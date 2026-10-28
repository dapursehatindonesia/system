-- =====================================================================
-- 008_lms_ai_kuota.sql
-- Batas pemakaian Chat AI Training per orang per hari, supaya kuota
-- Gemini tidak habis karena dipakai berlebihan.
-- Jalankan SETELAH 001–007. Jalankan SEKALI saja.
-- =====================================================================
begin;

create table public.lms_ai_usage (
  id         bigint generated always as identity primary key,
  profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index lms_ai_usage_profile_idx on public.lms_ai_usage (profile_id, created_at);
alter table public.lms_ai_usage enable row level security;
-- Tidak ada policy: tabel ini hanya diisi lewat fungsi di bawah.

-- Catat 1 pemakaian lalu kembalikan jumlah pemakaian hari ini (WIB).
-- Kalau sudah melewati batas, pemakaian tidak dicatat dan fungsi mengembalikan -1.
create or replace function public.lms_ai_pakai(p_batas int default 60) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if auth.uid() is null then raise exception 'Belum login.'; end if;
  select count(*) into v_n from lms_ai_usage
   where profile_id = auth.uid()
     and created_at >= (public.hari_ini()::timestamp at time zone 'Asia/Jakarta');
  if v_n >= p_batas then return -1; end if;
  insert into lms_ai_usage (profile_id) values (auth.uid());
  return v_n + 1;
end $$;
revoke execute on function public.lms_ai_pakai(int) from public, anon;
grant  execute on function public.lms_ai_pakai(int) to authenticated;

commit;
