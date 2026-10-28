-- =====================================================================
-- 014_cost_sumber_utama.sql
-- Sheet Cost menjadi sumber utama performa (mingguan per batch).
--   - Kolom baru: Box GT, Late delivery, Max Time (rata-rata), Complaint
--   - Identitas orang = NAMA + BRANCH (dua orang bernama sama di branch berbeda = orang berbeda)
--   - Kurir melihat baris yang Nama + Branch-nya sama dengan akunnya
--     (branch akun = branch dari area penugasannya saat ini)
--   - Staf Delivery DAN korlap melihat semua data performa
-- Jalankan SETELAH 001–013. Jalankan SEKALI saja.
-- =====================================================================
begin;

alter table public.dlv_costs
  add column if not exists box_gt        int  default 0,
  add column if not exists late_delivery int  default 0,
  add column if not exists max_time      time,
  add column if not exists complaint     int  default 0;

-- Branch jadi bagian kunci baris: Bulan + Batch + Nama + Branch
update public.dlv_costs set branch = '' where branch is null;
alter table public.dlv_costs alter column branch set default '', alter column branch set not null;
alter table public.dlv_costs drop constraint if exists dlv_costs_bulan_batch_nama_key;
alter table public.dlv_costs add constraint dlv_costs_kunci unique (bulan, batch, nama, branch);

-- Kunci identitas user yang login: "nama|branch"
create or replace function public.dlv_kunci_saya() returns text
language sql stable security definer set search_path = public as $$
  select norm_nama(p.nama) || '|' || norm_nama(b.nama)
    from profiles p
    join dlv_penugasan pg on pg.profile_id = p.id and pg.selesai is null
    join dlv_areas a on a.id = pg.area_id
    join dlv_branches b on b.id = a.branch_id
   where p.id = auth.uid() and p.aktif
   limit 1;
$$;

-- Boleh melihat SEMUA data performa: staf Delivery + korlap
create or replace function public.dlv_lihat_performa() returns boolean
language sql stable security definer set search_path = public as $$
  select public.dlv_staf_semua() or exists (
    select 1 from profiles where id = auth.uid() and aktif and division_id = 'DLV' and position_id = 'korlap');
$$;
revoke execute on function public.dlv_kunci_saya(), public.dlv_lihat_performa() from public, anon;
grant  execute on function public.dlv_kunci_saya(), public.dlv_lihat_performa() to authenticated, service_role;

create index if not exists dlv_costs_identitas_idx on public.dlv_costs ((norm_nama(nama) || '|' || norm_nama(branch)));
create index if not exists dlv_complaints_identitas_idx on public.dlv_complaints ((norm_nama(nama_kurir) || '|' || norm_nama(branch_nama)));

drop policy if exists "baca: sesuai hak" on public.dlv_costs;
create policy "baca: sesuai hak" on public.dlv_costs for select to authenticated
  using ((select public.dlv_lihat_performa())
         or (norm_nama(nama) || '|' || norm_nama(branch)) = (select public.dlv_kunci_saya()));

drop policy if exists "baca: sesuai hak" on public.dlv_complaints;
create policy "baca: sesuai hak" on public.dlv_complaints for select to authenticated
  using ((select public.dlv_lihat_performa())
         or (norm_nama(nama_kurir) || '|' || norm_nama(branch_nama)) = (select public.dlv_kunci_saya()));

commit;
