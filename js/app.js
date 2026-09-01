import { readWorkbook } from "./modules/excel.js";
import { validate, refreshConflictInfo } from "./modules/validator.js";
import { barcodeSvg } from "./modules/barcode.js";
import { exportExcel } from "./modules/exporter.js";

const $=id=>document.getElementById(id);
let rows=[], hidden=new Set(), currentIndex=-1, files=[], sourceFileNames=[];

const DATA_KEY="gestion-playas-working-data";
const HIDDEN_KEY="gestion-playas-hidden-data";
const FILES_KEY="gestion-playas-source-files";

function saveWorkingState(){
  try{
    localStorage.setItem(DATA_KEY,JSON.stringify(rows));
    localStorage.setItem(HIDDEN_KEY,JSON.stringify([...hidden]));
    localStorage.setItem(FILES_KEY,JSON.stringify(sourceFileNames));
  }catch(err){
    console.warn("No se pudo guardar el avance local:",err);
  }
}

function restoreWorkingState(){
  try{
    const saved=localStorage.getItem(DATA_KEY);
    if(!saved) return false;

    const parsed=JSON.parse(saved);
    if(!Array.isArray(parsed) || !parsed.length) return false;

    const savedHidden=JSON.parse(localStorage.getItem(HIDDEN_KEY)||"[]");
    const restored=dedupeCrossFileExactRecordsWithHidden(parsed,Array.isArray(savedHidden)?savedHidden:[]);
    rows=restored.rows;
    rows.forEach(cleanGeneratedObservation);
    refreshConflictInfo(rows);
    hidden=new Set(restored.hidden);

    const savedFiles=JSON.parse(localStorage.getItem(FILES_KEY)||"[]");
    sourceFileNames=Array.isArray(savedFiles) ? savedFiles : [];

    $("dropzone").classList.add("hidden");
    $("workspace").classList.remove("hidden");
    $("btnBarcode").disabled=false;
    $("btnDownload").disabled=false;

    populateFilters();
    render();
    return true;
  }catch(err){
    console.warn("No se pudo recuperar el trabajo anterior:",err);
    return false;
  }
}

$("version").textContent=`Versión ${window.APP_VERSION}`;

async function cacheBust(){
  const key="gestion-playas-version";
  const old=localStorage.getItem(key);

  if(old===window.APP_VERSION) return;

  // NO borrar localStorage: allí está el Excel unificado y el avance de trabajo.
  // Solo eliminamos Cache Storage y luego recargamos esta misma página con
  // un parámetro de versión para obligar al navegador a pedir los módulos nuevos.
  if("caches" in window){
    try{
      const cacheNames=await caches.keys();
      await Promise.all(cacheNames.map(name=>caches.delete(name)));
    }catch(_){}
  }

  localStorage.setItem(key,window.APP_VERSION);

  const url=new URL(window.location.href);
  url.searchParams.set("appv",window.APP_VERSION);
  url.searchParams.set("_",Date.now().toString());

  // Evita ejecutar módulos de una versión anterior que haya quedado en memoria.
  window.location.replace(url.toString());
}
cacheBust().then(()=>restoreWorkingState());

$("btnSelect").onclick=()=>$("fileInput").click();
$("fileInput").onchange=e=>setFiles([...e.target.files]);
$("btnUnificar").onclick=unify;
$("btnBarcode").onclick=()=>{
  const first=filtered()[0];
  if(first) openCard(first._i);
};
$("btnDownload").onclick=()=>exportExcel(rows);

["dragenter","dragover"].forEach(ev=>$("dropzone").addEventListener(ev,e=>{
  e.preventDefault();
  $("dropzone").classList.add("drag");
}));
["dragleave","drop"].forEach(ev=>$("dropzone").addEventListener(ev,e=>{
  e.preventDefault();
  $("dropzone").classList.remove("drag");
}));
$("dropzone").ondrop=e=>setFiles([...e.dataTransfer.files]);

$("searchInput").oninput=render;
$("filterPlaya").onchange=render;
$("filterBloque").onchange=render;
$("filterEstado").onchange=render;
$("btnShowHidden").onclick=()=>{
  hidden.clear();
  saveWorkingState();
  render();
};

$("btnClearAll").onclick=confirmClearAll;
$("clearCancel").onclick=closeClearAllModal;
$("clearConfirm").onclick=clearAllWorkingData;
$("clearAllOverlay").onclick=e=>{
  if(e.target===$("clearAllOverlay")) closeClearAllModal();
};

$("cardClose").onclick=closeCard;
$("cardHide").onclick=()=>actOnCurrent("hide");
$("cardDelete").onclick=()=>actOnCurrent("delete");
$("cardPrev").onclick=()=>openCard(nextVisibleIndex(-1));
$("cardNext").onclick=()=>openCard(nextVisibleIndex(1));
$("cardOverlay").onclick=e=>{
  if(e.target===$("cardOverlay")) closeCard();
};
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    closeCard();
    closeClearAllModal();
  }
  if(e.key==="ArrowLeft" && !$("cardOverlay").classList.contains("hidden")) openCard(nextVisibleIndex(-1));
  if(e.key==="ArrowRight" && !$("cardOverlay").classList.contains("hidden")) openCard(nextVisibleIndex(1));
});

function setFiles(list){
  files=list.filter(f=>/\.(xlsx|xls|csv)$/i.test(f.name));
  $("fileList").innerHTML=files.map(f=>`<div class="file-item">✓ ${escapeHtml(f.name)}</div>`).join("");
  $("btnUnificar").disabled=!files.length;
}

async function unify(){
  try{
    const all=[];
    for(const f of files) all.push(...await readWorkbook(f));
    if(!all.length) throw new Error("No se encontró una columna de Chasis válida en los archivos.");

    rows=validate(dedupeCrossFileExactRecords(all));
    hidden.clear();
    sourceFileNames=files.map(f=>f.name);
    saveWorkingState();

    $("dropzone").classList.add("hidden");
    $("workspace").classList.remove("hidden");
    $("btnBarcode").disabled=false;
    $("btnDownload").disabled=false;

    populateFilters();
    render();
    toast(`${rows.length} registros procesados.`);
  }catch(err){
    console.error(err);
    toast(err.message||"No se pudo procesar el archivo.",true);
  }
}

function populateFilters(){
  fillSelect($("filterPlaya"),[...new Set(rows.map(r=>r.playa).filter(Boolean))],"Playa: todas");
  fillSelect($("filterBloque"),[...new Set(rows.map(r=>r.bloque).filter(Boolean))],"Bloque: todos");
}

function fillSelect(sel,values,first){
  sel.innerHTML=`<option value="">${first}</option>`+
    values.sort().map(v=>`<option value="${escapeAttr(v)}">${escapeHtml(v)}</option>`).join("");
}

function filtered(){
  const q=$("searchInput").value.trim().toLowerCase();
  const p=$("filterPlaya").value;
  const b=$("filterBloque").value;
  const e=$("filterEstado").value;

  const data=rows.map((r,i)=>({...r,_i:i})).filter(r=>
    !hidden.has(r._i) &&
    (!q||String(r.chasis).toLowerCase().includes(q)) &&
    (!p||r.playa===p) &&
    (!b||r.bloque===b) &&
    (!e||r.estado===e)
  );

  // Los conflictos quedan agrupados por sus relaciones; los OK conservan su orden.
  return data.sort((a,b)=>{
    const ga=a._groupId||Number.MAX_SAFE_INTEGER;
    const gb=b._groupId||Number.MAX_SAFE_INTEGER;
    if(ga!==gb) return ga-gb;
    return a._i-b._i;
  });
}
function render(){
  const data=filtered();
  const tbody=$("dataTable").querySelector("tbody");
  tbody.innerHTML="";

  let lastGroup=null;
  data.forEach((r,displayPos)=>{
    if(r._groupId && r._groupId!==lastGroup){
      const groupRow=document.createElement("tr");
      groupRow.className="conflict-group-row";
      const cell=document.createElement("td");
      cell.colSpan=8;
      cell.textContent=`Grupo de conflicto ${r._groupId}`;
      groupRow.appendChild(cell);
      tbody.appendChild(groupRow);
      lastGroup=r._groupId;
    }

    const tr=document.createElement("tr");
    if(r.estado==="REVISAR") tr.className="conflict";
    const conflicts=(r._conflicts||[]).map(c=>c.text);
    const title=conflicts.join("\n");

    tr.innerHTML=`
      <td class="chassis">
        <button type="button" class="chassis-button" title="Abrir tarjeta del vehículo">
          ${escapeHtml(r.chasis)}
        </button>
      </td>
      <td>${escapeHtml(r.playa)}</td>
      <td>${escapeHtml(r.bloque)}</td>
      <td>${escapeHtml(r.carril)}</td>
      <td>${escapeHtml(r.posicion)}</td>
      <td class="location-cell">${escapeHtml(r.ubicacion)}</td>
      <td>${escapeHtml(r.observacion)}</td>
      <td class="${r.estado==="OK"?"status-ok":"status-review"}">${r.estado}</td>
    `;

    if(title){
      tr.title=title;
      const badge=document.createElement("span");
      badge.className="conflict-badge";
      badge.textContent="⚠";
      badge.title=title;
      tr.querySelector(".chassis").prepend(badge);
    }

    tr.querySelector(".chassis-button").addEventListener("click",e=>{
      e.preventDefault();
      e.stopPropagation();
      openCard(r._i);
    });

    tbody.appendChild(tr);
  });

  $("totalCount").textContent=rows.length;
  $("visibleCount").textContent=data.length;
  $("hiddenCount").textContent=hidden.size;
  $("conflictCount").textContent=rows.filter(r=>r.estado==="REVISAR").length;
}
function nextVisibleIndex(direction){
  const list=filtered();
  if(!list.length) return -1;

  let pos=list.findIndex(r=>r._i===currentIndex);
  if(pos<0) pos=direction>0?-1:0;

  pos=(pos+direction+list.length)%list.length;
  return list[pos]._i;
}

function renderCardConflicts(r){
  const box=$("cardConflicts");
  box.innerHTML="";
  const conflicts=r._conflicts||[];
  if(!conflicts.length){
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  const title=document.createElement("div");
  title.className="conflict-title";
  title.textContent="⚠ Conflictos detectados";
  box.appendChild(title);
  conflicts.forEach(c=>{
    const item=document.createElement("div");
    item.className="conflict-item";
    item.textContent=c.text;
    box.appendChild(item);
  });
}

function cleanGeneratedObservation(row){
  const generated=new Set(["chasis duplicado","ubicaciones diferentes","comparten la misma ubicacion"]);
  const parts=String(row.observacion||"").split("|").map(x=>x.trim()).filter(Boolean);
  row.observacion=parts.filter(x=>!generated.has(x.toLowerCase())).join(" | ");
}

function locationKeyForDedup(r){
  const literal=String(r.ubicacion||"").trim().toUpperCase();
  if(literal) return literal;
  return [r.playa,r.bloque,r.carril,r.posicion].map(x=>String(x||"").trim().toUpperCase()).join("|");
}

function dedupeCrossFileExactRecords(list){
  const result=[];
  const seen=new Map();
  for(const row of list){
    const key=`${String(row.chasis||"").trim().toUpperCase()}|${locationKeyForDedup(row)}`;
    const source=String(row.source||"");
    const previous=seen.get(key);
    if(previous && previous.source && source && previous.source!==source){
      if(row.observacion && row.observacion!==previous.observacion){
        previous.observacion=previous.observacion ? `${previous.observacion} | ${row.observacion}` : row.observacion;
      }
      continue;
    }
    result.push(row);
    if(!previous) seen.set(key,row);
  }
  result.forEach(cleanGeneratedObservation);
  return result;
}

function dedupeCrossFileExactRecordsWithHidden(list,hiddenIndexes){
  const result=[];
  const hiddenSet=new Set(hiddenIndexes||[]);
  const seen=new Map();
  const newHidden=[];
  list.forEach((row,index)=>{
    const key=`${String(row.chasis||"").trim().toUpperCase()}|${locationKeyForDedup(row)}`;
    const source=String(row.source||"");
    const previous=seen.get(key);
    if(previous && previous.source && source && previous.source!==source){
      if(row.observacion && row.observacion!==previous.observacion){
        previous.observacion=previous.observacion ? `${previous.observacion} | ${row.observacion}` : row.observacion;
      }
      if(hiddenSet.has(index)){
        const keptIndex=result.indexOf(previous);
        if(keptIndex>=0) newHidden.push(keptIndex);
      }
      return;
    }
    const newIndex=result.length;
    result.push(row);
    if(hiddenSet.has(index)) newHidden.push(newIndex);
    if(!previous) seen.set(key,row);
  });
  result.forEach(cleanGeneratedObservation);
  return {rows:result,hidden:[...new Set(newHidden)]};
}

function openCard(i){
  if(i<0 || !rows[i]) return;

  currentIndex=i;
  const r=rows[i];

  $("cardChassis").textContent=r.chasis;
  $("cardLocation").textContent=
    [r.playa,r.bloque,r.carril,r.posicion].filter(Boolean).join(" - ") || "Sin ubicación";
  $("cardObservation").textContent=r.observacion||"";
  renderCardConflicts(r);

  const barcodeBox=$("cardBarcode");
  barcodeBox.innerHTML="";

  try{
    const svg=barcodeSvg(r.chasis);
    barcodeBox.appendChild(svg);
  }catch(err){
    console.error(err);
    const error=document.createElement("div");
    error.className="barcode-error";
    error.textContent=err.message||"No se pudo generar el código de barras.";
    barcodeBox.appendChild(error);
  }

  $("cardOverlay").classList.remove("hidden");
  document.body.classList.add("modal-open");

  requestAnimationFrame(()=>{
    $("vehicleCard").focus();
  });
}

function closeCard(){
  $("cardOverlay").classList.add("hidden");
  document.body.classList.remove("modal-open");
  currentIndex=-1;
}

function actOnCurrent(action){
  if(currentIndex<0 || !rows[currentIndex]) return;

  const old=currentIndex;

  if(action==="hide"){
    hidden.add(old);
  }else{
    rows.splice(old,1);
    hidden=new Set(
      [...hidden]
        .map(i=>i>old?i-1:i)
        .filter(i=>i!==old)
    );
  }

  refreshConflictInfo(rows);
  saveWorkingState();

  const next=filtered();
  render();

  if(next.length){
    const candidate=next.find(r=>r._i>=Math.min(old,next[next.length-1]._i))||next[0];
    openCard(candidate._i);
  }else{
    closeCard();
  }
}

function confirmClearAll(){
  if(!rows.length) return;

  const count=sourceFileNames.length || 1;
  const noun=count===1 ? "planilla" : "planillas";
  const article=count===1 ? "la última planilla cargada" : "las últimas planillas cargadas";

  $("clearAllText").textContent=
    `Vas a borrar todos los avances realizados sobre ${article}. `+
    `Se eliminarán los vehículos cargados, los ocultos y el progreso guardado localmente. `+
    `Los archivos originales de tu computadora no se eliminarán.`;

  $("clearAllOverlay").classList.remove("hidden");
  document.body.classList.add("modal-open");
  requestAnimationFrame(()=>$("clearCancel").focus());
}

function closeClearAllModal(){
  $("clearAllOverlay").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function clearAllWorkingData(){
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(HIDDEN_KEY);
  localStorage.removeItem(FILES_KEY);

  rows=[];
  hidden.clear();
  sourceFileNames=[];
  currentIndex=-1;
  files=[];

  closeClearAllModal();

  $("workspace").classList.add("hidden");
  $("dropzone").classList.remove("hidden");
  $("fileList").innerHTML="";
  $("fileInput").value="";
  $("btnUnificar").disabled=true;
  $("btnBarcode").disabled=true;
  $("btnDownload").disabled=true;

  $("searchInput").value="";
  $("filterPlaya").innerHTML='<option value="">Playa: todas</option>';
  $("filterBloque").innerHTML='<option value="">Bloque: todos</option>';
  $("filterEstado").value="";

  render();
  toast("Todos los avances fueron borrados.");
}

function toast(msg,error=false){
  const el=$("toast");
  el.textContent=msg;
  el.classList.remove("hidden");
  el.classList.toggle("toast-error",error);
  setTimeout(()=>el.classList.add("hidden"),2500);
}

function escapeHtml(s){
  return String(s??"").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function escapeAttr(s){
  return String(s??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
