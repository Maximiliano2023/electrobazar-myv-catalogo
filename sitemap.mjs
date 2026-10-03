import { getCatalog, SITE, productSlug, categorySlug } from "./_catalog-lib.mjs";
export default async () => {
  try {
    const products = await getCatalog();
    const cats = [...new Set(products.map(p=>p.category).filter(Boolean))];
    const urls = [`${SITE}/`,...cats.map(c=>`${SITE}/categoria/${categorySlug(c)}`),...products.map(p=>`${SITE}/producto/${productSlug(p)}`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u.replace(/&/g,"&amp;")}</loc></url>`).join("\n")}\n</urlset>`;
    return new Response(xml,{headers:{"content-type":"application/xml; charset=utf-8","cache-control":"public, s-maxage=1800"}});
  } catch(e) { return new Response("Error generando sitemap",{status:500}); }
};
