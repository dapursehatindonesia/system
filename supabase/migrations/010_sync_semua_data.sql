-- =====================================================================
-- 010_sync_semua_data.sql
-- Semua baris spreadsheet ikut tersimpan:
--   - Batch berupa TEKS di SLA, Complaint, Cost (mis. "39", "01", "Payroll 01. Jan-26")
--   - Mode SLA bebas (HG, BK, GT, dan mode baru lainnya)
--   - Complaint tanpa nama kurir tetap tersimpan
-- Jalankan SETELAH 001–009. Jalankan SEKALI saja.
-- =====================================================================
begin;

alter table public.dlv_sla        drop constraint if exists dlv_sla_mode_check;
alter table public.dlv_sla        add  constraint dlv_sla_mode_isi check (length(btrim(mode)) between 1 and 20);
alter table public.dlv_sla        alter column batch type text using batch::text;
alter table public.dlv_complaints alter column batch type text using batch::text;
alter table public.dlv_complaints alter column nama_kurir drop not null;
alter table public.dlv_costs      alter column batch type text using batch::text;

commit;
