# formless

> Parse any public form URL into a clean JSON Schema or Markdown spec.  
> No config. No auth. Just a URL.

```bash
npx formless https://yourworkspace.typeform.com/to/abc123
```

---

## Why

You need to rebuild a client's Typeform in your own stack. Or validate form submissions against a schema. Or document what fields a form collects. You open the form, manually write out every field, its type, whether it's required — and you do it by hand, every time.

**formless** reads the form for you and outputs something you can actually use.

---

## Output formats

**JSON Schema** — ready to plug into validation libraries, OpenAPI specs, or AI prompts:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Job Application",
  "type": "object",
  "properties": {
    "full_name": { "type": "string", "minLength": 2 },
    "email": { "type": "string", "format": "email" },
    "role": {
      "type": "string",
      "enum": ["Engineering", "Design", "Product"]
    }
  },
  "required": ["full_name", "email", "role"]
}
```

**Markdown spec** — human-readable, drops into any README or doc:

```markdown
## Fields

### 1. Full name `required`
- **Type:** text

### 2. Email address `required`
- **Type:** email

### 3. Role `required`
- **Type:** select
- **Options:** Engineering, Design, Product
```

---

## CLI usage

```bash
# outputs both formats to stdout (default)
npx formless <url>

# specific format
npx formless <url> --format json
npx formless <url> --format md

# write files to a directory
npx formless <url> --out ./output

# pretty-print JSON
npx formless <url> --format json --pretty
```

---

## Web UI

A hosted version is available at **[formless.byant.dev](https://formless.byant.dev)**

---

## Supported platforms

| Platform | Status | Notes |
|---|---|---|
| Typeform | ✅ v1 | Public forms only |
| Tally | ✅ v1 | Public forms only |
| Google Forms | 🔜 v2 | Requires headless browser |
| Microsoft Forms | 🔜 v2 | Limited field data |
| Jotform | 🗓 Later | Planned |

Private or password-protected forms are not supported — the form must be publicly accessible.

---

## Roadmap

- **v1** — CLI + web UI, Typeform + Tally, JSON Schema + Markdown output
- **v2** — Google Forms, Zod schema output, `--watch` flag, form diffing
- **Later** — TypeScript interface output, React Hook Form generation, VS Code extension, GitHub Action

See the full [product plan](./docs/plan.md) for details.

---

## Contributing

Contributions are very welcome — especially new platform adapters.

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes and add tests
4. Open a pull request with a clear description

Please open an issue first for anything beyond a small bug fix, so we can discuss the approach before you invest time building it.

## Testing

See the testing guide at [docs/testing.md](./docs/testing.md) for CLI, web, and API test instructions.

---

## License

[MIT](./LICENSE) © 2026 Ant
