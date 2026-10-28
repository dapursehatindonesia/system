// ==========================================================
// LMS + LOGIN BERSAMA
// 1. Pastikan user sudah login & boleh membuka Training (kalau tidak → portal).
// 2. Baru muat script.js dan ui.js (urutan tetap).
// 3. Isi nama & role otomatis dari akun, lalu kunci supaya tidak bisa diganti.
// 4. Tambah tombol kembali ke aplikasi asal.
// ==========================================================
(async function () {
  const me = await HGAuth.guard('dlv-train');
  const p = me.profile;
  window.HG_ME = p;

  const load = src => new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Gagal memuat ' + src));
    document.body.appendChild(s);
  });
  await load('script.js?v=20261026');
  await load('ui.js?v=20261026');

  // Role konten LMS mengikuti jabatan
  const roleKey = { kurir: 'kurir', korlap: 'korlap', packing: 'packing' }[p.position_id];
  const fill = (nameId, roleId) => {
    const n = document.getElementById(nameId), r = document.getElementById(roleId);
    if (n) { n.value = p.nama; n.readOnly = true; n.title = 'Diambil dari akun Anda'; }
    if (r && roleKey && [...r.options].some(o => o.value === roleKey)) {
      r.value = roleKey; r.disabled = true; r.title = 'Diambil dari jabatan Anda';
      r.dispatchEvent(new Event('change'));
    }
  };
  fill('refreshmentName', 'refreshmentRole');
  fill('qnaName', 'qnaRole');

  // Tombol kembali di bagian bawah menu samping (kurir → aplikasi Kurir, lainnya → portal)
  const back = document.createElement('a');
  back.href = p.position_id === 'kurir' ? '/delivery/kurir/' : '/?portal=1';
  back.textContent = '← ' + (p.position_id === 'kurir' ? 'Kembali ke aplikasi Kurir' : 'Kembali ke portal');
  back.style.cssText = 'display:block;margin-top:12px;color:#f3cf1b;font-weight:700;font-size:13px;text-decoration:none';
  const foot = document.querySelector('.sidefoot');
  if (foot) foot.appendChild(back); else document.body.appendChild(back);
})().catch(e => {
  document.body.insertAdjacentHTML('afterbegin', '<p style="padding:16px;font-family:sans-serif;color:#b4281c">Gagal memuat Training: ' + String(e.message || e) + '</p>');
});
