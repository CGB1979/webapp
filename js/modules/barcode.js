function ensureJsBarcode(){
  if(typeof window.JsBarcode!=="function"){
    throw new Error("No se pudo cargar el generador de códigos de barras. Verificá la conexión a Internet y recargá la página.");
  }
}

export function barcodeSvg(value){
  ensureJsBarcode();

  const holder=document.createElement("div");
  holder.style.position="absolute";
  holder.style.left="-99999px";
  holder.style.top="-99999px";
  document.body.appendChild(holder);

  try{
    window.JsBarcode(holder,String(value),{
      format:"CODE128",
      displayValue:true,
      fontSize:13,
      height:60,
      width:2,
      margin:4,
      textMargin:4
    });

    const svg=holder.querySelector("svg");
    if(!svg) throw new Error("No se pudo generar el código de barras.");

    svg.setAttribute("role","img");
    svg.setAttribute("aria-label",`Código de barras ${value}`);
    svg.style.maxWidth="100%";
    svg.style.height="auto";
    return svg.cloneNode(true);
  }finally{
    holder.remove();
  }
}

export function barcodeDataUrl(value){
  ensureJsBarcode();

  const canvas=document.createElement("canvas");
  window.JsBarcode(canvas,String(value),{
    format:"CODE128",
    displayValue:true,
    fontSize:13,
    height:60,
    width:2,
    margin:4,
    textMargin:4
  });
  return canvas.toDataURL("image/png");
}
