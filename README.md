# Gestión de Playas

WebApp estática para GitHub Pages y servidores HTTPS.

## Inicio
Abrir `index.html` mediante GitHub Pages o un servidor estático HTTPS.

## Instalación como aplicación
La app incluye manifest PWA, iconos y Service Worker. En Chrome/Edge, una vez publicada en HTTPS, debería aparecer la opción **Instalar aplicación** en el menú del navegador o el icono de instalación de la barra de direcciones. Si se abre directamente como `file://`, no se puede instalar como PWA.

## Versión
La versión está en `js/version.js`. Incrementarla en cada publicación.

## Importante
La aplicación procesa los Excel en el navegador. No requiere backend. Las librerías de Excel y códigos de barras se cargan desde CDN, por lo que la instalación PWA no implica que esas librerías externas queden disponibles sin conexión.

Versión actual: 1.0.12


### PWA v1.0.15
- Pantalla completa mediante `display: fullscreen`.
- `display_override` con fallback a `standalone`.
- Orientación `any` y orientación desbloqueada cuando la API del navegador está disponible.
- Service Worker actualizado a la misma versión para forzar la renovación de caché.
