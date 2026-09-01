function ensureJsBarcode(){
  if(typeof window.JsBarcode!=="function"){
    throw new Error("No se pudo cargar el generador de códigos de barras.");
  }
}

export function barcodeSvg(value){
  ensureJsBarcode();

  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("xmlns","http://www.w3.org/2000/svg");
  svg.setAttribute("role","img");
  svg.setAttribute("aria-label",`Código de barras ${value}`);

  window.JsBarcode(svg,String(value),{
    format:"CODE128",
    displayValue:true,
    fontSize:14,
    height:65,
    width:2,
    margin:8,
    textMargin:5
  });

  svg.style.display="block";
  svg.style.maxWidth="100%";
  svg.style.height="auto";
  return svg;
}

export function barcodeDataUrl(value){
  ensureJsBarcode();

  const canvas=document.createElement("canvas");
  window.JsBarcode(canvas,String(value),{
    format:"CODE128",
    displayValue:true,
    fontSize:14,
    height:65,
    width:2,
    margin:8,
    textMargin:5
  });
  return canvas.toDataURL("image/png");
}
