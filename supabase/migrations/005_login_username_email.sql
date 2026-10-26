-- =====================================================================
-- 005_login_username_email.sql
-- Login bisa pakai USERNAME atau EMAIL.
-- Cara kerja:
--   - Email login di Supabase Auth SELALU "<username>@healthygo.local".
--   - Email asli (opsional) disimpan di profiles.email.
--   - Kalau user mengetik email, portal memanggil login_id() untuk mencari
--     username pemilik email itu, lalu login dengan username tersebut.
-- Jalankan SETELAH 001–004. Jalankan SEKALI saja.
-- =====================================================================
begin;

-- 1. Kolom email asli di profil (opsional, unik)
alter table public.profiles add column email text
  check (email is null or email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$');
create unique index profiles_email_unik on public.profiles (lower(email)) where email is not null;

-- 2. Pindahkan akun yang terlanjur dibuat dengan email asli (mis. admindatahg@gmail.com):
--    email asli disalin ke profil, email login diganti menjadi email internal.
update public.profiles p
   set email = lower(u.email)
  from auth.users u
 where u.id = p.id and u.email not like '%@healthygo.local';

update auth.users u
   set email = p.username || '@healthygo.local',
       email_confirmed_at = coalesce(u.email_confirmed_at, now()),
       updated_at = now()
  from public.profiles p
 where p.id = u.id and u.email not like '%@healthygo.local';

update auth.identities i
   set identity_data = i.identity_data || jsonb_build_object('email', p.username || '@healthygo.local'),
       updated_at = now()
  from public.profiles p
 where p.id = i.user_id and i.provider = 'email'
   and coalesce(i.identity_data->>'email', '') <> p.username || '@healthygo.local';

-- 3. Cari username dari input login (username atau email).
--    Dipanggil SEBELUM login, jadi boleh dipanggil tanpa login (anon).
--    Hanya mengembalikan username (bukan data lain), dan hanya untuk akun aktif.
create or replace function public.login_id(p_input text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when position('@' in lower(btrim(p_input))) > 0
      then (select username from profiles where lower(email) = lower(btrim(p_input)) and aktif limit 1)
    else lower(btrim(p_input))
  end;
$$;
revoke execute on function public.login_id(text) from public;
grant  execute on function public.login_id(text) to anon, authenticated;

commit;

-- Cek hasil:
-- select p.username, p.email, u.email as email_login
-- from profiles p join auth.users u on u.id = p.id;
-- Semua email_login harus berakhiran @healthygo.local
