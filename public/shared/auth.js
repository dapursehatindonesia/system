// ==========================================================
// AUTH BERSAMA — dipakai portal dan setiap aplikasi.
// Urutan script di setiap halaman:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="/shared/config.js"></script>
//   <script src="/shared/auth.js"></script>
//
// Di aplikasi (mis. /delivery/kurir):
//   const me = await HGAuth.guard('dlv-kurir');   // stop di sini kalau tidak boleh
//   me.profile.nama, me.profile.position_id, ...
// ==========================================================
(function () {
  if (!window.supabase || !window.HG) {
    document.body.innerHTML = '<p style="font-family:sans-serif;padding:24px">Gagal memuat sistem. Periksa koneksi internet lalu muat ulang halaman.</p>';
    throw new Error('supabase-js atau /shared/config.js belum dimuat');
  }
  const sb = window.supabase.createClient(HG.SUPABASE_URL, HG.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'hg-auth' }
  });

  /** Login bisa pakai username (kurir/staf) atau email asli (admin).
      Username diubah menjadi email internal "<username>@<LOGIN_DOMAIN>". */
  const toEmail = input => {
    const v = String(input || '').trim().toLowerCase();
    return v.includes('@') ? v : v + '@' + HG.LOGIN_DOMAIN;
  };

  /** Alamat tujuan setelah login hanya boleh path di situs ini (cegah redirect ke situs lain). */
  function safeNext(next) {
    if (!next || typeof next !== 'string') return null;
    if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null;
    return next;
  }

  function toLogin(extra) {
    const next = location.pathname + location.search + location.hash;
    location.replace('/?next=' + encodeURIComponent(next) + (extra ? '&' + extra : ''));
  }

  async function profile(userId) {
    const { data, error } = await sb.from('profiles')
      .select('id, nama, username, division_id, position_id, kontrak, aktif, positions(nama, cakupan), divisions(nama)')
      .eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  /**
   * Pastikan user sudah login, profilnya aktif, dan boleh membuka aplikasi ini.
   * Kalau tidak, langsung diarahkan ke portal. Mengembalikan { session, profile }.
   * Catatan: ini hanya untuk tampilan. Keamanan data tetap dijaga RLS di database.
   */
  async function guard(appId) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { toLogin(); return new Promise(() => {}); }
    const [{ data: ok, error }, prof] = await Promise.all([
      sb.rpc('boleh_akses', { p_user: session.user.id, p_app: appId }),
      profile(session.user.id).catch(() => null)
    ]);
    if (error || !ok || !prof || !prof.aktif) {
      location.replace('/?denied=' + encodeURIComponent(appId));
      return new Promise(() => {});
    }
    return { session, profile: prof };
  }

  async function logout() {
    await sb.auth.signOut();
    location.replace('/');
  }

  // Kalau user logout di tab lain, tab ini ikut kembali ke login.
  sb.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT' && location.pathname !== '/' && location.pathname !== '/index.html') location.replace('/');
  });

  window.HGAuth = { sb, toEmail, safeNext, profile, guard, logout };
})();
