-- =====================================================================
-- 001_inti.sql
-- Tabel inti yang dipakai SEMUA aplikasi & divisi:
-- divisi, jabatan, aplikasi, profil SDM, matriks akses, pengecualian.
-- Plus fungsi boleh_akses() dan aturan keamanan (RLS).
--
-- Cara pakai: Supabase Dashboard → SQL Editor → New query →
-- tempel seluruh isi file ini → Run. Jalankan SEKALI saja.
-- Seluruh isi dibungkus begin/commit: kalau ada error, tidak ada yang tersimpan.
-- =====================================================================
begin;

-- ---------- Divisi ----------
create table public.divisions (
  id          text primary key check (id ~ '^[A-Z]{2,5}$'),   -- contoh: DLV
  nama        text not null unique,                          -- contoh: Delivery
  created_at  timestamptz not null default now()
);

-- ---------- Jabatan ----------
-- cakupan 'divisi' = akses mengikuti matriks divisinya
-- cakupan 'semua'  = otomatis bisa membuka semua aplikasi (GM, Super Admin)
create table public.positions (
  id          text primary key check (id ~ '^[a-z0-9_]+$'),   -- contoh: kurir
  nama        text not null unique,                          -- contoh: Kurir
  cakupan     text not null default 'divisi' check (cakupan in ('divisi', 'semua')),
  urutan      int  not null default 100,
  created_at  timestamptz not null default now()
);

-- Jabatan dipakai di divisi mana saja (Admin bisa dipakai di banyak divisi)
create table public.position_divisions (
  position_id text not null references public.positions(id) on delete cascade,
  division_id text not null references public.divisions(id) on delete cascade,
  primary key (position_id, division_id)
);

-- ---------- Aplikasi ----------
create table public.apps (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),   -- contoh: dlv-kurir
  nama        text not null,
  division_id text references public.divisions(id),          -- null = lintas divisi (Backoffice)
  url         text not null unique check (url ~ '^/[a-z0-9/-]*$'),
  aktif       boolean not null default true,
  urutan      int not null default 100
);

-- ---------- Profil SDM ----------
-- Satu baris per orang, terhubung ke akun login (auth.users).
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text not null,
  username    text not null unique check (username ~ '^[a-z0-9._-]{4,40}$'),
  division_id text references public.divisions(id),          -- null untuk jabatan lintas divisi
  position_id text not null references public.positions(id),
  kontrak     text check (kontrak in ('Full Time', 'Part Time')),
  aktif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Nama wajib unik (tanpa beda huruf besar/kecil & spasi berlebih),
-- karena dipakai untuk mencocokkan data SLA/complaint/cost dari spreadsheet.
create unique index profiles_nama_unik
  on public.profiles (lower(regexp_replace(btrim(nama), '\s+', ' ', 'g')));

-- Validasi otomatis setiap profil disimpan
create or replace function public.cek_profil() returns trigger
language plpgsql set search_path = public as $$
begin
  new.nama := regexp_replace(btrim(new.nama), '\s+', ' ', 'g');
  if (select cakupan from positions where id = new.position_id) = 'semua' then
    new.division_id := null;
  elsif new.division_id is null
     or not exists (select 1 from position_divisions
                    where position_id = new.position_id and division_id = new.division_id) then
    raise exception 'Jabatan "%" tidak dipakai di divisi "%".', new.position_id, coalesce(new.division_id, '(kosong)');
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_cek
  before insert or update on public.profiles
  for each row execute function public.cek_profil();

-- ---------- Matriks akses ----------
create table public.role_app_access (
  division_id text not null references public.divisions(id) on delete cascade,
  position_id text not null references public.positions(id) on delete cascade,
  app_id      text not null references public.apps(id) on delete cascade,
  primary key (division_id, position_id, app_id)
);

-- Aplikasi yang langsung dibuka setelah login (kalau kosong → portal)
create table public.role_landing (
  division_id text not null references public.divisions(id) on delete cascade,
  position_id text not null references public.positions(id) on delete cascade,
  app_id      text not null references public.apps(id) on delete cascade,
  primary key (division_id, position_id)
);

-- Pengecualian per orang (izinkan/blokir), mengalahkan matriks
create table public.user_app_exceptions (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  app_id      text not null references public.apps(id) on delete cascade,
  izinkan     boolean not null,
  alasan      text not null check (length(btrim(alasan)) > 0),
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (profile_id, app_id)
);

-- =====================================================================
-- Fungsi akses — SATU-SATUNYA sumber aturan akses.
-- Dipakai portal, route guard tiap aplikasi, dan RLS.
-- Urutan: akun nonaktif → aplikasi nonaktif → pengecualian → lintas divisi → matriks
-- =====================================================================
create or replace function public.boleh_akses(p_user uuid, p_app text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when not p.aktif then false
      when not a.aktif then false
      when ex.izinkan is not null then ex.izinkan
      when pos.cakupan = 'semua' then true
      else exists (select 1 from role_app_access r
                   where r.division_id = p.division_id
                     and r.position_id = p.position_id
                     and r.app_id = a.id)
    end
    from profiles p
    join positions pos on pos.id = p.position_id
    cross join apps a
    left join user_app_exceptions ex on ex.profile_id = p.id and ex.app_id = a.id
    where p.id = p_user and a.id = p_app
  ), false);
$$;

-- Daftar aplikasi milik user yang sedang login (untuk portal)
create or replace function public.aplikasi_saya()
returns table (id text, nama text, url text, division_id text, divisi text, utama boolean)
language sql stable security definer set search_path = public as $$
  select a.id, a.nama, a.url, a.division_id, d.nama,
         coalesce(a.id = (select rl.app_id from role_landing rl
                          join profiles p on p.division_id = rl.division_id
                                         and p.position_id = rl.position_id
                          where p.id = auth.uid()), false)
  from apps a
  left join divisions d on d.id = a.division_id
  where public.boleh_akses(auth.uid(), a.id)
  order by d.nama nulls last, a.urutan;
$$;

-- Singkatan: apakah user yang login boleh membuka Backoffice
create or replace function public.admin_pusat() returns boolean
language sql stable security definer set search_path = public as $$
  select public.boleh_akses(auth.uid(), 'backoffice');
$$;

-- Fungsi hanya boleh dipanggil user yang sudah login
revoke execute on function public.boleh_akses(uuid, text), public.aplikasi_saya(), public.admin_pusat() from public, anon;
grant  execute on function public.boleh_akses(uuid, text), public.aplikasi_saya(), public.admin_pusat() to authenticated;

-- =====================================================================
-- Keamanan (Row Level Security)
-- Tanpa policy = tidak ada yang bisa baca/tulis lewat web.
-- Akun dibuat lewat Edge Function (memakai service role) di langkah berikutnya.
-- =====================================================================
alter table public.divisions            enable row level security;
alter table public.positions            enable row level security;
alter table public.position_divisions   enable row level security;
alter table public.apps                 enable row level security;
alter table public.profiles             enable row level security;
alter table public.role_app_access      enable row level security;
alter table public.role_landing         enable row level security;
alter table public.user_app_exceptions  enable row level security;

-- Master data: semua yang login boleh baca, hanya admin pusat yang boleh ubah
create policy "baca: login"        on public.divisions          for select to authenticated using (true);
create policy "ubah: admin pusat"  on public.divisions          for all    to authenticated using (public.admin_pusat()) with check (public.admin_pusat());
create policy "baca: login"        on public.positions          for select to authenticated using (true);
create policy "ubah: admin pusat"  on public.positions          for all    to authenticated using (public.admin_pusat()) with check (public.admin_pusat());
create policy "baca: login"        on public.position_divisions for select to authenticated using (true);
create policy "ubah: admin pusat"  on public.position_divisions for all    to authenticated using (public.admin_pusat()) with check (public.admin_pusat());
create policy "baca: login"        on public.apps               for select to authenticated using (true);
create policy "ubah: admin pusat"  on public.apps               for all    to authenticated using (public.admin_pusat()) with check (public.admin_pusat());
create policy "baca: login"        on public.role_app_access    for select to authenticated using (true);
create policy "ubah: admin pusat"  on public.role_app_access    for all    to authenticated using (public.admin_pusat()) with check (public.admin_pusat());
create policy "baca: login"        on public.role_landing       for select to authenticated using (true);
create policy "ubah: admin pusat"  on public.role_landing       for all    to authenticated using (public.admin_pusat()) with check (public.admin_pusat());

-- Profil: setiap orang melihat profilnya sendiri; admin pusat melihat & mengubah semua.
-- (Akses Admin Delivery ke profil kurir ditambahkan di migration delivery.)
create policy "baca: diri sendiri" on public.profiles for select to authenticated using (id = auth.uid() or public.admin_pusat());
create policy "ubah: admin pusat"  on public.profiles for update to authenticated using (public.admin_pusat()) with check (public.admin_pusat());

-- Pengecualian: orangnya sendiri boleh lihat; admin pusat kelola
create policy "baca: diri sendiri" on public.user_app_exceptions for select to authenticated using (profile_id = auth.uid() or public.admin_pusat());
create policy "ubah: admin pusat"  on public.user_app_exceptions for all    to authenticated using (public.admin_pusat()) with check (public.admin_pusat());

grant select, insert, update, delete on
  public.divisions, public.positions, public.position_divisions, public.apps,
  public.profiles, public.role_app_access, public.role_landing, public.user_app_exceptions
to authenticated;

commit;
