import { barcodeDataUrl } from "./barcode.js";
export async function exportExcel(rows){
  const wb=XLSX.utils.book_new();
  const aoa=[["Numero de Chasis","Playa","Bloque","Carril","Posicion","Ubicacion","Codigo de Barras","Observacion","Estado"]];
  rows.forEach(r=>aoa.push([r.chasis,r.playa,r.bloque,r.carril,r.posicion,r.ubicacion,"",r.observacion,r.estado]));
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"]=[{wch:24},{wch:9},{wch:10},{wch:9},{wch:10},{wch:18},{wch:40},{wch:45},{wch:12}];
  ws["!rows"]=aoa.map((_,i)=>i===0?{hpt:22}:{hpt:52});
  ws["!autofilter"]={ref:`A1:I${aoa.length}`};
  ws["!freeze"]={xSplit:0,ySplit:1};
  // SheetJS CE no incrusta imágenes en XLSX. Dejamos una celda reservada y generamos
  // además una hoja "Codigos de Barras" con los valores listos para impresión.
  const barcodeRows=[["Numero de Chasis","Codigo de Barras"],...rows.map(r=>[r.chasis,r.chasis])];
  const wb2=XLSX.utils.aoa_to_sheet(barcodeRows);
  wb2["!cols"]=[{wch:24},{wch:30}];
  XLSX.utils.book_append_sheet(wb,ws,"Planilla");
  XLSX.utils.book_append_sheet(wb,wb2,"Codigos de Barras");
  XLSX.writeFile(wb,"gestion_playas_unificada.xlsx");
}
