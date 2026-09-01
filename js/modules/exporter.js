function downloadBuffer(buffer,filename){
  const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function styleHeader(cell){
  cell.font={bold:true,color:{argb:"FF111827"}};
  cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFE5E7EB"}};
  cell.alignment={horizontal:"center",vertical:"middle"};
  cell.border={bottom:{style:"thin",color:{argb:"FF9CA3AF"}}};
}

function styleReview(cell){
  cell.alignment={vertical:"middle"};
}

function addNote(cell,text){
  if(!text) return;
  cell.note={
    texts:[{text:"⚠ Conflicto\n"+text}],
    margins:{left:0.2,right:0.2,top:0.2,bottom:0.2},
    protection:{locked:true,hidden:false}
  };
}

export async function exportExcel(rows){
  if(typeof ExcelJS==="undefined") throw new Error("No se pudo cargar el exportador de Excel.");

  const wb=new ExcelJS.Workbook();
  wb.creator="Gestión de Playas";
  wb.created=new Date();

  const ws=wb.addWorksheet("Planilla");
  ws.views=[{state:"frozen",ySplit:1}];
  ws.autoFilter={from:"A1",to:`I${rows.length+1}`};

  ws.addRow(["Numero de Chasis","Playa","Bloque","Carril","Posicion","Ubicacion","Codigo de Barras","Observacion","Estado"]);
  ws.getRow(1).height=24;
  ws.getRow(1).eachCell(styleHeader);

  rows.forEach(r=>{
    const row=ws.addRow([String(r.chasis??""),r.playa,r.bloque,r.carril,r.posicion,r.ubicacion,"",r.observacion||"",r.estado]);
    row.height=58;
    try{
      const dataUrl=barcodeDataUrl(r.chasis);
      const imageId=wb.addImage({base64:dataUrl,extension:"png"});
      ws.addImage(imageId,{tl:{col:6,row:row.number-1},ext:{width:250,height:58}});
    }catch(err){
      console.warn("No se pudo incrustar el código de barras:",err);
      row.getCell(7).value=String(r.chasis??"");
    }
    [2,3,4,5,9].forEach(c=>row.getCell(c).alignment={horizontal:"center",vertical:"middle"});
    row.getCell(1).font={bold:true,color:{argb:"FF1D4ED8"}};

    const notes=(r._conflicts||[]).map(c=>c.text).join("\n");
    if(r.estado==="REVISAR"){
      row.eachCell(cell=>styleReview(cell));
      row.getCell(9).font={bold:true,color:{argb:"FF9A3412"}};
      row.getCell(1).font={bold:true,color:{argb:"FF1D4ED8"}};
      // La nota queda fijada en cada celda de la fila que participa del conflicto.
      row.eachCell(cell=>addNote(cell,notes));
    }
  });

  ws.columns=[
    {width:24},{width:10},{width:11},{width:10},{width:10},{width:20},{width:40},{width:45},{width:12}
  ];

  const wb2=wb.addWorksheet("Codigos de Barras");
  wb2.views=[{state:"frozen",ySplit:1}];
  wb2.addRow(["Numero de Chasis","Codigo de Barras"]);
  wb2.getRow(1).height=24;
  wb2.getRow(1).eachCell(styleHeader);
  wb2.columns=[{width:24},{width:38}];

  rows.forEach(r=>{
    const row=wb2.addRow([String(r.chasis??""),String(r.chasis??"")]);
    row.height=24;
    row.getCell(2).alignment={horizontal:"center",vertical:"middle"};
    if(r.estado==="REVISAR"){
      row.eachCell(styleReview);
      const notes=(r._conflicts||[]).map(c=>c.text).join("\n");
      row.eachCell(cell=>addNote(cell,notes));
    }
  });

  const buffer=await wb.xlsx.writeBuffer();
  downloadBuffer(buffer,"gestion_playas_unificada.xlsx");
}
