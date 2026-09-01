export function barcodeSvg(value){
  const holder=document.createElement("div");
  JsBarcode(holder,value,{format:"CODE128",displayValue:true,fontSize:13,height:60,margin:4});
  return holder.querySelector("svg");
}
export function barcodeDataUrl(value){
  const canvas=document.createElement("canvas");
  JsBarcode(canvas,value,{format:"CODE128",displayValue:true,fontSize:13,height:60,margin:4});
  return canvas.toDataURL("image/png");
}
