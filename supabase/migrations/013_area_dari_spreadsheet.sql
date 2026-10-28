-- =====================================================================
-- 013_area_dari_spreadsheet.sql
-- Area & branch diambil dari SPREADSHEET, bukan dari akun aplikasi.
--   - SLA & Complaint tidak punya kolom area/branch → diambil dari sheet Cost:
--       1) baris Cost nama yang sama di bulan yang sama
--       2) kalau tidak ada: baris Cost terbaru untuk nama itu
--   - Korlap melihat semua baris yang area spreadsheet-nya = area yang ia pegang
--     (nama terdaftar atau tidak).
-- Jalankan SETELAH 001–012. Jalankan SEKALI saja.
-- =====================================================================
begin;

alter table public.dlv_sla        add column if not exists area_nama text, add column if not exists branch_nama text;
alter table public.dlv_complaints add column if not exists area_nama text, add column if not exists branch_nama text;

-- Normalisasi nama: huruf kecil, spasi rapi
create or replace function public.norm_nama(p text) returns text
language sql immutable as $$ select lower(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g')) $$;

create index if not exists dlv_costs_nama_idx on public.dlv_costs (public.norm_nama(nama), bulan);

-- Isi area/branch SLA & Complaint dari sheet Cost untuk rentang tanggal tertentu
create or replace function public.dlv_isi_area(p_dari date, p_sampai date) returns void
language plpgsql security definer set search_path = public as $$
begin
  update dlv_sla s set area_nama = x.area, branch_nama = x.branch
  from (
    select s2.id, coalesce(sm.area, ak.area) as area, coalesce(sm.branch, ak.branch) as branch
      from dlv_sla s2
      left join lateral (select c.area, c.branch from dlv_costs c
                          where norm_nama(c.nama) = norm_nama(s2.nama_kurir) and c.bulan = date_trunc('month', s2.tanggal)::date
                            and coalesce(btrim(c.area), '') <> '' order by c.batch desc limit 1) sm on true
      left join lateral (select c.area, c.branch from dlv_costs c
                          where norm_nama(c.nama) = norm_nama(s2.nama_kurir) and coalesce(btrim(c.area), '') <> ''
                          order by c.bulan desc, c.batch desc limit 1) ak on sm.area is null
     where s2.tanggal between p_dari and p_sampai
  ) x
  where s.id = x.id and (s.area_nama is distinct from x.area or s.branch_nama is distinct from x.branch);

  update dlv_complaints s set area_nama = x.area, branch_nama = x.branch
  from (
    select s2.id, coalesce(sm.area, ak.area) as area, coalesce(sm.branch, ak.branch) as branch
      from dlv_complaints s2
      left join lateral (select c.area, c.branch from dlv_costs c
                          where norm_nama(c.nama) = norm_nama(s2.nama_kurir) and c.bulan = date_trunc('month', s2.tanggal)::date
                            and coalesce(btrim(c.area), '') <> '' order by c.batch desc limit 1) sm on true
      left join lateral (select c.area, c.branch from dlv_costs c
                          where norm_nama(c.nama) = norm_nama(s2.nama_kurir) and coalesce(btrim(c.area), '') <> ''
                          order by c.bulan desc, c.batch desc limit 1) ak on sm.area is null
     where s2.tanggal between p_dari and p_sampai and s2.nama_kurir is not null
  ) x
  where s.id = x.id and (s.area_nama is distinct from x.area or s.branch_nama is distinct from x.branch);
end $$;
revoke execute on function public.dlv_isi_area(date, date) from public, anon, authenticated;
grant  execute on function public.dlv_isi_area(date, date) to service_role;

-- sync_terapkan: setelah menerapkan, isi ulang area/branch untuk rentang yang terdampak
create or replace function public.sync_terapkan(p_sync bigint, p_sumber text, p_dari date, p_sampai date, p_total int)
returns int language plpgsql security definer set search_path = public as $$
declare v int := 0;
begin
  if coalesce(p_total, 0) = 0 then
    update sync_log set status = 'gagal', selesai = now(),
           pesan = '0 baris terbaca dari spreadsheet. Data lama TIDAK dihapus. Periksa ID spreadsheet, nama tab, dan baris judul kolom.'
     where id = p_sync;
    return 0;
  end if;
  if p_sumber = 'SLA' then
    delete from dlv_sla where tanggal between p_dari and p_sampai and sync_id is distinct from p_sync;
  elsif p_sumber = 'Complaint' then
    delete from dlv_complaints where tanggal between p_dari and p_sampai and sync_id is distinct from p_sync;
  elsif p_sumber = 'Cost' then
    delete from dlv_costs where bulan between p_dari and p_sampai and sync_id is distinct from p_sync;
  else
    raise exception 'Sumber % tidak dikenal.', p_sumber;
  end if;
  get diagnostics v = row_count;
  -- Cost berubah → area SLA & complaint di bulan-bulan itu dihitung ulang
  if p_sumber = 'Cost' then
    perform dlv_isi_area(p_dari, (p_sampai + interval '1 month' - interval '1 day')::date);
  else
    perform dlv_isi_area(p_dari, p_sampai);
  end if;
  update sync_log set status = 'sukses', selesai = now(),
         pesan = case when v > 0 then v || ' baris lama dihapus karena sudah tidak ada di spreadsheet.' else null end
   where id = p_sync;
  return v;
end $$;
revoke execute on function public.sync_terapkan(bigint, text, date, date, int) from public, anon, authenticated;
grant  execute on function public.sync_terapkan(bigint, text, date, date, int) to service_role;

-- Kunci "branch|area" milik korlap yang login (untuk mencocokkan area spreadsheet)
create or replace function public.dlv_area_kunci_saya() returns setof text
language sql stable security definer set search_path = public as $$
  select norm_nama(b.nama) || '|' || norm_nama(a.nama)
    from dlv_area_korlap k
    join dlv_areas a on a.id = k.area_id
    join dlv_branches b on b.id = a.branch_id
    join profiles me on me.id = k.korlap_id and me.aktif
   where k.korlap_id = auth.uid() and k.selesai is null;
$$;
revoke execute on function public.dlv_area_kunci_saya() from public, anon;
grant  execute on function public.dlv_area_kunci_saya() to authenticated, service_role;

-- Policy baca: staf semua · pemilik data · korlap (akun ATAU area spreadsheet)
drop policy if exists "baca: sesuai hak" on public.dlv_sla;
create policy "baca: sesuai hak" on public.dlv_sla for select to authenticated
  using ((select public.dlv_staf_semua()) or profile_id = (select auth.uid())
         or profile_id in (select public.dlv_kurir_korlap_saya())
         or (norm_nama(branch_nama) || '|' || norm_nama(area_nama)) in (select public.dlv_area_kunci_saya()));

drop policy if exists "baca: sesuai hak" on public.dlv_complaints;
create policy "baca: sesuai hak" on public.dlv_complaints for select to authenticated
  using ((select public.dlv_staf_semua()) or profile_id = (select auth.uid())
         or profile_id in (select public.dlv_kurir_korlap_saya())
         or (norm_nama(branch_nama) || '|' || norm_nama(area_nama)) in (select public.dlv_area_kunci_saya()));

drop policy if exists "baca: sesuai hak" on public.dlv_costs;
create policy "baca: sesuai hak" on public.dlv_costs for select to authenticated
  using ((select public.dlv_staf_semua()) or profile_id = (select auth.uid())
         or profile_id in (select public.dlv_kurir_korlap_saya())
         or (norm_nama(branch) || '|' || norm_nama(area)) in (select public.dlv_area_kunci_saya()));

commit;

-- Isi area untuk SEMUA data yang sudah ada (jalankan terpisah setelah commit; bisa ±1 menit):
-- select public.dlv_isi_area('2000-01-01', '2100-12-31');
