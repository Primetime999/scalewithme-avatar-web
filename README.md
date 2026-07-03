# ScaleWithMe — Avatar Builder (web)

A no-install web version of the Avatar Builder: answer 5 questions → three ranked customer
personas + who to lead with. Static front-end (`public/`) + one Cloudflare Pages Function
(`functions/api/generate.js`) that calls the Anthropic API server-side.

## Deploy (Cloudflare Pages)

Prereqs: a valid **Anthropic API key** (`sk-ant-api…` from console.anthropic.com — the one
currently in the shell is revoked) and a Cloudflare account.

```bash
cd ~/Documents/scalewithme-avatar-web

# 1. Authenticate Cloudflare (opens a browser — approve once)
npx wrangler login

# 2. First deploy (creates the Pages project + uploads front-end and function)
npx wrangler pages deploy public --project-name scalewithme-avatar

# 3. Set the API key as a secret (wrangler prompts — paste it there, it stays off-screen)
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name scalewithme-avatar

# 4. Redeploy so the secret is live
npx wrangler pages deploy public --project-name scalewithme-avatar
```

Result: a public URL like `https://scalewithme-avatar.pages.dev` — anyone opens it, no account,
no install. Custom domain later via the Cloudflare Pages dashboard.

## Local test
```bash
echo 'ANTHROPIC_API_KEY=sk-ant-api-…' > .dev.vars   # gitignored
npx wrangler pages dev public
```

## Model
`functions/api/generate.js` uses `claude-sonnet-5`. Swap the `MODEL` constant for
`claude-haiku-4-5-20251001` to cut cost, or `claude-opus-4-8` for max quality.

## Notes
- The API key lives only as a Cloudflare **secret** (server-side) — never in the client or the repo.
- `.dev.vars` and any `*.key` files are gitignored.
