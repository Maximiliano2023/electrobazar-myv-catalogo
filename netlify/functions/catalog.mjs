import { getCatalog } from "./_catalog-lib.mjs";
export default async () => {
  try {
    const products = await getCatalog();
    return new Response(JSON.stringify({source:"https://reyesdeloeste.com.ar",updatedAt:new Date().toISOString(),count:products.length,products}),{
      status:200,
      headers:{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=300",
        "Netlify-CDN-Cache-Control":"public, durable, s-maxage=7200, stale-while-revalidate=604800"}
    });
  } catch(e) {
    return new Response(JSON.stringify({error:"No se pudo actualizar el catálogo",detail:String(e)}),{status:500,headers:{"content-type":"application/json; charset=utf-8"}});
  }
};
