// Cloudflare Pages Function — GET /api/emails?token=ADMIN_TOKEN
// Lists captured emails through the same KV binding that writes them (consistent).
export async function onRequestGet({ request, env }) {
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  const url = new URL(request.url);
  if (!env.ADMIN_TOKEN || url.searchParams.get("token") !== env.ADMIN_TOKEN) return json({ error: "unauthorized" }, 401);
  if (!env.EMAILS) return json({ error: "Capture store not configured" }, 500);
  const out = [];
  let cursor;
  do {
    const list = await env.EMAILS.list({ prefix: "email:", cursor });
    for (const k of list.keys) {
      const v = await env.EMAILS.get(k.name);
      try { out.push(JSON.parse(v)); } catch { out.push({ email: k.name.replace(/^email:/, "") }); }
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return json({ count: out.length, emails: out });
}
