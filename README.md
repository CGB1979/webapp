# Gestión de Playas

WebApp estática para GitHub Pages.

## Inicio
Abrir `index.html` mediante GitHub Pages o un servidor estático.

## Versión
La versión está en `js/version.js`. Incrementarla en cada publicación.

## Importante
La aplicación procesa los Excel en el navegador. No requiere backend.

La exportación utiliza SheetJS CE desde CDN. Esta versión genera el XLSX y una hoja adicional de códigos. La incrustación de imágenes de código de barras dentro de celdas XLSX requiere una etapa de generación XLSX con soporte de imágenes (por ejemplo, una biblioteca/build que soporte imágenes), que debe sustituirse antes de considerar ese requisito cerrado.

Versión actual: 1.0.1


Versión actual: 1.0.3
Actualización automática: al detectar una nueva versión se limpia Cache Storage y se recarga con un parámetro de versión. El trabajo local (Excel unificado, ocultos y avance) permanece en localStorage.
