/* =========================================================
   CORE APP LOGIC: SEARCH, COUNTING, THEME, GIFS & SETTINGS
   ========================================================= */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MAX_GIFS=20;
const DEFAULT_FIREBASE_DB_URL='https://stok-8afca-default-rtdb.asia-southeast1.firebasedatabase.app';
const CLOUD_SHARED_NODE='khim_stock_shared_catalog';
const ANDROID_APK_URL='https://github.com/skhm1111-code/skhm1111-code.github.io/releases/latest/download/KHIM-Stock.apk';
const DEFAULT_SHELF_SHEET_URL='https://docs.google.com/spreadsheets/d/1Vbaa5NgbN5iL7vLe1skF2TB3YSgHOgN9mTGS1VPunFA/edit?usp=sharing';

const KH_DIGITS={'០':'0','១':'1','២':'2','៣':'3','៤':'4','៥':'5','៦':'6','៧':'7','៨':'8','៩':'9'};
const normDigits=s=>String(s||'').replace(/[០-៩]/g,d=>KH_DIGITS[d]||d);
const normCode=s=>normDigits(s).trim().toUpperCase().replace(/\s+/g,'');

const UI_THEMES={
  green :{g:'#14532d',g2:'#166534',gs:'#dcfce7',rgb:'20,83,45'},
  blue  :{g:'#0f3d7a',g2:'#1d4ed8',gs:'#dbeafe',rgb:'15,61,122'},
  purple:{g:'#581c87',g2:'#7e22ce',gs:'#f3e8ff',rgb:'88,28,135'},
  orange:{g:'#c2410c',g2:'#ea580c',gs:'#ffedd5',rgb:'194,65,12'},
  slate :{g:'#1e293b',g2:'#334155',gs:'#e2e8f0',rgb:'30,41,59'}
};

const ICON_PACKS={
  outline:{
    label:'Outline',
    undo:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>`,
    png :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 10 5 5 5-5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>`,
    tg  :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>`,
    edit:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`
  },
  commerce:{
    label:'Commerce',
    undo:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>`,
    png :`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 13-5-5h3V7h4v4h3l-5 5z"/></svg>`,
    tg  :`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
    edit:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`
  },
  classic:{
    label:'Classic',
    undo:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>`,
    png :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    tg  :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    edit:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
  }
};

const SAMPLE=[{shortCode:'Y158',name:'ច្រាស់ដុសធ្មេញ',group:'ទូទៅ',price:0.45,variants:[
  {pCode:'P0080972',barcode:'6930114380306',color:'ចំនួនរាប់',sysStock:564}]}];

let catalog=[], ledger={};
let meta={
  active:'',sync:'',exported:{},logoFlipped:false,stageEnabled:true,darkMode:false,updatedAt:0,
  uiTheme:'green',iconPack:'outline',apkUrl:'',firebaseUrl:DEFAULT_FIREBASE_DB_URL,
  tableFont:"'Kantumruy Pro','Plus Jakarta Sans',sans-serif",customFontData:'',customFontLabel:''
};
let gifs=[], gifIdx=0, index=new Map(), dups=new Set(), undoStack=[], hlKey=null;

const vKey=(p,v)=>v.pCode?'p:'+v.pCode:'c:'+p.shortCode+'__'+v.color;
const cnt=(p,v)=>ledger[vKey(p,v)]?.n||0;
const counted=(p,v)=>!!ledger[vKey(p,v)];
const curP=()=>catalog.find(p=>p.shortCode===meta.active)||catalog[0];
const fmtDate=t=>{const d=t?new Date(t):new Date();return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getFullYear()).slice(-2)};

/* Settings Tab Switcher */
function switchSettingsTab(tabId){
  document.querySelectorAll('#settingsTabs .set-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===tabId));
  document.querySelectorAll('#adminModal .set-pane').forEach(pane=>pane.classList.toggle('active',pane.id===tabId));
}

function applyUiThemeAndIcons(){
  const tKey=meta.uiTheme && UI_THEMES[meta.uiTheme] ? meta.uiTheme : 'green';
  const t=UI_THEMES[tKey];
  document.documentElement.style.setProperty('--g',t.g);
  document.documentElement.style.setProperty('--g2',t.g2);
  document.documentElement.style.setProperty('--gs',t.gs);
  document.documentElement.style.setProperty('--g-rgb',t.rgb);
  document.querySelectorAll('#themeSwatches .swatch-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.theme===tKey));

  const pKey=meta.iconPack && ICON_PACKS[meta.iconPack] ? meta.iconPack : 'outline';
  const pack=ICON_PACKS[pKey];
  if($('icoUndo'))$('icoUndo').innerHTML=pack.undo;
  if($('icoPng'))$('icoPng').innerHTML=pack.png;
  if($('icoTg'))$('icoTg').innerHTML=pack.tg;
  if($('icoEdit'))$('icoEdit').innerHTML=pack.edit;
  if($('iconPackVal'))$('iconPackVal').textContent=pack.label;
  document.querySelectorAll('.icon-pack-card').forEach(card=>card.classList.toggle('active',card.dataset.pack===pKey));
}

function setUiTheme(themeName){meta.uiTheme=themeName;applyUiThemeAndIcons();save('meta');toast('✓ បានប្តូរពណ៌ Theme រួចរាល់');}
function setIconPack(packName){meta.iconPack=packName;applyUiThemeAndIcons();save('meta');toast('✓ បានប្តូរម៉ូដ Icon: '+ICON_PACKS[packName].label);}

(function initSmoothStars(){
  const layer=$('starLayer');if(!layer)return;
  layer.innerHTML='';
  [[7,11,0.2],[22,26,1.1],[78,14,0.6],[90,38,1.9],[12,64,2.4],[68,75,1.4],[92,84,0.4],[44,9,1.7]].forEach(([x,y,delay])=>{
    const s=document.createElement('div');s.className='star-spark';s.style.left=x+'%';s.style.top=y+'%';s.style.animationDelay=delay+'s';layer.appendChild(s);
  });
})();

function applyTableFontStyle(fontCss, customDataUrl, customName){
  if(customDataUrl){
    let stEl=$('dynamicCustomFontStyle');
    if(!stEl){stEl=document.createElement('style');stEl.id='dynamicCustomFontStyle';document.head.appendChild(stEl);}
    stEl.textContent=`@font-face{font-family:'UserUploadedKhmerFont';src:url('${customDataUrl}');}`;
  }
  const chosen=fontCss || "'Kantumruy Pro','Plus Jakarta Sans',sans-serif";
  document.documentElement.style.setProperty('--table-font',chosen);
  const sel=$('tableFontSelect');
  if(sel){
    if(chosen.includes('UserUploadedKhmerFont') && !sel.querySelector("option[value*='UserUploadedKhmerFont']")){
      const opt=document.createElement('option');opt.value="'UserUploadedKhmerFont',sans-serif";opt.textContent=(customName||'Custom Font')+' (Uploaded)';sel.appendChild(opt);
    }
    sel.value=chosen;
  }
  if($('customFontName') && customName)$('customFontName').textContent='Font៖ '+customName;
}

function setTableFont(val){meta.tableFont=val;applyTableFontStyle(val,meta.customFontData,meta.customFontLabel);save('meta');scheduleSharedPush();toast('បានប្តូរ Font គ្រប់តារាងរួចរាល់');}
function uploadCustomFont(ev){
  const f=ev.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{if(typeof rd.result==='string'){meta.customFontData=rd.result;meta.customFontLabel=f.name;meta.tableFont="'UserUploadedKhmerFont',sans-serif";applyTableFontStyle(meta.tableFont,meta.customFontData,meta.customFontLabel);save('meta');toast('✓ បញ្ចូល Font '+f.name+' រួចរាល់!');}};
  rd.readAsDataURL(f);ev.target.value='';
}

function getApkUrl(){return (meta.apkUrl && meta.apkUrl.trim()) || ANDROID_APK_URL;}
function saveApkUrl(val){meta.apkUrl=(val||'').trim();save('meta');toast('បានរក្សាទុក Link APK');}
function downloadAndroidApk(){const url=getApkUrl();if(!url){toast('សូមដាក់ Link File .apk ក្នុង Settings ជាមុនសិន','warn');openM('adminModal');return;}window.open(url,'_blank','noopener');}
function applyHeaderFlip(){const hdr=$('mainHeader');if(hdr)hdr.classList.toggle('flipped',!!meta.logoFlipped);}

/* GIF Stage & Blessings */
let stageSwapTimer, gifIntervalId=null;
function toggleDrawer(id){const el=$(id);if(el){const isHidden=el.style.display==='none';if(isHidden)el.style.display='block';else el.classList.toggle('open');}}
function toggleStageEnabled(on){meta.stageEnabled=!!on;applyStageVisibility();save('meta');toast(meta.stageEnabled?'បានបើករូបភាពមានចលនា':'បានបិទរូបភាពមានចលនា');}
function applyStageVisibility(){
  const enabled=meta.stageEnabled!==false;
  const st=$('centerStage');if(st)st.style.visibility=enabled?'visible':'hidden';
  if($('toggleStageSwitch'))$('toggleStageSwitch').checked=enabled;
  if($('gifStatusSub'))$('gifStatusSub').textContent=enabled?'កំពុងបើកបង្ហាញលើក្បាលកម្មវិធី':'បានបិទបង្ហាញ';
}
function renderStage(instant=false){
  const img=$('stageImg'), def=$('defaultDancer');
  clearTimeout(stageSwapTimer);applyStageVisibility();
  if(!gifs.length){img.style.display='none';def.style.display='flex';def.classList.remove('fading');return;}
  if(gifIdx>=gifs.length)gifIdx=0;
  const nextSrc=gifs[gifIdx];def.style.display='none';
  if(instant || img.style.display==='none' || !img.src){img.src=nextSrc;img.style.display='block';img.classList.remove('fading');return;}
  img.classList.add('fading');
  stageSwapTimer=setTimeout(()=>{img.src=nextSrc;img.classList.remove('fading');},220);
}
function renderGifGrid(){
  const grid=$('gifGrid');if(!grid)return;
  $('gifCountText').textContent=`កំពុងប្រើ ${gifs.length} / ${MAX_GIFS} រូប`;
  if($('gifCountBadge'))$('gifCountBadge').textContent=`${gifs.length} រូប`;
  if(!gifs.length){grid.innerHTML='<div style="grid-column:1/-1;font-size:12px;color:var(--mut);padding:6px 0">មិនទាន់មានរូប GIF/Sticker ទេ</div>';return;}
  grid.innerHTML=gifs.map((src,i)=>`<div class="gif-slot" title="រូបទី ${i+1}"><img src="${src}" alt="GIF ${i+1}"><button class="gif-rm" onclick="removeGif(${i})" title="លុប">×</button></div>`).join('');
}
function addGifFiles(ev){
  const files=[...(ev.target.files||[])];ev.target.value='';if(!files.length)return;
  const slotsLeft=MAX_GIFS-gifs.length;if(slotsLeft<=0){toast(`ពេញ ${MAX_GIFS} រូបហើយ!`,'warn');return;}
  const picked=files.slice(0,slotsLeft);let done=0, addedCount=0;
  picked.forEach(file=>{
    const rd=new FileReader();
    rd.onload=()=>{if(typeof rd.result==='string'&&gifs.length<MAX_GIFS){gifs.push(rd.result);addedCount++;}done++;if(done===picked.length){meta.updatedAt=Date.now();save('gifs','meta');if(gifs.length===addedCount)gifIdx=0;renderStage(true);renderGifGrid();syncSharedToCloud(false);toast(`✓ Add រូបវិលជុំបាន +${addedCount} រូប`);}};
    rd.onerror=()=>{done++;if(done===picked.length){save('gifs');renderStage(true);renderGifGrid();}};
    rd.readAsDataURL(file);
  });
}
function removeGif(i){gifs.splice(i,1);if(gifIdx>=gifs.length)gifIdx=0;meta.updatedAt=Date.now();save('gifs','meta');renderStage(true);renderGifGrid();syncSharedToCloud(false);}
function clearAllGifs(){if(!gifs.length)return toast('មិនមានរូបត្រូវលុបទេ','warn');if(!confirm('លុបរូបវិលជុំទាំងអស់ចេញ?'))return;gifs=[];gifIdx=0;meta.updatedAt=Date.now();save('gifs','meta');renderStage(true);renderGifGrid();syncSharedToCloud(false);toast('បានលុបរូបវិលជុំទាំងអស់');}
function nextGifSmooth(){if(gifs.length>1){gifIdx=(gifIdx+1)%gifs.length;renderStage(false);}}
function handleStageClick(){nextGifSmooth();triggerBlessingDance();}
function startGifTimer(){if(gifIntervalId)clearInterval(gifIntervalId);gifIntervalId=setInterval(()=>nextGifSmooth(),3500);}

const BLESSINGS=['សាធុ! រាប់ស្តុកត្រូវ ១០០%! 🎉','សាធុ! ស្រស់ស្រាយ អត់ Stress! ✨','សាធុ! ជោគជ័យ លក់ដាច់ខ្លាំង! 💃','សាធុ! រាប់រួចលឿនរហ័ស! 🎊'];
let blessIdx=0, partyTimer, bubbleTimer;
function triggerBlessingDance(customMsg){
  const stage=$('centerStage'), bubble=$('blessingBubble'), msg=customMsg||BLESSINGS[blessIdx++ % BLESSINGS.length];
  if(stage){stage.classList.remove('party');void stage.offsetWidth;stage.classList.add('party');clearTimeout(partyTimer);partyTimer=setTimeout(()=>stage.classList.remove('party'),1900);}
  if(bubble){bubble.textContent=msg;bubble.classList.add('show');clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>bubble.classList.remove('show'),2100);}
  const rect=stage?stage.getBoundingClientRect():{left:window.innerWidth*0.5,top:30,width:44,height:42};
  const cx=rect.left+rect.width/2, cy=rect.top+rect.height/2, emojis=['🎉','✨','🎊','💃','🕺','🙏','💚'], layer=$('burstLayer');
  if(layer){
    for(let i=0;i<14;i++){
      const el=document.createElement('span');el.className='burst-piece';el.textContent=emojis[i%emojis.length];
      const angle=(Math.PI*2/14)*i + (Math.random()*0.35 - 0.175), dist=55 + Math.random()*95;
      el.style.left=cx+'px';el.style.top=cy+'px';
      el.style.setProperty('--dx',(Math.cos(angle)*dist).toFixed(1)+'px');
      el.style.setProperty('--dy',(Math.sin(angle)*dist - 25).toFixed(1)+'px');
      el.style.setProperty('--rot',(Math.random()*360 - 180)+'deg');
      el.style.fontSize=(16 + Math.floor(Math.random()*9))+'px';
      layer.appendChild(el);setTimeout(()=>el.remove(),1350);
    }
  }
}

/* Sound & Toast */
let ac, toastT;
function beep(ok){
  try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type=ok?'sine':'square';o.frequency.value=ok?1200:220;g.gain.value=.15;o.start();o.stop(ac.currentTime+(ok?.08:.35));}catch(e){}
  if(navigator.vibrate)navigator.vibrate(ok?30:[120,60,120]);
}
function toast(msg,type='ok'){const t=$('toast');t.textContent=msg;t.className=type;t.style.display='block';clearTimeout(toastT);toastT=setTimeout(()=>t.style.display='none',type==='err'?3200:2600)}

/* Catalog Index, Search & Counting */
function buildIndex(){
  index=new Map();dups=new Set();
  catalog.forEach(p=>p.variants.forEach(v=>{
    [v.barcode,v.pCode].forEach(k=>{if(!k)return;const kl=normCode(k),ex=index.get(kl);if(ex&&ex.v!==v)dups.add(kl);else index.set(kl,{p,v});});
  }));
}

function bump(p,v,d){const key=vKey(p,v),prev=ledger[key]?ledger[key].n:null,cur=prev||0,n=Math.max(0,cur+d);undoStack.push({key,prev});if(undoStack.length>50)undoStack.shift();ledger[key]={n,t:Date.now()};save('ledger','meta');}
function setCount(p,v,n){const key=vKey(p,v),prev=ledger[key]?ledger[key].n:null;undoStack.push({key,prev});ledger[key]={n:Math.max(0,n|0),t:Date.now()};save('ledger');}
function undo(){const u=undoStack.pop();if(!u)return toast('គ្មានអ្វីត្រូវ Undo','warn');if(u.prev===null)delete ledger[u.key];else ledger[u.key]={n:u.prev,t:Date.now()};save('ledger');render();toast('Undo រួចរាល់');}
function resetCounts(){if(!confirm('លុបចំនួនរាប់ទាំងអស់?'))return;if(!confirm('ប្រាកដមែនទេ?'))return;ledger={};meta.exported={};undoStack=[];save('ledger','meta');render();toast('បានលុបចំនួនរាប់');}

function scan(raw){
  const q=normCode(raw);if(!q)return false;
  const hit=index.get(q);
  if(hit){
    meta.active=hit.p.shortCode;hlKey=vKey(hit.p,hit.v);shelfData.activeLocIdx=0;
    bump(hit.p,hit.v,1);render();beep(true);
    const sHits=findCodeLocations(hit.p.shortCode);
    updateSearchShelfBanner(hit.p.shortCode,sHits);announceShelfLocation(hit.p.shortCode);
    if(dups.has(q))toast('⚠ Barcode ស្ទួន!','warn');
    return true;
  }
  const p=catalog.find(x=>normCode(x.shortCode)===q);
  if(p){selectProduct(p.shortCode);return true;}
  const sHits=findCodeLocations(q);
  if(sHits.length){
    shelfData.selectedRack=sHits[0].rackId;shelfData.activeLocIdx=0;saveShelfData();
    updateSearchShelfBanner(q,sHits);announceShelfLocation(q);beep(true);
    return true;
  }
  return false;
}

function onEnter(){
  const inp=$('scanInput'),rawVal=inp.value.trim();if(!rawVal)return;
  const qNorm=normCode(rawVal);inp.value='';$('drop').classList.remove('show');
  if(scan(rawVal))return;
  const ql=qNorm.toLowerCase();
  const f=catalog.find(p=>normCode(p.shortCode).toLowerCase().startsWith(ql) || p.name.toLowerCase().includes(ql) || p.variants.some(v=>normCode(v.pCode||'').toLowerCase().includes(ql)||normCode(v.barcode||'').toLowerCase().includes(ql)||(v.color||'').toLowerCase().includes(ql)));
  if(f){selectProduct(f.shortCode);return;}
  const shelfMatches=findShelfCodesByQuery(qNorm);
  if(shelfMatches.length){
    const best=shelfMatches[0];shelfData.selectedRack=best.locs[0].rackId;shelfData.activeLocIdx=0;saveShelfData();
    updateSearchShelfBanner(best.code,best.locs);beep(true);
    toast(`🏆 ${best.code} ➔ ឆាន ${[...new Set(best.locs.map(x=>x.rackId))].join(', ')}`);
    return;
  }
  beep(false);toast('រកមិនឃើញ "'+rawVal+'"','err');
}

function liveSearch(){
  const rawQ=$('scanInput').value.trim(), qNorm=normCode(rawQ), q=qNorm.toLowerCase(), d=$('drop');
  if(!q){d.classList.remove('show');updateSearchShelfBanner('',[]);return;}
  const shelfMatches=findShelfCodesByQuery(qNorm);
  const exactShelfMatch=shelfMatches.find(m=>m.code===qNorm) || shelfMatches[0];
  if(exactShelfMatch && exactShelfMatch.locs.length)updateSearchShelfBanner(exactShelfMatch.code,exactShelfMatch.locs);
  else updateSearchShelfBanner('',[]);

  const rackMatchCodes=new Set();
  const normRack=qNorm.replace(/^(?:ឆាន|ធ្នើរ|ថ្នើរ)/,'').replace(/^([A-Z]+)[-–—_/]?(\d+)$/,'$1-$2');
  if(shelfData.racks[normRack])Object.values(shelfData.racks[normRack]).forEach(arr=>arr.forEach(c=>rackMatchCodes.add(normCode(c))));

  const m=catalog.filter(p=>{
    const sc=normCode(p.shortCode).toLowerCase();
    return sc.includes(q) || p.name.toLowerCase().includes(q) || (p.group||'').toLowerCase().includes(q) ||
      p.variants.some(v=>normCode(v.pCode||'').toLowerCase().includes(q)||normCode(v.barcode||'').toLowerCase().includes(q)||(v.color||'').toLowerCase().includes(q)) ||
      rackMatchCodes.has(normCode(p.shortCode));
  }).slice(0,50);

  const catalogCodeSet=new Set(m.map(p=>normCode(p.shortCode)));
  let html=m.map(p=>{
    const loc=findCodeLocations(p.shortCode)[0];
    const locBadge=loc?`<span style="background:var(--gs);color:var(--g);padding:2px 7px;border-radius:6px;font-weight:800;font-size:11px;margin-left:5px">🏆 ឆាន ${esc(loc.rackId)}</span>`:'';
    return `<div class="it" data-code="${esc(p.shortCode)}"><div><strong style="color:var(--g);font-size:15px">${esc(p.shortCode)}</strong>${locBadge} <span style="font-weight:600">${esc(p.name)}</span></div><span style="font-size:12px;color:var(--mut)">${p.variants.length} ពណ៌ • ${esc(p.price)}$</span></div>`;
  }).join('');

  html += shelfMatches.filter(sm=>!catalogCodeSet.has(sm.code)).slice(0,50).map(sm=>{
    const rNames=[...new Set(sm.locs.map(x=>x.rackId))];
    return `<div class="it" onclick="openShelfForCode('${esc(sm.code)}','${esc(rNames[0])}')"><div><strong style="color:var(--g);font-size:15px">🏆 ${esc(sm.code)}</strong> <span style="background:var(--gs);color:var(--g);padding:2px 7px;border-radius:6px;font-weight:800;font-size:11px;margin-left:4px">ឆាន ${esc(rNames.join(', '))}</span></div><span style="font-size:11px;color:var(--g2);font-weight:800">មើលឆាន ›</span></div>`;
  }).join('');

  d.innerHTML=html || `<div class="it" style="color:var(--mut)">រកមិនឃើញ</div>`;
  d.classList.add('show');
}

function openShelfForCode(code,rackId){if(rackId)shelfData.selectedRack=rackId;shelfData.activeLocIdx=0;saveShelfData();$('drop')?.classList.remove('show');if($('scanInput'))$('scanInput').value=code;updateSearchShelfBanner(code,findCodeLocations(code));openShelfModalForCurrent();}
function updateSearchShelfBanner(codeLabel,hits){const banner=$('searchShelfBanner');if(!banner)return;if(shelfData.enabled===false || !codeLabel || !hits || !hits.length){banner.classList.remove('show');return;}const uniqueRacks=[...new Set(hits.map(h=>h.rackId))];$('ssbBadge').textContent='🏆 ឆាន '+uniqueRacks.join(', ');$('ssbCode').textContent='កូដ '+codeLabel;banner.classList.add('show');}
function selectProduct(code){meta.active=code;hlKey=null;shelfData.activeLocIdx=0;$('scanInput').value='';$('drop').classList.remove('show');save('meta');render();const hits=findCodeLocations(code);updateSearchShelfBanner(code,hits);announceShelfLocation(code);}
function statusOf(n,sys,has){if(!has)return['pend','មិនទាន់រាប់'];const d=n-sys;if(d===0)return['ok','✓ ត្រូវ'];return d<0?['short','ខ្វះ '+(-d)]:['over','លើស '+d];}

function productLastCountTime(p){return Math.max(0,...p.variants.map(v=>ledger[vKey(p,v)]?.t||0));}
function isProductUnsavedExport(p){if(!p)return false;const lastCnt=productLastCountTime(p);if(!lastCnt)return false;return ((meta.exported&&meta.exported[p.shortCode])||0) < lastCnt;}
function markExported(code){if(!meta.exported)meta.exported={};meta.exported[code]=Date.now();save('meta');render();}
function handleLogoClick(){const unsavedCount=catalog.filter(p=>isProductUnsavedExport(p)).length;if(unsavedCount>0)openUnsavedModal();else triggerBlessingDance('សាធុ! រាប់រួច និង Save រួចរាល់! 🎉');}

function render(){
  const p=curP();
  if(!p){$('dCode').textContent='—';$('dVars').innerHTML='<div class="vn" style="padding:14px 0;color:var(--mut)">សូមទម្លាក់ File ឬ Upload Excel ក្នុង Settings</div>';updateProgress();return}
  meta.active=p.shortCode;
  const hits=findCodeLocations(p.shortCode), uniqueRacks=[...new Set(hits.map(h=>h.rackId))];
  const channelLabel=uniqueRacks.length ? ('🏆 ឆាន '+uniqueRacks.join(', ')) : '🏆 ឆាន —';
  if($('glassNavPos'))$('glassNavPos').textContent=channelLabel;
  if($('dFootChannel'))$('dFootChannel').textContent=channelLabel;

  $('dCode').textContent=p.shortCode;$('dName').textContent=p.name;$('dPrice').textContent=p.price+'$';
  const last=productLastCountTime(p);$('dDate').textContent='📅 '+(last?fmtDate(last):fmtDate());

  const unsaved=isProductUnsavedExport(p), expEl=$('dExpStatus');
  if(!last){expEl.style.display='none';$('card').classList.remove('need-export');$('btnPng').classList.remove('remind');$('btnTg').classList.remove('remind');}
  else if(unsaved){expEl.style.display='inline-block';expEl.className='exp-tag no';expEl.textContent='⚠ មិនទាន់ Save រូប/ផ្ញើ';$('card').classList.add('need-export');$('btnPng').classList.add('remind');$('btnTg').classList.add('remind');}
  else{expEl.style.display='inline-block';expEl.className='exp-tag yes';expEl.textContent='✓ Save រូប/ផ្ញើរួច';$('card').classList.remove('need-export');$('btnPng').classList.remove('remind');$('btnTg').classList.remove('remind');}

  let sS=0,sA=0;
  $('dVars').innerHTML=p.variants.map((v,i)=>{
    const n=cnt(p,v),sys=v.sysStock||0;sS+=sys;sA+=n;
    const [cls,txt]=statusOf(n,sys,counted(p,v));
    return `<div class="vl ${hlKey===vKey(p,v)?'hl':''}"><div><div class="vn">${esc(v.color&&v.color!=='-'?v.color:'ចំនួនរាប់')}</div>${v.pCode?`<div class="vb">${esc(v.pCode)}${v.barcode?' • '+esc(v.barcode):''}</div>`:''}</div><div class="vr"><div class="qc"><button class="qb" data-a="m" data-i="${i}">−</button><input type="number" class="qi" data-i="${i}" value="${n}" inputmode="numeric"><button class="qb p" data-a="p" data-i="${i}">+</button></div><div class="sc"><div class="big">= ${n}</div><div class="sub-row"><span class="sm">ពពក ${sys}</span><span class="st ${cls}">${txt}</span></div></div></div></div>`;
  }).join('');
  $('dSys').textContent='ចំនួនសរុប: '+sS;$('dAct').textContent='= '+sA;
  $('pills').innerHTML=catalog.slice(0,6).map(x=>{const u=isProductUnsavedExport(x);return `<button class="pill ${x.shortCode===p.shortCode?'a':''} ${u?'unexp':''}" data-code="${esc(x.shortCode)}">${esc(x.shortCode)}${u?' •':''}</button>`;}).join('');
  renderMiniShelfForProduct(p);updateProgress();
}

function updateProgress(){
  let done=0,bad=0,unsavedList=[];
  catalog.forEach(p=>{if(p.variants.some(v=>counted(p,v))){done++;if(p.variants.some(v=>counted(p,v)&&cnt(p,v)!==(v.sysStock||0)))bad++;if(isProductUnsavedExport(p))unsavedList.push(p);}});
  $('progA').textContent=`រាប់ហើយ ${done.toLocaleString()}/${catalog.length.toLocaleString()} កូដ`;
  $('progB').textContent=bad?`មិនត្រូវ ${bad} កូដ`:'';
  const lb=$('logoBadge');if(unsavedList.length>0){lb.classList.add('show');lb.textContent=String(unsavedList.length);}else{lb.classList.remove('show');lb.textContent='0';}
  $('stats').textContent=`catalog ${catalog.length.toLocaleString()} កូដ • រាប់ហើយ ${done.toLocaleString()} • មិនត្រូវគ្នា ${bad}`;
}

function openUnsavedModal(){
  const list=catalog.filter(p=>isProductUnsavedExport(p)), box=$('unsavedList');
  if(!list.length)box.innerHTML='<p style="color:var(--g);font-weight:700;padding:12px 0">✓ កូដដែលបានរាប់ទាំងអស់ សុទ្ធតែបាន Save រូប/ផ្ញើរួចរាល់ហើយ!</p>';
  else box.innerHTML=list.map(p=>{const tot=p.variants.reduce((acc,v)=>acc+cnt(p,v),0);return `<div class="ulist-item" onclick="selectProduct('${esc(p.shortCode)}');closeM('unsavedModal')"><div><strong style="color:var(--g);font-size:16px">${esc(p.shortCode)}</strong><span style="font-weight:700;margin-left:6px">${esc(p.name)}</span><div style="font-size:11px;color:var(--mut);margin-top:2px">រាប់សរុបបាន: = ${tot}</div></div><span style="font-size:12px;font-weight:800;color:#b45309;background:var(--orgs);padding:4px 9px;border-radius:8px">បើក Save ➔</span></div>`;}).join('');
  openM('unsavedModal');
}

function openM(id){
  if(id==='adminModal'){
    updateProgress();renderGifGrid();applyUiThemeAndIcons();
    if($('apkLinkInput'))$('apkLinkInput').value=getApkUrl();
    if($('firebaseUrlInput'))$('firebaseUrlInput').value=getFirebaseUrl();
    if($('shelfSheetUrlInput'))$('shelfSheetUrlInput').value=shelfData.sheetUrl||DEFAULT_SHELF_SHEET_URL;
    if($('shelfPrefixInput'))$('shelfPrefixInput').value=shelfData.prefix||'';
    if($('shelfSheetUrl2Input'))$('shelfSheetUrl2Input').value=shelfData.sheetUrl2||'';
    if($('shelfPrefix2Input'))$('shelfPrefix2Input').value=shelfData.prefix2||'';
    updateShelfToggleText();
    applyTableFontStyle(meta.tableFont,meta.customFontData,meta.customFontLabel);
  }
  $(id).classList.add('open');
}
function closeM(id){$(id).classList.remove('open');if(id==='adminModal')$('scanInput').focus();}

function edRow(v,i){return `<div class="erow" data-i="${i}"><input class="inp c" value="${esc(v.color||'')}" placeholder="ពណ៌"><input class="inp n" type="number" value="${v.n||0}"><input class="inp s" type="number" value="${v.sys||0}"><button class="del" onclick="this.parentElement.remove()">×</button></div>`;}
function openEdit(){const p=curP();if(!p)return;$('edCode').value=p.shortCode;$('edPrice').value=p.price;$('edName').value=p.name;$('edGroup').value=p.group||'';$('edRows').innerHTML=p.variants.map((v,i)=>edRow({color:v.color,n:cnt(p,v),sys:v.sysStock},i)).join('');openM('editModal');}
function addEdRow(){$('edRows').insertAdjacentHTML('beforeend',edRow({},-1));}
function applyEdit(){
  const p=curP(),newCode=$('edCode').value.trim().toUpperCase();if(!newCode)return alert('សូមបញ្ចូលកូដ!');
  if(newCode!==p.shortCode&&catalog.some(x=>x.shortCode===newCode))return alert('កូដ '+newCode+' មានរួចហើយ!');
  const rows=[...document.querySelectorAll('#edRows .erow')];if(!rows.length)return alert('ត្រូវមានយ៉ាងតិច ១ ពណ៌!');
  const old=p.variants.map(v=>({key:vKey(p,v),e:ledger[vKey(p,v)]}));
  const nv=rows.map(r=>{const i=+r.dataset.i,b=i>=0?p.variants[i]:{pCode:'',barcode:''};return {v:{pCode:b.pCode,barcode:b.barcode,color:r.querySelector('.c').value.trim()||'-',sysStock:parseInt(r.querySelector('.s').value)||0},n:parseInt(r.querySelector('.n').value)||0,prev:i>=0?old[i].e:null};});
  old.forEach(o=>delete ledger[o.key]);p.shortCode=newCode;p.price=parseFloat($('edPrice').value)||0;p.name=$('edName').value.trim()||newCode;p.group=$('edGroup').value.trim()||'ទូទៅ';p.variants=nv.map(x=>x.v);
  nv.forEach(x=>{if(x.n>0||x.prev)ledger[vKey(p,x.v)]={n:x.n,t:x.prev?.t||Date.now()}});
  meta.active=newCode;buildIndex();save('catalog','ledger','meta');scheduleSharedPush();render();closeM('editModal');
}
function deleteProduct(){const p=curP();if(!p||!confirm('លុបកូដ '+p.shortCode+' ពី catalog?'))return;p.variants.forEach(v=>delete ledger[vKey(p,v)]);if(meta.exported)delete meta.exported[p.shortCode];catalog=catalog.filter(x=>x!==p);meta.active=catalog[0]?.shortCode||'';buildIndex();save('catalog','ledger','meta');scheduleSharedPush();render();closeM('editModal');}
function createProduct(){const code=$('nCode').value.trim().toUpperCase();if(!code)return alert('សូមវាយកូដអីវ៉ាន់!');if(catalog.some(p=>p.shortCode===code)&&!confirm('កូដ '+code+' មានរួចហើយ។ ជំនួសវា?'))return;const cols=$('nColors').value.split(',').map(s=>s.trim()).filter(Boolean);const variants=(cols.length?cols:['-']).map(c=>({pCode:'',barcode:'',color:c,sysStock:0}));const np={shortCode:code,name:$('nName').value.trim()||code,group:$('nGroup').value.trim()||'ទូទៅ',price:parseFloat($('nPrice').value)||0,variants};const i=catalog.findIndex(p=>p.shortCode===code);if(i>=0)catalog[i]=np;else catalog.unshift(np);meta.active=code;buildIndex();save('catalog','meta');scheduleSharedPush();render();closeM('adminModal');toast('បានបន្ថែម '+code);}

/* Event Bindings & Bootstrap */
$('dVars').addEventListener('pointerdown',e=>{const b=e.target.closest('[data-a]');if(!b)return;e.preventDefault();const p=curP(),v=p.variants[+b.dataset.i];hlKey=vKey(p,v);bump(p,v,b.dataset.a==='p'?1:-1);render();});
$('dVars').addEventListener('change',e=>{if(!e.target.classList.contains('qi'))return;const p=curP(),v=p.variants[+e.target.dataset.i];setCount(p,v,parseInt(e.target.value)||0);render();});
function codeClick(e){const t=e.target.closest('[data-code]');if(t)selectProduct(t.dataset.code)}
$('drop').addEventListener('click',codeClick);$('pills').addEventListener('click',codeClick);
$('scanInput').addEventListener('input',liveSearch);
$('scanInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();onEnter()}});
document.addEventListener('click',e=>{if(!e.target.closest('.sw'))$('drop').classList.remove('show')});

(function initLogoDrag(){
  const lw=$('logoWrap');if(!lw)return;
  let startX=0, moved=false, dragging=false;
  lw.addEventListener('pointerdown',e=>{dragging=true;moved=false;startX=e.clientX;lw.classList.add('dragging');try{lw.setPointerCapture(e.pointerId)}catch(_){}});
  lw.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-startX;if(Math.abs(dx)>18){moved=true;const shouldFlip=dx<0;if(meta.logoFlipped!==shouldFlip){meta.logoFlipped=shouldFlip;applyHeaderFlip();save('meta');}startX=e.clientX;}});
  const endDrag=()=>{if(!dragging)return;dragging=false;lw.classList.remove('dragging');if(!moved)handleLogoClick();};
  lw.addEventListener('pointerup',endDrag);lw.addEventListener('pointercancel',endDrag);
})();

let appInitialized=false;
async function initApp(){
  if(appInitialized)return;
  appInitialized=true;
  loadShelfData();
  startGifTimer();
  try{
    if(navigator.storage?.persist)navigator.storage.persist();
    const [c,l,m,g]=await Promise.all([idbGet('catalog'),idbGet('ledger'),idbGet('meta'),idbGet('gifs')]);
    catalog=c&&c.length?c:JSON.parse(JSON.stringify(SAMPLE));
    ledger=l||{};meta={...meta,...(m||{})};gifs=Array.isArray(g)?g.slice(0,MAX_GIFS):[];
    if(!meta.exported)meta.exported={};
    applyHeaderFlip();applyUiThemeAndIcons();applyTableFontStyle(meta.tableFont,meta.customFontData,meta.customFontLabel);
    renderStage(true);setBadge('✓ Ready '+(meta.sync?'· '+meta.sync:''));
    await pullSharedFromCloud(false);
    await syncShelfFromGoogleSheet(false);
  }catch(e){
    catalog=JSON.parse(JSON.stringify(SAMPLE));applyUiThemeAndIcons();renderStage(true);setBadge('✓ Ready');
  }
  buildIndex();rebuildShelfIndex();render();$('scanInput')?.focus();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initApp,{once:true});
else initApp();
