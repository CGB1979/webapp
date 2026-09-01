function norm(v){
  return String(v??"").trim().toUpperCase();
}

function addObservation(row,text){
  if(!row.observacion) row.observacion=text;
  else if(!row.observacion.toUpperCase().includes(text.toUpperCase())){
    row.observacion += " | " + text;
  }
}

function locationKey(row){
  // La Ubicacion física se determina por Playa + Bloque + Carril + Posicion.
  // En playas especiales también se conserva la Posicion, por ejemplo J-A-1-1
  // y J-A-1-2 son ubicaciones diferentes.
  return [
    norm(row.playa),
    norm(row.bloque),
    norm(row.carril),
    norm(row.posicion)
  ].join("|");
}

export function validate(rows){
  rows.forEach(r=>{
    r.estado="OK";
    // No arrastrar observaciones de una validación anterior.
    r.observacion=r.observacion ? String(r.observacion).trim() : "";
  });

  const byChasis=new Map();
  const byLocation=new Map();

  for(const r of rows){
    const c=norm(r.chasis);
    const loc=locationKey(r);

    if(c){
      if(!byChasis.has(c)) byChasis.set(c,[]);
      byChasis.get(c).push(r);
    }

    if(!byLocation.has(loc)) byLocation.set(loc,[]);
    byLocation.get(loc).push(r);
  }

  // CHASIS DUPLICADO:
  // cualquier chasis que aparece más de una vez es duplicado.
  // Si aparece en más de una ubicación, además se informa "Ubicaciones diferentes".
  for(const group of byChasis.values()){
    if(group.length<=1) continue;

    const locations=new Set(group.map(locationKey));

    for(const r of group){
      r.estado="REVISAR";
      addObservation(r,"Chasis Duplicado");

      if(locations.size>1){
        addObservation(r,"Ubicaciones diferentes");
      }
    }
  }

  // UBICACION COMPARTIDA:
  // solo es conflicto cuando DOS O MÁS CHASIS DIFERENTES están en la misma
  // ubicación exacta (la misma combinación Playa/Bloque/Carril/Posicion).
  for(const group of byLocation.values()){
    const chasis=new Set(group.map(r=>norm(r.chasis)).filter(Boolean));

    if(chasis.size>1){
      for(const r of group){
        r.estado="REVISAR";
        addObservation(r,"Comparten la misma Ubicacion");
      }
    }
  }

  return rows;
}
