// =====================================================================
// Edge Function: sync-sheet
// Menerima data SLA / Complaint / Cost dari Apps Script, mencocokkan nama
// kurir ke profil, menyimpan ke database, dan mencatat log.
//
// Aksi:
//   picu    — dari Management (login Admin Delivery / admin pusat): minta Apps Script sync sekarang
//   mulai   — dari Apps Script: buka log sync baru            (wajib header x-sync-token)
//   batch   — dari Apps Script: kirim sebagian baris         (wajib header x-sync-token)
//   selesai — dari Apps Script: terapkan & tutup log         (wajib header x-sync-token)
//   gagal   — dari Apps Script: tandai log gagal             (wajib header x-sync-token)
//
// Secrets yang dibutuhkan (Edge Functions → Secrets):
//   SYNC_TOKEN      — kata sandi panjang acak, SAMA dengan di Apps Script
//   APPS_SCRIPT_URL — URL Web App Apps Script (untuk tombol "Sinkronkan sekarang")
//   HG_SECRET_KEY   — (opsional) secret key sb_secret_..., kalau service role bawaan tidak tersedia
// Pengaturan: matikan "Verify JWT" (function ini memeriksa sendiri).
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SECRET = Deno.env.get('HG_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SYNC_TOKEN = Deno.env.get('SYNC_TOKEN') ?? '';
const SCRIPT_URL = Deno.env.get('APPS_SCRIPT_URL') ?? '';
const db = createClient(Deno.env.get('SUPABASE_URL')!, SECRET ?? '', { auth: { persistSession: false, autoRefreshToken: false } });

class Fail extends Error { constructor(public status: number, msg: string) { super(msg); } }
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const norm = (s: unknown) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const SUMBER = ['SLA', 'Complaint', 'Cost'];
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const int = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : 0; };
const numv = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const txt = (v: unknown, max = 500) => { const s = String(v ?? '').trim(); return s ? s.slice(0, max) : null; };

async function q<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Fail(500, error.message);
  return data;
}

/** Peta nama (dinormalisasi) → id profil. */
async function petaNama() {
  const rows = await q(db.from('profiles').select('id, nama')) as { id: string; nama: string }[];
  const m = new Map<string, string>();
  rows.forEach((r) => m.set(norm(r.nama), r.id));
  return m;
}

// ---------- picu (dari Management) ----------
async function picu(req: Request, body: Record<string, unknown>) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) throw new Fail(401, 'Sesi tidak valid. Silakan login ulang.');
  const me = await q(db.from('profiles').select('id, aktif, division_id, position_id').eq('id', user.id).maybeSingle()) as
    { id: string; aktif: boolean; division_id: string | null; position_id: string } | null;
  const { data: pusat } = await db.rpc('boleh_akses', { p_user: user.id, p_app: 'backoffice' });
  const adminDlv = me?.aktif && me.division_id === 'DLV' && me.position_id === 'admin';
  if (!pusat && !adminDlv) throw new Fail(403, 'Hanya Admin Delivery yang bisa menjalankan sinkronisasi.');
  if (!SCRIPT_URL) throw new Fail(500, 'APPS_SCRIPT_URL belum diatur di Secrets Edge Function.');

  const sejak = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const jalan = await q(db.from('sync_log').select('id').eq('status', 'berjalan').gte('mulai', sejak)) as unknown[];
  if (jalan.length) throw new Fail(409, 'Sinkronisasi sedang berjalan. Tunggu sampai selesai.');

  const r = await fetch(SCRIPT_URL, {
    method: 'POST', redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: SYNC_TOKEN, oleh: user.id, mode: body.mode === 'penuh' ? 'penuh' : 'normal' }),
  });
  const t = await r.text();
  let res: { ok?: boolean; error?: string } = {};
  try { res = JSON.parse(t); } catch { /* bukan JSON */ }
  if (!r.ok || !res.ok) throw new Fail(502, 'Apps Script tidak merespons dengan benar: ' + (res.error ?? t.slice(0, 200)));
  return { ok: true, pesan: 'Sinkronisasi dimulai. Hasilnya muncul di log dalam 1–3 menit.' };
}

// ---------- aksi dari Apps Script ----------
async function mulai(b: Record<string, unknown>) {
  const sumber = String(b.sumber);
  if (!SUMBER.includes(sumber)) throw new Fail(400, 'Sumber tidak dikenal.');
  if (!isDate(b.dari) || !isDate(b.sampai)) throw new Fail(400, 'Rentang tanggal tidak valid.');
  // Tutup log lama yang menggantung (lebih dari 30 menit)
  await db.from('sync_log').update({ status: 'gagal', selesai: new Date().toISOString(), pesan: 'Terhenti sebelum selesai.' })
    .eq('status', 'berjalan').lt('mulai', new Date(Date.now() - 30 * 60 * 1000).toISOString());
  const row = await q(db.from('sync_log').insert({
    sumber, dari: b.dari, sampai: b.sampai, mode: txt(b.mode, 20), dipicu_oleh: txt(b.oleh, 40),
  }).select('id').single()) as { id: number };
  return { sync_id: row.id };
}

async function batch(b: Record<string, unknown>) {
  const syncId = int(b.sync_id), sumber = String(b.sumber), rows = Array.isArray(b.rows) ? b.rows as Record<string, unknown>[] : [];
  if (!syncId || !SUMBER.includes(sumber)) throw new Fail(400, 'Batch tidak valid.');
  if (rows.length > 3000) throw new Fail(400, 'Maksimal 3000 baris per batch.');
  const peta = await petaNama(), tak = new Set<string>();
  const cocok = (nama: unknown) => { const id = peta.get(norm(nama)); if (!id) tak.add(String(nama ?? '').trim()); return id ?? null; };
  let gagal = int(b.gagal), data: Record<string, unknown>[] = [];

  if (sumber === 'SLA') {
    data = rows.filter((r) => isDate(r.tanggal) && txt(r.nama_kurir) && txt(r.mode) && txt(r.sesi)).map((r) => ({
      batch: txt(r.batch, 50), tanggal: r.tanggal, sesi: txt(r.sesi, 30), mode: txt(r.mode, 20)!.toUpperCase(), nama_kurir: txt(r.nama_kurir, 200),
      profile_id: cocok(r.nama_kurir), max_time: /^\d{2}:\d{2}(:\d{2})?$/.test(String(r.max_time ?? '')) ? r.max_time : null,
      qty_box: int(r.qty_box), box_terlambat: int(r.box_terlambat), sync_id: syncId,
    }));
    gagal += rows.length - data.length;
    if (data.length) await q(db.from('dlv_sla').upsert(data, { onConflict: 'tanggal,sesi,mode,nama_kurir' }));
  }
  if (sumber === 'Complaint') {
    data = rows.filter((r) => isDate(r.tanggal) && txt(r.kunci)).map((r) => ({
      kunci: txt(r.kunci, 100), batch: txt(r.batch, 50), tanggal: r.tanggal, sesi: txt(r.sesi, 30), branch: txt(r.branch, 100),
      nama_customer: txt(r.nama_customer, 200), tipe: txt(r.tipe, 100), keterangan: txt(r.keterangan, 2000),
      nama_kurir: txt(r.nama_kurir, 200), kode_warna: txt(r.kode_warna, 50), profile_id: txt(r.nama_kurir) ? cocok(r.nama_kurir) : null, sync_id: syncId,
    }));
    gagal += rows.length - data.length;
    if (data.length) await q(db.from('dlv_complaints').upsert(data, { onConflict: 'kunci' }));
  }
  if (sumber === 'Cost') {
    data = rows.filter((r) => isDate(r.bulan) && txt(r.nama) && txt(r.batch)).map((r) => ({
      bulan: r.bulan, batch: txt(r.batch, 50), nama: txt(r.nama, 200), profile_id: cocok(r.nama),
      branch: txt(r.branch, 100) ?? '',
      box_gt: int(r.box_gt), late_delivery: int(r.late_delivery), complaint: int(r.complaint),
      max_time: /^\d{2}:\d{2}(:\d{2})?$/.test(String(r.max_time ?? '')) ? r.max_time : null, kontrak: txt(r.kontrak, 50), jabatan: txt(r.jabatan, 100), area: txt(r.area, 100),
      total_weekly: numv(r.total_weekly), total_cost: numv(r.total_cost), total_box: int(r.total_box), box_hg: int(r.box_hg), box_bk: int(r.box_bk),
      box_b2b: int(r.box_b2b), box_b2c: int(r.box_b2c), target: int(r.target), kelebihan_box: int(r.kelebihan_box),
      estafet: numv(r.estafet), jarak: numv(r.jarak), parkir: numv(r.parkir), gedung: numv(r.gedung), dll: numv(r.dll), sync_id: syncId,
    }));
    gagal += rows.length - data.length;
    if (data.length) await q(db.from('dlv_costs').upsert(data, { onConflict: 'bulan,batch,nama,branch' }));
  }

  if (tak.size) {
    const ada = await q(db.from('sync_unmatched').select('nama').eq('sync_id', syncId)) as { nama: string }[];
    const sudah = new Set(ada.map((x) => x.nama));
    const baru = [...tak].filter((n) => n && !sudah.has(n)).map((nama) => ({ sync_id: syncId, sumber, nama }));
    if (baru.length) await q(db.from('sync_unmatched').insert(baru));
  }
  await q(db.rpc('sync_tambah', { p_sync: syncId, p_masuk: data.length, p_gagal: gagal }));
  return { masuk: data.length, gagal, tidak_cocok: tak.size };
}

async function selesai(b: Record<string, unknown>) {
  if (!isDate(b.dari) || !isDate(b.sampai)) throw new Fail(400, 'Rentang tanggal tidak valid.');
  const dihapus = await q(db.rpc('sync_terapkan', { p_sync: int(b.sync_id), p_sumber: String(b.sumber), p_dari: b.dari, p_sampai: b.sampai, p_total: int(b.total) }));
  return { ok: true, dihapus };
}

async function gagalkan(b: Record<string, unknown>) {
  await q(db.from('sync_log').update({ status: 'gagal', selesai: new Date().toISOString(), pesan: txt(b.pesan, 1000) }).eq('id', int(b.sync_id)));
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Metode tidak diizinkan.' });
  try {
    if (!SECRET) throw new Fail(500, 'Secret key belum diatur (HG_SECRET_KEY).');
    const body = await req.json().catch(() => ({}));
    if (body.action === 'picu') return json(200, await picu(req, body));
    if (!SYNC_TOKEN || req.headers.get('x-sync-token') !== SYNC_TOKEN) throw new Fail(401, 'Token sync salah.');
    switch (body.action) {
      case 'mulai': return json(200, await mulai(body));
      case 'batch': return json(200, await batch(body));
      case 'selesai': return json(200, await selesai(body));
      case 'gagal': return json(200, await gagalkan(body));
      default: throw new Fail(400, 'Aksi tidak dikenal.');
    }
  } catch (e) {
    return json(e instanceof Fail ? e.status : 500, { error: e instanceof Error ? e.message : String(e) });
  }
});
