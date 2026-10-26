// ==========================================================
// SUPABASE CONFIG
// Publishable key aman untuk frontend/browser.
// JANGAN masukkan Secret Key / service_role key ke file ini.
// ==========================================================
// Memakai koneksi & login bersama (/shared/config.js + /shared/auth.js).
// Pengguna sudah login sebelum file ini dimuat (lihat lms-auth.js).
const supabaseClient=window.HGAuth ? window.HGAuth.sb : null;

// ==========================================================
// NAVIGATION
// ==========================================================
const navTargets=['home','gallery','modules','cases','quiz','refreshment','qna'];
const navButtons=[...document.querySelectorAll('.nav')];
const mobileButtons=[...document.querySelectorAll('.mobile-nav button')];
const sectionEls=navTargets.map(id=>document.getElementById(id)).filter(Boolean);

function showSection(id){
  if(refreshmentStarted && id!=='refreshment'){
    return;
  }
  sectionEls.forEach(section=>section.classList.toggle('active-section',section.id===id));
  navButtons.forEach(button=>button.classList.toggle('active',button.dataset.target===id));
  mobileButtons.forEach(button=>button.classList.toggle('active',button.dataset.target===id));
  const main=document.querySelector('main');
  if(main) main.scrollTo({top:0,behavior:'smooth'});

  if(id==='cases'){
    currentCaseRole='weekly';
    renderCases();
  }
  if(id==='gallery'){
    const categories=[...new Set((galleryItems || []).map(item=>item.category))];
    if(categories.length) currentGalleryCategory=categories[0];
    renderGallery();
  }
  if(id==='qna') loadQna();
}

document.querySelectorAll('[data-target]').forEach(el=>{
  el.addEventListener('click',()=>showSection(el.dataset.target));
});

// ==========================================================
// HELPERS
// ==========================================================
function roleName(role){ return roles[role]?.name || role; }

function roleStyle(role){
  const r=roles[role] || {};
  return `--role-color:${r.color || '#075744'};--role-bg:${r.bg || '#eef6f2'};`;
}

function escapeHtml(value){
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function setSelectOptions(select, includeAll=false){
  if(!select) return;
  const options=Object.entries(roles).map(([key,r])=>
    `<option value="${escapeHtml(key)}">${escapeHtml(r.name)}</option>`
  );
  if(includeAll) options.unshift('<option value="all">Semua Role</option>');
  select.innerHTML=options.join('');
}

// ==========================================================
// HOME ROLE STRIP
// ==========================================================
const roleStrip=document.getElementById('roleStrip');
if(roleStrip){
  roleStrip.innerHTML=Object.entries(roles).map(([key,r])=>`
    <div style="${roleStyle(key)}">
      <b>${escapeHtml(r.name)}</b>
      <small>${escapeHtml(r.desc)}</small>
    </div>
  `).join('');
}

// ==========================================================
// MODULES — satu role boleh punya banyak modul.
// ==========================================================
const moduleCards=document.getElementById('moduleCards');
if(moduleCards){
  moduleCards.innerHTML=modules.map(m=>{
    const r=roles[m.role] || {name:m.role,desc:'',color:'#075744',bg:'#eef6f2'};
    return `<article class="card">
      <span class="role-badge" style="${roleStyle(m.role)}">${escapeHtml(r.name)}</span>
      <h3>${escapeHtml(m.title)}</h3>
      <p class="module-desc">${escapeHtml(m.description || '')}</p>
      <a class="drive" href="${escapeHtml(m.url)}" target="_blank" rel="noopener">Buka modul</a>
    </article>`;
  }).join('');
}

// ==========================================================
// CASE STUDY
// ==========================================================
let currentCaseRole='weekly';

function renderWeeklyCase(){
  const wrap=document.getElementById('weeklyCaseWrap');
  if(!wrap) return;

  const list=(Array.isArray(weeklyCases)?weeklyCases:[]).filter(c=>c && c.active!==false && c.title);
  if(!list.length){
    wrap.innerHTML='<div class="empty-state">Belum ada Weekly Cases. Tambahkan di data.js.</div>';
    return;
  }

  wrap.innerHTML=list.map((item,index)=>`
    <article class="case-card">
      <div class="case-top">
        <span class="case-tag">WEEKLY CASES ${String(index+1).padStart(2,'0')}</span>
        <div class="case-meta-group">
          ${item.week ? `<span class="case-week">${escapeHtml(item.week)}</span>` : ''}
          ${item.role ? `<span class="case-role" style="${roleStyle(item.role)}">${escapeHtml(roleName(item.role))}</span>` : ''}
        </div>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="case-situation">${escapeHtml(item.situation || '')}</p>
      <p class="case-explain"><b>Penjelasan singkat:</b> ${escapeHtml(item.explanation || '')}</p>
      <button class="solution-toggle" onclick="toggleSolution(this)">Lihat penyelesaian</button>
      <div class="solution"><b>PENYELESAIAN</b><br>${escapeHtml(item.solution || '')}</div>
    </article>`).join('');
}

function renderCaseTabs(){
  const roleTabs=Object.keys(roles).filter(k=>k!=='all' && Array.isArray(cases[k]));
  const tabs=[{key:'weekly',label:'WEEKLY CASES'},...roleTabs.map(k=>({key:k,label:roleName(k)}))];

  if(!tabs.length){
    document.getElementById('caseTabs').innerHTML='';
    document.getElementById('caseList').innerHTML='<div class="empty-state">Belum ada studi kasus.</div>';
    return;
  }

  if(!tabs.some(t=>t.key===currentCaseRole)) currentCaseRole='weekly';
  document.getElementById('caseTabs').innerHTML=tabs.map(t=>
    `<button class="tab ${t.key===currentCaseRole?'active':''}" onclick="setCaseRole('${t.key}')">${escapeHtml(t.label)}</button>`
  ).join('');
}

function renderCases(){
  renderCaseTabs();
  const weeklyWrap=document.getElementById('weeklyCaseWrap');
  const listEl=document.getElementById('caseList');
  const labelEl=document.getElementById('caseContentLabel');

  if(currentCaseRole==='weekly'){
    if(labelEl) labelEl.textContent='WEEKLY CASES';
    if(weeklyWrap) weeklyWrap.style.display='grid';
    if(listEl) listEl.style.display='none';
    renderWeeklyCase();
    return;
  }

  if(labelEl) labelEl.textContent='CASE LIBRARY';
  if(weeklyWrap) weeklyWrap.style.display='none';
  if(listEl) listEl.style.display='grid';

  const list=cases[currentCaseRole] || [];
  listEl.innerHTML=list.length ? list.map((c,i)=>`
    <article class="case-card">
      <div class="case-top">
        <span class="case-tag">${escapeHtml(c[0] || `CASE ${String(i+1).padStart(2,'0')}`)}</span>
        <span class="case-role" style="${roleStyle(currentCaseRole)}">${escapeHtml(roleName(currentCaseRole))}</span>
      </div>
      <h3>${escapeHtml(c[1])}</h3>
      <p class="case-situation">${escapeHtml(c[2])}</p>
      <p class="case-explain"><b>Penjelasan singkat:</b> ${escapeHtml(c[3])}</p>
      <button class="solution-toggle" onclick="toggleSolution(this)">Lihat penyelesaian</button>
      <div class="solution"><b>PENYELESAIAN</b><br>${escapeHtml(c[4])}</div>
    </article>`).join('') : '<div class="empty-state">Belum ada studi kasus untuk role ini. Tambahkan di data.js.</div>';
}

function setCaseRole(role){
  currentCaseRole=role;
  renderCases();
}

function toggleSolution(btn){
  const solution=btn.nextElementSibling;
  const open=solution.classList.toggle('show');
  btn.textContent=open?'Tutup penyelesaian':'Lihat penyelesaian';
}

renderWeeklyCase();
renderCases();

// ==========================================================
// QUIZ
// ==========================================================
let currentQuizRole=Object.keys(roles)[0];
const quizScores={};
const quizAnswered={};

Object.keys(roles).forEach(role=>{
  const total=(quizzes[role] || []).length;
  quizScores[role]=0;
  quizAnswered[role]=new Array(total).fill(false);
});

function renderQuizTabs(){
  const tabData=Object.keys(roles).filter(k=>Array.isArray(quizzes[k]));
  if(!tabData.length){
    document.getElementById('quizTabs').innerHTML='';
    return;
  }
  if(!tabData.includes(currentQuizRole)) currentQuizRole=tabData[0];
  document.getElementById('quizTabs').innerHTML=tabData.map(k=>
    `<button class="tab ${k===currentQuizRole?'active':''}" onclick="setQuizRole('${k}')">${escapeHtml(roleName(k))}</button>`
  ).join('');
}

function renderQuiz(){
  renderQuizTabs();
  const list=quizzes[currentQuizRole] || [];
  document.getElementById('quizRoleLabel').textContent=roleName(currentQuizRole);
  document.getElementById('quizScore').textContent=`${quizScores[currentQuizRole] || 0} / ${list.length} benar`;
  document.getElementById('quizList').innerHTML=list.length ? list.map((q,qi)=>`
    <article class="quiz-card" data-quiz-index="${qi}">
      <div class="qtop">
        <span>Soal ${qi+1} / ${list.length}</span>
        <span>${quizAnswered[currentQuizRole]?.[qi]?'Sudah dijawab':''}</span>
      </div>
      <h3>${escapeHtml(q[0])}</h3>
      <div>${q[1].map((a,i)=>`
        <button class="ans" data-answer="${i}" ${quizAnswered[currentQuizRole]?.[qi]?'disabled':''} onclick="answerQuiz(${qi},${i},this)">
          ${String.fromCharCode(65+i)}. ${escapeHtml(a)}
        </button>`).join('')}</div>
      <div class="explain ${quizAnswered[currentQuizRole]?.[qi]?'':'hidden'}">
        ${quizAnswered[currentQuizRole]?.[qi]?`<b>Jawaban benar:</b> ${escapeHtml(q[1][q[2]])}<br><br><b>Penjelasan:</b> ${escapeHtml(q[3])}`:''}
      </div>
    </article>`).join('') : '<div class="empty-state">Belum ada kuis untuk role ini. Tambahkan di data.js.</div>';
}

function setQuizRole(role){
  currentQuizRole=role;
  renderQuiz();
}

function answerQuiz(qi,choice,button){
  if(quizAnswered[currentQuizRole][qi]) return;
  quizAnswered[currentQuizRole][qi]=true;
  const q=quizzes[currentQuizRole][qi];
  const card=button.closest('.quiz-card');
  const buttons=card.querySelectorAll('.ans');
  buttons.forEach(b=>b.disabled=true);
  buttons[q[2]].classList.add('correct');
  if(choice!==q[2]) button.classList.add('wrong');
  else quizScores[currentQuizRole]++;
  card.querySelector('.qtop span:last-child').textContent='Sudah dijawab';
  const explanation=card.querySelector('.explain');
  explanation.innerHTML=`<b>Jawaban benar:</b> ${escapeHtml(q[1][q[2]])}<br><br><b>Penjelasan:</b> ${escapeHtml(q[3])}`;
  explanation.classList.remove('hidden');
  document.getElementById('quizScore').textContent=`${quizScores[currentQuizRole]} / ${quizzes[currentQuizRole].length} benar`;
}

renderQuiz();

// ==========================================================
// REFRESHMENT
// ==========================================================
const refreshmentDateLabel=document.getElementById('refreshmentDateLabel');
const refreshmentRole=document.getElementById('refreshmentRole');
const refreshmentName=document.getElementById('refreshmentName');
const refreshmentColorCode=document.getElementById('refreshmentColorCode');
const refreshmentSetupNote=document.getElementById('refreshmentSetupNote');
const startRefreshmentBtn=document.getElementById('startRefreshmentBtn');
const refreshmentQuizPanel=document.getElementById('refreshmentQuizPanel');
const refreshmentList=document.getElementById('refreshmentList');
const refreshmentProgress=document.getElementById('refreshmentProgress');
const submitRefreshmentBtn=document.getElementById('submitRefreshmentBtn');
const refreshmentResult=document.getElementById('refreshmentResult');
let refreshmentStarted=false;

function formatRefreshmentDate(dateString){
  if(!dateString) return 'Tanggal belum diatur';
  const d=new Date(`${dateString}T00:00:00`);
  if(Number.isNaN(d.getTime())) return dateString;
  return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(d);
}

function getRefreshmentQuestions(){
  const role=refreshmentRole?.value || Object.keys(roles)[0];
  const questionsByRole=refreshment?.questions || {};
  return Array.isArray(questionsByRole[role]) ? questionsByRole[role] : [];
}

function updateRefreshmentAvailability(){
  if(!refreshmentSetupNote || !startRefreshmentBtn) return;
  const list=getRefreshmentQuestions();
  if(!refreshment?.date){
    refreshmentSetupNote.textContent='Tanggal Refreshment belum diatur.';
    startRefreshmentBtn.disabled=true;
    startRefreshmentBtn.style.opacity='.55';
    return;
  }
  if(!list.length){
    refreshmentSetupNote.textContent='Belum ada soal Refreshment untuk role ini.';
    startRefreshmentBtn.disabled=true;
    startRefreshmentBtn.style.opacity='.55';
    return;
  }
  refreshmentSetupNote.textContent=`${list.length} soal tersedia untuk ${roleName(refreshmentRole.value)}.`;
  startRefreshmentBtn.disabled=false;
  startRefreshmentBtn.style.opacity='1';
}

function resetRefreshmentSession(){
  refreshmentStarted=false;
  if(refreshmentQuizPanel) refreshmentQuizPanel.classList.add('hidden-panel');
  if(refreshmentResult) refreshmentResult.classList.add('hidden-panel');
  if(refreshmentList) refreshmentList.innerHTML='';
  if(submitRefreshmentBtn){
    submitRefreshmentBtn.disabled=false;
    submitRefreshmentBtn.textContent='Kirim Hasil';
  }
  updateRefreshmentAvailability();
}

function initRefreshment(){
  if(!refreshmentDateLabel) return;
  refreshmentDateLabel.textContent=formatRefreshmentDate(refreshment?.date);
  setSelectOptions(refreshmentRole);
  if(refreshmentRole){
    refreshmentRole.addEventListener('change',()=>{
      resetRefreshmentSession();
      if(refreshmentSetupNote) refreshmentSetupNote.textContent='Role berubah. Refreshment dimulai kembali dari awal.';
    });
  }
  updateRefreshmentAvailability();
}

function renderRefreshmentQuestions(){
  const list=getRefreshmentQuestions();
  refreshmentProgress.textContent=`${list.length} soal • Pilih satu jawaban untuk setiap soal`;
  refreshmentList.innerHTML=list.length ? list.map((q,qi)=>`
    <article class="quiz-card refreshment-question-card" data-refreshment-index="${qi}">
      <div class="qtop">
        <span>Soal ${qi+1} / ${list.length}</span>
        <span>Belum dijawab</span>
      </div>
      <h3>${escapeHtml(q.question)}</h3>
      <div>
        ${(q.options || []).map((option,i)=>`
          <button type="button" class="ans refreshment-answer" data-question="${qi}" data-answer="${i}">${String.fromCharCode(65+i)}. ${escapeHtml(option)}</button>`).join('')}
      </div>
    </article>`).join('') : '<div class="empty-state">Belum ada soal Refreshment.</div>';

  refreshmentList.querySelectorAll('.refreshment-answer').forEach(button=>{
    button.addEventListener('click',()=>{
      const qi=Number(button.dataset.question);
      const card=button.closest('.quiz-card');
      card.querySelectorAll('.refreshment-answer').forEach(btn=>btn.classList.remove('selected'));
      button.classList.add('selected');
      card.dataset.selected=button.dataset.answer;
      card.querySelector('.qtop span:last-child').textContent='Sudah dipilih';
    });
  });
}

function startRefreshment(){
  const name=refreshmentName?.value.trim();
  const role=refreshmentRole?.value;
  const colorCode=refreshmentColorCode?.value.trim();
  const list=getRefreshmentQuestions();

  if(!name){
    refreshmentName.focus();
    refreshmentSetupNote.textContent='Nama wajib diisi.';
    return;
  }
  if(!role){
    refreshmentRole.focus();
    refreshmentSetupNote.textContent='Role wajib dipilih.';
    return;
  }
  if(!colorCode){
    refreshmentColorCode.focus();
    refreshmentSetupNote.textContent='Kode warna wajib diisi.';
    return;
  }
  if(!refreshment?.date || !list.length){
    refreshmentSetupNote.textContent='Belum ada soal Refreshment untuk role ini.';
    return;
  }

  refreshmentStarted=true;
  refreshmentSetupNote.textContent='';
  renderRefreshmentQuestions();
  refreshmentQuizPanel.classList.remove('hidden-panel');
  refreshmentResult.classList.add('hidden-panel');
  refreshmentQuizPanel.scrollIntoView({behavior:'smooth',block:'start'});
}

async function submitRefreshment(){
  if(!refreshmentStarted) return;

  const list=getRefreshmentQuestions();
  const cards=[...refreshmentList.querySelectorAll('.refreshment-question-card')];
  const unanswered=cards.findIndex(card=>card.dataset.selected===undefined);

  if(unanswered!==-1){
    cards[unanswered].scrollIntoView({behavior:'smooth',block:'center'});
    cards[unanswered].querySelector('.qtop span:last-child').textContent='Wajib dijawab';
    return;
  }

  const correctCount=cards.reduce((total,card,qi)=>total+(Number(card.dataset.selected)===Number(list[qi].answer)?1:0),0);
  const totalQuestions=cards.length;
  const score=totalQuestions?Math.round((correctCount/totalQuestions)*100):0;

  submitRefreshmentBtn.disabled=true;
  submitRefreshmentBtn.textContent='Menyimpan...';

  let saveMessage='Hasil dihitung di perangkat.';
  let saveOk=false;

  if(supabaseClient){
    const payload={
      refreshment_date:refreshment.date,
      name:refreshmentName.value.trim(),
      role:roleName(refreshmentRole.value),
      color_code:refreshmentColorCode.value.trim(),
      score,
      total_question:totalQuestions
    };

    const {error}=await supabaseClient.from('refreshment_results').insert(payload);
    if(error){
      saveMessage=`Nilai tampil, tetapi penyimpanan ke database gagal: ${error.message}`;
      console.error('Refreshment save error:',error);
    }else{
      saveOk=true;
      saveMessage='✓ Hasil berhasil tersimpan.';
    }
  }else{
    saveMessage='Supabase belum terhubung.';
  }

  refreshmentResult.innerHTML=`
    <div class="result-score">${score}</div>
    <div class="result-main">${correctCount} / ${totalQuestions} benar</div>
    <div class="result-meta">${escapeHtml(refreshmentName.value.trim())} • ${escapeHtml(roleName(refreshmentRole.value))}</div>
    <div class="result-save ${saveOk?'success':'warning'}">${escapeHtml(saveMessage)}</div>`;
  refreshmentStarted=false;
  refreshmentResult.classList.remove('hidden-panel');
  submitRefreshmentBtn.textContent='Tersimpan';
  refreshmentResult.scrollIntoView({behavior:'smooth',block:'center'});
}

if(startRefreshmentBtn) startRefreshmentBtn.addEventListener('click',startRefreshment);
if(submitRefreshmentBtn) submitRefreshmentBtn.addEventListener('click',submitRefreshment);
initRefreshment();

// ==========================================================
// GALLERY
// Courier Standard menjadi salah satu kategori di Gallery.
// ==========================================================
const galleryTabs=document.getElementById('galleryTabs');
const galleryGrid=document.getElementById('galleryGrid');
let currentGalleryCategory=(galleryItems && galleryItems.length) ? galleryItems[0].category : '';

function renderGallery(){
  if(!galleryTabs || !galleryGrid) return;
  const categories=[...new Set((galleryItems || []).map(item=>item.category))];
  if(!categories.length){
    galleryTabs.innerHTML='';
    galleryGrid.innerHTML='<div class="empty-state">Belum ada konten gallery.</div>';
    return;
  }
  if(!categories.includes(currentGalleryCategory)) currentGalleryCategory=categories[0];
  galleryTabs.innerHTML=categories.map(category=>`<button class="tab ${category===currentGalleryCategory?'active':''}" onclick="setGalleryCategory('${escapeHtml(category)}')">${escapeHtml(category)}</button>`).join('');
  const list=(galleryItems || []).filter(item=>item.category===currentGalleryCategory);
  galleryGrid.innerHTML=list.map(item=>`
    <article class="gallery-card">
      <div class="gallery-image-wrap">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || 'Gallery')}" onerror="this.style.opacity='0.15';">
      </div>
      <div class="gallery-card-body">
        ${item.period ? `<span class="gallery-period">${escapeHtml(item.period)}</span>` : ''}
        ${item.title ? `<h3>${escapeHtml(item.title)}</h3>` : ''}
        ${item.name ? `<b>${escapeHtml(item.name)}</b>` : ''}
        ${item.subtitle ? `<p>${escapeHtml(item.subtitle)}</p>` : ''}
      </div>
    </article>`).join('');
}

function setGalleryCategory(category){
  currentGalleryCategory=category;
  renderGallery();
}

renderGallery();

// ==========================================================
// CHAT AI ASSISTANT — ROLE-AWARE
// Role diambil dari data.js, tetapi role ALL tidak ditawarkan.
// Hanya pilihan role yang disimpan di perangkat; riwayat chat tidak disimpan.
// ==========================================================
const chatAiFab=document.getElementById('chatAiFab');
const chatAiModal=document.getElementById('chatAiModal');
const chatAiForm=document.getElementById('chatAiForm');
const chatAiInput=document.getElementById('chatAiInput');
const chatAiSend=document.getElementById('chatAiSend');
const chatAiMessages=document.getElementById('chatAiMessages');
const chatAiStatus=document.getElementById('chatAiStatus');
const CHAT_AI_ROLE_STORAGE_KEY='healthyGoTrainingChatAiRole';
const CHAT_AI_ALLOWED_ROLES=['korlap','kurir','packing'];
const chatAiRoles=CHAT_AI_ALLOWED_ROLES.filter(key=>roles && roles[key]).map(key=>({key,...roles[key]}));
let activeChatAiRole=loadChatAiRole();

function loadChatAiRole(){
  try{const saved=localStorage.getItem(CHAT_AI_ROLE_STORAGE_KEY);return CHAT_AI_ALLOWED_ROLES.includes(saved)&&roles?.[saved]?saved:null;}catch(_){return null;}
}
function saveChatAiRole(role){
  if(!CHAT_AI_ALLOWED_ROLES.includes(role)||!roles?.[role])return false;
  activeChatAiRole=role;
  try{localStorage.setItem(CHAT_AI_ROLE_STORAGE_KEY,role);return true;}catch(_){return false;}
}
function renderChatAiMarkdown(text){
  const safe=escapeHtml(String(text??''));
  return safe.replace(/\*\*(.+?)\*\*/gs,'<strong>$1</strong>').replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/gs,'<strong>$1</strong>');
}
function scrollChatAiToBottom(){if(chatAiMessages)chatAiMessages.scrollTop=chatAiMessages.scrollHeight;}
function addChatAiMessage(text,type='ai'){
  if(!chatAiMessages)return null;
  const item=document.createElement('div');item.className=`chat-ai-message ${type}`;
  if(type==='ai'||type==='error')item.innerHTML=renderChatAiMarkdown(text);else item.textContent=String(text??'');
  chatAiMessages.appendChild(item);scrollChatAiToBottom();return item;
}
function addChatAiRoleChoices(prompt='Pilih role yang sesuai dengan tugasmu.'){
  if(!chatAiMessages)return;
  const item=document.createElement('div');item.className='chat-ai-message ai chat-ai-role-choice-message';
  const intro=document.createElement('div');intro.textContent=prompt;item.appendChild(intro);
  const list=document.createElement('div');list.className='chat-ai-role-choices';
  chatAiRoles.forEach(role=>{
    const button=document.createElement('button');button.type='button';button.className=`chat-ai-role-choice role-${role.key}`;button.dataset.chatAiRole=role.key;
    const name=document.createElement('strong');name.textContent=role.name;
    const desc=document.createElement('span');desc.textContent=role.desc||'';
    button.append(name,desc);list.appendChild(button);
  });
  item.appendChild(list);chatAiMessages.appendChild(item);scrollChatAiToBottom();
}
function openChatAi(){
  if(!chatAiModal)return;
  chatAiModal.classList.add('open');chatAiModal.setAttribute('aria-hidden','false');
  // Tidak memulihkan riwayat percakapan; hanya role yang diingat.
  if(chatAiMessages&&!chatAiMessages.dataset.initialized){
    chatAiMessages.innerHTML='';
    if(activeChatAiRole&&roles[activeChatAiRole]){
      addChatAiMessage(`Role aktif: **${roles[activeChatAiRole].name}**. Pilihan ini tersimpan di perangkatmu. Ada yang bisa aku bantu hari ini? Jika ingin ganti role, cukup ketik **ganti role** atau sebutkan role yang baru.`);
    }else{
      addChatAiMessage('Halo! 👋 Sebelum mulai, kamu bertugas sebagai apa hari ini? Pilih role supaya aku bisa menyesuaikan jawaban dengan tanggung jawabmu.');
      addChatAiRoleChoices('Pilih role kamu:');
    }
    chatAiMessages.dataset.initialized='true';
  }
  setTimeout(()=>chatAiInput?.focus(),80);
}
function closeChatAi(){if(!chatAiModal)return;chatAiModal.classList.remove('open');chatAiModal.setAttribute('aria-hidden','true');}
function setChatAiStatus(text='',type=''){if(!chatAiStatus)return;chatAiStatus.textContent=text;chatAiStatus.className=`form-note ${type}`;}
function normalizeChatAiText(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function detectChatAiRoleRequest(message){
  const text=normalizeChatAiText(message);
  const changeVerb=/\b(ganti|ubah|rubah|pindah|switch|change)\b/.test(text);
  const changeIntent=changeVerb&&(/\b(role|peran|posisi|tugas)\b/.test(text)||/\b(ke|jadi)\s+(korlap|kurir|packing|tim packing)\b/.test(text));
  const explicitRole=/\b(saya|aku|gw|gue|gua|sekarang|jadi|bertugas|sebagai)\b/.test(text)&&/\b(korlap|kurir|packing|tim packing)\b/.test(text);
  const directRole=/^(korlap|kurir|packing|tim packing)$/.test(text);
  if(!(changeIntent||explicitRole||directRole))return null;
  if(/\b(korlap)\b/.test(text))return {intent:'change',role:'korlap'};
  if(/\b(kurir)\b/.test(text))return {intent:'change',role:'kurir'};
  if(/\b(tim packing|packing)\b/.test(text))return {intent:'change',role:'packing'};
  return {intent:'choose',role:null};
}
function handleChatAiRoleRequest(request){
  if(request?.intent==='change'&&request.role&&CHAT_AI_ALLOWED_ROLES.includes(request.role)){
    const role=roles[request.role];addChatAiMessage(`Kamu ingin mengganti role menjadi **${role.name}**. Klik pilihan di bawah untuk mengonfirmasi.`);addChatAiRoleChoices('Konfirmasi role baru:');return;
  }
  addChatAiMessage('Tentu, kita bisa ganti role. Pilih role yang sesuai dengan tugasmu sekarang:');addChatAiRoleChoices('Pilih role baru:');
}
function confirmChatAiRole(roleKey){
  const role=chatAiRoles.find(item=>item.key===roleKey);if(!role)return;
  saveChatAiRole(roleKey);
  addChatAiMessage(role.name,'user');
  addChatAiMessage(`✅ **Role berhasil disimpan: ${role.name}.** Aku akan menyesuaikan jawabanku dengan tugas ${role.name}. Ada yang bisa aku bantu hari ini? Jika ingin ganti role, cukup ketik **ganti role** atau sebutkan role yang baru.`);
  setChatAiStatus('Role aktif: '+role.name);
}
const CHAT_AI_KEYWORDS=[
  'catering','katering','food','makanan','meal','packing','pack','box','order','pesanan','delivery','deliver','shipment','shipping','pengiriman','kurir','driver','customer','pelanggan','complaint','komplain','sop','operasional','quality','qc','quality check','label','alamat','pickup','handover','dispatch','retur','refund','telat','terlambat','rusak','salah','training','healthy go','motor','vehicle','kendaraan','berangkat','kirim','mengirim','antar','mengantar','serah terima','cek','periksa','kualitas','jumlah','kelengkapan','kendala','mogok','jalan','packing list','order sheet','scan','suhu','higien','hygiene'
];
function isAllowedChatTopic(message){const text=normalizeChatAiText(message);return CHAT_AI_KEYWORDS.some(keyword=>text.includes(keyword));}
async function sendChatAi(message){
  if(!supabaseClient)throw new Error('Supabase belum terhubung di browser.');
  if(!activeChatAiRole)throw new Error('Pilih role terlebih dahulu.');
  const {data,error}=await supabaseClient.functions.invoke('training-ai',{body:{message,role:activeChatAiRole}});
  if(error){
    try{const response=error.context;if(response&&typeof response.json==='function'){const payload=await response.clone().json();const detail=payload?.details?.error?.message||payload?.details?.message||payload?.error;if(detail)throw new Error(detail);}}catch(detailError){if(detailError instanceof Error&&detailError.message)throw detailError;}
    throw new Error(error.message||'Edge Function training-ai gagal dipanggil.');
  }
  if(!data?.answer)throw new Error(data?.error||'AI tidak memberikan jawaban.');return data.answer;
}
if(chatAiFab)chatAiFab.addEventListener('click',openChatAi);
document.querySelectorAll('[data-chat-ai-close]').forEach(el=>el.addEventListener('click',closeChatAi));
if(chatAiMessages)chatAiMessages.addEventListener('click',event=>{const button=event.target.closest('[data-chat-ai-role]');if(button)confirmChatAiRole(button.dataset.chatAiRole);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&chatAiModal?.classList.contains('open'))closeChatAi();});
if(chatAiForm)chatAiForm.addEventListener('submit',async event=>{
  event.preventDefault();const message=(chatAiInput?.value||'').trim();if(!message)return;
  addChatAiMessage(message,'user');chatAiInput.value='';
  // Ganti role ditangani di frontend dan tidak menghabiskan token Gemini.
  const roleRequest=detectChatAiRoleRequest(message);if(roleRequest){handleChatAiRoleRequest(roleRequest);chatAiInput.focus();return;}
  if(!activeChatAiRole){addChatAiMessage('Pilih role terlebih dahulu agar aku bisa memberikan jawaban yang sesuai.');addChatAiRoleChoices('Pilih role kamu:');chatAiInput.focus();return;}
  if(!isAllowedChatTopic(message)){addChatAiMessage('Maaf, aku hanya dapat membantu pertanyaan seputar operasional catering, packing, shipment/delivery, kurir, dan customer delivery.','ai');setChatAiStatus('Pertanyaan di luar scope training.');chatAiInput.focus();return;}
  chatAiSend.disabled=true;chatAiSend.textContent='...';setChatAiStatus('Sedang mencari jawaban...');
  try{const answer=await sendChatAi(message);addChatAiMessage(answer,'ai');setChatAiStatus('Role aktif: '+(roles[activeChatAiRole]?.name||activeChatAiRole));}
  catch(error){console.error('Chat AI error:',error);addChatAiMessage('Maaf, Chat AI sedang tidak dapat digunakan. Silakan coba lagi.','ai error');setChatAiStatus(`Koneksi Chat AI gagal: ${error?.message||'cek Edge Function training-ai di Supabase.'}`,'error');}
  finally{chatAiSend.disabled=false;chatAiSend.textContent='Kirim';chatAiInput.focus();}
});
// ==========================================================
// TANYA JAWAB
// Peserta: SELECT + INSERT questions
// Website: SELECT answers
// Trainer menjawab dari Supabase Dashboard.
// ==========================================================
const qnaName=document.getElementById('qnaName');
const qnaRole=document.getElementById('qnaRole');
const qnaQuestion=document.getElementById('qnaQuestion');
const qnaSubmitBtn=document.getElementById('qnaSubmitBtn');
const qnaRefreshBtn=document.getElementById('qnaRefreshBtn');
const qnaFormMessage=document.getElementById('qnaFormMessage');
const qnaFilterRole=document.getElementById('qnaFilterRole');
const qnaList=document.getElementById('qnaList');

let qnaData=[];

function initQna(){
  setSelectOptions(qnaRole);
  setSelectOptions(qnaFilterRole,true);
}

function setQnaMessage(message,type=''){
  if(!qnaFormMessage) return;
  qnaFormMessage.textContent=message;
  qnaFormMessage.className=`form-note ${type}`;
}

async function loadQna(){
  if(!qnaList) return;

  if(!supabaseClient){
    qnaList.innerHTML='<div class="empty-state">Supabase belum terhubung.</div>';
    return;
  }

  qnaList.innerHTML='<div class="loading-state">Memuat pertanyaan...</div>';

  const [questionsRes,answersRes]=await Promise.all([
    supabaseClient.from('questions').select('id,name,role,question,status,created_at').order('created_at',{ascending:false}),
    supabaseClient.from('answers').select('id,question_id,answer,answered_by,created_at').order('created_at',{ascending:false})
  ]);

  if(questionsRes.error){
    console.error('Questions load error:',questionsRes.error);
    qnaList.innerHTML='<div class="empty-state">Pertanyaan belum dapat dimuat. Cek RLS atau koneksi Supabase.</div>';
    return;
  }

  if(answersRes.error){
    console.error('Answers load error:',answersRes.error);
  }

  const latestAnswers=new Map();
  (answersRes.data || []).forEach(answer=>{
    if(!latestAnswers.has(answer.question_id)){
      latestAnswers.set(answer.question_id,answer);
    }
  });

  qnaData=(questionsRes.data || []).map(question=>({
    ...question,
    reply:latestAnswers.get(question.id) || null
  }));

  renderQnaList();
}

function renderQnaList(){
  if(!qnaList) return;
  const filter=qnaFilterRole?.value || 'all';
  const list=qnaData.filter(item=>filter==='all' || item.role===roleName(filter) || item.role===filter);

  if(!list.length){
    qnaList.innerHTML='<div class="empty-state">Belum ada pertanyaan untuk filter ini.</div>';
    return;
  }

  qnaList.innerHTML=list.map(item=>{
    const answered=Boolean(item.reply);
    const roleKey=Object.keys(roles).find(key=>roleName(key)===item.role) || item.role;
    const date=item.created_at ? new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(item.created_at)) : '';
    return `<article class="qna-card">
      <div class="qna-card-top">
        <div>
          <b>${escapeHtml(item.name)}</b>
          <span class="qna-dot">•</span>
          <span class="qna-role" style="${roleStyle(roleKey)}">${escapeHtml(item.role)}</span>
        </div>
        <span class="qna-date">${escapeHtml(date)}</span>
      </div>

      <p class="qna-question">“${escapeHtml(item.question)}”</p>

      <div class="qna-status ${answered?'answered':'open'}">
        <i></i>${answered?'Sudah dijawab':'Menunggu jawaban'}
      </div>

      ${answered?`
        <div class="qna-answer">
          <b>↳ ${escapeHtml(item.reply.answered_by || 'Trainer')}</b>
          <p>${escapeHtml(item.reply.answer)}</p>
        </div>`:''}
    </article>`;
  }).join('');
}

async function submitQna(){
  const name=qnaName?.value.trim();
  const role=qnaRole?.value;
  const question=qnaQuestion?.value.trim();

  if(!name){
    setQnaMessage('Nama wajib diisi.','error');
    qnaName.focus();
    return;
  }
  if(!role){
    setQnaMessage('Role wajib dipilih.','error');
    qnaRole.focus();
    return;
  }
  if(!question){
    setQnaMessage('Pertanyaan wajib diisi.','error');
    qnaQuestion.focus();
    return;
  }

  if(!supabaseClient){
    setQnaMessage('Supabase belum terhubung.','error');
    return;
  }

  qnaSubmitBtn.disabled=true;
  qnaSubmitBtn.textContent='Mengirim...';
  setQnaMessage('');

  const {error}=await supabaseClient.from('questions').insert({
    name,
    role:roleName(role),
    question,
    status:'open'
  });

  qnaSubmitBtn.disabled=false;
  qnaSubmitBtn.textContent='Kirim Pertanyaan';

  if(error){
    console.error('Question insert error:',error);
    setQnaMessage('Pertanyaan gagal dikirim. Cek RLS atau koneksi Supabase.','error');
    return;
  }

  qnaQuestion.value='';
  setQnaMessage('✓ Pertanyaan berhasil dikirim.','success');
  await loadQna();
}

if(qnaSubmitBtn) qnaSubmitBtn.addEventListener('click',submitQna);
if(qnaRefreshBtn) qnaRefreshBtn.addEventListener('click',loadQna);
if(qnaFilterRole) qnaFilterRole.addEventListener('change',renderQnaList);

initQna();
loadQna();
