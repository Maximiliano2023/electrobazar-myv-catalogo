import * as cheerio from "cheerio";

const BASE = "https://reyesdeloeste.com.ar";

// Categorías principales. Si el proveedor agrega otra categoría nueva,
// se puede sumar acá sin tocar el diseño del catálogo.
const CATEGORIES = [
  ["Hogar", "/tienda/hogar"],
  ["Moda y accesorios", "/tienda/moda-y-accesorios"],
  ["Infantil", "/tienda/infantil"],
  ["Belleza y cuidado", "/tienda/belleza-y-cuidado-personal"],
  ["Tecnología", "/tienda/tecnologia"],
  ["Tiempo libre", "/tienda/tiempo-libre"],
  ["Iluminación", "/tienda/iluminacion"],
  ["Electrodomésticos", "/tienda/electrodomesticos"],
  ["Ferretería", "/tienda/ferreteria"],
  ["Librería", "/tienda/libreria"]
];

const moneyToNumber = (txt) => {
  if (!txt) return null;
  const m = txt.replace(/\s/g,"").match(/\$?([\d.]+(?:,\d{1,2})?)/);
  if (!m) return null;
  return Number(m[1].replace(/\./g,"").replace(",","."));
};

function absUrl(u) {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return new URL(u, BASE).href;
}

function pickText($el) {
  return $el.text().replace(/\s+/g, " ").trim();
}

function parseProducts(html, category) {
  const $ = cheerio.load(html);
  const found = [];
  const seen = new Set();

  // Buscar contenedores de producto usando varios selectores.
  const selectors = [
    ".product", ".product-item", ".item-product", ".item",
    "[data-product-id]", ".producto", ".product-box",
    ".card-product", ".product-list-item"
  ];

  let nodes = $();
  for (const s of selectors) nodes = nodes.add($(s));

  // Fallback: elementos que contengan CÓD y un precio.
  if (!nodes.length) {
    $("*").each((_, el) => {
      const t = pickText($(el));
      if (/C[ÓO]D\s*:/i.test(t) && /\$\s*[\d.]+(?:,\d+)?/.test(t) && t.length < 1500) {
        nodes = nodes.add($(el));
      }
    });
  }

  nodes.each((_, el) => {
    const $el = $(el);
    const text = pickText($el);
    if (!/\$\s*[\d.]+(?:,\d+)?/.test(text)) return;

    const codeMatch = text.match(/C[ÓO]D\s*:\s*([A-Z0-9_.\-\/]+)/i);
    const code = codeMatch ? codeMatch[1].trim() : "";

    // Título: probar encabezados y enlaces de producto.
    let name = "";
    for (const sel of ["h1","h2","h3","h4",".name",".title",".product-name","a[href*='/tienda/']"]) {
      const v = pickText($el.find(sel).first());
      if (v && !/registrate|favoritos|comparar|precio/i.test(v) && v.length < 180) {
        name = v; break;
      }
    }

    const priceMatch = text.match(/\$\s*([\d.]+(?:,\d{1,2})?)/);
    const cost = priceMatch ? moneyToNumber(priceMatch[0]) : null;
    if (!cost || !name) return;

    let href = $el.find("a[href*='/tienda/']").first().attr("href") || "";
    href = absUrl(href);

    let img = "";
    const $img = $el.find("img").first();
    if ($img.length) {
      img = $img.attr("data-src") || $img.attr("data-lazy-src") || $img.attr("src") || "";
      img = absUrl(img);
    }

    const key = code || (name + "|" + cost);
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ category, code, name, cost, url: href, image: img });
  });

  // Segunda estrategia específica basada en el texto de la página.
  if (!found.length) {
    const body = $("body").text().replace(/\r/g,"");
    const chunks = body.split(/C[ÓO]D\s*:/i).slice(1);
    for (const chunk of chunks) {
      const code = (chunk.match(/^\s*([^\s]+)/) || [])[1] || "";
      const priceM = chunk.match(/\$\s*([\d.]+(?:,\d{1,2})?)/);
      if (!priceM) continue;
      const beforePrice = chunk.slice(0, chunk.indexOf(priceM[0]))
        .replace(/Favoritos|Registrate para más información|Comparar/gi," ")
        .replace(/\s+/g," ").trim();
      const name = beforePrice.replace(new RegExp("^"+code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"\\s*"),"").trim();
      const cost = moneyToNumber(priceM[0]);
      if (name && cost) found.push({category, code, name, cost, url:"", image:""});
    }
  }

  return found;
}

async function fetchCategory(name, path) {
  const results = [];
  const seen = new Set();

  // Hasta 20 páginas por categoría, 50 artículos por página.
  for (let page = 1; page <= 20; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${BASE}${path}${sep}page=${page}&recsPerPage=50`;
    const r = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 ElectrobazarMYV/1.0",
        "accept-language": "es-AR,es;q=0.9"
      }
    });
    if (!r.ok) break;
    const html = await r.text();
    const items = parseProducts(html, name);
    let added = 0;
    for (const p of items) {
      const key = p.code || `${p.name}|${p.cost}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(p);
        added++;
      }
    }
    // Si la página trae menos de 45 o no agregó nada, normalmente es la última.
    if (!items.length || added === 0 || items.length < 45) break;
  }
  return results;
}

export default async () => {
  try {
    const batches = await Promise.all(CATEGORIES.map(([n,p]) => fetchCategory(n,p)));
    let products = batches.flat();

    // Deduplicar globalmente por código; conservar categoría.
    const map = new Map();
    for (const p of products) {
      const key = p.code || `${p.name}|${p.cost}`;
      if (!map.has(key)) map.set(key, p);
    }
    products = [...map.values()];

    return new Response(JSON.stringify({
      source: BASE,
      updatedAt: new Date().toISOString(),
      count: products.length,
      products
    }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Actualización automática sin castigar al proveedor en cada visita.
        "cache-control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({error:"No se pudo actualizar el catálogo", detail:String(e)}), {
      status: 500,
      headers: {"content-type":"application/json; charset=utf-8"}
    });
  }
};
