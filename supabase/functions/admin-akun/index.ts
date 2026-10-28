// =====================================================================
// Edge Function: admin-akun
// Membuat / mengubah / menonaktifkan akun dan reset password.
// Berjalan di server Supabase, satu-satunya tempat yang memegang secret key.
//
// Siapa yang boleh:
//   - Admin pusat (punya akses Backoffice): semua akun
//   - Admin divisi (jabatan 'admin'): hanya akun KURIR di divisinya sendiri
//
// Dipanggil dari browser:
//   sb.functions.invoke('admin-akun', { body: { action: 'create', ... } })
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOGIN_DOMAIN = 'healthygo.local';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// Pakai secret key baru (sb_secret_...) kalau diisi sebagai HG_SECRET_KEY, kalau tidak pakai service role bawaan.
const SECRET = Deno.env.get('HG_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const admin = createClient(SUPABASE_URL, SECRET ?? '', { auth: { persistSession: false, autoRefreshToken: false } });

class Fail extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const USERNAME = /^[a-z0-9._-]{4,40}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normName = (s: unknown) => String(s ?? '').trim().replace(/\s+/g, ' ');

type Profile = { id: string; nama: string; username: string; division_id: string | null; position_id: string; aktif: boolean; email?: string | null };

function tempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const a = new Uint32Array(10);
  crypto.getRandomValues(a);
  return 'Hg-' + Array.from(a, (x) => chars[x % chars.length]).join('');
}

/** Ubah error database menjadi pesan yang dimengerti admin. */
function dbErr(e: { message?: string } | null): Fail {
  const m = e?.message ?? String(e);
  if (m.includes('profiles_nama_unik')) return new Fail(409, 'Nama sudah dipakai orang lain. Nama harus unik karena dipakai untuk mencocokkan data spreadsheet.');
  if (m.includes('profiles_username_key')) return new Fail(409, 'Username sudah dipakai.');
  if (m.includes('profiles_email_unik')) return new Fail(409, 'Email sudah dipakai akun lain.');
  if (m.includes('profiles_email_check')) return new Fail(400, 'Format email tidak valid.');
  if (m.includes('tidak dipakai di divisi')) return new Fail(400, m.slice(m.indexOf('Jabatan')));
  if (m.includes('profiles_position_id_fkey')) return new Fail(400, 'Jabatan tidak dikenal.');
  if (m.includes('profiles_division_id_fkey')) return new Fail(400, 'Divisi tidak dikenal.');
  return new Fail(500, m);
}

async function loadProfile(id: string): Promise<Profile | null> {
  const { data, error } = await admin.from('profiles')
    .select('id, nama, username, division_id, position_id, aktif, email').eq('id', id).maybeSingle();
  if (error) throw dbErr(error);
  return data;
}

async function isPusat(uid: string) {
  const { data, error } = await admin.rpc('boleh_akses', { p_user: uid, p_app: 'backoffice' });
  if (error) throw dbErr(error);
  return data === true;
}

async function authorize(caller: Profile, target: { division_id: string | null; position_id: string }) {
  if (await isPusat(caller.id)) return;
  const adminDivisi = caller.position_id === 'admin' && caller.division_id;
  if (adminDivisi && target.division_id === caller.division_id && target.position_id === 'kurir') return;
  throw new Fail(403, 'Anda tidak punya izin mengelola akun ini. Admin divisi hanya bisa mengelola akun kurir di divisinya.');
}

async function ensureOtherSuperadmin(exceptId: string) {
  const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true })
    .eq('position_id', 'superadmin').eq('aktif', true).neq('id', exceptId);
  if (error) throw dbErr(error);
  if (!count) throw new Fail(400, 'Minimal harus ada satu Super Admin aktif lainnya.');
}

async function audit(actor: string, aksi: string, targetId: string, detail: Record<string, unknown>) {
  await admin.from('audit_log').insert({ actor_id: actor, aksi, target_tabel: 'profiles', target_id: targetId, detail });
}

// ---------- Aksi ----------
async function create(caller: Profile, b: Record<string, unknown>) {
  const nama = normName(b.nama);
  const username = String(b.username ?? '').trim().toLowerCase();
  const position_id = String(b.position_id ?? '');
  const division_id = b.division_id ? String(b.division_id) : null;
  if (!nama) throw new Fail(400, 'Nama wajib diisi.');
  if (!USERNAME.test(username)) throw new Fail(400, 'Username 4–40 karakter: huruf kecil, angka, titik, garis bawah, atau strip.');
  if (!position_id) throw new Fail(400, 'Pilih jabatan.');
  await authorize(caller, { division_id, position_id });

  // Email login selalu internal; email asli (opsional) disimpan di profil untuk login alternatif.
  const email = `${username}@${LOGIN_DOMAIN}`;
  const realEmail = b.email ? String(b.email).trim().toLowerCase() : null;
  if (realEmail && !EMAIL.test(realEmail)) throw new Fail(400, 'Format email tidak valid.');
  const custom = typeof b.password === 'string' && b.password.length > 0;
  if (custom && (b.password as string).length < 8) throw new Fail(400, 'Password minimal 8 karakter.');
  const password = custom ? (b.password as string) : tempPassword();

  const { data: created, error: ae } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nama, username },
  });
  if (ae || !created?.user) {
    if (/already|registered|exists/i.test(ae?.message ?? '')) throw new Fail(409, 'Username atau email sudah dipakai akun lain.');
    throw new Fail(500, 'Gagal membuat akun login: ' + (ae?.message ?? 'tidak diketahui'));
  }
  const { error: pe } = await admin.from('profiles').insert({
    id: created.user.id, nama, username, division_id, position_id, kontrak: b.kontrak || null, email: realEmail,
  });
  if (pe) {
    await admin.auth.admin.deleteUser(created.user.id); // batalkan supaya tidak ada akun tanpa profil
    throw dbErr(pe);
  }
  await audit(caller.id, 'buat_akun', created.user.id, { nama, username, division_id, position_id });
  return { id: created.user.id, username, email: realEmail, password_sementara: custom ? null : password };
}

async function update(caller: Profile, b: Record<string, unknown>) {
  const t = await loadProfile(String(b.id ?? ''));
  if (!t) throw new Fail(404, 'Akun tidak ditemukan.');
  await authorize(caller, t);
  const next = {
    nama: b.nama !== undefined ? normName(b.nama) : t.nama,
    username: b.username !== undefined ? String(b.username).trim().toLowerCase() : t.username,
    division_id: b.division_id !== undefined ? (b.division_id ? String(b.division_id) : null) : t.division_id,
    position_id: b.position_id !== undefined ? String(b.position_id) : t.position_id,
  };
  await authorize(caller, next);
  if (!next.nama) throw new Fail(400, 'Nama wajib diisi.');
  if (!USERNAME.test(next.username)) throw new Fail(400, 'Username 4–40 karakter: huruf kecil, angka, titik, garis bawah, atau strip.');
  if (t.id === caller.id && next.position_id !== t.position_id) throw new Fail(400, 'Anda tidak bisa mengubah jabatan akun Anda sendiri.');
  if (t.position_id === 'superadmin' && next.position_id !== 'superadmin') await ensureOtherSuperadmin(t.id);

  const row: Record<string, unknown> = { ...next };
  if (b.kontrak !== undefined) row.kontrak = b.kontrak || null;
  if (b.email !== undefined) {
    const e = b.email ? String(b.email).trim().toLowerCase() : null;
    if (e && !EMAIL.test(e)) throw new Fail(400, 'Format email tidak valid.');
    row.email = e;
  }
  const { error } = await admin.from('profiles').update(row).eq('id', t.id);
  if (error) throw dbErr(error);

  // Username berubah → email internal login ikut berubah (email asli tidak disentuh)
  if (next.username !== t.username) {
    const { error: ee } = await admin.auth.admin.updateUserById(t.id, { email: `${next.username}@${LOGIN_DOMAIN}`, email_confirm: true });
    if (ee) {
      await admin.from('profiles').update({ username: t.username }).eq('id', t.id);
      throw new Fail(409, 'Username tidak bisa dipakai: ' + ee.message);
    }
  }
  await audit(caller.id, 'ubah_akun', t.id, { sebelum: t, sesudah: row });
  return { ok: true };
}

async function setAktif(caller: Profile, b: Record<string, unknown>) {
  const t = await loadProfile(String(b.id ?? ''));
  if (!t) throw new Fail(404, 'Akun tidak ditemukan.');
  await authorize(caller, t);
  const aktif = b.aktif === true;
  if (t.id === caller.id) throw new Fail(400, 'Anda tidak bisa menonaktifkan akun Anda sendiri.');
  if (!aktif && t.position_id === 'superadmin') await ensureOtherSuperadmin(t.id);
  // Nonaktif = diblokir di sistem login juga, sehingga sesi yang masih terbuka ikut tidak berlaku.
  const { error: ae } = await admin.auth.admin.updateUserById(t.id, { ban_duration: aktif ? 'none' : '876000h' });
  if (ae) throw new Fail(500, 'Gagal mengubah status login: ' + ae.message);
  const { error } = await admin.from('profiles').update({ aktif }).eq('id', t.id);
  if (error) throw dbErr(error);
  await audit(caller.id, aktif ? 'aktifkan_akun' : 'nonaktifkan_akun', t.id, { nama: t.nama });
  return { ok: true };
}

async function resetPassword(caller: Profile, b: Record<string, unknown>) {
  const t = await loadProfile(String(b.id ?? ''));
  if (!t) throw new Fail(404, 'Akun tidak ditemukan.');
  await authorize(caller, t);
  const password = tempPassword();
  const { error } = await admin.auth.admin.updateUserById(t.id, { password });
  if (error) throw new Fail(500, 'Gagal reset password: ' + error.message);
  await audit(caller.id, 'reset_password', t.id, { nama: t.nama });
  return { password_sementara: password };
}

// ---------- Pintu masuk ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Metode tidak diizinkan.' });
  try {
    if (!SECRET) throw new Fail(500, 'Secret key belum diatur. Tambahkan secret HG_SECRET_KEY di pengaturan Edge Functions.');
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) throw new Fail(401, 'Belum login.');
    const { data: { user }, error: ue } = await admin.auth.getUser(token);
    if (ue || !user) throw new Fail(401, 'Sesi tidak valid. Silakan login ulang.');
    const caller = await loadProfile(user.id);
    if (!caller || !caller.aktif) throw new Fail(403, 'Akun Anda tidak aktif.');

    const body = await req.json().catch(() => ({}));
    switch (body.action) {
      case 'create': return json(200, await create(caller, body));
      case 'update': return json(200, await update(caller, body));
      case 'set_aktif': return json(200, await setAktif(caller, body));
      case 'reset_password': return json(200, await resetPassword(caller, body));
      case 'create_bulk': {
        // Impor massal: maksimal 25 baris per panggilan; hasil per baris (berhasil / alasan gagal)
        const rows = Array.isArray(body.rows) ? body.rows.slice(0, 25) : [];
        const hasil = [];
        for (const r of rows) {
          try { hasil.push({ ok: true, ...(await create(caller, r)) }); }
          catch (e) { hasil.push({ ok: false, error: e instanceof Error ? e.message : String(e), username: r?.username ?? null }); }
        }
        return json(200, { hasil });
      }
      default: throw new Fail(400, 'Aksi tidak dikenal.');
    }
  } catch (e) {
    const status = e instanceof Fail ? e.status : 500;
    return json(status, { error: e instanceof Error ? e.message : String(e) });
  }
});
