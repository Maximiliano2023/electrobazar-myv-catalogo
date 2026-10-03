const ALLOWED_HOST = "reyesdeloeste.com.ar";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) return new Response("Falta url", {status:400});

    const u = new URL(target);
    if (u.hostname !== ALLOWED_HOST && u.hostname !== "www."+ALLOWED_HOST) {
      return new Response("Host no permitido", {status:403});
    }

    const r = await fetch(u.href, {
      headers: {"user-agent":"Mozilla/5.0 ElectrobazarMYV/1.0"}
    });
    if (!r.ok) return new Response("Imagen no disponible", {status:r.status});

    return new Response(r.body, {
      status: 200,
      headers: {
        "content-type": r.headers.get("content-type") || "image/jpeg",
        "cache-control": "public, max-age=86400, s-maxage=604800"
      }
    });
  } catch (e) {
    return new Response("Imagen inválida", {status:400});
  }
};
