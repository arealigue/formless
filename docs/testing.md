# Testing Guide

This guide covers manual and quick automated checks for formless.

## Prerequisites

- Node.js 20+
- npm 10+

From project root:

```bash
npm install
```

## Fast Validation (Recommended Before PR)

Run all core checks:

```bash
npm run typecheck
npm run test
npm run build
```

## CLI Testing

### Parse Tally as JSON

```bash
npm run dev:cli -- https://tally.so/r/kd0Zpe json
```

Expected: JSON Schema only.

### Parse Tally as Markdown

```bash
npm run dev:cli -- https://tally.so/r/kd0Zpe md
```

Expected: Markdown spec only.

### Parse both outputs

```bash
npm run dev:cli -- https://tally.so/r/kd0Zpe both
```

Expected: JSON + Markdown separated by a divider.

### Write output files

```bash
npm run dev:cli -- https://tally.so/r/kd0Zpe json --out ./output
```

Expected: File written under `output/`.

## Web App Testing

Start web app:

```bash
npm run dev:web
```

Open the local URL shown by Next.js (usually `http://localhost:3000` or `http://localhost:3001`).

Manual checks:

- Paste URL and click Parse.
- Toggle JSON Schema and Markdown.
- Copy output button copies current output.
- Invalid URL shows a helpful error.

## API Testing

The parse API route is `POST /api/parse`.

Request body:

```json
{
  "url": "https://tally.so/r/kd0Zpe",
  "format": "json"
}
```

Valid `format` values:

- `json`
- `md`
- `both`

### PowerShell example

```powershell
$body = @{ url = 'https://tally.so/r/kd0Zpe'; format = 'json' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3000/api/parse' -Method POST -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 8
```

If your dev server is on another port, replace `3000` accordingly.

### curl example

```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"url":"https://tally.so/r/kd0Zpe","format":"json"}'
```

Expected response shape:

```json
{
  "jsonSchema": { "type": "object" },
  "markdown": "...optional...",
  "meta": {
    "platform": "tally",
    "fieldCount": 24,
    "parsedAt": "2026-04-25T00:00:00.000Z"
  }
}
```

## Troubleshooting

- If CLI seems to ignore `--format`, pass format as positional token (`json`, `md`, or `both`) after URL when using `npm run dev:cli -- ...`.
- If API returns 429, wait one minute (rate limit is 30 req/min per IP).
- If parsing fails for Tally due to payload changes, capture page HTML and open an issue with URL + error output.