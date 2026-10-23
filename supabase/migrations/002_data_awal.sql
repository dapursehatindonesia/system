-- =====================================================================
-- 002_data_awal.sql
-- Data awal: divisi Delivery, jabatan, aplikasi, matriks akses.
-- Jalankan SETELAH 001_inti.sql berhasil. Jalankan SEKALI saja.
-- Divisi lain (Kitchen, Warehouse, dst.) nanti ditambah lewat Backoffice.
-- =====================================================================
begin;

insert into public.divisions (id, nama) values
  ('DLV', 'Delivery');

insert into public.positions (id, nama, cakupan, urutan) values
  ('kurir',      'Kurir',           'divisi', 10),
  ('korlap',     'Korlap',          'divisi', 20),
  ('admin',      'Admin',           'divisi', 30),
  ('hrd',        'HRD',             'divisi', 40),
  ('manajer',    'Manajer',         'divisi', 50),
  ('gm',         'General Manager', 'semua',  90),
  ('superadmin', 'Super Admin',     'semua',  99);

insert into public.position_divisions (position_id, division_id) values
  ('kurir', 'DLV'), ('korlap', 'DLV'), ('admin', 'DLV'), ('hrd', 'DLV'), ('manajer', 'DLV');

insert into public.apps (id, nama, division_id, url, urutan) values
  ('dlv-kurir',  'Kurir',      'DLV', '/delivery/kurir',      10),
  ('dlv-mgmt',   'Management', 'DLV', '/delivery/management', 20),
  ('dlv-train',  'Training',   'DLV', '/delivery/training',   30),
  ('backoffice', 'Backoffice', null,  '/backoffice',          90);

-- Matriks akses Delivery (sama dengan prototype)
insert into public.role_app_access (division_id, position_id, app_id) values
  ('DLV', 'kurir',   'dlv-kurir'), ('DLV', 'kurir',   'dlv-train'),
  ('DLV', 'korlap',  'dlv-mgmt'),  ('DLV', 'korlap',  'dlv-train'),
  ('DLV', 'admin',   'dlv-mgmt'),  ('DLV', 'admin',   'dlv-train'),
  ('DLV', 'hrd',     'dlv-mgmt'),
  ('DLV', 'manajer', 'dlv-mgmt'),  ('DLV', 'manajer', 'dlv-train');

-- Aplikasi utama setelah login
insert into public.role_landing (division_id, position_id, app_id) values
  ('DLV', 'kurir',   'dlv-kurir'),
  ('DLV', 'korlap',  'dlv-mgmt'),
  ('DLV', 'admin',   'dlv-mgmt'),
  ('DLV', 'hrd',     'dlv-mgmt'),
  ('DLV', 'manajer', 'dlv-mgmt');

commit;

-- Cek hasil (jalankan terpisah kalau mau):
-- select 'divisi' t, count(*) from divisions union all
-- select 'jabatan', count(*) from positions union all
-- select 'aplikasi', count(*) from apps union all
-- select 'matriks', count(*) from role_app_access;
-- Hasil yang benar: divisi 1, jabatan 7, aplikasi 4, matriks 9
