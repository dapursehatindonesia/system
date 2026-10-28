-- =====================================================================
-- 009_sync.sql
-- Pendukung sinkronisasi spreadsheet (SLA, Complaint, Cost).
--   - Setiap baris mencatat sync_id terakhir yang menulisnya.
--   - Setelah semua batch masuk, sync_terapkan() menghapus baris di rentang
--     yang sama yang TIDAK ada lagi di spreadsheet (sudah dihapus/diedit di sheet).
--   - Pengaman: kalau 0 baris terbaca, tidak ada yang dihapus & log ditandai gagal.
-- Fungsi di sini hanya bisa dipanggil Edge Function (service_role), bukan dari browser.
-- Jalankan SETELAH 001–008. Jalankan SEKALI saja.
-- =====================================================================
begin;

alter table public.dlv_sla        add column sync_id bigint references public.sync_log(id) on delete set null;
alter table public.dlv_complaints add column sync_id bigint references public.sync_log(id) on delete set null;
alter table public.dlv_costs      add column sync_id bigint references public.sync_log(id) on delete set null;
alter table public.sync_log       add column dari date, add column sampai date, add column mode text;
create index sync_log_mulai_idx on public.sync_log (mulai desc);
create index sync_unmatched_sync_idx on public.sync_unmatched (sync_id);

-- Tambah hitungan baris masuk/gagal (dipanggil per batch)
create or replace function public.sync_tambah(p_sync bigint, p_masuk int, p_gagal int) returns void
language sql security definer set search_path = public as $$
  update sync_log set baris_masuk = coalesce(baris_masuk, 0) + p_masuk,
                      baris_gagal = coalesce(baris_gagal, 0) + p_gagal
   where id = p_sync;
$$;

-- Terapkan hasil sync: hapus baris lama di rentang yang tidak ikut sync ini
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
  update sync_log set status = 'sukses', selesai = now(),
         pesan = case when v > 0 then v || ' baris lama dihapus karena sudah tidak ada di spreadsheet.' else null end
   where id = p_sync;
  return v;
end $$;

revoke execute on function public.sync_tambah(bigint, int, int), public.sync_terapkan(bigint, text, date, date, int) from public, anon, authenticated;
grant  execute on function public.sync_tambah(bigint, int, int), public.sync_terapkan(bigint, text, date, date, int) to service_role;

commit;
