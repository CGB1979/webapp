function norm(v){
  return String(v??"").trim().toUpperCase();
}

function locationKey(row){
  const literal=norm(row.ubicacion);
  if(literal) return literal;
  return [norm(row.playa),norm(row.bloque),norm(row.carril),norm(row.posicion)].join("|");
}

function locationLabel(row){
  return String(row.ubicacion||[row.playa,row.bloque,row.carril,row.posicion].filter(Boolean).join("-")||"Sin ubicación").trim();
}

function unique(list){
  return [...new Set(list.filter(Boolean))];
}

function buildConflictInfo(rows){
  const byChasis=new Map();
  const byLocation=new Map();
  rows.forEach((r,i)=>{
    r._i=i;
    r._conflicts=[];
    r._groupId=null;
    const c=norm(r.chasis), l=locationKey(r);
    if(c){ if(!byChasis.has(c)) byChasis.set(c,[]); byChasis.get(c).push(i); }
    if(l){ if(!byLocation.has(l)) byLocation.set(l,[]); byLocation.get(l).push(i); }
  });

  const adjacency=Array.from({length:rows.length},()=>new Set());
  const addConflict=(i,type,text)=>{
    if(!rows[i]._conflicts.some(x=>x.type===type && x.text===text)) rows[i]._conflicts.push({type,text});
  };

  for(const indexes of byChasis.values()){
    if(indexes.length<2) continue;
    const locations=unique(indexes.map(i=>locationKey(rows[i])));
    if(locations.length<2) continue;
    indexes.forEach(i=>{
      const others=unique(indexes.filter(j=>j!==i).map(j=>locationLabel(rows[j])));
      addConflict(i,"chasis",`Mismo chasis en otras ubicaciones: ${others.join(", ")}`);
      indexes.filter(j=>j!==i).forEach(j=>adjacency[i].add(j));
    });
  }

  for(const indexes of byLocation.values()){
    const chassis=unique(indexes.map(i=>norm(rows[i].chasis)));
    if(chassis.length<2) continue;
    indexes.forEach(i=>{
      const others=unique(indexes.filter(j=>j!==i).map(j=>String(rows[j].chasis||"").trim()));
      addConflict(i,"ubicacion",`Esta ubicación también contiene otros chasis: ${others.join(", ")}`);
      indexes.filter(j=>j!==i).forEach(j=>adjacency[i].add(j));
    });
  }

  let group=0;
  const seen=new Set();
  for(let i=0;i<rows.length;i++){
    if(seen.has(i) || adjacency[i].size===0) continue;
    group++;
    const stack=[i];
    seen.add(i);
    while(stack.length){
      const n=stack.pop();
      rows[n]._groupId=group;
      for(const next of adjacency[n]) if(!seen.has(next)){seen.add(next);stack.push(next);}
    }
  }

  rows.forEach(r=>{
    r.estado=r._conflicts.length?"REVISAR":"OK";
  });
  return {byChasis,byLocation};
}

export function validate(rows){
  rows.forEach(r=>{
    r.estado="OK";
    r.observacion=r.observacion ? String(r.observacion).trim() : "";
  });
  buildConflictInfo(rows);
  return rows;
}

export function refreshConflictInfo(rows){
  buildConflictInfo(rows);
  return rows;
}

export function conflictText(row){
  return (row._conflicts||[]).map(c=>c.text);
}

export function conflictTooltip(row){
  return conflictText(row).join("\n");
}

export function locationKeyForRow(row){ return locationKey(row); }
