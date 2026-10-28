-- =====================================================================
-- 007_lms_login.sql
-- LMS sekarang WAJIB login lewat portal:
--   - Hasil refreshment & pertanyaan tercatat dengan ID orangnya (profile_id).
--   - Akses publik (anon) ditutup.
--   - Hasil refreshment: dilihat pemiliknya, korlap areanya, dan staf Delivery.
--   - Pertanyaan & jawaban: dilihat semua yang punya akses Training.
--   - Staf Delivery (Admin/Manajer/HRD) bisa menjawab & mengubah status pertanyaan.
-- Jalankan SETELAH 001–006, dan SETELAH data LMS lama di-import (boleh juga sebelum).
-- =====================================================================
begin;

alter table public.refreshment_results
  add column profile_id uuid default auth.uid() references public.profiles(id) on delete set null;
alter table public.questions
  add column profile_id uuid default auth.uid() references public.profiles(id) on delete set null;
create index refreshment_results_profile_idx on public.refreshment_results (profile_id, refreshment_date);
create index questions_profile_idx on public.questions (profile_id);

-- Tutup akses publik
drop policy if exists "kirim hasil refreshment" on public.refreshment_results;
drop policy if exists "kirim pertanyaan"        on public.questions;
drop policy if exists "baca pertanyaan"         on public.questions;
drop policy if exists "baca jawaban"            on public.answers;
revoke select, insert on public.refreshment_results, public.questions, public.answers from anon;

-- Hasil refreshment
create policy "kirim hasil: diri sendiri" on public.refreshment_results for insert to authenticated
  with check (profile_id = auth.uid() and public.boleh_akses(auth.uid(), 'dlv-train'));
create policy "baca hasil: sesuai hak" on public.refreshment_results for select to authenticated
  using (public.dlv_orang_boleh(profile_id));

-- Pertanyaan
create policy "kirim pertanyaan: diri sendiri" on public.questions for insert to authenticated
  with check (profile_id = auth.uid() and public.boleh_akses(auth.uid(), 'dlv-train'));
create policy "baca pertanyaan: pengguna training" on public.questions for select to authenticated
  using (public.boleh_akses(auth.uid(), 'dlv-train'));
create policy "ubah status: staf dlv" on public.questions for update to authenticated
  using (public.dlv_staf_semua()) with check (public.dlv_staf_semua());

-- Jawaban
create policy "baca jawaban: pengguna training" on public.answers for select to authenticated
  using (public.boleh_akses(auth.uid(), 'dlv-train'));
create policy "jawab: staf dlv" on public.answers for insert to authenticated
  with check (public.dlv_staf_semua());
create policy "ubah jawaban: staf dlv" on public.answers for update to authenticated
  using (public.dlv_staf_semua()) with check (public.dlv_staf_semua());

commit;
