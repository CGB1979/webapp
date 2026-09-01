# Gestión de Playas

WebApp estática para GitHub Pages.

## Inicio
Abrir `index.html` mediante GitHub Pages o un servidor estático.

## Versión
La versión está en `js/version.js`. Incrementarla en cada publicación.

## Importante
La aplicación procesa los Excel en el navegador. No requiere backend.

La exportación utiliza SheetJS CE desde CDN. Esta versión genera el XLSX y una hoja adicional de códigos. La incrustación de imágenes de código de barras dentro de celdas XLSX requiere una etapa de generación XLSX con soporte de imágenes (por ejemplo, una biblioteca/build que soporte imágenes), que debe sustituirse antes de considerar ese requisito cerrado.
