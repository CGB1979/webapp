function norm(v){return String(v??"").trim().toUpperCase();}
function addObservation(row,text){
  if(!row.observacion) row.observacion=text;
  else if(!row.observacion.toUpperCase().includes(text.toUpperCase())) row.observacion += " | " + text;
}
export function validate(rows){
  rows.forEach(r=>{r.estado="OK";});
  const byChasis=new Map(), byLocation=new Map();
  for(const r of rows){
    const c=norm(r.chasis);
    const loc=[r.playa,r.bloque,r.carril,r.posicion].map(norm).join("|");
    if(!byChasis.has(c)) byChasis.set(c,[]);
    byChasis.get(c).push(r);
    if(!byLocation.has(loc)) byLocation.set(loc,[]);
    byLocation.get(loc).push(r);
  }
  for(const group of byChasis.values()){
    const locations=new Set(group.map(r=>[r.playa,r.bloque,r.carril,r.posicion].map(norm).join("|")));
    if(group.length>1 && locations.size>1){
      group.forEach(r=>{r.estado="REVISAR";addObservation(r,"Chasis Duplicado");});
    }
  }
  for(const group of byLocation.values()){
    const chasis=new Set(group.map(r=>norm(r.chasis)));
    if(group.length>1 && chasis.size>1){
      group.forEach(r=>{r.estado="REVISAR";addObservation(r,"Comparten la misma Ubicacion");});
    }
  }
  return rows;
}
