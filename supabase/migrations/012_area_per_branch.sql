-- =====================================================================
-- 012_area_per_branch.sql
-- Nama area cukup unik DI DALAM satu branch.
-- Contoh yang sekarang boleh: "B2B" di CK Kapuk dan "B2B" di CK Pamulang.
-- Jalankan SETELAH 001–011. Jalankan SEKALI saja.
-- =====================================================================
begin;

alter table public.dlv_areas drop constraint if exists dlv_areas_nama_key;
create unique index if not exists dlv_areas_branch_nama_unik
  on public.dlv_areas (branch_id, lower(btrim(nama)));

commit;
