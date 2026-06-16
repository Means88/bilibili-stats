# BiliBili Stats

Cloudflare Worker exposing Bilibili SVG and JSON Feed endpoints:

```markdown
![](https://<your-worker-host>/api/bilibili?gist={GIST_ID})
```

Example:

```text
GET /api/bilibili?gist=0123456789abcdef0123456789abcdef
```

The same Gist can expose the homepage JSON Feed file:

```text
GET /api/bilibili.json?gist=0123456789abcdef0123456789abcdef
```

The JSON Feed response includes permissive CORS headers for browser clients.

## Chrome Extension

The Worker does not call Bilibili directly. Use the Chrome extension in `extension/` to collect stats from an open Bilibili page and save sanitized JSON to a GitHub Gist.

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked and select the `extension/` directory.
4. Open a Bilibili space page.
5. Open the extension popup, set your GitHub token, UID, and optional existing Gist IDs.
6. If the Gist ID fields are empty, click `Scan Gists` to match existing Gists by file name.
7. Click `Sync all` to update the stats Gist and latest videos Gist.
8. Use the saved stats Gist ID in `/api/bilibili?gist={GIST_ID}`.

The extension cannot read `.env`; paste the GitHub token into the popup once and it will be saved in Chrome extension storage.
Use `Export config` and `Import config` to move extension settings between browser profiles.

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

The same stats Gist also receives `bilibili.json`, a JSON Feed payload for the homepage videos section.

The latest videos sync writes two files to the configured videos Gist:

```text
latest_videos
latest_videos.md
```

`latest_videos` is plain text and `latest_videos.md` contains Markdown links, matching this format:

```markdown
[Video title](https://www.bilibili.com/video/BV...) ▶️:0.3k :11
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
