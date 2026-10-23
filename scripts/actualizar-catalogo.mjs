import { getCatalog } from "../netlify/functions/_catalog-lib.mjs";
import { writeFile, readFile } from "node:fs/promises";
const target = new URL("../public/catalogo.json", import.meta.url);
const products = await getCatalog();
if (!Array.isArray(products) || products.length < 10) {
  throw new Error(`Actualización cancelada: solo ${products?.length ?? 0} productos. Se conserva el catálogo anterior.`);
}
const previous = await readFile(target, "utf8").then(JSON.parse).catch(() => null);
// Evitar publicar un catálogo incompleto si falla una categoría.
if (previous?.count > 100 && products.length < previous.count * 0.65) {
  throw new Error(`Catálogo sospechosamente reducido (${products.length} frente a ${previous.count}).`);
}
const payload = {source:"https://reyesdeloeste.com.ar",updatedAt:new Date().toISOString(),count:products.length,products};
await writeFile(target, JSON.stringify(payload));
console.log(`Catálogo guardado: ${products.length} productos`);
