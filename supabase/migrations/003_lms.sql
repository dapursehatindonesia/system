-- =====================================================================
-- 003_lms.sql
-- Tabel LMS (Training), identik dengan project lama (Web Training)
-- supaya data bisa dipindah apa adanya lewat CSV.
-- Jalankan SETELAH 001 dan 002. Jalankan SEKALI saja.
--
-- Perbedaan dengan project lama (perbaikan):
-- 1. Policy berlaku untuk 'anon' DAN 'authenticated'. Setelah portal login
--    jadi, pengguna LMS sudah login (role authenticated). Di project lama
--    policy hanya untuk 'anon', sehingga LMS akan gagal menyimpan begitu
--    pengguna login.
-- 2. Batas panjang teks & nilai, supaya form publik tidak bisa diisi data
--    berukuran raksasa.
-- Nama tabel tetap sama agar script.js LMS tidak perlu diubah selain URL & key.
-- =====================================================================
begin;

create table public.refreshment_results (
  id               uuid primary key default gen_random_uuid(),
  name             text check (length(name) <= 200),
  role             text check (length(role) <= 50),
  color_code       text check (length(color_code) <= 50),
  refreshment_date date not null,
  score            integer check (score >= 0),
  total_question   integer check (total_question >= 0),
  created_at       timestamptz default now()
);

create table public.questions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) <= 200),
  role       text check (length(role) <= 50),
  question   text check (length(question) <= 5000),
  status     text check (length(status) <= 50),
  created_at timestamptz default now()
);

create table public.answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  answer      text check (length(answer) <= 10000),
  answered_by text check (length(answered_by) <= 200),
  created_at  timestamptz default now()
);
create index answers_question_id_idx on public.answers (question_id);

alter table public.refreshment_results enable row level security;
alter table public.questions           enable row level security;
alter table public.answers             enable row level security;

-- Sama dengan project lama, ditambah role authenticated:
-- - Hasil refreshment: boleh DIKIRIM, tidak bisa dibaca publik (nilai orang lain tetap privat)
-- - Pertanyaan: boleh dikirim & dibaca
-- - Jawaban: hanya dibaca (jawaban diisi trainer lewat dashboard/aplikasi admin)
create policy "kirim hasil refreshment" on public.refreshment_results for insert to anon, authenticated with check (true);
create policy "kirim pertanyaan"        on public.questions           for insert to anon, authenticated with check (true);
create policy "baca pertanyaan"         on public.questions           for select to anon, authenticated using (true);
create policy "baca jawaban"            on public.answers             for select to anon, authenticated using (true);

-- Admin pusat (pemegang akses Backoffice) boleh mengelola semua data LMS dari aplikasi
create policy "kelola: admin pusat" on public.refreshment_results for all to authenticated using (public.admin_pusat()) with check (public.admin_pusat());
create policy "kelola: admin pusat" on public.questions           for all to authenticated using (public.admin_pusat()) with check (public.admin_pusat());
create policy "kelola: admin pusat" on public.answers             for all to authenticated using (public.admin_pusat()) with check (public.admin_pusat());

grant select, insert on public.refreshment_results, public.questions, public.answers to anon;
grant select, insert, update, delete on public.refreshment_results, public.questions, public.answers to authenticated;

commit;

-- Setelah import CSV, cek jumlah baris (harus sama dengan project lama):
-- select 'refreshment_results' t, count(*) from refreshment_results union all
-- select 'questions', count(*) from questions union all
-- select 'answers', count(*) from answers;
