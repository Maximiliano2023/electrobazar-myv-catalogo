import * as cheerio from "cheerio";

export const BASE = "https://reyesdeloeste.com.ar";
export const SITE = "https://electrobazarmyv.com";
export const MARKUP = 1.50;

export const CATEGORIES = [
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

export function slugify(s="") {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}
export const productSlug = p => slugify(`${p.name}-${p.code || ""}`);
export const categorySlug = name => slugify(name);
export const finalPrice = cost => Math.ceil((Number(cost) * MARKUP) / 100) * 100;

const moneyToNumber = (txt) => {
  if (!txt) return null;
  const m = txt.replace(/\s/g,"").match(/\$?([\d.]+(?:,\d{1,2})?)/);
  if (!m) return null;
  return Number(m[1].replace(/\./g,"").replace(",","."));
};
const absUrl = u => !u ? "" : (u.startsWith("http") ? u : new URL(u, BASE).href);
const pickText = $el => $el.text().replace(/\s+/g, " ").trim();

function parseProducts(html, category) {
  const $ = cheerio.load(html);
  const found = [], seen = new Set();
  const selectors = [".product",".product-item",".item-product",".item","[data-product-id]",".producto",".product-box",".card-product",".product-list-item"];
  let nodes = $();
  for (const s of selectors) nodes = nodes.add($(s));

  if (!nodes.length) {
    $("*").each((_, el) => {
      const t = pickText($(el));
      if (/C[ÓO]D\s*:/i.test(t) && /\$\s*[\d.]+(?:,\d+)?/.test(t) && t.length < 1500) nodes = nodes.add($(el));
    });
  }

  nodes.each((_, el) => {
    const $el = $(el), text = pickText($el);
    if (!/\$\s*[\d.]+(?:,\d+)?/.test(text)) return;
    const codeMatch = text.match(/C[ÓO]D\s*:\s*([A-Z0-9_.\-\/]+)/i);
    const code = codeMatch ? codeMatch[1].trim() : "";
    let name = "";
    for (const sel of ["h1","h2","h3","h4",".name",".title",".product-name","a[href*='/tienda/']"]) {
      const v = pickText($el.find(sel).first());
      if (v && !/registrate|favoritos|comparar|precio/i.test(v) && v.length < 180) { name = v; break; }
    }
    const priceMatch = text.match(/\$\s*([\d.]+(?:,\d{1,2})?)/);
    const cost = priceMatch ? moneyToNumber(priceMatch[0]) : null;
    if (!cost || !name) return;
    let href = absUrl($el.find("a[href*='/tienda/']").first().attr("href") || "");
    const $img = $el.find("img").first();
    let img = $img.length ? ($img.attr("data-src") || $img.attr("data-lazy-src") || $img.attr("src") || "") : "";
    img = absUrl(img);
    const key = code || `${name}|${cost}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({category, code, name, cost, url: href, image: img});
  });

  return found;
}

async function fetchCategory(name, path) {
  const results = [], seen = new Set();
  for (let page = 1; page <= 20; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${BASE}${path}${sep}page=${page}&recsPerPage=50`;
    const r = await fetch(url, {headers:{"user-agent":"Mozilla/5.0 ElectrobazarMYV/1.0","accept-language":"es-AR,es;q=0.9"}});
    if (!r.ok) break;
    const items = parseProducts(await r.text(), name);
    let added = 0;
    for (const p of items) {
      const key = p.code || `${p.name}|${p.cost}`;
      if (!seen.has(key)) { seen.add(key); results.push(p); added++; }
    }
    if (!items.length || added === 0 || items.length < 45) break;
  }
  return results;
}

export async function getCatalog() {
  const batches = await Promise.all(CATEGORIES.map(([n,p]) => fetchCategory(n,p)));
  const map = new Map();
  for (const p of batches.flat()) {
    const key = p.code || `${p.name}|${p.cost}`;
    if (!map.has(key)) map.set(key,p);
  }
  return [...map.values()];
}
