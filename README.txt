ELECTROBAZAR MYV - CATÁLOGO AUTOMÁTICO

QUÉ HACE
- Lee los productos actuales de Reyes del Oeste.
- Si el proveedor agrega productos, aparecen automáticamente.
- Si los elimina, dejan de aparecer.
- Si cambia un precio, se recalcula automáticamente.
- Precio publicado = precio del proveedor + 40%, redondeado hacia arriba a $100.
- Usa las imágenes del proveedor a través de una función proxy.
- No tiene carrito: cada producto abre WhatsApp.

CÓMO PUBLICAR GRATIS EN NETLIFY
1. Descomprimí este ZIP.
2. Entrá a https://app.netlify.com/
3. Creá una cuenta gratis.
4. Elegí "Add new project" y luego una opción para desplegar/importar el proyecto.
5. IMPORTANTE: como este catálogo usa funciones automáticas, conviene subir esta carpeta a GitHub y conectar el repositorio a Netlify.
6. Netlify detectará netlify.toml y publicará automáticamente.
7. El link quedará parecido a https://electrobazar-myv.netlify.app

ARCHIVOS
- public/index.html : la tienda visible.
- netlify/functions/catalog.mjs : lee el catálogo del proveedor.
- netlify/functions/image.mjs : trae las imágenes.
- netlify.toml : configuración.
- package.json : dependencia del lector HTML.

NOTA IMPORTANTE
La sincronización depende de la estructura pública del sitio del proveedor. Si el proveedor cambia por completo su HTML, podría requerir ajustar el lector. Antes de reutilizar comercialmente todas sus imágenes, conviene confirmar que el proveedor autoriza a revendedores a hacerlo.
