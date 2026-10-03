import { getCatalog, SITE, finalPrice, productSlug, categorySlug } from "./_catalog-lib.mjs";

const esc = (s="") => String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const money = n => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);

const layout = ({title,description,canonical,body,jsonld=""}) => `<!doctype html>
<html lang="es-AR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<style>
body{font-family:Arial,Helvetica,sans-serif;margin:0;background:#f5f5f7;color:#222}
header{background:linear-gradient(110deg,#5d3ff1,#8069ff);color:#fff;padding:18px}
header a{color:#fff;text-decoration:none;font-weight:900;font-size:22px}
main{max-width:980px;margin:28px auto;padding:0 18px}.card{background:#fff;border:1px solid #e4e4e9;border-radius:16px;padding:22px}
.breadcrumb{font-size:13px;margin-bottom:14px}.breadcrumb a{color:#5d3ff1;text-decoration:none}
h1{font-size:30px;margin:0 0 12px}.price{font-size:28px;font-weight:900;margin:14px 0}.muted{color:#6e6e6e}
img{max-width:100%;max-height:430px;object-fit:contain;display:block;margin:18px auto}.wa{display:inline-block;background:#eafff2;color:#08783a;padding:13px 18px;border-radius:10px;text-decoration:none;font-weight:800}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.p{background:#fff;border:1px solid #e4e4e9;border-radius:14px;padding:14px}.p a{text-decoration:none;color:#222}
@media(max-width:700px){.grid{grid-template-columns:1fr 1fr}h1{font-size:25px}}
</style>
${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ""}
</head><body><header><a href="/">Electrobazar MYV</a></header><main>${body}</main></body></html>`;

export default async (req) => {
  try {
    const path = new URL(req.url).pathname;
    const products = await getCatalog();

    if (path.startsWith("/producto/")) {
      const slug = path.split("/").filter(Boolean)[1] || "";
      const p = products.find(x => productSlug(x) === slug);
      if (!p) return new Response("Producto no encontrado",{status:404});
      const fp = finalPrice(p.cost), canonical = `${SITE}/producto/${productSlug(p)}`;
      const description = `Comprá ${p.name} en Electrobazar MYV. Precio ${money(fp)}. Consultá disponibilidad y entrega por WhatsApp.`;
      const whatsapp = `https://wa.me/5491170582166?text=${encodeURIComponent(`Hola, quiero consultar por ${p.name}${p.code?` (código ${p.code})`:""}. Precio publicado: ${money(fp)}`)}`;
      const jsonld = JSON.stringify({
        "@context":"https://schema.org","@type":"Product","name":p.name,
        "sku":p.code || undefined,"image":p.image?[p.image]:undefined,"description":description,
        "offers":{"@type":"Offer","url":canonical,"priceCurrency":"ARS","price":fp,
        "availability":"https://schema.org/InStock","seller":{"@type":"Organization","name":"Electrobazar MYV"}}
      });
      const body = `<div class="breadcrumb"><a href="/">Inicio</a> › <a href="/categoria/${categorySlug(p.category)}">${esc(p.category)}</a> › ${esc(p.name)}</div>
      <article class="card"><h1>${esc(p.name)}</h1>${p.code?`<div class="muted">Código ${esc(p.code)}</div>`:""}
      ${p.image?`<img src="/api/image?url=${encodeURIComponent(p.image)}" alt="${esc(p.name)}">`:""}
      <div class="price">${money(fp)}</div><p>Consultá disponibilidad, medios de entrega y tiempos de pedido.</p>
      <a class="wa" href="${whatsapp}" rel="nofollow">💬 Consultar por WhatsApp</a></article>`;
      return new Response(layout({title:`${p.name} | Electrobazar MYV`,description,canonical,body,jsonld}),
        {headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, s-maxage=1800"}});
    }

    if (path.startsWith("/categoria/")) {
      const slug = path.split("/").filter(Boolean)[1] || "";
      const cat = [...new Set(products.map(p=>p.category))].find(c=>categorySlug(c)===slug);
      if (!cat) return new Response("Categoría no encontrada",{status:404});
      const list = products.filter(p=>p.category===cat), canonical = `${SITE}/categoria/${categorySlug(cat)}`;
      const description = `${cat} en Electrobazar MYV. Catálogo online con precios actualizados y consultas por WhatsApp. Entregas en zonas de Buenos Aires.`;
      const cards = list.map(p=>`<div class="p"><a href="/producto/${productSlug(p)}"><strong>${esc(p.name)}</strong><div class="price" style="font-size:20px">${money(finalPrice(p.cost))}</div></a></div>`).join("");
      const body = `<div class="breadcrumb"><a href="/">Inicio</a> › ${esc(cat)}</div><h1>${esc(cat)}</h1><p>${esc(description)}</p><div class="grid">${cards}</div>`;
      return new Response(layout({title:`${cat} | Electrobazar MYV`,description,canonical,body}),
        {headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, s-maxage=1800"}});
    }
    return new Response("No encontrado",{status:404});
  } catch(e) { return new Response("Error temporal",{status:500}); }
};
