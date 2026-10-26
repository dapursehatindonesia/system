-- =====================================================================
-- 006_delivery.sql
-- Modul Delivery + Absensi (absensi dipakai bersama semua divisi).
--
--   Master   : dlv_branches, dlv_areas, dlv_area_korlap, dlv_penugasan,
--              dlv_target_default, dlv_target_box
--   Absensi  : attendance_sessions, attendance_points, attendance  (+ fungsi absen())
--   Transaksi: dlv_penilaian, dlv_reimburse  (+ fungsi proses_reimburse())
--   Spreadsheet (diisi sync jam 01.00): dlv_sla, dlv_complaints, dlv_costs,
--              sync_log, sync_unmatched
--   Foto     : bucket storage 'foto-absen' & 'foto-reimburse' (privat)
--
-- Siapa melihat apa (dijaga RLS):
--   - Kurir      : hanya data dirinya
--   - Korlap     : kurir di area penugasannya yang aktif
--   - Admin/Manajer/HRD Delivery & admin pusat : semua Delivery
--   - Reimburse  : kurir pemilik, Admin & Manajer Delivery. Yang memproses: Admin Delivery.
--
-- Jalankan SETELAH 001–005. Jalankan SEKALI saja.
-- =====================================================================
begin;

-- ---------- Waktu Jakarta ----------
create or replace function public.hari_ini() returns date
language sql stable as $$ select (now() at time zone 'Asia/Jakarta')::date $$;
create or replace function public.jam_sekarang() returns time
language sql stable as $$ select (now() at time zone 'Asia/Jakarta')::time $$;

-- =====================================================================
-- MASTER DELIVERY
-- =====================================================================
create table public.dlv_branches (
  id         uuid primary key default gen_random_uuid(),
  nama       text not null unique check (length(btrim(nama)) between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.dlv_areas (
  id         uuid primary key default gen_random_uuid(),
  nama       text not null unique check (length(btrim(nama)) between 1 and 100),
  branch_id  uuid not null references public.dlv_branches(id),
  aktif      boolean not null default true,
  created_at timestamptz not null default now()
);

-- Korlap ↔ area, dengan riwayat (selesai terisi = penugasan lama)
create table public.dlv_area_korlap (
  id        bigint generated always as identity primary key,
  korlap_id uuid not null references public.profiles(id) on delete cascade,
  area_id   uuid not null references public.dlv_areas(id) on delete cascade,
  mulai     date not null default public.hari_ini(),
  selesai   date,
  check (selesai is null or selesai >= mulai)
);
create unique index dlv_area_korlap_aktif on public.dlv_area_korlap (korlap_id, area_id) where selesai is null;

-- Kurir ↔ area, dengan riwayat (laporan bulan lalu tetap benar walau kurir pindah area)
create table public.dlv_penugasan (
  id         bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  area_id    uuid not null references public.dlv_areas(id),
  mulai      date not null default public.hari_ini(),
  selesai    date,
  check (selesai is null or selesai >= mulai)
);
create unique index dlv_penugasan_aktif on public.dlv_penugasan (profile_id) where selesai is null;

create table public.dlv_target_default (
  kontrak text primary key check (kontrak in ('Full Time', 'Part Time')),
  target  int not null check (target >= 0)
);
insert into public.dlv_target_default values ('Full Time', 650), ('Part Time', 350);

create table public.dlv_target_box (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  bulan      date not null check (extract(day from bulan) = 1),   -- tanggal 1 tiap bulan
  target     int  not null check (target >= 0),
  primary key (profile_id, bulan)
);

-- ---------- Fungsi bantu akses Delivery ----------
create or replace function public.area_kurir(p_profile uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select area_id from dlv_penugasan where profile_id = p_profile and selesai is null limit 1;
$$;

-- Admin, Manajer, HRD Delivery (dan admin pusat): melihat semua Delivery
create or replace function public.dlv_staf_semua() returns boolean
language sql stable security definer set search_path = public as $$
  select public.admin_pusat() or exists (
    select 1 from profiles where id = auth.uid() and aktif
      and division_id = 'DLV' and position_id in ('admin', 'manajer', 'hrd'));
$$;

-- Admin Delivery (dan admin pusat): boleh mengubah master, memproses reimburse
create or replace function public.dlv_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.admin_pusat() or exists (
    select 1 from profiles where id = auth.uid() and aktif and division_id = 'DLV' and position_id = 'admin');
$$;

create or replace function public.dlv_korlap_area(p_area uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from dlv_area_korlap k join profiles p on p.id = k.korlap_id
                 where k.korlap_id = auth.uid() and p.aktif and k.area_id = p_area and k.selesai is null);
$$;

create or replace function public.dlv_area_boleh(p_area uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.dlv_staf_semua() or public.dlv_korlap_area(p_area);
$$;

-- Boleh melihat data orang ini? (dirinya sendiri, staf Delivery, atau korlap areanya)
create or replace function public.dlv_orang_boleh(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_profile = auth.uid() or public.dlv_staf_semua() or public.dlv_korlap_area(public.area_kurir(p_profile));
$$;

-- Reimburse hanya dilihat pemilik, Admin & Manajer Delivery, admin pusat
create or replace function public.dlv_reimburse_lihat(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_profile = auth.uid() or public.admin_pusat() or exists (
    select 1 from profiles where id = auth.uid() and aktif and division_id = 'DLV' and position_id in ('admin', 'manajer'));
$$;

-- Profil kurir Delivery boleh dibaca staf Delivery & korlap areanya
create policy "baca: delivery" on public.profiles for select to authenticated
  using (division_id = 'DLV' and (public.dlv_staf_semua() or (position_id = 'kurir' and public.dlv_korlap_area(public.area_kurir(id)))));

-- =====================================================================
-- ABSENSI (semua divisi)
-- =====================================================================
create table public.attendance_sessions (
  sesi        text primary key,
  jam_mulai   time not null,
  jam_selesai time not null,
  hari        int[] not null,                -- 1 = Senin … 7 = Minggu
  untuk       text not null check (untuk in ('kurir', 'staf'))
);
insert into public.attendance_sessions values
  ('Lunch',   '08:00', '11:59', '{1,2,3,4,5}',   'kurir'),
  ('Dinner',  '14:00', '18:59', '{1,2,3,4,5}',   'kurir'),
  ('Weekend', '07:00', '11:59', '{6}',           'kurir'),
  ('Masuk',   '05:00', '12:00', '{1,2,3,4,5,6}', 'staf'),
  ('Pulang',  '12:00', '23:59', '{1,2,3,4,5,6}', 'staf');

-- Titik absensi: area_id terisi = hanya untuk kurir area itu; kosong = untuk semua (mis. dapur CK, kantor)
create table public.attendance_points (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null unique check (length(btrim(nama)) between 1 and 100),
  area_id     uuid references public.dlv_areas(id),
  division_id text references public.divisions(id),
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  radius_m    int not null default 100 check (radius_m between 20 and 1000),
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.attendance (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  tanggal      date not null,
  sesi         text not null references public.attendance_sessions(sesi),
  status       text not null default 'Hadir' check (status in ('Hadir', 'Izin', 'Sakit')),
  jam          time,
  point_id     uuid references public.attendance_points(id),
  jarak_m      int,
  lat          double precision,
  lng          double precision,
  akurasi_m    double precision,
  foto_path    text,
  catatan      text check (length(catatan) <= 500),
  sumber       text not null default 'app' check (sumber in ('app', 'admin')),
  dicatat_oleh uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  unique (profile_id, tanggal, sesi)
);
create index attendance_tanggal_idx on public.attendance (tanggal);

-- Absen dari aplikasi. SEMUA validasi di server: jam sesi, radius, foto, dobel absen.
create or replace function public.absen(p_sesi text, p_lat double precision, p_lng double precision,
                                        p_akurasi double precision, p_foto text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_p    profiles%rowtype;
  v_s    attendance_sessions%rowtype;
  v_hari date := public.hari_ini();
  v_jam  time := public.jam_sekarang();
  v_area uuid;
  v_t    record;
  v_id   uuid;
begin
  if v_uid is null then raise exception 'Belum login.'; end if;
  select * into v_p from profiles where id = v_uid;
  if not found or not v_p.aktif then raise exception 'Akun tidak aktif.'; end if;
  select * into v_s from attendance_sessions where sesi = p_sesi;
  if not found then raise exception 'Sesi % tidak dikenal.', p_sesi; end if;
  if (v_s.untuk = 'kurir') <> (v_p.position_id = 'kurir') then
    raise exception 'Sesi % tidak berlaku untuk jabatan Anda.', p_sesi; end if;
  if not (extract(isodow from v_hari)::int = any (v_s.hari)) then
    raise exception 'Tidak ada sesi % hari ini.', p_sesi; end if;
  if v_jam < v_s.jam_mulai or v_jam > v_s.jam_selesai then
    raise exception 'Absen % hanya bisa pukul % – %.', p_sesi, to_char(v_s.jam_mulai, 'HH24:MI'), to_char(v_s.jam_selesai, 'HH24:MI'); end if;
  if exists (select 1 from attendance where profile_id = v_uid and tanggal = v_hari and sesi = p_sesi) then
    raise exception 'Anda sudah absen % hari ini.', p_sesi; end if;
  if p_sesi = 'Pulang' and not exists (select 1 from attendance where profile_id = v_uid and tanggal = v_hari and sesi = 'Masuk' and status = 'Hadir') then
    raise exception 'Absen masuk dulu sebelum absen pulang.'; end if;
  if p_lat is null or p_lng is null then raise exception 'Lokasi tidak terbaca.'; end if;
  if p_akurasi is not null and p_akurasi > 150 then
    raise exception 'Akurasi GPS terlalu rendah (±% m). Pindah ke tempat terbuka lalu coba lagi.', round(p_akurasi); end if;
  if p_foto is null or p_foto not like v_uid::text || '/%'
     or not exists (select 1 from storage.objects where bucket_id = 'foto-absen' and name = p_foto) then
    raise exception 'Foto absen tidak ditemukan. Ambil foto ulang.'; end if;

  v_area := public.area_kurir(v_uid);
  select t.id, t.nama, t.radius_m,
         round(6371000 * 2 * asin(least(1.0, sqrt(
           power(sin(radians(t.lat - p_lat) / 2), 2) +
           cos(radians(p_lat)) * cos(radians(t.lat)) * power(sin(radians(t.lng - p_lng) / 2), 2)))))::int as jarak
    into v_t
    from attendance_points t
   where t.aktif
     and ((t.area_id is null and (t.division_id is null or t.division_id = v_p.division_id)) or t.area_id = v_area)
   order by 4 limit 1;
  if not found then raise exception 'Belum ada titik absensi untuk Anda. Hubungi admin.'; end if;
  if v_t.jarak > v_t.radius_m then
    raise exception 'Di luar radius: % m dari %. Maksimal % m.', v_t.jarak, v_t.nama, v_t.radius_m; end if;

  insert into attendance (profile_id, tanggal, sesi, status, jam, point_id, jarak_m, lat, lng, akurasi_m, foto_path, sumber)
  values (v_uid, v_hari, p_sesi, 'Hadir', v_jam, v_t.id, v_t.jarak, p_lat, p_lng, p_akurasi, p_foto, 'app')
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'jam', to_char(v_jam, 'HH24:MI'), 'titik', v_t.nama, 'jarak', v_t.jarak);
end $$;

-- Admin mencatat Izin/Sakit (tidak bisa menimpa absen asli dari aplikasi)
create or replace function public.catat_absen_admin(p_profile uuid, p_tanggal date, p_sesi text, p_status text, p_catatan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.admin_pusat() or (public.dlv_admin() and exists (select 1 from profiles where id = p_profile and division_id = 'DLV'))) then
    raise exception 'Anda tidak punya izin mencatat absensi orang ini.'; end if;
  if p_status not in ('Izin', 'Sakit') then raise exception 'Admin hanya bisa mencatat Izin atau Sakit.'; end if;
  if exists (select 1 from attendance where profile_id = p_profile and tanggal = p_tanggal and sesi = p_sesi and sumber = 'app') then
    raise exception 'Sudah ada absen dari aplikasi untuk sesi ini.'; end if;
  insert into attendance (profile_id, tanggal, sesi, status, catatan, sumber, dicatat_oleh)
  values (p_profile, p_tanggal, p_sesi, p_status, p_catatan, 'admin', auth.uid())
  on conflict (profile_id, tanggal, sesi) do update
    set status = excluded.status, catatan = excluded.catatan, dicatat_oleh = excluded.dicatat_oleh;
  insert into audit_log (actor_id, aksi, target_tabel, target_id, detail)
  values (auth.uid(), 'catat_absen', 'attendance', p_profile::text, jsonb_build_object('tanggal', p_tanggal, 'sesi', p_sesi, 'status', p_status));
end $$;

-- =====================================================================
-- PENILAIAN KORLAP
-- =====================================================================
create table public.dlv_penilaian (
  id           bigint generated always as identity primary key,
  tanggal      date not null,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  area_id      uuid not null references public.dlv_areas(id),
  lunch        text check (lunch  in ('Hadir', 'Alpa', 'Izin', 'Sakit')),
  dinner       text check (dinner in ('Hadir', 'Alpa', 'Izin', 'Sakit')),
  tas          text check (tas    in ('Lengkap', 'Belum Punya', 'Kondisi Buruk')),
  jaket        text check (jaket  in ('Lengkap', 'Belum Punya', 'Kondisi Buruk')),
  helm         text check (helm   in ('Lengkap', 'Belum Punya', 'Kondisi Buruk')),
  sepatu       text check (sepatu in ('Lengkap', 'Belum Punya', 'Kondisi Buruk')),
  dinilai_oleh uuid references public.profiles(id),
  updated_at   timestamptz not null default now(),
  unique (tanggal, profile_id)
);
create or replace function public.dlv_penilaian_stempel() returns trigger
language plpgsql set search_path = public as $$
begin new.dinilai_oleh := auth.uid(); new.updated_at := now(); return new; end $$;
create trigger dlv_penilaian_stempel before insert or update on public.dlv_penilaian
  for each row execute function public.dlv_penilaian_stempel();

-- =====================================================================
-- REIMBURSEMENT (Estafet, Parkir, Jarak)
-- =====================================================================
create table public.dlv_reimburse (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  tipe            text not null check (tipe in ('Estafet', 'Parkir', 'Jarak')),
  tanggal         date not null,
  sesi            text not null check (sesi in ('Lunch', 'Dinner', 'Weekend')),
  tujuan          text check (length(tujuan) <= 200),
  jarak_km        numeric(6, 1) check (jarak_km > 0 and jarak_km <= 200),
  cust_terjauh    text check (length(cust_terjauh) <= 200),
  foto_path       text,
  foto_jarak_path text,
  foto_box_path   text,
  nominal         int check (nominal >= 0),
  status          text not null default 'Waiting' check (status in ('Waiting', 'Approved', 'Rejected')),
  alasan_tolak    text check (length(alasan_tolak) <= 500),
  diproses_oleh   uuid references public.profiles(id),
  diproses_at     timestamptz,
  created_at      timestamptz not null default now(),
  check ((tipe = 'Estafet' and tujuan is not null and foto_path is not null)
      or (tipe = 'Parkir'  and foto_path is not null)
      or (tipe = 'Jarak'   and jarak_km is not null and cust_terjauh is not null
                           and foto_jarak_path is not null and foto_box_path is not null)),
  check (status <> 'Rejected' or alasan_tolak is not null)
);
create unique index dlv_reimburse_jarak_1x on public.dlv_reimburse (profile_id, tanggal, sesi)
  where tipe = 'Jarak' and status <> 'Rejected';
create index dlv_reimburse_status_idx on public.dlv_reimburse (status, created_at desc);

create or replace function public.proses_reimburse(p_id uuid, p_status text, p_nominal int, p_alasan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.dlv_admin() then raise exception 'Hanya Admin Delivery yang bisa memproses reimbursement.'; end if;
  if p_status not in ('Approved', 'Rejected') then raise exception 'Status tidak valid.'; end if;
  if p_status = 'Approved' and (p_nominal is null or p_nominal < 0) then raise exception 'Isi nominal yang disetujui.'; end if;
  if p_status = 'Rejected' and coalesce(btrim(p_alasan), '') = '' then raise exception 'Tulis alasan penolakan.'; end if;
  update dlv_reimburse
     set status = p_status,
         nominal = case when p_status = 'Approved' then p_nominal end,
         alasan_tolak = case when p_status = 'Rejected' then btrim(p_alasan) end,
         diproses_oleh = auth.uid(), diproses_at = now()
   where id = p_id and status = 'Waiting';
  if not found then raise exception 'Pengajuan tidak ditemukan atau sudah diproses.'; end if;
  insert into audit_log (actor_id, aksi, target_tabel, target_id, detail)
  values (auth.uid(), 'proses_reimburse', 'dlv_reimburse', p_id::text, jsonb_build_object('status', p_status, 'nominal', p_nominal));
end $$;

-- =====================================================================
-- DATA DARI SPREADSHEET (diisi sync jam 01.00 — bukan dari browser)
-- =====================================================================
create table public.dlv_sla (
  id            bigint generated always as identity primary key,
  batch         int,
  tanggal       date not null,
  sesi          text not null,
  mode          text not null check (mode in ('HG', 'BK')),
  nama_kurir    text not null,
  profile_id    uuid references public.profiles(id) on delete set null,
  max_time      time,
  qty_box       int not null default 0,
  box_terlambat int not null default 0,
  unique (tanggal, sesi, mode, nama_kurir)
);
create index dlv_sla_profile_tgl on public.dlv_sla (profile_id, tanggal);

create table public.dlv_complaints (
  id            bigint generated always as identity primary key,
  kunci         text not null unique,       -- sidik jari baris spreadsheet, supaya sync ulang tidak dobel
  batch         int,
  tanggal       date not null,
  sesi          text,                       -- kolom "menu" di spreadsheet
  branch        text,
  nama_customer text,
  tipe          text,
  keterangan    text,
  nama_kurir    text not null,
  kode_warna    text,
  profile_id    uuid references public.profiles(id) on delete set null
);
create index dlv_complaints_profile_tgl on public.dlv_complaints (profile_id, tanggal);

create table public.dlv_costs (
  id            bigint generated always as identity primary key,
  bulan         date not null,              -- dari kolom Month (2601 → 2026-01-01)
  batch         int not null,
  nama          text not null,
  profile_id    uuid references public.profiles(id) on delete set null,
  branch text, kontrak text, jabatan text, area text,
  total_weekly  numeric default 0, total_cost numeric default 0,
  total_box int default 0, box_hg int default 0, box_bk int default 0, box_b2b int default 0, box_b2c int default 0,
  target int default 0, kelebihan_box int default 0,
  estafet numeric default 0, jarak numeric default 0, parkir numeric default 0, gedung numeric default 0, dll numeric default 0,
  unique (bulan, batch, nama)
);
create index dlv_costs_profile on public.dlv_costs (profile_id, bulan);

create table public.sync_log (
  id          bigint generated always as identity primary key,
  sumber      text not null,
  mulai       timestamptz not null default now(),
  selesai     timestamptz,
  status      text not null default 'berjalan' check (status in ('berjalan', 'sukses', 'gagal')),
  baris_masuk int default 0,
  baris_gagal int default 0,
  pesan       text,
  dipicu_oleh uuid references public.profiles(id)
);
create table public.sync_unmatched (
  id      bigint generated always as identity primary key,
  sync_id bigint references public.sync_log(id) on delete cascade,
  sumber  text not null,
  nama    text not null,
  tanggal date
);

-- =====================================================================
-- FOTO (Storage, privat). Path file: <id user>/<nama file>
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('foto-absen',     'foto-absen',     false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('foto-reimburse', 'foto-reimburse', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.foto_boleh(p_bucket text, p_folder text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then false
    when p_bucket = 'foto-absen'     then public.dlv_orang_boleh(p_folder::uuid)
    when p_bucket = 'foto-reimburse' then public.dlv_reimburse_lihat(p_folder::uuid)
    else false end;
$$;

create policy "foto: unggah ke folder sendiri" on storage.objects for insert to authenticated
  with check (bucket_id in ('foto-absen', 'foto-reimburse') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "foto: lihat sesuai hak" on storage.objects for select to authenticated
  using (bucket_id in ('foto-absen', 'foto-reimburse')
         and ((storage.foldername(name))[1] = auth.uid()::text or public.foto_boleh(bucket_id, (storage.foldername(name))[1])));
create policy "foto: admin hapus" on storage.objects for delete to authenticated
  using (bucket_id in ('foto-absen', 'foto-reimburse') and public.dlv_admin());

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.dlv_branches        enable row level security;
alter table public.dlv_areas           enable row level security;
alter table public.dlv_area_korlap     enable row level security;
alter table public.dlv_penugasan       enable row level security;
alter table public.dlv_target_default  enable row level security;
alter table public.dlv_target_box      enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_points   enable row level security;
alter table public.attendance          enable row level security;
alter table public.dlv_penilaian       enable row level security;
alter table public.dlv_reimburse       enable row level security;
alter table public.dlv_sla             enable row level security;
alter table public.dlv_complaints      enable row level security;
alter table public.dlv_costs           enable row level security;
alter table public.sync_log            enable row level security;
alter table public.sync_unmatched      enable row level security;

-- Master: semua yang login boleh baca (nama area/branch/titik), Admin Delivery mengelola
create policy "baca: login"       on public.dlv_branches        for select to authenticated using (true);
create policy "kelola: admin dlv" on public.dlv_branches        for all    to authenticated using (public.dlv_admin()) with check (public.dlv_admin());
create policy "baca: login"       on public.dlv_areas           for select to authenticated using (true);
create policy "kelola: admin dlv" on public.dlv_areas           for all    to authenticated using (public.dlv_admin()) with check (public.dlv_admin());
create policy "baca: login"       on public.dlv_area_korlap     for select to authenticated using (true);
create policy "kelola: admin dlv" on public.dlv_area_korlap     for all    to authenticated using (public.dlv_admin()) with check (public.dlv_admin());
create policy "baca: sesuai hak"  on public.dlv_penugasan       for select to authenticated using (public.dlv_orang_boleh(profile_id));
create policy "kelola: admin dlv" on public.dlv_penugasan       for all    to authenticated using (public.dlv_admin()) with check (public.dlv_admin());
create policy "baca: login"       on public.dlv_target_default  for select to authenticated using (true);
create policy "kelola: admin dlv" on public.dlv_target_default  for all    to authenticated using (public.dlv_admin()) with check (public.dlv_admin());
create policy "baca: sesuai hak"  on public.dlv_target_box      for select to authenticated using (public.dlv_orang_boleh(profile_id));
create policy "kelola: admin dlv" on public.dlv_target_box      for all    to authenticated using (public.dlv_admin()) with check (public.dlv_admin());
create policy "baca: login"       on public.attendance_sessions for select to authenticated using (true);
create policy "kelola: admin pusat" on public.attendance_sessions for all to authenticated using (public.admin_pusat()) with check (public.admin_pusat());
create policy "baca: login"       on public.attendance_points   for select to authenticated using (true);
create policy "kelola: admin dlv" on public.attendance_points   for all    to authenticated using (public.dlv_admin()) with check (public.dlv_admin());

-- Absensi: dibaca sesuai hak; ditulis HANYA lewat fungsi absen() / catat_absen_admin()
create policy "baca: sesuai hak" on public.attendance for select to authenticated using (public.dlv_orang_boleh(profile_id));

-- Penilaian: korlap area / Admin Delivery, hanya Senin minggu berjalan s.d. hari ini
create policy "baca: sesuai hak" on public.dlv_penilaian for select to authenticated
  using (public.dlv_area_boleh(area_id) or profile_id = auth.uid());
create policy "isi: korlap/admin" on public.dlv_penilaian for insert to authenticated
  with check ((public.dlv_admin() or public.dlv_korlap_area(area_id))
              and tanggal between date_trunc('week', public.hari_ini())::date and public.hari_ini());
create policy "ubah: korlap/admin" on public.dlv_penilaian for update to authenticated
  using ((public.dlv_admin() or public.dlv_korlap_area(area_id))
         and tanggal between date_trunc('week', public.hari_ini())::date and public.hari_ini())
  with check ((public.dlv_admin() or public.dlv_korlap_area(area_id))
              and tanggal between date_trunc('week', public.hari_ini())::date and public.hari_ini());

-- Reimburse: kurir mengajukan miliknya sendiri; diproses lewat proses_reimburse()
create policy "baca: sesuai hak" on public.dlv_reimburse for select to authenticated
  using (public.dlv_reimburse_lihat(profile_id));
create policy "ajukan: kurir" on public.dlv_reimburse for insert to authenticated
  with check (profile_id = auth.uid() and status = 'Waiting' and nominal is null and diproses_oleh is null
              and tanggal between public.hari_ini() - 14 and public.hari_ini()
              and exists (select 1 from public.profiles where id = auth.uid() and aktif and position_id = 'kurir')
              and (foto_path       is null or foto_path       like auth.uid()::text || '/%')
              and (foto_jarak_path is null or foto_jarak_path like auth.uid()::text || '/%')
              and (foto_box_path   is null or foto_box_path   like auth.uid()::text || '/%'));

-- Data spreadsheet: dibaca sesuai hak; baris yang namanya tidak cocok hanya untuk staf
create policy "baca: sesuai hak" on public.dlv_sla        for select to authenticated using (case when profile_id is null then public.dlv_staf_semua() else public.dlv_orang_boleh(profile_id) end);
create policy "baca: sesuai hak" on public.dlv_complaints for select to authenticated using (case when profile_id is null then public.dlv_staf_semua() else public.dlv_orang_boleh(profile_id) end);
create policy "baca: sesuai hak" on public.dlv_costs      for select to authenticated using (case when profile_id is null then public.dlv_staf_semua() else public.dlv_orang_boleh(profile_id) end);
create policy "baca: staf dlv"   on public.sync_log       for select to authenticated using (public.dlv_staf_semua());
create policy "baca: staf dlv"   on public.sync_unmatched for select to authenticated using (public.dlv_staf_semua());

-- ---------- Hak akses tabel & fungsi ----------
grant select, insert, update, delete on
  public.dlv_branches, public.dlv_areas, public.dlv_area_korlap, public.dlv_penugasan,
  public.dlv_target_default, public.dlv_target_box, public.attendance_sessions, public.attendance_points,
  public.dlv_penilaian
to authenticated;
grant select on public.attendance, public.dlv_sla, public.dlv_complaints, public.dlv_costs, public.sync_log, public.sync_unmatched to authenticated;
grant select, insert on public.dlv_reimburse to authenticated;

revoke execute on function
  public.area_kurir(uuid), public.dlv_staf_semua(), public.dlv_admin(), public.dlv_korlap_area(uuid),
  public.dlv_area_boleh(uuid), public.dlv_orang_boleh(uuid), public.dlv_reimburse_lihat(uuid), public.foto_boleh(text, text),
  public.absen(text, double precision, double precision, double precision, text),
  public.catat_absen_admin(uuid, date, text, text, text), public.proses_reimburse(uuid, text, int, text)
from public, anon;
grant execute on function
  public.area_kurir(uuid), public.dlv_staf_semua(), public.dlv_admin(), public.dlv_korlap_area(uuid),
  public.dlv_area_boleh(uuid), public.dlv_orang_boleh(uuid), public.dlv_reimburse_lihat(uuid), public.foto_boleh(text, text),
  public.absen(text, double precision, double precision, double precision, text),
  public.catat_absen_admin(uuid, date, text, text, text), public.proses_reimburse(uuid, text, int, text)
to authenticated, service_role;

commit;

-- Cek hasil (jalankan terpisah):
-- select count(*) as tabel_dlv from information_schema.tables where table_schema='public' and (table_name like 'dlv_%' or table_name like 'attendance%' or table_name like 'sync_%');
--   → harus 16
-- select id, public from storage.buckets;   → foto-absen & foto-reimburse, public = false
