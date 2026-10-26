-- =====================================================================
-- 004_backoffice.sql
-- Pendukung Backoffice:
--   1. audit_log  : riwayat siapa mengubah apa
--   2. simpan_matriks() : simpan matriks akses 1 divisi sekaligus (atomik)
--   3. simpan_jabatan() : tambah/ubah jabatan + divisinya sekaligus (atomik)
--   4. izin fungsi akses untuk Edge Function (service_role)
-- Jalankan SETELAH 001–003. Jalankan SEKALI saja.
-- =====================================================================
begin;

-- ---------- Riwayat aktivitas ----------
create table public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles(id) on delete set null,
  aksi         text not null,
  target_tabel text,
  target_id    text,
  detail       jsonb,
  created_at   timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
alter table public.audit_log enable row level security;
-- Hanya bisa dibaca admin pusat. Ditulis oleh fungsi di bawah & Edge Function (bukan dari browser).
create policy "baca: admin pusat" on public.audit_log for select to authenticated using (public.admin_pusat());
grant select on public.audit_log to authenticated;

-- Edge Function memakai role service_role dan perlu memanggil fungsi akses
grant execute on function public.boleh_akses(uuid, text), public.admin_pusat() to service_role;

-- ---------- Simpan matriks akses satu divisi ----------
-- p_akses   : [{"position_id":"kurir","app_id":"dlv-kurir"}, ...]
-- p_landing : [{"position_id":"kurir","app_id":"dlv-kurir"}, ...]
create or replace function public.simpan_matriks(p_divisi text, p_akses jsonb, p_landing jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_pusat() then
    raise exception 'Hanya admin pusat yang boleh mengubah matriks akses.';
  end if;
  delete from role_app_access where division_id = p_divisi;
  insert into role_app_access (division_id, position_id, app_id)
    select p_divisi, x->>'position_id', x->>'app_id' from jsonb_array_elements(p_akses) x;
  delete from role_landing where division_id = p_divisi;
  insert into role_landing (division_id, position_id, app_id)
    select p_divisi, x->>'position_id', x->>'app_id' from jsonb_array_elements(p_landing) x
    where exists (select 1 from role_app_access r
                  where r.division_id = p_divisi and r.position_id = x->>'position_id' and r.app_id = x->>'app_id');
  insert into audit_log (actor_id, aksi, target_tabel, target_id, detail)
    values (auth.uid(), 'simpan_matriks', 'role_app_access', p_divisi, jsonb_build_object('akses', p_akses, 'landing', p_landing));
end $$;

-- ---------- Tambah / ubah jabatan ----------
-- p_id null = jabatan baru (id dibuat dari nama). Mengembalikan id jabatan.
create or replace function public.simpan_jabatan(p_id text, p_nama text, p_cakupan text, p_divisi text[])
returns text language plpgsql security definer set search_path = public as $$
declare
  v_id text := nullif(btrim(coalesce(p_id, '')), '');
  v_n  int;
begin
  if not public.admin_pusat() then raise exception 'Hanya admin pusat yang boleh mengubah jabatan.'; end if;
  if coalesce(btrim(p_nama), '') = '' then raise exception 'Nama jabatan wajib diisi.'; end if;
  if p_cakupan not in ('divisi', 'semua') then raise exception 'Cakupan tidak valid.'; end if;
  if p_cakupan = 'divisi' and coalesce(array_length(p_divisi, 1), 0) = 0 then
    raise exception 'Pilih minimal satu divisi yang memakai jabatan ini.';
  end if;

  if v_id is null then
    v_id := trim(both '_' from lower(regexp_replace(btrim(p_nama), '[^a-zA-Z0-9]+', '_', 'g')));
    if v_id = '' then raise exception 'Nama jabatan harus mengandung huruf atau angka.'; end if;
    insert into positions (id, nama, cakupan) values (v_id, btrim(p_nama), p_cakupan);
  else
    if p_cakupan = 'divisi' then
      select count(*) into v_n from profiles
        where position_id = v_id and (division_id is null or not (division_id = any(p_divisi)));
      if v_n > 0 then
        raise exception '% akun masih memakai jabatan ini di divisi yang tidak dicentang (atau tanpa divisi). Pindahkan akunnya dulu.', v_n;
      end if;
    end if;
    update positions set nama = btrim(p_nama), cakupan = p_cakupan where id = v_id;
    if not found then raise exception 'Jabatan % tidak ditemukan.', v_id; end if;
  end if;

  delete from position_divisions where position_id = v_id;
  if p_cakupan = 'divisi' then
    insert into position_divisions (position_id, division_id) select v_id, unnest(p_divisi);
    delete from role_app_access where position_id = v_id and not (division_id = any(p_divisi));
    delete from role_landing    where position_id = v_id and not (division_id = any(p_divisi));
  else
    delete from role_app_access where position_id = v_id;
    delete from role_landing    where position_id = v_id;
  end if;

  insert into audit_log (actor_id, aksi, target_tabel, target_id, detail)
    values (auth.uid(), 'simpan_jabatan', 'positions', v_id,
            jsonb_build_object('nama', p_nama, 'cakupan', p_cakupan, 'divisi', p_divisi));
  return v_id;
end $$;

revoke execute on function public.simpan_matriks(text, jsonb, jsonb), public.simpan_jabatan(text, text, text, text[]) from public, anon;
grant  execute on function public.simpan_matriks(text, jsonb, jsonb), public.simpan_jabatan(text, text, text, text[]) to authenticated;

commit;
