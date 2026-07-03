// Cloudflare Pages Function — POST /api/generate
// Calls the Anthropic Messages API with tool-use to force a valid structured result.

const MODEL = "claude-sonnet-5";

const AVATAR_ITEM = {
  type: "object",
  properties: {
    rank: { type: "string", description: "PRIMARY | SECONDARY | TERTIARY" },
    name: { type: "string", description: "First name + age, e.g. 'Shipping Sam, 32'" },
    role: { type: "string" },
    snapshot: { type: "string", description: "role, household, income, tech comfort" },
    jtbd: {
      type: "object",
      properties: { functional: { type: "string" }, emotional: { type: "string" }, social: { type: "string" } },
      required: ["functional", "emotional", "social"],
    },
    acute: { type: "string" },
    alternative: { type: "string" },
    language: { type: "array", items: { type: "string" } },
    channelLead: { type: "string" },
    channelGems: { type: "string" },
    antiFit: { type: "string" },
    thesis: { type: "string" },
    riskiest: { type: "string" },
    moves: {
      type: "object",
      properties: { message: { type: "string" }, channel: { type: "string" }, offer: { type: "string" } },
      required: ["message", "channel", "offer"],
    },
    serveVia: { type: "string" },
  },
  required: ["rank","name","role","snapshot","jtbd","acute","alternative","language","channelLead","channelGems","antiFit","thesis","riskiest","moves","serveVia"],
};

export async function onRequestPost({ request, env }) {
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
  if (!env.ANTHROPIC_API_KEY) return json({ error: "Server missing ANTHROPIC_API_KEY" }, 500);

  let a;
  try { a = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (!a || !a.q1 || !a.q3) return json({ error: "Missing product or problem" }, 400);

  const userMsg = `Build three distinct, prioritized customer avatars for this product. Make them genuinely different people (different jobs/contexts), narrow and specific — never "everyone". Treat every field as a hypothesis to validate. Then call emit_avatars with exactly three avatars ranked PRIMARY, SECONDARY, TERTIARY (in that order), plus a "leadWith" paragraph on which to lead with and why.

INPUTS
- Product: ${a.q1}
- Who lit up: ${a.q2 || "(not given — infer)"}
- Problem it kills: ${a.q3}
- What they do today instead: ${a.q4 || "(not given — infer)"}
- Their own words: ${a.q5 || "(not given — infer)"}`;

  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        tools: [{
          name: "emit_avatars",
          description: "Return the three prioritized customer avatars.",
          input_schema: {
            type: "object",
            properties: { leadWith: { type: "string" }, avatars: { type: "array", items: AVATAR_ITEM } },
            required: ["leadWith", "avatars"],
          },
        }],
        tool_choice: { type: "tool", name: "emit_avatars" },
        messages: [{ role: "user", content: userMsg }],
      }),
    });
  } catch { return json({ error: "Upstream request failed" }, 502); }

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return json({ error: "Anthropic error " + resp.status, detail: t.slice(0, 200) }, 502);
  }

  const data = await resp.json();
  const tu = (data.content || []).find((c) => c.type === "tool_use");
  if (!tu || !tu.input) return json({ error: "No structured result", stop: data.stop_reason }, 502);
  return json(tu.input);
}
