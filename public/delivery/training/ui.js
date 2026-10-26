// ==========================================================
// UI SHELL — drawer menu, judul halaman, progress kuis.
// File ini hanya mengatur tampilan; logika utama tetap di script.js.
// ==========================================================
(function(){
  const body=document.body;
  const openBtn=document.getElementById('openNav');
  const closeBtn=document.getElementById('closeNav');
  const scrim=document.getElementById('scrim');
  const pageTitle=document.getElementById('pageTitle');

  function openNav(){body.classList.add('nav-open');openBtn?.setAttribute('aria-expanded','true');}
  function closeNav(){body.classList.remove('nav-open');openBtn?.setAttribute('aria-expanded','false');}
  openBtn?.addEventListener('click',openNav);
  closeBtn?.addEventListener('click',closeNav);
  scrim?.addEventListener('click',closeNav);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNav();});

  function syncTitle(){
    const active=document.querySelector('.nav.active');
    if(pageTitle && active) pageTitle.textContent=active.dataset.title || active.textContent.trim();
  }

  // Jalan setelah handler showSection di script.js
  document.querySelectorAll('[data-target]').forEach(el=>{
    el.addEventListener('click',()=>{
      closeNav();
      syncTitle();
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });
  syncTitle();

  // Progress bar skor kuis, membaca teks "x / y benar"
  const score=document.getElementById('quizScore');
  const meter=document.getElementById('quizMeter');
  function syncMeter(){
    if(!score || !meter) return;
    const m=score.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    const pct=m && Number(m[2]) ? Math.round(Number(m[1])/Number(m[2])*100) : 0;
    meter.style.width=pct+'%';
  }
  if(score){new MutationObserver(syncMeter).observe(score,{childList:true,characterData:true,subtree:true});syncMeter();}
})();
