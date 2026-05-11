# BiliBili Stats

Cloudflare Worker exposing a single SVG endpoint:

```markdown
![](https://<your-worker-host>/api/bilibili?gist={GIST_ID})
```

Example:

```text
GET /api/bilibili?gist=0123456789abcdef0123456789abcdef
```

## Chrome Extension

The Worker does not call Bilibili directly. Use the Chrome extension in `extension/` to collect stats from an open Bilibili page and save sanitized JSON to a GitHub Gist.

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked and select the `extension/` directory.
4. Open a Bilibili space page.
5. Open the extension popup, set your GitHub token, UID, and optional existing Gist ID.
6. Click `Collect & sync`.
7. Use the saved Gist ID in `/api/bilibili?gist={GIST_ID}`.

The extension cannot read `.env`; paste the GitHub token into the popup once and it will be saved in Chrome extension storage.

The extension writes `bilibili-stats.json` with this shape:

```json
{
  "schemaVersion": 1,
  "uid": "2034996",
  "updatedAt": "2026-05-11T00:00:00.000Z",
  "stats": {
    "username": "Means88",
    "followers": 644,
    "followings": 167,
    "recentViews": null,
    "videos": 71,
    "level": 6,
    "description": ""
  }
}
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

Optional Worker environment variables:

- `GITHUB_TOKEN`: GitHub token used by the Worker to read private Gists. Public Gists do not need it.

For local development, put it in `.dev.vars` or `.env`. For production, configure it with `wrangler secret put GITHUB_TOKEN`.
