# BiliBili Stats

Cloudflare Worker exposing a single SVG endpoint:

```markdown
![](https://<your-worker-host>/api/bilibili?uid={YOUR_USER_ID})
```

Example:

```text
GET /api/bilibili?uid=2034996
```

## Development

```bash
pnpm install
pnpm dev
```

## Deploy

```bash
pnpm deploy
```

Optional environment variables:

- `COOKIE`: Bilibili cookie used for requests that need authenticated data.
- `ALLOWED_UID_LIST`: Comma-separated numeric UID strings allowed to call `/api/bilibili`.

For local development, put them in `.dev.vars` or `.env`. For production, configure them with `wrangler secret put COOKIE` and `wrangler secret put ALLOWED_UID_LIST`.
