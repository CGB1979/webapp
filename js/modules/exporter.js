import { barcodeDataUrl } from "./barcode.js";

const HEADER_STYLE={
  fill:{fgColor:{rgb:"E5E7EB"}},
  font:{bold:true,color:{rgb:"111827"}},
  alignment:{horizontal:"center",vertical:"center"}
};

const REVIEW_STYLE={
  fill:{fgColor:{rgb:"FCE4C4"}},
  alignment:{vertical:"center"}
};

const CENTER_STYLE={
  alignment:{horizontal:"center",vertical:"center"}
};

export async function exportExcel(rows){
  const wb=XLSX.utils.book_new();

  const aoa=[
    ["Numero de Chasis","Playa","Bloque","Carril","Posicion","Ubicacion","Codigo de Barras","Observacion","Estado"]
  ];

  rows.forEach(r=>{
    aoa.push([
      r.chasis,
      r.playa,
      r.bloque,
      r.carril,
      r.posicion,
      r.ubicacion,
      "",
      r.observacion||"",
      r.estado
    ]);
  });

  const ws=XLSX.utils.aoa_to_sheet(aoa);

  ws["!cols"]=[
    {wch:24},{wch:9},{wch:10},{wch:9},{wch:10},
    {wch:20},{wch:40},{wch:45},{wch:12}
  ];
  ws["!rows"]=aoa.map((_,i)=>i===0?{hpt:24}:{hpt:52});
  ws["!autofilter"]={ref:`A1:I${aoa.length}`};
  ws["!freeze"]={xSplit:0,ySplit:1};

  // Encabezados.
  for(let c=0;c<9;c++){
    const cell=ws[XLSX.utils.encode_cell({r:0,c})];
    if(cell) cell.s=HEADER_STYLE;
  }

  // Filas REVISAR: naranja claro en toda la fila y Estado resaltado.
  rows.forEach((r,i)=>{
    const excelRow=i+1;

    if(r.estado==="REVISAR"){
      for(let c=0;c<9;c++){
        const ref=XLSX.utils.encode_cell({r:excelRow,c});
        if(ws[ref]) ws[ref].s=REVIEW_STYLE;
      }
      const state=ws[XLSX.utils.encode_cell({r:excelRow,c:8})];
      if(state){
        state.s={
          ...REVIEW_STYLE,
          font:{bold:true,color:{rgb:"9A3412"}},
          alignment:{horizontal:"center",vertical:"center"}
        };
      }
    }

    ["B","C","D","E","I"].forEach(col=>{
      const cell=ws[`${col}${excelRow+1}`];
      if(cell) cell.s={...(cell.s||{}),...CENTER_STYLE};
    });
  });

  // Chasis como texto para conservar ceros/longitud y centrar.
  rows.forEach((r,i)=>{
    const cell=ws[`A${i+2}`];
    if(cell){
      cell.t="s";
      cell.v=String(r.chasis);
      cell.s={...(cell.s||{}),font:{bold:true,color:{rgb:"1D4ED8"}},alignment:{vertical:"center"}};
      if(r.estado==="REVISAR") cell.s={...REVIEW_STYLE,font:{bold:true,color:{rgb:"1D4ED8"}},alignment:{vertical:"center"}};
    }
  });

  // Hoja auxiliar de códigos.
  const barcodeRows=[
    ["Numero de Chasis","Codigo de Barras"],
    ...rows.map(r=>[r.chasis,r.chasis])
  ];
  const wb2=XLSX.utils.aoa_to_sheet(barcodeRows);
  wb2["!cols"]=[{wch:24},{wch:30}];
  for(let c=0;c<2;c++){
    const cell=wb2[XLSX.utils.encode_cell({r:0,c})];
    if(cell) cell.s=HEADER_STYLE;
  }
  rows.forEach((r,i)=>{
    const rr=i+1;
    const a=wb2[`A${rr+1}`], b=wb2[`B${rr+1}`];
    if(a) a.s={alignment:{vertical:"center"}};
    if(b) b.s={alignment:{horizontal:"center",vertical:"center"}};
    if(r.estado==="REVISAR"){
      if(a) a.s=REVIEW_STYLE;
      if(b) b.s=REVIEW_STYLE;
    }
  });

  XLSX.utils.book_append_sheet(wb,ws,"Planilla");
  XLSX.utils.book_append_sheet(wb,wb2,"Codigos de Barras");
  XLSX.writeFile(wb,"gestion_playas_unificada.xlsx");
}
