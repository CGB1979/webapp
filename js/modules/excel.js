import { COLUMN_ALIASES } from "../../config/columnas.js";

const normalize = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[°º.]/g,"").replace(/\s+/g," ").trim();

function findHeaderRow(rows){
  let best={row:0,score:-1};
  const wanted=Object.values(COLUMN_ALIASES).flat().map(normalize);
  rows.slice(0,15).forEach((r,i)=>{
    const cells=(r||[]).map(normalize);
    let score=0;
    for(const c of cells) if(wanted.includes(c) || c.includes("chasis")) score++;
    if(score>best.score) best={row:i,score};
  });
  return best.row;
}

function mapColumns(header){
  const result={};
  header.forEach((h,i)=>{
    const n=normalize(h);
    for(const [key,aliases] of Object.entries(COLUMN_ALIASES)){
      if(aliases.map(normalize).includes(n) || (key==="chasis" && n.includes("chasis"))){
        if(result[key]===undefined) result[key]=i;
      }
    }
  });
  return result;
}

export async function readWorkbook(file){
  const buffer=await file.arrayBuffer();
  const wb=XLSX.read(buffer,{type:"array",cellDates:false});
  const output=[];
  for(const sheetName of wb.SheetNames){
    const ws=wb.Sheets[sheetName];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
    if(!rows.length) continue;
    const hr=findHeaderRow(rows), header=rows[hr]||[], map=mapColumns(header);
    if(map.chasis===undefined) continue;
    for(let r=hr+1;r<rows.length;r++){
      const row=rows[r]||[];
      const value=k=>map[k]===undefined?"":String(row[map[k]]??"").trim();
      const chasis=value("chasis");
      if(!chasis) continue;
      output.push({chasis,playa:value("playa"),bloque:value("bloque"),carril:value("carril"),posicion:value("posicion"),ubicacion:value("ubicacion"),observacion:value("observacion"),source:file.name});
    }
  }
  return output;
}
