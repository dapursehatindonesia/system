const roles={
  korlap:{name:'KORLAP',desc:'Control • Monitor • Action',color:'#c64039',bg:'#fbe9e8'},
  kurir:{name:'KURIR',desc:'Tepat • Cepat • Aman • Sopan • Lapor',color:'#08775c',bg:'#e5f5ed'},
  packing:{name:'TIM PACKING',desc:'Check • Scan • Pack • Verify • Handover',color:'#2b6fb6',bg:'#e7f0ff'},
  all:{name:'ALL',desc:'Deliver the Healthiness',color:'#6d28d9',bg:'#ede9fe'}
};

// ==========================================================
// MODUL TRAINING
// Tambahkan object baru di bawah jika satu role punya modul baru.
// role harus sama dengan id pada object roles di atas.
// ==========================================================
const modules=[
  {
    id:'korlap-01',
    role:'korlap',
    title:'Modul Korlap: Control, Monitor, & Action',
    description:'Materi training untuk KORLAP.',
    url:'https://drive.google.com/file/d/17aQHbSqbH1TWKSXLS7bvEzdiVfQa7O9S/view?usp=sharing'
  },
  {
    id:'kurir-01',
    role:'kurir',
    title:'Modul Kurir: Zero Complaint, The Power of Excellent Service',
    description:'Materi training untuk KURIR.',
    url:'https://drive.google.com/file/d/1LSeSQc1ymrRFBX2TTutmr29K6XlW_V9t/view?usp=sharing'
  },
  {
    id:'packing-01',
    role:'packing',
    title:'Modul Packing: From Kitchen to Customer',
    description:'Materi training untuk Tim PACKING & BACKUP.',
    url:'https://drive.google.com/file/d/1yzu0bjDkiG43hxFNfC7QTSgQqasjyJpf/view?usp=sharing'
  },
  {
    id:'all-01',
    role:'all',
    title:'Standard Photo Report',
    description:'Standar Foto Serah Terima ke Customer.',
    url:'https://drive.google.com/file/d/11lHOy3fEIaYvclzhskRABzaqKUkEbj0L/view?usp=sharing'
  }
];

// ==========================================================
// CONTOH TAMBAH MODUL KEDUA UNTUK KURIR:
// {
//   id:'kurir-02',
//   role:'kurir',
//   title:'Modul Handling Delivery',
//   description:'Materi tambahan untuk KURIR.',
//   url:'LINK_GOOGLE_DRIVE'
// }
// ==========================================================

// ==========================================================
// CASE MINGGUAN
// Update bagian ini setiap minggu. Tidak perlu mengubah script.js.
// role: korlap | kurir | packing
// ==========================================================
const weeklyCases=[
  {
    id:'weekly-kurir-01',
    active:true,
    week:'5–11 Oktober 2026',
    role:'kurir',
    title:'Box Disemutin',
    situation:'Banyak komplain terkait box disemutin.',
    explanation:'Kebersihan dan kehigenisan box merupakan hal yang harus dijaga.',
    solution:'Kurir perlu cek kondisi tas sebelum berangkat. Kurir perlu cek kondisi peletakan box di tempat customer, pastikan aman dari semut atau serangga lainnya. Berikan dobel plastik jika box berpotensi bersemut.'
  },
  {
    id:'weekly-kurir-02',
    active:true,
    week:'6 Oktober 2026',
    role:'kurir',
    title:'Salah Alamat',
    situation:'Kurir mengirim box ke alamat yang belum sesuai, sempat dikirim ulang ke alamat sesuai tapi melebihi jam pengantaran.',
    explanation:'Kurir WAJIB teliti dalam membaca label alamat di box.',
    solution:'Ketika terjadi salah alamat, kurir wajib menginfokan ke customer, sampaikan permintaan maaf ke customer. Jangan lupa, info ke korlap. Langsung antar box ke alamat yang sesuai.'
  },
  {
    id:'weekly-kurir-03',
    active:true,
    week:'9 Oktober 2026',
    role:'kurir',
    title:'Free Item Tidak Terkirim',
    situation:'Ada customer yang tidak menerima free item padahal seharusnya dikirimkan free item.',
    explanation:'Free item wajib diterima customer yang sesuai karena ini bentuk kompensasi dari healthy go.',
    solution:'Korlap, tim packing, dan kurir harus cek manifest terkait customer mana saja yang mendapat free item. Jika tidak ada bisa koordinasi dengan CS sesegera mungkin.'
  }
];

const cases={
korlap:[
 ['CASE 01','Kurir terlambat berangkat','Kurir seharusnya berangkat pukul 09.00, tetapi pukul 09.20 belum berangkat.','Korlap perlu memastikan fakta dan penyebab sebelum mengambil tindakan.','CEK → TANYA → PUTUSKAN → TINDAK → FOLLOW UP. Pastikan delivery kembali berjalan dan hasilnya dipantau.'],
 ['CASE 02','Kendaraan bermasalah','Kurir membawa 40 box tetapi kendaraan mengalami masalah di perjalanan.','Kendaraan bermasalah dapat mengganggu keselamatan, produk, customer, dan operasional.','STOP → SECURE → REPORT → SOLVE → FOLLOW UP. Amankan box, laporkan, koordinasikan backup, lalu pastikan delivery selesai.'],
 ['CASE 03','Customer complaint','Customer mengeluhkan makanan terlambat.','Complaint perlu ditangani dengan melihat fakta delivery dan penyebab keterlambatan.','Identifikasi penyebab → ambil tindakan → update pihak terkait → pastikan penyelesaian → evaluasi agar tidak berulang.'],
 ['CASE 04','Kurir hadir tetapi belum READY','Kurir sudah hadir, tetapi HP belum siap dan kendaraan belum dicek.','Hadir belum tentu berarti siap delivery.','Lakukan readiness check: PERSON + VEHICLE + EQUIPMENT + APPEARANCE. Jika belum siap, selesaikan gap sebelum deployment.'],
 ['CASE 05','Manpower kurang','Satu kurir tidak hadir sehingga jumlah manpower kurang untuk area delivery.','Kekurangan manpower perlu diketahui sebelum operasional berjalan.','Cek attendance → hitung kebutuhan → REDISTRIBUSI atau BACKUP → pastikan area tetap ter-cover.'],
 ['CASE 06','Delivery tidak update','Status delivery belum diperbarui dan Korlap belum menerima informasi.','Jangan menunggu masalah menjadi besar.','Cek status → tanyakan pihak terkait → tentukan tindakan → follow up sampai status jelas.'],
 ['CASE 07','Customer sulit dihubungi','Kurir sudah sampai area tujuan tetapi customer sulit dihubungi.','Ini merupakan early warning yang perlu dipantau sebelum berdampak ke delivery.','Follow-up sesuai SOP, pastikan status diketahui, dan eskalasi ke Korlap/PIC bila membutuhkan bantuan.'],
 ['CASE 08','Teguran karena pelanggaran berulang','Kurir kembali melakukan pelanggaran setelah sebelumnya diberi arahan.','Tindakan disiplin perlu berbasis fakta dan mengikuti ketentuan perusahaan.','VERIFIKASI → KLARIFIKASI → COACHING → DOKUMENTASI → FOLLOW UP. Pelanggaran berulang dapat dieskalasikan sesuai ketentuan perusahaan.'],
 ['CASE 09','Hasil monitoring menunjukkan area bermasalah','Satu area menunjukkan keterlambatan dan complaint yang berulang.','Data harian dapat digunakan untuk menemukan pola masalah.','Review data → identifikasi pola → tentukan action plan → coaching bila diperlukan → monitor hasil perbaikan.'],
 ['CASE 10','Operasional selesai tetapi belum direview','Semua kurir sudah pulang, tetapi tidak ada review kendala dan action plan.','Sesi belum selesai ketika kurir pulang.','Cek delivery, complaint, box bermasalah, keterlambatan, kendaraan, kejadian khusus, masalah berulang, lalu tentukan action plan berikutnya.']
],
kurir:[
 ['CASE 01','Customer sulit dihubungi','Kurir tiba di lokasi tetapi customer belum dapat dihubungi.','Jangan langsung meninggalkan lokasi tanpa mengikuti alur penanganan.','Tetap sopan → follow-up sesuai SOP → cek status → lapor Korlap/PIC bila membutuhkan bantuan atau eskalasi.'],
 ['CASE 02','Kendaraan bermasalah','Kendaraan bermasalah saat membawa pesanan.','Keselamatan dan keamanan box harus dijaga terlebih dahulu.','Amankan box → laporkan kondisi → minta/ikuti arahan backup → lanjutkan delivery → pastikan status selesai.'],
 ['CASE 03','Delivery terlambat','Delivery melewati waktu target.','Keterlambatan perlu ditangani, bukan dibiarkan tanpa informasi.','Cek penyebab → lakukan tindakan → update status → laporkan kendala yang memengaruhi delivery.'],
 ['CASE 04','Seragam dan identitas belum sesuai','Sebelum berangkat, seragam atau identitas belum sesuai standar.','Kesiapan person adalah bagian dari READY.','Lengkapi seragam dan identitas sesuai standar sebelum berangkat.'],
 ['CASE 05','BBM tidak cukup','Kendaraan aman, tetapi BBM tidak cukup untuk menyelesaikan delivery.','Kesiapan kendaraan harus diperiksa sebelum deployment.','Pastikan BBM cukup sebelum berangkat dan koordinasikan bila kondisi tersebut sudah mengganggu rencana delivery.'],
 ['CASE 06','HP dan baterai tidak siap','HP aktif tetapi baterai rendah dan perlengkapan pendukung belum siap.','Equipment merupakan bagian dari kesiapan delivery.','Pastikan HP, baterai, e-money, delivery box/tas, dan perlengkapan pendukung siap sebelum berangkat.'],
 ['CASE 07','Jumlah box tidak sesuai penugasan','Kurir menerima jumlah box yang tidak sesuai dengan informasi penugasan.','Kurir perlu memahami apa yang dibawa sebelum berangkat.','Cek jumlah dan penugasan → tanyakan bila ada ketidaksesuaian → laporkan/koordinasikan sebelum melanjutkan.'],
 ['CASE 08','Alamat atau tujuan belum jelas','Kurir belum memahami alamat tujuan dan prioritas delivery.','Penugasan harus jelas: area, jumlah, customer, tujuan, dan prioritas.','Pastikan informasi tujuan dan prioritas jelas sebelum berangkat.'],
 ['CASE 09','Customer menyampaikan complaint','Customer mengeluhkan kondisi atau keterlambatan delivery.','Customer complaint harus ditangani dengan komunikasi yang baik dan berbasis fakta.','Dengarkan → tetap sopan dan jangan berdebat → cek fakta/status → ikuti SOP → lapor bila perlu eskalasi.'],
 ['CASE 10','Setelah delivery selesai','Delivery sudah selesai, tetapi ada kejadian khusus selama perjalanan.','Tugas tidak berhenti pada “sudah berangkat” atau sekadar sampai tujuan.','Pastikan status delivery ter-update → laporkan kendala/kejadian khusus → rapikan perlengkapan → sampaikan informasi penting untuk sesi berikutnya.']
],
packing:[
 ['CASE 01','Label tidak sesuai','Saat pengecekan, label box tidak sesuai dengan order.','Label adalah salah satu kontrol utama sebelum box diteruskan.','JANGAN DITERUSKAN. Pisahkan box dan kembalikan ke proses terkait sesuai prosedur.'],
 ['CASE 02','Jumlah box selisih','Manifest 100 box, tetapi box aktual yang diterima hanya 98.','Selisih jumlah harus ditahan dan dicek sebelum handover.','STOP → CHECK → REPORT. Cek manifest dan hasil scan, lalu informasikan PIC.'],
 ['CASE 03','Box belum di-scan','Box sudah lengkap tetapi belum di-scan.','Box belum dapat dianggap siap hanya karena kondisinya lengkap.','BELUM READY → lakukan pengecekan dan scan. Prinsipnya 1 BOX = 1 SCAN = 1 CONTROL.'],
 ['CASE 04','Box rusak atau terbuka','Box diterima dalam kondisi rusak, terbuka, atau bocor.','Kondisi box harus sesuai sebelum masuk proses berikutnya.','Pisahkan box → lakukan perbaikan/penggantian sesuai alur → pastikan kondisi aman sebelum diteruskan.'],
 ['CASE 05','Sesi tidak sesuai','Box masuk ke area packing tetapi ternyata untuk sesi yang berbeda.','Sesi merupakan bagian dari CHECK 4 HAL.','Tahan box dan jangan diteruskan sebelum ketidaksesuaian sesi ditangani sesuai prosedur.'],
 ['CASE 06','Perlengkapan packing belum lengkap','Box sudah ter-scan tetapi plastik atau perlengkapan yang dibutuhkan belum tersedia.','Scan bukan akhir proses; box masih harus melalui packing.','Lengkapi plastik, alat makan atau kabel ties bila diperlukan, lalu pastikan final condition sesuai.'],
 ['CASE 07','Manifest belum dicek','Jumlah box terlihat sesuai, tetapi manifest belum dibandingkan dengan box aktual dan hasil scan.','Manifest check membantu memastikan jumlah yang seharusnya, aktual, dan tercatat selaras.','PRINT → CHECKLIST → CONFIRM. Jika ada selisih → STOP → CHECK → REPORT.'],
 ['CASE 08','Box ditaruh sembarangan','Box sudah siap tetapi diletakkan sembarangan sehingga berisiko rusak.','Handling yang benar menjaga kualitas dan keamanan box.','Jaga box tetap aman, jangan melempar atau menumpuk sembarangan, dan hindari paparan panas berlebihan.'],
 ['CASE 09','APD tidak lengkap','Staff packing bekerja tanpa masker atau hairnet.','APD adalah bagian dari keamanan dan higienitas proses.','Lengkapi APD wajib: masker dan hairnet, lalu lanjutkan pekerjaan sesuai standar.'],
 ['CASE 10','Box belum siap saat handover','Kurir datang, tetapi final check belum selesai.','Handover hanya dilakukan saat box sudah READY.','Jangan serahkan dulu. Selesaikan CHECK → SCAN → PACK → VERIFY, cek manifest, lalu HANDOVER ketika seluruh kondisi OK.']
]
};

const quizzes={
korlap:[
 ['Kurir belum berangkat 20 menit setelah jadwal. Langkah pertama Korlap?',['Langsung menegur','Cek fakta kondisi aktual','Menunggu complaint','Membiarkan'],1,'Problem solving dimulai dengan CEK: pastikan fakta masalah.'],
 ['Urutan problem solving Korlap yang sesuai?',['Tanya → Cek → Pulang','Cek → Tanya → Putuskan → Tindak → Follow Up','Tindak → Cek → Abaikan','Lapor → Pulang → Follow Up'],1,'Gunakan pola CEK → TANYA → PUTUSKAN → TINDAK → FOLLOW UP.'],
 ['Sebelum operasional, Korlap perlu memastikan apa?',['Hanya jumlah kurir','Attendance dan kecukupan manpower','Hanya complaint','Hanya kendaraan'],1,'Kontrol pre-operation dimulai dari attendance dan manpower.'],
 ['Kurir hadir tetapi HP dan kendaraan belum siap. Statusnya?',['READY','Belum READY','Selesai','Tidak perlu dicek'],1,'READY mencakup PERSON + VEHICLE + EQUIPMENT + APPEARANCE.'],
 ['Saat monitoring, Korlap seharusnya?',['Menunggu laporan masalah','Aktif memonitor kondisi lapangan','Hanya melihat akhir bulan','Hanya menangani complaint'],1,'Korlap aktif memonitor attendance, readiness, productivity, timing, area, quality, complaint, dan issue.'],
 ['Sinyal “delivery tidak update” sebaiknya diperlakukan sebagai?',['Early warning','Masalah yang boleh diabaikan','Hasil akhir','Bukan tanggung jawab Korlap'],0,'Early warning perlu ditindaklanjuti sebelum dampaknya membesar.'],
 ['Dalam coaching kurir, fokus utama sebaiknya?',['Label pribadi','Fakta, penyebab, solusi, komitmen, follow-up','Menunggu masalah berulang','Menghindari pembicaraan'],1,'Coaching diarahkan pada fakta dan tindakan perbaikan, bukan label pribadi.'],
 ['Urutan penanganan kondisi darurat yang sesuai materi?',['Report → Stop → Pulang','STOP → SECURE → REPORT → SOLVE → FOLLOW UP','Solve → Ignore → Follow Up','Follow Up → Stop'],1,'Alur darurat dimulai dari keselamatan dan pengamanan kondisi.'],
 ['Jika pelanggaran berulang terjadi, langkah setelah coaching dan dokumentasi adalah?',['Tidak perlu apa-apa','Follow up dan eskalasi sesuai ketentuan bila berulang','Langsung pulang','Hapus catatan'],1,'Pelanggaran berulang dapat dieskalasikan sesuai ketentuan perusahaan setelah proses berbasis fakta.'],
 ['Apa tujuan review post-operation?',['Sekadar menutup shift','Review, belajar, dan membuat action plan','Menghapus semua kendala','Menunggu complaint berikutnya'],1,'POST-OPERATION = REVIEW → LEARN → IMPROVE dan menetapkan action plan berikutnya.']
],
kurir:[
 ['Sebelum delivery, hadir saja sudah cukup?',['Ya','Tidak, harus READY','Hanya jika ramai','Tidak perlu dicek'],1,'Modul menegaskan: hadir belum tentu READY.'],
 ['Mana yang termasuk kesiapan kendaraan?',['BBM cukup dan kendaraan aman','Hanya warna kendaraan','Hanya nomor kendaraan','Tidak perlu dicek'],0,'Vehicle readiness mencakup kendaraan aman dan BBM cukup.'],
 ['Apa yang harus dipahami sebelum berangkat?',['Hanya jumlah box','Apa yang dibawa, ke mana, berapa jumlahnya, dan prioritas','Hanya nama Korlap','Hanya jam pulang'],1,'Kurir perlu memahami area, jumlah, customer/tujuan, dan prioritas.'],
 ['Standar delivery “TEPAT” berarti memastikan?',['Orang, alamat, jumlah, dan pesanan sesuai','Datang tanpa komunikasi','Selalu paling cepat','Mengabaikan jumlah'],0,'TEPAT mencakup orang, alamat, jumlah, dan pesanan.'],
 ['Jika terjadi kendala yang memengaruhi delivery, tindakan yang sesuai?',['Diam','Lapor','Menunggu sampai besok','Mengabaikan'],1,'LAPOR berarti segera melaporkan kendala yang memengaruhi delivery.'],
 ['Saat kendaraan bermasalah, prioritas awal?',['Mengejar waktu tanpa berhenti','Amankan box dan kondisi, lalu laporkan','Meninggalkan box','Mengabaikan masalah'],1,'Contoh tindakan: amankan box → laporkan → ikuti arahan backup → lanjutkan delivery.'],
 ['Saat customer complaint, kurir sebaiknya?',['Berdebat','Tetap sopan, dengarkan, dan cek fakta/status','Langsung pergi','Menyalahkan customer'],1,'Customer complaint ditangani dengan komunikasi sopan dan pengecekan fakta.'],
 ['Jika alamat/tujuan belum jelas sebelum berangkat?',['Tetap berangkat tanpa bertanya','Pastikan informasi tujuan jelas','Abaikan','Tunggu complaint'],1,'Penugasan harus dipahami sebelum delivery.'],
 ['Setelah delivery selesai, yang perlu dilakukan?',['Tidak perlu update','Pastikan status ter-update dan laporkan kejadian khusus','Langsung pulang tanpa informasi','Hapus data'],1,'Setelah delivery, status harus jelas dan kendala/kejadian khusus dilaporkan.'],
 ['Urutan prinsip delivery yang digunakan dalam materi adalah?',['Cepat, diam, selesai','TEPAT • CEPAT • AMAN • SOPAN • LAPOR','Aman saja','Sopan saja'],1,'Lima standar delivery: TEPAT, CEPAT, AMAN, SOPAN, LAPOR.']
],
packing:[
 ['Prinsip scan untuk box adalah?',['1 box = 1 scan','1 box = 2 scan','Scan jika sempat','Tidak perlu scan'],0,'Rule utama: 1 BOX = 1 SCAN = 1 CONTROL.'],
 ['Saat menerima box, empat hal yang dicek adalah?',['Jumlah, kondisi box, label/kode, sesi','Harga, warna, ukuran, nama','Hanya label','Hanya jumlah'],0,'CHECK 4 HAL: jumlah, kondisi box, label/kode, dan sesi.'],
 ['Jika label box tidak sesuai, tindakan yang tepat?',['Tetap handover','Jangan diteruskan','Abaikan','Serahkan ke customer'],1,'Label salah harus ditahan dan ditangani sesuai prosedur.'],
 ['Manifest 100, aktual 98. Apa tindakan?',['Langsung handover','STOP → CHECK → REPORT','Tambah angka di manifest','Abaikan'],1,'Selisih jumlah harus dihentikan, dicek, dan dilaporkan.'],
 ['Setelah scan, apakah box langsung READY?',['Ya','Tidak, masih harus masuk proses packing','Tidak perlu dicek','Hanya jika kurir datang'],1,'Setelah scan, box wajib masuk proses packing.'],
 ['Yang termasuk final condition box adalah?',['Tertutup, aman, bebas benda asing','Terbuka agar mudah dicek','Dilempar ke area kurir','Tidak perlu dicek'],0,'Final condition harus tertutup, aman, dan bebas benda asing.'],
 ['Sebelum handover, salah satu checklist wajib adalah?',['Jumlah box sesuai','Mengabaikan manifest','Tidak perlu scan','Tidak perlu cek label'],0,'Final check mencakup jumlah, scan, label/kode, sesi, kondisi, perlengkapan, dan manifest.'],
 ['Jika box rusak, prinsip penanganannya?',['Abaikan','Pisahkan lalu perbaiki/ganti sesuai alur','Langsung handover','Sembunyikan'],1,'Box rusak dipisahkan dan ditangani sesuai prosedur.'],
 ['APD wajib pada proses packing yang disebut dalam materi?',['Masker dan hairnet','Topi bebas','Tidak ada','Sarung tangan saja'],0,'Materi menyebut masker dan hairnet sebagai APD wajib.'],
 ['Handover dilakukan ketika?',['Box baru diterima','Box READY dan sudah terverifikasi','Sebelum scan','Sebelum final check'],1,'READY → HANDOVER → DELIVERY. Serahkan hanya box yang sudah lengkap dan terverifikasi.']
]
};


const refreshment={
  date:'2026-10-01',
  questions:{
    korlap:[
      {question:'Kurir belum berangkat 20 menit setelah jadwal. Langkah pertama Korlap?',options:['Langsung menegur','Cek fakta kondisi aktual','Menunggu complaint','Membiarkan'],answer:1},
      {question:'Urutan problem solving Korlap yang sesuai?',options:['Tanya → Cek → Pulang','Cek → Tanya → Putuskan → Tindak → Follow Up','Tindak → Cek → Abaikan','Lapor → Pulang → Follow Up'],answer:1},
      {question:'Sebelum operasional, Korlap perlu memastikan apa?',options:['Hanya jumlah kurir','Attendance dan kecukupan manpower','Hanya complaint','Hanya kendaraan'],answer:1},
      {question:'Kurir hadir tetapi HP dan kendaraan belum siap. Statusnya?',options:['READY','Belum READY','Selesai','Tidak perlu dicek'],answer:1},
      {question:'Saat monitoring, Korlap seharusnya?',options:['Menunggu laporan masalah','Aktif memonitor kondisi lapangan','Hanya melihat akhir bulan','Hanya menangani complaint'],answer:1},
      {question:'Sinyal “delivery tidak update” sebaiknya diperlakukan sebagai?',options:['Early warning','Masalah yang boleh diabaikan','Hasil akhir','Bukan tanggung jawab Korlap'],answer:0},
      {question:'Dalam coaching kurir, fokus utama sebaiknya?',options:['Label pribadi','Fakta, penyebab, solusi, komitmen, follow-up','Menunggu masalah berulang','Menghindari pembicaraan'],answer:1},
      {question:'Urutan penanganan kondisi darurat yang sesuai materi?',options:['Report → Stop → Pulang','STOP → SECURE → REPORT → SOLVE → FOLLOW UP','Solve → Ignore → Follow Up','Follow Up → Stop'],answer:1},
      {question:'Jika pelanggaran berulang terjadi, langkah setelah coaching dan dokumentasi adalah?',options:['Tidak perlu apa-apa','Follow up dan eskalasi sesuai ketentuan bila berulang','Langsung pulang','Hapus catatan'],answer:1},
      {question:'Apa tujuan review post-operation?',options:['Sekadar menutup shift','Review, belajar, dan membuat action plan','Menghapus semua kendala','Menunggu complaint berikutnya'],answer:1}
    ],
    kurir:[
      {question:'Sebelum delivery, hadir saja sudah cukup?',options:['Ya','Tidak, harus READY','Hanya jika ramai','Tidak perlu dicek'],answer:1},
      {question:'Mana yang termasuk kesiapan kendaraan?',options:['BBM cukup dan kendaraan aman','Hanya warna kendaraan','Hanya nomor kendaraan','Tidak perlu dicek'],answer:0},
      {question:'Apa yang harus dipahami sebelum berangkat?',options:['Hanya jumlah box','Apa yang dibawa, ke mana, berapa jumlahnya, dan prioritas','Hanya nama Korlap','Hanya jam pulang'],answer:1},
      {question:'Standar delivery “TEPAT” berarti memastikan?',options:['Orang, alamat, jumlah, dan pesanan sesuai','Datang tanpa komunikasi','Selalu paling cepat','Mengabaikan jumlah'],answer:0},
      {question:'Jika terjadi kendala yang memengaruhi delivery, tindakan yang sesuai?',options:['Diam','Lapor','Menunggu sampai besok','Mengabaikan'],answer:1},
      {question:'Saat kendaraan bermasalah, prioritas awal?',options:['Mengejar waktu tanpa berhenti','Amankan box dan kondisi, lalu laporkan','Meninggalkan box','Mengabaikan masalah'],answer:1},
      {question:'Saat customer complaint, kurir sebaiknya?',options:['Berdebat','Tetap sopan, dengarkan, dan cek fakta/status','Langsung pergi','Menyalahkan customer'],answer:1},
      {question:'Jika alamat/tujuan belum jelas sebelum berangkat?',options:['Tetap berangkat tanpa bertanya','Pastikan informasi tujuan jelas','Abaikan','Tunggu complaint'],answer:1},
      {question:'Setelah delivery selesai, yang perlu dilakukan?',options:['Tidak perlu update','Pastikan status ter-update dan laporkan kejadian khusus','Langsung pulang tanpa informasi','Hapus data'],answer:1},
      {question:'Urutan prinsip delivery yang digunakan dalam materi adalah?',options:['Cepat, diam, selesai','TEPAT • CEPAT • AMAN • SOPAN • LAPOR','Aman saja','Sopan saja'],answer:1}
    ],
    packing:[
      {question:'Prinsip scan untuk box adalah?',options:['1 box = 1 scan','1 box = 2 scan','Scan jika sempat','Tidak perlu scan'],answer:0},
      {question:'Saat menerima box, empat hal yang dicek adalah?',options:['Jumlah, kondisi box, label/kode, sesi','Harga, warna, ukuran, nama','Hanya label','Hanya jumlah'],answer:0},
      {question:'Jika label box tidak sesuai, tindakan yang tepat?',options:['Tetap handover','Jangan diteruskan','Abaikan','Serahkan ke customer'],answer:1},
      {question:'Manifest 100, aktual 98. Apa tindakan?',options:['Langsung handover','STOP → CHECK → REPORT','Tambah angka di manifest','Abaikan'],answer:1},
      {question:'Setelah scan, apakah box langsung READY?',options:['Ya','Tidak, masih harus masuk proses packing','Tidak perlu dicek','Hanya jika kurir datang'],answer:1},
      {question:'Yang termasuk final condition box adalah?',options:['Tertutup, aman, bebas benda asing','Terbuka agar mudah dicek','Dilempar ke area kurir','Tidak perlu dicek'],answer:0},
      {question:'Sebelum handover, salah satu checklist wajib adalah?',options:['Jumlah box sesuai','Mengabaikan manifest','Tidak perlu scan','Tidak perlu cek label'],answer:0},
      {question:'Jika box rusak, prinsip penanganannya?',options:['Abaikan','Pisahkan lalu perbaiki/ganti sesuai alur','Langsung handover','Sembunyikan'],answer:1},
      {question:'APD wajib pada proses packing yang disebut dalam materi?',options:['Masker dan hairnet','Topi bebas','Tidak ada','Sarung tangan saja'],answer:0},
      {question:'Handover dilakukan ketika?',options:['Box baru diterima','Box READY dan sudah terverifikasi','Sebelum scan','Sebelum final check'],answer:1}
    ]
  }
};


// ==========================================================
// GALLERY
// Tambahkan item baru sesuai kategori.
// image dapat diarahkan ke file gambar di repository.
// ==========================================================
const galleryItems=[
  {id:'appearance',category:'Courier Standard',title:'Atribut Kurir',period:'Courier Standard',name:'Healthy Go',subtitle:'Standar pakaian dan penampilan kurir',image:'std-pakaian.png'},
  {id:'bag',category:'Courier Standard',title:'Tas Kurir',period:'Courier Standard',name:'Healthy Go',subtitle:'Tas kurir dalam kondisi bersih & box tertata rapi',image:'std-tas.png'},
  {id:'identity',category:'Courier Standard',title:'Identitas Kurir',period:'Courier Standard',name:'Healthy Go',subtitle:'KTP & SIM dibawa saat bekerja',image:'identitas-kurir.png'},
  {id:'mentality',category:'Courier Standard',title:'Courier Mentality',period:'Courier Standard',name:'Healthy Go',subtitle:'Sikap positif, tanggung jawab, dan memberikan yang terbaik.',image:'Mentality-Kurir.png'},
  {id:'integrity',category:'Courier Standard',title:'Integrity Awareness',period:'Courier Standard',name:'Healthy Go',subtitle:'Integritas Nomor Satu.',image:'integrity-awareness.png'},
  {id:'top-kurir-2026-10',category:'Top Kurir of the Month',title:'Top Kurir of the Month',period:'Oktober 2026',name:'Nama Kurir',subtitle:'Kurir Area',image:'logo_hg_hijau_cut.png'},
  {id:'top-kurir-2026-10',category:'Top Kurir of the Month',title:'Top Kurir of the Month',period:'Oktober 2026',name:'Nama Kurir',subtitle:'Kurir Area',image:'logo_hg_hijau_cut.png'},
  {id:'best-delivery-moment-01',category:'Best Delivery Moment',title:'Training Kurir',period:'September 2026',name:'Jabodetabek',subtitle:'Training kurir untuk meningkatkan kompetensi & standar pelayanan kurir',image:'training-kurir.png'},
];


