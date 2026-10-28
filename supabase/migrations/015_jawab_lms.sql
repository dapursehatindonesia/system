-- =====================================================================
-- 015_jawab_lms.sql
-- Semua pengguna Management Delivery (Admin, Manajer, HRD, Korlap) bisa
-- menjawab pertanyaan LMS (Ask Trainer) dan mengubah statusnya.
-- Jalankan SETELAH 001–014. Jalankan SEKALI saja.
-- =====================================================================
begin;

drop policy if exists "ubah status: staf dlv"  on public.questions;
drop policy if exists "jawab: staf dlv"        on public.answers;
drop policy if exists "ubah jawaban: staf dlv" on public.answers;

create policy "ubah status: management" on public.questions for update to authenticated
  using ((select public.dlv_lihat_performa())) with check ((select public.dlv_lihat_performa()));
create policy "jawab: management" on public.answers for insert to authenticated
  with check ((select public.dlv_lihat_performa()));
create policy "ubah jawaban: management" on public.answers for update to authenticated
  using ((select public.dlv_lihat_performa())) with check ((select public.dlv_lihat_performa()));
create policy "hapus jawaban: management" on public.answers for delete to authenticated
  using ((select public.dlv_lihat_performa()));

-- Pengguna Management juga perlu bisa membaca pertanyaan walau tidak punya akses Training
create policy "baca pertanyaan: management" on public.questions for select to authenticated
  using ((select public.dlv_lihat_performa()));
create policy "baca jawaban: management" on public.answers for select to authenticated
  using ((select public.dlv_lihat_performa()));

commit;
