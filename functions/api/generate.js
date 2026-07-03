// Cloudflare Pages Function — POST /api/generate
// Calls the Anthropic Messages API server-side using the ANTHROPIC_API_KEY secret.

const MODEL = "claude-sonnet-5";

export async function onRequestPost(context) {
  const { request, env } = context;
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

  if (!env.ANTHROPIC_API_KEY) return json({ error: "Server missing ANTHROPIC_API_KEY" }, 500);

  let a;
  try { a = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (!a || !a.q1 || !a.q3) return json({ error: "Missing product or problem" }, 400);

  const prompt = `You are an expert avatar strategist. From the inputs below, produce THREE distinct, prioritized customer avatars for this product. Make them genuinely different people (different jobs/contexts), narrow and specific — never "everyone". Treat every field as a hypothesis to validate.

INPUTS
- Product: ${a.q1}
- Who lit up: ${a.q2 || "(not given — infer)"}
- Problem it kills: ${a.q3}
- What they do today instead: ${a.q4 || "(not given — infer)"}
- Their own words: ${a.q5 || "(not given — infer)"}

Return ONLY valid JSON (no markdown, no prose) in exactly this shape:
{"leadWith":"one short paragraph: which avatar (by name) to lead with and why, and how the other two get served differently",
"avatars":[{"rank":"PRIMARY","name":"First name + age","role":"one-line who they are","snapshot":"1-2 lines: role, household, income, tech comfort","jtbd":{"functional":"","emotional":"","social":""},"acute":"the problem that makes them act now","alternative":"what they use instead + why it fails","language":["2-4 exact phrases they'd say"],"channelLead":"the ONE channel to prioritize","channelGems":"1-2 hidden-gem venues","antiFit":"who it's NOT for","thesis":"[name] who struggles with [problem] because [alternative] fails at [gap]","riskiest":"the assumption that, if wrong, breaks this avatar","moves":{"message":"","channel":"","offer":""},"serveVia":"how to serve them (e.g. membership / done-for-you / a-la-carte tool)"}]}
Include exactly three avatars, ranked PRIMARY, SECONDARY, TERTIARY in that order.`;

  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        system: "You output only valid JSON. No markdown fences, no commentary.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (e) {
    return json({ error: "Upstream request failed" }, 502);
  }

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return json({ error: "Anthropic error " + resp.status, detail: t.slice(0, 300) }, 502);
  }

  const data = await resp.json();
  let text = (data.content && data.content[0] && data.content[0].text) || "";
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  try {
    return json(JSON.parse(text.slice(s, e + 1)));
  } catch {
    return json({ error: "Could not parse model output" }, 502);
  }
}
