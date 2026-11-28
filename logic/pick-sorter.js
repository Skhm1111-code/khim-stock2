/* =========================================================
   STORAGE, FIREBASE CLOUD SYNC, EXCEL & PNG/TELEGRAM EXPORT
   ========================================================= */
const DB_NAME='khim_stock_v2', LS_KEY='khim_stock_backup_v2';
let _db;

function idb(){
  return _db||(_db=new Promise((res,rej)=>{
    try{
      const r=indexedDB.open(DB_NAME,1);
      r.onupgradeneeded=()=>r.result.createObjectStore('kv');
      r.onsuccess=()=>res(r.result);
      r.onerror=()=>rej(r.error);
      r.onblocked=()=>rej(new Error('blocked'));
    }catch(e){rej(e);}
  }));
}

async function idbGet(k){
  try{
    const db=await idb();
    return await new Promise((res,rej)=>{
      const q=db.transaction('kv').objectStore('kv').get(k);
      q.onsuccess=()=>res(q.result);
      q.onerror=()=>rej(q.error);
    });
  }catch(e){
    try{const raw=localStorage.getItem(LS_KEY);return raw?JSON.parse(raw)[k]:undefined;}catch(_){return undefined;}
  }
}

async function idbPutMany(o){
  try{
    const safe={...o};
    if(Array.isArray(safe.gifs)&&JSON.stringify(safe.gifs).length>1500000)delete safe.gifs;
    const prev=JSON.parse(localStorage.getItem(LS_KEY)||'{}');
    const merged={...prev,...safe};
    if(JSON.stringify(merged).length<4200000)localStorage.setItem(LS_KEY,JSON.stringify(merged));
    else{delete merged.gifs;localStorage.setItem(LS_KEY,JSON.stringify(merged));}
  }catch(_){}
  const db=await idb();
  return new Promise((res,rej)=>{
    const t=db.transaction('kv','readwrite'),s=t.objectStore('kv');
    for(const k in o)s.put(o[k],k);
    t.oncomplete=res;
    t.onerror=()=>rej(t.error);
    t.onabort=()=>rej(t.error);
  });
}

const dirty=new Set();
let saveTimer;
function save(...keys){keys.forEach(k=>dirty.add(k));setBadge('កំពុងរក្សា…');clearTimeout(saveTimer);saveTimer=setTimeout(flush,80);}

async function flush(){
  clearTimeout(saveTimer);if(!dirty.size)return;
  const src={catalog,ledger,meta,gifs},out={};
  dirty.forEach(k=>out[k]=src[k]);dirty.clear();
  try{await idbPutMany(out);setBadge('✓ Saved '+(meta.sync?'· '+meta.sync:''));}
  catch(e){setBadge('✓ Local '+(meta.sync?'· '+meta.sync:''));}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush()});
window.addEventListener('pagehide',flush);
function setBadge(t,bad){const b=$('saveBadge');if(b){b.textContent=t;b.classList.toggle('bad',!!bad);}}

async function refreshAppCacheKeepData(){
  await flush();saveShelfData();
  try{
    if('caches' in window){const names=await caches.keys();await Promise.all(names.map(n=>caches.delete(n)));}
    if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()));}
  }catch(_){}
  toast('✓ សម្អាត Cache រួចរាល់ (ទិន្នន័យដើមនៅដដែល)! កំពុងផ្ទុកឡើងវិញ...');
  setTimeout(()=>location.reload(),700);
}

/* Firebase Cloud Sync */
let isSyncingCloud=false, sharedPushTimer;
function getFirebaseUrl(){return (meta.firebaseUrl && meta.firebaseUrl.trim().replace(/\/+$/,'')) || DEFAULT_FIREBASE_DB_URL;}
function saveFirebaseUrl(val){meta.firebaseUrl=(val||'').trim().replace(/\/+$/,'') || DEFAULT_FIREBASE_DB_URL;save('meta');toast('បានរក្សាទុក Firebase URL');pullSharedFromCloud(true);}
function scheduleSharedPush(){if(!getFirebaseUrl())return;clearTimeout(sharedPushTimer);sharedPushTimer=setTimeout(()=>syncSharedToCloud(false),700);}
function updateCloudStrip(title,sub){if($('cloudStatusLabel'))$('cloudStatusLabel').textContent=title;if($('cloudSubLabel'))$('cloudSubLabel').textContent=sub;}

async function syncSharedToCloud(notify){
  const fbUrl=getFirebaseUrl();if(!fbUrl || isSyncingCloud)return;
  isSyncingCloud=true;
  updateCloudStrip('⏳ កំពុង Save ទៅ Firebase...','សូមរង់ចាំបន្តិច');
  try{
    meta.updatedAt=Date.now();
    const res=await fetch(`${fbUrl}/${CLOUD_SHARED_NODE}.json`,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({updatedAt:meta.updatedAt,gifs,catalog,tableFont:meta.tableFont,shelfRacks:shelfData.racks})
    });
    if(!res.ok)throw new Error('HTTP '+res.status);
    setBadge('☁️ Shared Synced');
    updateCloudStrip('☁️ បាន Save ទៅ Firebase រួចរាល់',`${catalog.length} កូដ • ក្រុមការងារប្រើរួមគ្នាបានភ្លាម`);
    if(notify)toast('✓ Save & ផ្ញើទៅ Firebase រួចរាល់!');
  }catch(e){
    setBadge('Local · Offline');
    updateCloudStrip('⚠️ Save ក្នុងម៉ាស៊ីន','ចុច Settings ដើម្បីពិនិត្យ Firebase');
    if(notify)toast('Sync មិនបាន','err');
  }finally{isSyncingCloud=false;}
}

async function pullSharedFromCloud(notify){
  const fbUrl=getFirebaseUrl();if(!fbUrl || isSyncingCloud)return;
  isSyncingCloud=true;
  try{
    const res=await fetch(`${fbUrl}/${CLOUD_SHARED_NODE}.json?_t=${Date.now()}`,{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();if(!data){if(notify)toast('មិនទាន់មាន Catalog លើ Cloud ទេ','warn');return;}
    if(Array.isArray(data.gifs) && data.gifs.length){gifs=data.gifs.slice(0,MAX_GIFS);gifIdx=0;renderStage(true);renderGifGrid();save('gifs');}
    if(Array.isArray(data.catalog) && data.catalog.length){
      const isSampleOnly=(catalog.length<=1 && catalog[0]?.shortCode==='Y158' && catalog[0]?.variants?.[0]?.pCode==='P0080972');
      if(isSampleOnly || notify || (data.updatedAt && data.updatedAt > (meta.updatedAt||0))){
        catalog=data.catalog;buildIndex();save('catalog');
      }
    }
    if(data.shelfRacks && typeof data.shelfRacks==='object' && Object.keys(data.shelfRacks).length){
      const cloudCodes=countTotalShelfCodes(data.shelfRacks), localCodes=countTotalShelfCodes(shelfData.racks);
      if(cloudCodes>=localCodes || localCodes===0){
        shelfData.racks={...shelfData.racks,...data.shelfRacks};
        rebuildShelfIndex();saveShelfData();updateShelfToggleText();
      }
    }
    if(data.tableFont && !meta.customFontData){meta.tableFont=data.tableFont;applyTableFontStyle(meta.tableFont,meta.customFontData,meta.customFontLabel);save('meta');}
    render();setBadge('☁️ Shared Synced');updateCloudStrip('☁️ ទិន្នន័យរួមសកម្ម',`${catalog.length} កូដ`);
    if(notify)toast('✓ ទាញ Catalog ថ្មីពី Firebase រួចរាល់!');
  }catch(e){if(notify)toast('ទាញពី Firebase មិនបាន','err');}
  finally{isSyncingCloud=false;}
}

/* Excel & JSON Import/Export */
function handleQuickMasterDrop(ev){
  const file=ev.target.files[0];if(!file)return;
  if(file.name.toLowerCase().endsWith('.json')){
    const r=new FileReader();
    r.onload=async()=>{
      try{
        const d=JSON.parse(r.result);const list=Array.isArray(d)?d:(Array.isArray(d.catalog)?d.catalog:null);
        if(!list||!list.length)throw new Error('Invalid JSON');
        catalog=list;if(d.ledger&&typeof d.ledger==='object')ledger=d.ledger;if(Array.isArray(d.gifs))gifs=d.gifs.slice(0,MAX_GIFS);
        meta.sync=fmtDate();meta.active=catalog[0].shortCode;buildIndex();renderStage(true);save('catalog','ledger','meta','gifs');render();
        await syncSharedToCloud(true);
      }catch(err){toast('File JSON មិនត្រឹមត្រូវ!','err');}
      ev.target.value='';
    };
    r.readAsText(file);
  }else{importExcel(ev,true);}
}

function importExcel(ev,autoSync=false){
  const file=ev.target.files[0];if(!file)return;
  const st=$('upStatus');if(st){st.style.display='block';st.textContent='កំពុងអាន File…';}
  const rd=new FileReader();
  rd.onload=e=>setTimeout(async()=>{
    try{
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false});
      let h=3;for(let i=0;i<Math.min(15,rows.length);i++){const s=rows[i].join('|').toLowerCase();if(s.includes('code')&&s.includes('name')){h=i;break}}
      const hd=rows[h].map(x=>String(x).trim().toLowerCase());
      const col=(n,d)=>{const i=hd.indexOf(n);return i>=0?i:d};const fi=(s,d)=>{const i=hd.findIndex(x=>x.includes(s));return i>=0?i:d};
      const iC=col('code',1),iB=col('barcode',2),iN=col('name',3),iA=col('attributes',6),iP=col('price',7),iS=fi('stock qty',8),iG=fi('product group',12);
      const map=new Map(),seen=new Set();
      for(let r=h+1;r<rows.length;r++){
        const row=rows[r];if(!row||!row.length)continue;
        const pc=String(row[iC]||'').trim(),bc=String(row[iB]||'').trim(),full=String(row[iN]||'').trim();
        if(!full&&!pc)continue;if(pc&&seen.has(pc))continue;if(pc)seen.add(pc);
        let sc,nm=full;const sp=full.indexOf(' ');if(sp>0){sc=full.slice(0,sp).trim().toUpperCase();nm=full.slice(sp+1).trim()}else sc=(full||pc).toUpperCase();
        let color=String(row[iA]||'').trim();if(color.startsWith('-'))color=color.slice(1).trim();if(!color)color='-';
        const price=parseFloat(String(row[iP]).replace(/[^0-9.]/g,''))||0,sys=Math.round(parseFloat(String(iS>=0?row[iS]:0).replace(/,/g,''))||0),grp=String(row[iG]||'').trim()||'ទូទៅ';
        if(!map.has(sc))map.set(sc,{shortCode:sc,name:nm||sc,group:grp,price,variants:[]});
        const en=map.get(sc);if(price>0&&!en.price)en.price=price;en.variants.push({pCode:pc,barcode:bc,color,sysStock:sys});
      }
      const list=[...map.values()];if(!list.length){if(st)st.textContent='រកមិនឃើញទិន្នន័យ!';toast('រកមិនឃើញទិន្នន័យ!','err');return}
      if(!autoSync && !confirm(`ជំនួស catalog ដោយ ${list.length.toLocaleString()} កូដ?`))return;
      catalog=list;meta.sync=fmtDate();if(!curP()||meta.active!==curP().shortCode)meta.active=catalog[0].shortCode;
      buildIndex();save('catalog','meta');render();
      if(st)st.textContent=`✓ ជោគជ័យ ${list.length.toLocaleString()} កូដ`;
      await syncSharedToCloud(true);
    }catch(err){if(st)st.textContent='មានបញ្ហាក្នុងការអាន File!';toast('មានបញ្ហាក្នុងការអាន File!','err');}
    ev.target.value='';
  },30);
  rd.readAsArrayBuffer(file);
}

function exportExcel(){
  const head=['Short Code','P-Code','Barcode','Product Name','Group','Color','Price ($)','System Stock','Counted','Diff','Status','Shelf','Counted At'];
  const all=[head],bad=[head];
  catalog.forEach(p=>{const loc=findCodeLocations(p.shortCode)[0];p.variants.forEach(v=>{const e=ledger[vKey(p,v)],n=e?.n||0,d=n-(v.sysStock||0);const s=!e?'មិនទាន់រាប់':d===0?'ត្រូវ':d<0?'ខ្វះ':'លើស';const r=[p.shortCode,v.pCode,v.barcode,p.name,p.group,v.color,p.price,v.sysStock||0,n,d,s,loc?loc.rackId:'',e?new Date(e.t).toLocaleString():''];all.push(r);if(e&&d!==0)bad.push(r);});});
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(all),'Stock_Audit');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(bad),'Mismatch');XLSX.writeFile(wb,`KHIM_Stock_Check_${fmtDate()}.xlsx`);
}

function dl(name,blob){const a=document.createElement('a');a.download=name;a.href=URL.createObjectURL(blob);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
function backupJSON(){dl(`KHIM_backup_${fmtDate()}.json`,new Blob([JSON.stringify({v:1,catalog,ledger,meta,gifs,shelfData})],{type:'application/json'}))}
function restoreJSON(ev){
  const f=ev.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.catalog)||typeof d.ledger!=='object')throw 0;if(!confirm('Restore នឹងជំនួសទិន្នន័យទាំងអស់។ បន្ត?'))return;catalog=d.catalog;ledger=d.ledger;meta={...meta,...(d.meta||{})};if(d.shelfData&&d.shelfData.racks){shelfData={...shelfData,...d.shelfData};rebuildShelfIndex();saveShelfData();}gifs=Array.isArray(d.gifs)?d.gifs.slice(0,MAX_GIFS):gifs;if(!meta.exported)meta.exported={};undoStack=[];applyHeaderFlip();applyUiThemeAndIcons();applyTableFontStyle(meta.tableFont,meta.customFontData,meta.customFontLabel);renderStage(true);renderGifGrid();buildIndex();save('catalog','ledger','meta','gifs');render();toast('Restore ជោគជ័យ');}catch(e){alert('File Backup មិនត្រឹមត្រូវ!')}ev.target.value=''};
  r.readAsText(f);
}

/* PNG & Telegram Export */
function downloadPNG(){
  const p=curP(), card=$('card');if(!card)return;
  const clone=card.cloneNode(true);clone.removeAttribute('id');clone.classList.add('capture-clone');document.body.appendChild(clone);
  html2canvas(clone,{scale:3,backgroundColor:'#ffffff',useCORS:true}).then(cv=>{
    clone.remove();cv.toBlob(b=>{
      if(!b)return toast('បង្កើត PNG មិនបាន','err');
      const fname=`KHIM_${meta.active}_${fmtDate()}.png`, f=new File([b],fname,{type:'image/png'});
      if(p)markExported(p.shortCode);nextGifSmooth();triggerBlessingDance();
      if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:'Stock '+meta.active}).catch(()=>dl(fname,b));
      else dl(fname,b);
    },'image/png');
  }).catch(()=>{clone.remove();toast('បង្កើត PNG មិនបាន','err');});
}

function copyTextFallback(str,msg){
  const ok=()=>toast(msg);
  const fb=()=>{const t=document.createElement('textarea');t.value=str;document.body.appendChild(t);t.select();try{document.execCommand('copy');ok()}catch(e){toast('Copy មិនបាន','err')}t.remove()};
  if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(str).then(ok,fb);else fb();
}
function copyCodeOnly(){const p=curP();if(!p)return;copyTextFallback(p.shortCode,'Copy កូដ '+p.shortCode+' រួចរាល់');}
function copyTelegram(){
  const p=curP();if(!p)return;const last=productLastCountTime(p), dStr=last?fmtDate(last):fmtDate(), locs=findCodeLocations(p.shortCode);
  const uniqueRacks=[...new Set(locs.map(x=>x.rackId))];
  const shelfLine=uniqueRacks.length?`🏆 ឆាន: ${uniqueRacks.join(', ')}\n`:'';
  let a=0,s=0,L=`${p.shortCode} - ${p.name} (${p.price}$)\n${shelfLine}📅 ${dStr}\n----------------------\n`;
  p.variants.forEach(v=>{const n=cnt(p,v),sys=v.sysStock||0,d=n-sys;a+=n;s+=sys;const diffTxt=!counted(p,v)?'⏳ មិនទាន់រាប់':d===0?'✅ ត្រូវ':d<0?`❌ ខ្វះ ${-d}`:`⚠ លើស ${d}`;L+=`• ${v.color&&v.color!=='-'?v.color:'ចំនួនរាប់'}: = ${n} (ពពក ${sys}) ➔ ${diffTxt}\n`;});
  L+=`----------------------\nសរុបរាប់បាន: = ${a} (ពពក ${s}) ${a===s?'✅':'Diff '+(a-s)}\n${uniqueRacks.length?'🏆 ឆាន: '+uniqueRacks.join(', '):''}`.trim();
  markExported(p.shortCode);nextGifSmooth();triggerBlessingDance();copyTextFallback(L,'Copy '+p.shortCode+' រួចរាល់');
}
