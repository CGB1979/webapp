import { readWorkbook } from "./modules/excel.js";
import { validate } from "./modules/validator.js";
import { barcodeSvg } from "./modules/barcode.js";
import { exportExcel } from "./modules/exporter.js";

const $=id=>document.getElementById(id);
let rows=[], hidden=new Set(), currentIndex=-1, files=[];

$("version").textContent=`Versión ${window.APP_VERSION}`;

async function cacheBust(){
  const key="gestion-playas-version";
  const old=localStorage.getItem(key);
  if(old!==window.APP_VERSION){
    localStorage.setItem(key,window.APP_VERSION);
    if("caches" in window){
      try{
        for(const k of await caches.keys()) await caches.delete(k);
      }catch(_){}
    }
  }
}
cacheBust();

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
  render();
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
  if(e.key==="Escape") closeCard();
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

    rows=validate(all);
    hidden.clear();

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

  return rows.map((r,i)=>({...r,_i:i})).filter(r=>
    !hidden.has(r._i) &&
    (!q||String(r.chasis).toLowerCase().includes(q)) &&
    (!p||r.playa===p) &&
    (!b||r.bloque===b) &&
    (!e||r.estado===e)
  );
}

function render(){
  const data=filtered();
  const tbody=$("dataTable").querySelector("tbody");
  tbody.innerHTML="";

  data.forEach(r=>{
    const tr=document.createElement("tr");
    if(r.estado==="REVISAR") tr.className="conflict";

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
      <td>${escapeHtml(r.ubicacion)}</td>
      <td>${escapeHtml(r.observacion)}</td>
      <td class="${r.estado==="OK"?"status-ok":"status-review"}">${r.estado}</td>
    `;

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

function openCard(i){
  if(i<0 || !rows[i]) return;

  currentIndex=i;
  const r=rows[i];

  $("cardChassis").textContent=r.chasis;
  $("cardLocation").textContent=
    [r.playa,r.bloque,r.carril,r.posicion].filter(Boolean).join(" - ") || "Sin ubicación";
  $("cardObservation").textContent=r.observacion||"";

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

  const next=filtered();
  render();

  if(next.length){
    const candidate=next.find(r=>r._i>=Math.min(old,next[next.length-1]._i))||next[0];
    openCard(candidate._i);
  }else{
    closeCard();
  }
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
