// Cloudflare Pages Function — POST /api/subscribe  → stores an email in the EMAILS KV namespace.
export async function onRequestPost({ request, env }) {
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  if (!env.EMAILS) return json({ error: "Capture store not configured" }, 500);
  let b; try { b = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const email = (b && b.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Please enter a valid email." }, 400);
  await env.EMAILS.put("email:" + email, JSON.stringify({ email, ts: Date.now(), source: (b.source || "avatar-builder").toString().slice(0, 40), product: (b.product || "").slice(0, 200) }));
  return json({ ok: true });
}
