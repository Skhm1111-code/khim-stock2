/* =========================================================
   SHELF RACK MAP (2 LINKS) & FULL-SCREEN CALCULATOR
   ========================================================= */
const SHELF_KEY='khim_shelf_map_v4';
const TIER_NAMES={1:'ជួរ ១',2:'ជួរ ២',3:'ជួរ ៣',4:'ជួរ ៤'};
const SLOT_NAMES={0:'ប្រឡោះ ១',1:'ប្រឡោះ ២',2:'ប្រឡោះ ៣',3:'ប្រឡោះ ៤',4:'ប្រឡោះ ៥'};

let shelfCodeIndex=new Map();
let shelfData={
  enabled:true,
  selectedRack:'K-1',
  sheetUrl:DEFAULT_SHELF_SHEET_URL,
  prefix:'',
  sheetUrl2:'',
  prefix2:'A',
  lastSynced:'',
  editingSlot:null,
  activeLocIdx:0,
  rackCols:{'K-1':3,'K-2':3},
  rackSource:{'K-1':1,'K-2':1},
  racks:{
    'K-1':{'1_0':['Z293'],'1_1':['Y336'],'1_2':['R044'],'2_0':['Y370'],'2_1':['Y337'],'3_0':['Y542'],'3_1':['Y669'],'3_2':['Y158'],'4_1':['Y337']},
    'K-2':{'1_1':['U249'],'2_0':['Z289','U936'],'3_0':['Y865'],'3_2':['Y517'],'4_1':['U310'],'4_2':['Y629']}
  }
};

function getRackColCount(rackId){
  if(shelfData.rackCols && shelfData.rackCols[rackId])return Math.max(3,Math.min(5,shelfData.rackCols[rackId]));
  const slots=shelfData.racks[rackId]||{};let maxIdx=2;
  Object.keys(slots).forEach(k=>{const sIdx=parseInt(k.split('_')[1],10)||0;if(sIdx>maxIdx)maxIdx=sIdx;});
  return Math.max(3,Math.min(5,maxIdx+1));
}
function getSlotIndicesLTR(colCount){const n=Math.max(3,Math.min(5,colCount||3)),arr=[];for(let i=0;i<n;i++)arr.push(i);return arr;}
function parsePrefixList(str){return String(str||'').split(/[\s,;/]+/).map(x=>normDigits(x).trim().toUpperCase()).filter(Boolean);}
function matchesPrefixRules(codeOrRack, prefixList){
  if(!prefixList || !prefixList.length)return true;
  const target=normCode(codeOrRack), lead=(target.match(/^[A-Z]+/)||[''])[0];
  return prefixList.some(p=>target.startsWith(p) || lead===p);
}

function rebuildShelfIndex(){
  shelfCodeIndex=new Map();
  const racks=shelfData.racks||{};
  for(const rackId of Object.keys(racks)){
    const slots=racks[rackId]||{}, srcNum=(shelfData.rackSource && shelfData.rackSource[rackId])||1;
    for(const slotKey of Object.keys(slots)){
      const parts=String(slotKey).split('_'), tier=parseInt(parts[0],10)||1, slot=parseInt(parts[1],10)||0;
      for(const rawCode of (slots[slotKey]||[])){
        const c=normCode(rawCode);if(!c)continue;
        if(!shelfCodeIndex.has(c))shelfCodeIndex.set(c,[]);
        const list=shelfCodeIndex.get(c);
        if(!list.some(x=>x.rackId===rackId && x.tier===tier && x.slot===slot))list.push({rackId,tier,slot,source:srcNum});
      }
    }
  }
}

function findCodeLocations(shortCode){
  const target=normCode(shortCode);if(!target)return[];
  if(shelfCodeIndex.has(target)){
    const all=[...shelfCodeIndex.get(target)];
    const p1=parsePrefixList(shelfData.prefix), p2=parsePrefixList(shelfData.prefix2);
    all.sort((a,b)=>{
      const aM2=p2.length && matchesPrefixRules(target,p2) && a.source===2, bM2=p2.length && matchesPrefixRules(target,p2) && b.source===2;
      if(aM2!==bM2)return aM2?-1:1;
      const aM1=p1.length && matchesPrefixRules(target,p1) && a.source===1, bM1=p1.length && matchesPrefixRules(target,p1) && b.source===1;
      if(aM1!==bM1)return aM1?-1:1;
      return 0;
    });
    return all;
  }
  const hits=[], racks=shelfData.racks||{};
  for(const rackId of Object.keys(racks)){
    const slots=racks[rackId]||{}, cols=getRackColCount(rackId);
    for(let t=4;t>=1;t--){
      for(let s=0;s<cols;s++){
        if((slots[`${t}_${s}`]||[]).some(c=>normCode(c)===target))hits.push({rackId,tier:t,slot:s,source:(shelfData.rackSource&&shelfData.rackSource[rackId])||1});
      }
    }
  }
  return hits;
}

function findShelfCodesByQuery(rawQuery){
  const q=normCode(rawQuery);if(!q)return[];
  const matchedCodes=[];
  for(const [code,locs] of shelfCodeIndex.entries()){
    if(code===q || code.startsWith(q) || code.includes(q))matchedCodes.push({code,locs,exact:code===q,prefix:code.startsWith(q)});
  }
  matchedCodes.sort((a,b)=>{
    if(a.exact!==b.exact)return a.exact?-1:1;
    if(a.prefix!==b.prefix)return a.prefix?-1:1;
    return a.code.localeCompare(b.code,undefined,{numeric:true});
  });
  return matchedCodes;
}

function extractGoogleSheetId(urlOrId){
  const s=String(urlOrId||'').trim(), m=s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if(m)return m[1];
  if(/^[a-zA-Z0-9-_]{20,}$/.test(s))return s;
  return '';
}

function loadShelfData(){
  try{
    const raw=localStorage.getItem(SHELF_KEY) || localStorage.getItem('khim_shelf_map_v3');
    if(raw){
      const parsed=JSON.parse(raw);
      shelfData={
        enabled:parsed.enabled!==false,
        selectedRack:parsed.selectedRack||'K-1',
        sheetUrl:parsed.sheetUrl||DEFAULT_SHELF_SHEET_URL,
        prefix:parsed.prefix||'',
        sheetUrl2:parsed.sheetUrl2||'',
        prefix2:parsed.prefix2!==undefined?parsed.prefix2:'A',
        lastSynced:parsed.lastSynced||'',
        editingSlot:null,
        activeLocIdx:0,
        rackCols:parsed.rackCols&&typeof parsed.rackCols==='object'?parsed.rackCols:{'K-1':3,'K-2':3},
        rackSource:parsed.rackSource&&typeof parsed.rackSource==='object'?parsed.rackSource:{'K-1':1,'K-2':1},
        racks:parsed.racks&&typeof parsed.racks==='object'?parsed.racks:shelfData.racks
      };
    }
  }catch(_){}
  rebuildShelfIndex();
  if($('toggleShelfSwitch'))$('toggleShelfSwitch').checked=shelfData.enabled!==false;
  updateShelfToggleText();
}

function saveShelfData(){
  rebuildShelfIndex();
  try{
    localStorage.setItem(SHELF_KEY,JSON.stringify({
      enabled:shelfData.enabled!==false,selectedRack:shelfData.selectedRack,sheetUrl:shelfData.sheetUrl,
      prefix:shelfData.prefix,sheetUrl2:shelfData.sheetUrl2,prefix2:shelfData.prefix2,
      lastSynced:shelfData.lastSynced,rackCols:shelfData.rackCols,rackSource:shelfData.rackSource,racks:shelfData.racks
    }));
  }catch(_){}
}

function countTotalShelfCodes(racksObj){let n=0;Object.values(racksObj||{}).forEach(slots=>{Object.values(slots||{}).forEach(arr=>{n+=(arr||[]).length;});});return n;}

function updateShelfToggleText(){
  const on=shelfData.enabled!==false;
  if($('shelfToggleSub'))$('shelfToggleSub').textContent=on?'កំពុងបើកបង្ហាញលេខក្បាលឆាន':'បានបិទ (មិនលោតលើក្រដាសរាប់ស្តុក)';
  const rackCount=Object.keys(shelfData.racks||{}).length, codeCount=countTotalShelfCodes(shelfData.racks);
  const sampleCodes=[...shelfCodeIndex.keys()].slice(0,5).join(', ');
  if($('shelfTotalRacksBadge'))$('shelfTotalRacksBadge').textContent=`${rackCount} ឆាន (${codeCount} កូដ)`;
  if($('shelfSyncStatus'))$('shelfSyncStatus').textContent=shelfData.lastSynced ? `${shelfData.lastSynced} • ${rackCount} ឆាន` : `${rackCount} ឆាន • ${codeCount} កូដ`;
  if($('shelfDebugInfo')){
    const linkInfo=shelfData.sheetUrl2 ? '2 Link សកម្ម' : '1 Link សកម្ម';
    $('shelfDebugInfo').textContent=`📊 ${linkInfo} • ${rackCount} ឆាន • ${codeCount} កូដ` + (sampleCodes ? ` (ឧ. ${sampleCodes})` : '');
  }
}

function toggleShelfEnabled(on){shelfData.enabled=!!on;shelfData.activeLocIdx=0;saveShelfData();updateShelfToggleText();render();toast(shelfData.enabled?'✓ បានបើកបង្ហាញលេខក្បាលឆាន':'បានបិទបង្ហាញឆាន');}
function saveShelfSheetUrl(val){shelfData.sheetUrl=(val||'').trim()||DEFAULT_SHELF_SHEET_URL;saveShelfData();toast('បានរក្សាទុក Link Google Sheet ទី 1');}
function saveShelfPrefix(val){shelfData.prefix=(val||'').trim().toUpperCase();saveShelfData();toast(shelfData.prefix?`Link 1 កំណត់ត្រកូល "${shelfData.prefix}"`:'Link 1 ចាប់ទាំងអស់');}
function saveShelfSheetUrl2(val){shelfData.sheetUrl2=(val||'').trim();saveShelfData();toast(shelfData.sheetUrl2?'✓ បានរក្សាទុក Link Google Sheet ទី 2':'បានលុប Link ទី 2');}
function saveShelfPrefix2(val){shelfData.prefix2=(val||'').trim().toUpperCase();saveShelfData();toast(shelfData.prefix2?`Link 2 កំណត់ត្រកូល "${shelfData.prefix2}"`:'Link 2 ចាប់ទាំងអស់');}

function parseRawCsvToGrid(text){
  const cleanText=String(text||'').replace(/^\uFEFF/,''), firstLine=cleanText.split(/\r?\n/)[0]||'';
  const delim=((firstLine.match(/\t/g)||[]).length > (firstLine.match(/,/g)||[]).length)?'\t':',';
  const rows=[];let row=[], cur='', inQuotes=false;
  for(let i=0;i<cleanText.length;i++){
    const ch=cleanText[i], next=cleanText[i+1];
    if(inQuotes){if(ch==='"' && next==='"'){cur+='"';i++;}else if(ch==='"')inQuotes=false;else cur+=ch;}
    else{
      if(ch==='"')inQuotes=true;
      else if(ch===delim){row.push(cur.trim());cur='';}
      else if(ch==='\r' && next==='\n'){row.push(cur.trim());rows.push(row);row=[];cur='';i++;}
      else if(ch==='\n' || ch==='\r'){row.push(cur.trim());rows.push(row);row=[];cur='';}
      else cur+=ch;
    }
  }
  if(cur.length>0 || row.length>0){row.push(cur.trim());rows.push(row);}
  return rows;
}

function extractCodesFromCell(rawCell){
  const cleaned=normDigits(rawCell||'').toUpperCase().trim();
  if(!cleaned || /^(?:ឆាន|ធ្នើរ|ថ្នើរ)?\s*[A-Z]{1,4}\s*[-–—_/]\s*\d{1,4}$/.test(cleaned) || /^(?:ជួរ|ប្រឡោះ|ថ្នើរ|TIER|ROW|SLOT)?\s*[0-9]{1,2}$/.test(cleaned))return[];
  const out=[];
  for(const tok of cleaned.split(/[\s,;/|+\n()]+/).map(x=>x.trim()).filter(Boolean)){
    if(/^(?:ឆាន|ធ្នើរ|ថ្នើរ)?[A-Z]{1,4}[-–—_/]\d{1,4}$/.test(tok))continue;
    const alphaNumMatches=tok.match(/[A-Z]{1,5}[-_]?\d{1,7}[A-Z0-9]*/g);
    if(alphaNumMatches){
      for(const m of alphaNumMatches){const cleanM=m.replace(/^[-_]+|[-_]+$/g,'');if(cleanM.length>=2 && !out.includes(cleanM))out.push(cleanM);}
      continue;
    }
    if(/^\d{3,14}$/.test(tok) && !out.includes(tok))out.push(tok);
  }
  return out;
}

function parseWarehouseGridToRacks(grid, prefixFilter='', targetRacks=null, sourceNum=1, targetRackCols=null, targetRackSource=null){
  const prefixList=parsePrefixList(prefixFilter);
  const isRackHeader=txt=>{const clean=normDigits(txt||'').trim();if(!clean)return false;return /^(?:ឆាន|ធ្នើរ|ថ្នើរ)\s*[A-Z]{1,4}\s*[-–—_/]?\s*[0-9]{1,4}$/i.test(clean) || /^[A-Z]{1,4}\s*[-–—_/]\s*[0-9]{1,4}$/i.test(clean);};
  const normalizeRackId=txt=>{let s=normDigits(txt||'').trim().replace(/^(?:ឆាន|ធ្នើរ|ថ្នើរ)\s*/i,'').toUpperCase().replace(/\s+/g,'');return s.replace(/^([A-Z]+)[-–—_/]?(\d+)$/,'$1-$2');};
  const rackHeaders=[];
  for(let r=0;r<grid.length;r++)for(let c=0;c<(grid[r]||[]).length;c++){const cell=String(grid[r][c]||'').trim();if(isRackHeader(cell))rackHeaders.push({row:r,col:c,rackId:normalizeRackId(cell)});}
  if(!rackHeaders.length)return null;
  const newRacks=targetRacks||{}, rCols=targetRackCols||{}, rSrc=targetRackSource||{};
  for(let idx=0;idx<rackHeaders.length;idx++){
    const cur=rackHeaders[idx];let blockWidth=3;
    const sameRowNext=rackHeaders.find(h=>h.row===cur.row && h.col>cur.col);
    if(sameRowNext)blockWidth=Math.max(1,Math.min(5,sameRowNext.col-cur.col));
    else{
      let maxDataCol=cur.col+2;
      for(let off=1;off<=8 && (cur.row+off)<grid.length;off++){const rr=grid[cur.row+off]||[];for(let cc=cur.col;cc<Math.min(rr.length,cur.col+5);cc++)if(String(rr[cc]||'').trim())maxDataCol=Math.max(maxDataCol,cc);}
      blockWidth=Math.max(1,Math.min(5,maxDataCol-cur.col+1));
    }
    const rowEntries=[];let maxUsedColOffset=0;
    for(let offset=1;offset<=12;offset++){
      const r=cur.row+offset;if(r>=grid.length)break;
      if(rackHeaders.some(h=>h.row===r && h.col>=cur.col && h.col<cur.col+blockWidth))break;
      const colsInRow=[];
      for(let cOffset=0;cOffset<blockWidth;cOffset++){
        const rawCell=String(grid[r]?.[cur.col+cOffset]||'').trim();if(!rawCell || isRackHeader(rawCell))continue;
        let codes=extractCodesFromCell(rawCell);
        if(prefixList.length && !matchesPrefixRules(cur.rackId,prefixList))codes=codes.filter(cd=>matchesPrefixRules(cd,prefixList));
        if(codes.length){colsInRow.push({cOffset,codes});if(cOffset>maxUsedColOffset)maxUsedColOffset=cOffset;}
      }
      if(colsInRow.length){rowEntries.push(colsInRow);if(rowEntries.length>=4)break;}
    }
    if(!rowEntries.length && prefixList.length && !matchesPrefixRules(cur.rackId,prefixList))continue;
    const detectedCols=Math.max(3,Math.min(5,Math.max(blockWidth,maxUsedColOffset+1)));
    const rackKey=(newRacks[cur.rackId] && rSrc[cur.rackId] && rSrc[cur.rackId]!==sourceNum)?`${cur.rackId} (L${sourceNum})`:cur.rackId;
    if(!newRacks[rackKey])newRacks[rackKey]={};
    rCols[rackKey]=Math.max(rCols[rackKey]||3,detectedCols);rSrc[rackKey]=sourceNum;
    const totalRowsFound=rowEntries.length;
    rowEntries.forEach((colsInRow, rIdx)=>{
      const tierNum = totalRowsFound >= 4 ? (4 - rIdx) : Math.max(1, Math.min(4, totalRowsFound - rIdx));
      colsInRow.forEach(({cOffset,codes})=>{
        const slotKey=`${tierNum}_${Math.max(0,Math.min(4,cOffset))}`;
        if(!newRacks[rackKey][slotKey])newRacks[rackKey][slotKey]=[];
        codes.forEach(code=>{if(!newRacks[rackKey][slotKey].includes(code))newRacks[rackKey][slotKey].push(code);});
      });
    });
  }
  return newRacks;
}

async function fetchSheetGridFromGoogle(sheetId){
  if(!sheetId)return null;
  try{
    const res=await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx&_t=${Date.now()}`,{cache:'no-store',mode:'cors'});
    if(res.ok){
      const buf=await res.arrayBuffer();
      if(buf && buf.byteLength>200){
        const wb=XLSX.read(new Uint8Array(buf),{type:'array'});
        if(wb && wb.SheetNames && wb.SheetNames.length)return {grids:wb.SheetNames.map(name=>XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:false})),sheetCount:wb.SheetNames.length};
      }
    }
  }catch(_){}
  for(const url of [`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&_t=${Date.now()}`,`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&_t=${Date.now()}`]){
    try{const res=await fetch(url,{cache:'no-store',mode:'cors'});if(res.ok){const txt=await res.text();if(txt && !txt.trim().startsWith('<!DOCTYPE') && !txt.trim().startsWith('<html')){const grid=parseRawCsvToGrid(txt);if(grid.length)return {grids:[grid],sheetCount:1};}}}catch(_){}
  }
  return null;
}

async function syncShelfFromGoogleSheet(notify=false){
  const sheetId1=extractGoogleSheetId(shelfData.sheetUrl || DEFAULT_SHELF_SHEET_URL), sheetId2=extractGoogleSheetId(shelfData.sheetUrl2 || '');
  try{
    if(notify)toast('⏳ កំពុងទាញតារាងឆានពី Google Sheet...');
    const mergedRacks={}, mergedCols={}, mergedSrc={};let totalTabs=0;
    if(sheetId1){const f1=await fetchSheetGridFromGoogle(sheetId1);if(f1 && f1.grids.length){totalTabs+=f1.sheetCount;f1.grids.forEach(g=>parseWarehouseGridToRacks(g,shelfData.prefix,mergedRacks,1,mergedCols,mergedSrc));}}
    if(sheetId2){const f2=await fetchSheetGridFromGoogle(sheetId2);if(f2 && f2.grids.length){totalTabs+=f2.sheetCount;f2.grids.forEach(g=>parseWarehouseGridToRacks(g,shelfData.prefix2,mergedRacks,2,mergedCols,mergedSrc));}}
    const rackTotal=Object.keys(mergedRacks).length, codeTotal=countTotalShelfCodes(mergedRacks);
    if(!rackTotal){if(notify)toast('រកមិនឃើញក្បាលឆាន (ឧ. K-1 ឬ A-1) ក្នុង Sheet ទេ','warn');return;}
    shelfData.racks=mergedRacks;shelfData.rackCols=mergedCols;shelfData.rackSource=mergedSrc;
    shelfData.lastSynced=`Sheet (${totalTabs} Tab) `+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    const firstRack=Object.keys(mergedRacks)[0];if(firstRack && !mergedRacks[shelfData.selectedRack])shelfData.selectedRack=firstRack;
    saveShelfData();updateShelfToggleText();render();liveSearch();scheduleSharedPush();
    if($('shelfModal')?.classList.contains('open')){populateRackSelect();renderShelfModalGrid();}
    if(notify)toast(`✓ Sync ឆានជោគជ័យ (${rackTotal} ឆាន • ${codeTotal} កូដ)!`);
  }catch(e){if(notify)toast('ទាញពី Google Sheet មិនបាន','err');}
}

function importShelfFile(ev){
  const file=ev.target.files[0];if(!file)return;
  const rd=new FileReader();
  rd.onload=e=>{
    try{
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      const mergedRacks={}, mergedCols={}, mergedSrc={};
      wb.SheetNames.forEach(shName=>{const grid=XLSX.utils.sheet_to_json(wb.Sheets[shName],{header:1,defval:'',raw:false});parseWarehouseGridToRacks(grid,shelfData.prefix,mergedRacks,1,mergedCols,mergedSrc);});
      if(!Object.keys(mergedRacks).length){toast('រកមិនឃើញឆាន (ឧ. K-1) ក្នុង File នេះទេ!','err');return;}
      shelfData.racks=mergedRacks;shelfData.rackCols=mergedCols;shelfData.rackSource=mergedSrc;shelfData.lastSynced='File: '+file.name;
      const firstRack=Object.keys(mergedRacks)[0];if(firstRack)shelfData.selectedRack=firstRack;
      saveShelfData();updateShelfToggleText();render();liveSearch();scheduleSharedPush();
      toast(`✓ Convert តារាងឆានបាន ${Object.keys(mergedRacks).length} ឆាន (${countTotalShelfCodes(mergedRacks)} កូដ)!`);
    }catch(err){toast('មានបញ្ហាក្នុងការអាន File ឆាន!','err');}
    ev.target.value='';
  };
  rd.readAsArrayBuffer(file);
}

function importShelfFromPaste(){
  const raw=($('shelfPasteArea')?.value||'').trim();if(!raw)return toast('សូម Copy ពី Sheet មក Paste ក្នុងប្រអប់ជាមុនសិន','warn');
  try{
    const grid=parseRawCsvToGrid(raw), mergedRacks={...shelfData.racks}, mergedCols={...(shelfData.rackCols||{})}, mergedSrc={...(shelfData.rackSource||{})};
    parseWarehouseGridToRacks(grid,'',mergedRacks,1,mergedCols,mergedSrc);
    if(!Object.keys(mergedRacks).length)return toast('រកមិនឃើញឈ្មោះឆាន (ឧ. K-1) ក្នុងអត្ថបទដែល Paste ទេ','err');
    shelfData.racks=mergedRacks;shelfData.rackCols=mergedCols;shelfData.rackSource=mergedSrc;shelfData.lastSynced='Paste '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    const firstRack=Object.keys(mergedRacks)[0];if(firstRack)shelfData.selectedRack=firstRack;
    saveShelfData();updateShelfToggleText();render();liveSearch();scheduleSharedPush();
    toast(`✓ បញ្ចូលបាន ${Object.keys(mergedRacks).length} ឆាន (${countTotalShelfCodes(mergedRacks)} កូដ) រួចរាល់!`);
  }catch(err){toast('មានបញ្ហាក្នុងការអានទិន្នន័យ Paste','err');}
}

function announceShelfLocation(shortCode){if(shelfData.enabled===false)return;const hits=findCodeLocations(shortCode);if(!hits.length)return;const uniqueRacks=[...new Set(hits.map(h=>h.rackId))];toast(`🏆 ${normCode(shortCode)} ➔ ឆាន ${uniqueRacks.join(', ')}`);}

function renderMiniShelfForProduct(p){
  const box=$('dShelfMini'), badge=$('dShelfBadge'), tabs=$('dShelfTabs'), grid=$('dShelfGrid'), locEl=$('dShelfLoc');
  if(!box||!grid||!badge||!locEl)return;
  if(shelfData.enabled===false || !p){box.style.display='none';return;}
  box.style.display='flex';
  const hits=findCodeLocations(p.shortCode);
  if(!hits.length){
    box.classList.add('empty');badge.textContent='ឆាន —';tabs.innerHTML='';locEl.textContent='+ ឆាន';
    grid.innerHTML=[4,3,2,1].map(()=>`<div class="shelf-mini-row" style="grid-template-columns:repeat(3,1fr)">${[0,1,2].map(()=>`<div class="shelf-mini-cell"></div>`).join('')}</div>`).join('');
    return;
  }
  box.classList.remove('empty');
  if(shelfData.activeLocIdx>=hits.length)shelfData.activeLocIdx=0;
  const curHit=hits[shelfData.activeLocIdx], colCount=getRackColCount(curHit.rackId), slotCols=getSlotIndicesLTR(colCount);
  badge.textContent='🏆 ឆាន '+curHit.rackId;
  const uniqueRacks=[...new Set(hits.map(h=>h.rackId))];
  tabs.innerHTML = uniqueRacks.length>1 ? uniqueRacks.map(rId=>{const firstIdx=hits.findIndex(x=>x.rackId===rId);return `<button type="button" class="shelf-mtab ${curHit.rackId===rId?'on':''}" onclick="selectShelfHit(${firstIdx})">${esc(rId)}</button>`;}).join('') : '';
  locEl.textContent=`ឆាន ${curHit.rackId} (${colCount} ប្រឡោះ)`;
  grid.innerHTML=[4,3,2,1].map(tNum=>`<div class="shelf-mini-row" style="grid-template-columns:repeat(${colCount},1fr)">${slotCols.map(sIdx=>{const isHit=(curHit.tier===tNum && curHit.slot===sIdx);return `<div class="shelf-mini-cell ${isHit?'hit':''}">${isHit?esc(p.shortCode):''}</div>`;}).join('')}</div>`).join('');
}

function selectShelfHit(idx){shelfData.activeLocIdx=idx;renderMiniShelfForProduct(curP());}

function populateRackSelect(){
  const sel=$('shelfRackSelect');if(!sel)return;
  const rackSet=new Set(Object.keys(shelfData.racks||{}));if(!rackSet.size){for(let i=1;i<=10;i++)rackSet.add('K-'+i);}
  const sorted=[...rackSet].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  sel.innerHTML=sorted.map(id=>{const cntCodes=Object.values(shelfData.racks[id]||{}).reduce((a,b)=>a+(b?.length||0),0);return `<option value="${esc(id)}">${esc(id)} (${getRackColCount(id)} ប្រឡោះ • ${cntCodes} កូដ)</option>`;}).join('');
  sel.value=shelfData.selectedRack||sorted[0]||'K-1';
}

function openShelfModalForCurrent(){
  populateRackSelect();updateShelfToggleText();
  const qVal=normCode($('scanInput')?.value||''), p=curP();
  const hits=(qVal && findCodeLocations(qVal).length) ? findCodeLocations(qVal) : (p?findCodeLocations(p.shortCode):[]);
  if(hits.length){shelfData.selectedRack=hits[shelfData.activeLocIdx]?.rackId || hits[0].rackId;$('shelfRackSelect').value=shelfData.selectedRack;}
  if($('shelfSlotEditor'))$('shelfSlotEditor').style.display='none';
  renderShelfModalGrid();openM('shelfModal');
}

function setSelectedRackColumns(cols){const rackId=shelfData.selectedRack||'K-1';if(!shelfData.rackCols)shelfData.rackCols={};shelfData.rackCols[rackId]=Math.max(3,Math.min(5,cols));saveShelfData();renderShelfModalGrid();render();}

function renderShelfModalGrid(){
  const sel=$('shelfRackSelect'), rackId=sel?sel.value:(shelfData.selectedRack||'K-1');
  shelfData.selectedRack=rackId;saveShelfData();
  const colCount=getRackColCount(rackId), slotCols=getSlotIndicesLTR(colCount);
  if($('shelfRackTitle'))$('shelfRackTitle').innerHTML=`🏆 ឆាន ${esc(rackId)} (${colCount} ប្រឡោះ) &nbsp;<span style="display:inline-flex;gap:3px;vertical-align:middle">${[3,4,5].map(n=>`<button type="button" onclick="setSelectedRackColumns(${n})" style="border:1px solid var(--g);background:${colCount===n?'var(--g)':'#fff'};color:${colCount===n?'#fff':'var(--g)'};border-radius:6px;padding:1px 6px;font-size:10px;font-weight:800;cursor:pointer">${n}</button>`).join('')}</span>`;
  const activeCode=normCode($('scanInput')?.value||'') || normCode(curP()?.shortCode||''), rackSlots=shelfData.racks[rackId]||{};
  $('shelfTierGrid').innerHTML=[4,3,2,1].map(tNum=>{
    const cells=slotCols.map(sIdx=>{
      const key=`${tNum}_${sIdx}`, list=rackSlots[key]||[], hasCodes=list.length>0, isHit=activeCode && list.some(c=>normCode(c)===activeCode);
      return `<div class="shelf-slot-cell ${hasCodes?'has-codes':''} ${isHit?'is-hit':''}" onclick="openSlotEditor('${esc(rackId)}','${key}',${tNum},${sIdx})"><div class="shelf-slot-pos">${SLOT_NAMES[sIdx]}</div><div class="shelf-slot-codes">${hasCodes?esc(list.join(', ')):`<span style="color:#9ca3af;font-weight:600">+ ដាក់</span>`}</div></div>`;
    }).join('');
    return `<div class="shelf-tier-row" style="grid-template-columns:56px repeat(${colCount},1fr)"><div class="shelf-tier-lbl">${TIER_NAMES[tNum]}</div>${cells}</div>`;
  }).join('');
}

function openSlotEditor(rackId,key,tNum,sIdx){shelfData.editingSlot={rackId,key};const list=(shelfData.racks[rackId]&&shelfData.racks[rackId][key])||[];if($('shelfEditorTitle'))$('shelfEditorTitle').textContent=`កែប្រឡោះ • ឆាន ${rackId} (${TIER_NAMES[tNum]} - ${SLOT_NAMES[sIdx]})`;if($('shelfSlotInput'))$('shelfSlotInput').value=list.join(', ');if($('shelfSlotEditor'))$('shelfSlotEditor').style.display='block';$('shelfSlotInput')?.focus();}
function saveShelfSlotCodes(){if(!shelfData.editingSlot)return;const {rackId,key}=shelfData.editingSlot;const codes=normDigits($('shelfSlotInput')?.value||'').toUpperCase().split(/[,\s]+/).map(s=>s.trim()).filter(Boolean);if(!shelfData.racks[rackId])shelfData.racks[rackId]={};if(codes.length)shelfData.racks[rackId][key]=codes;else delete shelfData.racks[rackId][key];saveShelfData();updateShelfToggleText();scheduleSharedPush();if($('shelfSlotEditor'))$('shelfSlotEditor').style.display='none';renderShelfModalGrid();render();toast('✓ បានរក្សាទុកឆាន '+rackId);}
function quickAssignCurrentCodeToSelectedSlot(){const p=curP();if(!p)return;const rackId=shelfData.selectedRack||'K-1', key='1_0';if(!shelfData.racks[rackId])shelfData.racks[rackId]={};const list=shelfData.racks[rackId][key]||[];if(!list.includes(p.shortCode))list.unshift(p.shortCode);shelfData.racks[rackId][key]=list;saveShelfData();updateShelfToggleText();renderShelfModalGrid();render();scheduleSharedPush();toast(`✓ ដាក់ ${p.shortCode} ចូលឆាន ${rackId}`);}

/* Full-screen Liquid Glass Calculator */
const CALC_STORAGE_KEY='khim_calc_state_v1';
let calcState={expr:'',display:'0',justEval:false,isOpen:false};
function loadCalcState(){try{const raw=localStorage.getItem(CALC_STORAGE_KEY);if(raw){const p=JSON.parse(raw);calcState={expr:p.expr||'',display:p.display||'0',justEval:!!p.justEval,isOpen:false};}}catch(_){}renderCalc();}
function saveCalcState(){try{localStorage.setItem(CALC_STORAGE_KEY,JSON.stringify({expr:calcState.expr,display:calcState.display,justEval:calcState.justEval}));}catch(_){}}
function renderCalc(){if($('calcExpr'))$('calcExpr').textContent=calcState.expr.replace(/\*/g,'×').replace(/\//g,'÷');if($('calcVal'))$('calcVal').textContent=calcState.display||'0';}
function setCalcMode(open){
  calcState.isOpen=!!open;
  const m=$('mainAppContainer'), hdr=$('mainHeader'), c=$('calcScreen');
  if(m)m.style.display=calcState.isOpen?'none':'block';
  if(hdr)hdr.style.display=calcState.isOpen?'none':'grid';
  if(c)c.classList.toggle('active',calcState.isOpen);
  if(calcState.isOpen){$('scanInput')?.blur();$('drop')?.classList.remove('show');renderCalc();}
  else{$('scanInput')?.focus();}
}
function playCordClickSound(openingCalc){
  try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const now=ac.currentTime,bufLen=Math.floor(ac.sampleRate*0.035),buf=ac.createBuffer(1,bufLen,ac.sampleRate),ch=buf.getChannelData(0);for(let i=0;i<bufLen;i++)ch[i]=(Math.random()*2-1)*Math.exp(-i/(bufLen*0.22));const n=ac.createBufferSource();n.buffer=buf;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.setValueAtTime(openingCalc?2100:1650,now);bp.Q.setValueAtTime(2.6,now);const ng=ac.createGain();ng.gain.setValueAtTime(0.45,now);ng.gain.exponentialRampToValueAtTime(0.001,now+0.035);n.connect(bp);bp.connect(ng);ng.connect(ac.destination);n.start(now);const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(openingCalc?340:250,now);o.frequency.exponentialRampToValueAtTime(openingCalc?125:85,now+0.055);g.gain.setValueAtTime(0.32,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.06);o.connect(g);g.connect(ac.destination);o.start(now);o.stop(now+0.065);}catch(_){}
  if(navigator.vibrate)navigator.vibrate(20);
}
function togglePullCalculator(){const nextOpen=!calcState.isOpen,cord=$('pullCordBtn');if(cord){cord.classList.add('pulled');setTimeout(()=>cord.classList.remove('pulled'),440);}playCordClickSound(nextOpen);setCalcMode(nextOpen);}
(function initPullCord(){
  const btn=$('pullCordBtn');if(!btn)return;
  let startY=0,pulling=false,triggered=false;
  btn.addEventListener('pointerdown',e=>{pulling=true;triggered=false;startY=e.clientY;btn.classList.add('pulled');try{btn.setPointerCapture(e.pointerId)}catch(_){}});
  btn.addEventListener('pointermove',e=>{if(!pulling||triggered)return;if(e.clientY-startY>14){triggered=true;togglePullCalculator();}});
  const finish=()=>{if(!pulling)return;pulling=false;setTimeout(()=>btn.classList.remove('pulled'),420);if(!triggered){triggered=true;togglePullCalculator();}};
  btn.addEventListener('pointerup',finish);btn.addEventListener('pointercancel',finish);
})();
function evalSafeExpr(rawExpr){const cleaned=rawExpr.replace(/[^0-9+\-*/.%().\s]/g,'').trim();if(!cleaned)return 0;const pct=cleaned.replace(/(\d+(?:\.\d+)?)%/g,'($1/100)');const val=Function('"use strict";return ('+pct+')')();if(typeof val!=='number'||!isFinite(val))return 'Error';return Number(val.toFixed(8)).toString();}
function pressCalcKey(k){
  if(k==='AC'){calcState.expr='';calcState.display='0';calcState.justEval=false;saveCalcState();renderCalc();return;}
  if(k==='DEL'){if(calcState.justEval){calcState.expr='';calcState.display='0';calcState.justEval=false;}else if(calcState.expr.length>0){calcState.expr=calcState.expr.slice(0,-1);calcState.display=calcState.expr||'0';}else calcState.display='0';saveCalcState();renderCalc();return;}
  if(k==='='){if(!calcState.expr)return;calcState.display=String(evalSafeExpr(calcState.expr));calcState.justEval=true;saveCalcState();renderCalc();return;}
  const isOp=['+','-','*','/','%'].includes(k);
  if(calcState.justEval){calcState.expr=isOp?((calcState.display==='Error'?'0':calcState.display)+k):(k==='.'?'0.':k);calcState.justEval=false;}
  else{
    if(k==='.'){const parts=calcState.expr.split(/[+\-*/%]/),lastPart=parts[parts.length-1]||'';if(lastPart.includes('.'))return;calcState.expr=calcState.expr?(isOp?calcState.expr+'0.':calcState.expr+'.'):'0.';}
    else if(isOp){if(!calcState.expr)calcState.expr=(calcState.display||'0')+k;else if(/[+\-*/%]$/.test(calcState.expr))calcState.expr=calcState.expr.slice(0,-1)+k;else calcState.expr+=k;}
    else calcState.expr+=k;
  }
  calcState.display=calcState.expr||'0';saveCalcState();renderCalc();
}
function flashBtn(el){if(!el)return;el.classList.add('is-pressed');clearTimeout(el._pt);el._pt=setTimeout(()=>el.classList.remove('is-pressed'),120);}
$('calcKeypad')?.addEventListener('pointerdown',e=>{const btn=e.target.closest('[data-k]');if(!btn)return;e.preventDefault();flashBtn(btn);pressCalcKey(btn.dataset.k);});
function copyCalcResult(){copyTextFallback(calcState.display||'0','Copy លេខ '+(calcState.display||'0')+' រួចរាល់');}
function applyCalcToStock(){const rawNum=parseFloat(calcState.display);if(isNaN(rawNum))return toast('លេខមិនត្រឹមត្រូវ','err');const qty=Math.max(0,Math.round(rawNum)),p=curP();if(!p)return;const tv=p.variants.find(v=>vKey(p,v)===hlKey)||p.variants[0];if(!tv)return;setCount(p,tv,qty);setCalcMode(false);render();toast('✓ បានដាក់លេខ '+qty+' ចូល '+p.shortCode);}
loadCalcState();
