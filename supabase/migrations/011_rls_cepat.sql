-- =====================================================================
-- 011_rls_cepat.sql
-- Mempercepat aturan keamanan (RLS) untuk tabel besar (SLA, complaint, cost, absensi).
-- Sebelumnya hak akses dihitung ULANG untuk setiap baris → timeout saat data puluhan ribu.
-- Sekarang dihitung SEKALI per permintaan:
--   - (select fungsi())      → dievaluasi sekali, bukan per baris
--   - profile_id in (select …) → daftar kurir milik korlap dihitung sekali
-- ATURAN AKSES TIDAK BERUBAH. Ditambah indeks tanggal untuk pencarian per bulan.
-- Jalankan SETELAH 001–010. Aman dijalankan sekali.
-- =====================================================================
begin;

-- ---------- Fungsi bantu (sekali hitung per permintaan) ----------
-- Kurir yang sedang berada di area penugasan korlap yang login
create or replace function public.dlv_kurir_korlap_saya() returns setof uuid
language sql stable security definer set search_path = public as $$
  select p.profile_id
    from dlv_penugasan p
    join dlv_area_korlap k on k.area_id = p.area_id and k.selesai is null
    join profiles me on me.id = k.korlap_id and me.aktif
   where k.korlap_id = auth.uid() and p.selesai is null;
$$;

-- Area penugasan korlap yang login
create or replace function public.dlv_area_korlap_saya() returns setof uuid
language sql stable security definer set search_path = public as $$
  select k.area_id
    from dlv_area_korlap k
    join profiles me on me.id = k.korlap_id and me.aktif
   where k.korlap_id = auth.uid() and k.selesai is null;
$$;

-- Admin/Manajer Delivery atau admin pusat (untuk reimburse)
create or replace function public.dlv_reimburse_staf() returns boolean
language sql stable security definer set search_path = public as $$
  select public.admin_pusat() or exists (
    select 1 from profiles where id = auth.uid() and aktif and division_id = 'DLV' and position_id in ('admin', 'manajer'));
$$;

revoke execute on function public.dlv_kurir_korlap_saya(), public.dlv_area_korlap_saya(), public.dlv_reimburse_staf() from public, anon;
grant  execute on function public.dlv_kurir_korlap_saya(), public.dlv_area_korlap_saya(), public.dlv_reimburse_staf() to authenticated, service_role;

-- ---------- Policy baca yang dipercepat ----------
drop policy if exists "baca: sesuai hak" on public.dlv_sla;
create policy "baca: sesuai hak" on public.dlv_sla for select to authenticated
  using ((select public.dlv_staf_semua()) or profile_id = (select auth.uid()) or profile_id in (select public.dlv_kurir_korlap_saya()));

drop policy if exists "baca: sesuai hak" on public.dlv_complaints;
create policy "baca: sesuai hak" on public.dlv_complaints for select to authenticated
  using ((select public.dlv_staf_semua()) or profile_id = (select auth.uid()) or profile_id in (select public.dlv_kurir_korlap_saya()));

drop policy if exists "baca: sesuai hak" on public.dlv_costs;
create policy "baca: sesuai hak" on public.dlv_costs for select to authenticated
  using ((select public.dlv_staf_semua()) or profile_id = (select auth.uid()) or profile_id in (select public.dlv_kurir_korlap_saya()));

drop policy if exists "baca: sesuai hak" on public.attendance;
create policy "baca: sesuai hak" on public.attendance for select to authenticated
  using ((select public.dlv_staf_semua()) or profile_id = (select auth.uid()) or profile_id in (select public.dlv_kurir_korlap_saya()));

drop policy if exists "baca: sesuai hak" on public.dlv_penugasan;
create policy "baca: sesuai hak" on public.dlv_penugasan for select to authenticated
  using ((select public.dlv_staf_semua()) or profile_id = (select auth.uid()) or profile_id in (select public.dlv_kurir_korlap_saya()));

drop policy if exists "baca: sesuai hak" on public.dlv_target_box;
create policy "baca: sesuai hak" on public.dlv_target_box for select to authenticated
  using ((select public.dlv_staf_semua()) or profile_id = (select auth.uid()) or profile_id in (select public.dlv_kurir_korlap_saya()));

drop policy if exists "baca: sesuai hak" on public.dlv_penilaian;
create policy "baca: sesuai hak" on public.dlv_penilaian for select to authenticated
  using ((select public.dlv_staf_semua()) or profile_id = (select auth.uid()) or area_id in (select public.dlv_area_korlap_saya()));

drop policy if exists "baca: sesuai hak" on public.dlv_reimburse;
create policy "baca: sesuai hak" on public.dlv_reimburse for select to authenticated
  using (profile_id = (select auth.uid()) or (select public.dlv_reimburse_staf()));

drop policy if exists "baca hasil: sesuai hak" on public.refreshment_results;
create policy "baca hasil: sesuai hak" on public.refreshment_results for select to authenticated
  using ((select public.dlv_staf_semua()) or profile_id = (select auth.uid()) or profile_id in (select public.dlv_kurir_korlap_saya()));

drop policy if exists "baca: delivery" on public.profiles;
create policy "baca: delivery" on public.profiles for select to authenticated
  using (division_id = 'DLV' and ((select public.dlv_staf_semua()) or id in (select public.dlv_kurir_korlap_saya())));

drop policy if exists "baca: diri sendiri" on public.profiles;
create policy "baca: diri sendiri" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.admin_pusat()));

-- ---------- Indeks untuk pencarian per bulan / tanggal ----------
create index if not exists dlv_sla_tanggal_idx        on public.dlv_sla (tanggal, id);
create index if not exists dlv_complaints_tanggal_idx on public.dlv_complaints (tanggal, id);
create index if not exists dlv_costs_bulan_idx        on public.dlv_costs (bulan, id);

commit;

-- Supaya statistik tabel segar setelah sync besar (jalankan terpisah, boleh kapan saja):
-- analyze public.dlv_sla; analyze public.dlv_complaints; analyze public.dlv_costs;
