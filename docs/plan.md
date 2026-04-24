# formless — product plan

> Parse any public form URL into a clean JSON Schema or Markdown spec.  
> No config. No auth. Just a URL.

---

## Overview

**formless** is an open-source developer tool that takes a public form URL (Typeform, Tally, and others) and outputs a machine-readable or human-readable description of its fields — field names, types, validation rules, options, and required status.

It ships as two things: a CLI (`npx formless`) and a minimal web UI deployed on Vercel.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Monorepo | npm workspaces | Zero extra tooling, works natively |
| Language | TypeScript | Type safety for schema modeling |
| CLI framework | [citty](https://github.com/unjs/citty) | Lightweight, modern, ESM-first |
| Scraping | Playwright (Tally) | Handles JS-rendered forms |
| Web UI | Next.js 14 (App Router) | App on Vercel free tier |
| Styling | Tailwind CSS | Fast, no design system overhead |
| Hosting | Vercel | Free tier, works with your stack |
| Package registry | npm | Standard for CLI distribution |

---

## Repo Structure

```
formless/
├── packages/
│   ├── core/                  ← shared parser, adapters, output builders
│   │   ├── src/
│   │   │   ├── adapters/
│   │   │   │   ├── typeform.ts
│   │   │   │   └── tally.ts
│   │   │   ├── outputs/
│   │   │   │   ├── json-schema.ts
│   │   │   │   └── markdown.ts
│   │   │   ├── normalizer.ts  ← maps platform fields → FormlessField[]
│   │   │   ├── detector.ts    ← detects platform from URL
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── cli/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── app/
│       │   ├── page.tsx
│       │   ├── api/
│       │   │   └── parse/route.ts
│       │   └── layout.tsx
│       ├── components/
│       │   ├── UrlInput.tsx
│       │   ├── OutputPanel.tsx
│       │   └── FormatToggle.tsx
│       ├── package.json
│       └── tsconfig.json
├── .github/
│   └── workflows/
│       ├── ci.yml             ← lint + typecheck on PR
│       └── release.yml        ← publish to npm on tag
├── README.md
├── CONTRIBUTING.md
├── package.json               ← workspace root
└── tsconfig.base.json
```

---

## The Core Data Model

Every platform adapter normalizes into a shared `FormlessField` type. This is the backbone of the entire project.

```typescript
type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'phone'
  | 'url'
  | 'date'
  | 'textarea'
  | 'select'       // single-choice dropdown
  | 'multiselect'  // multiple-choice
  | 'boolean'      // yes/no
  | 'rating'       // numeric scale
  | 'ranking'      // drag-to-rank
  | 'file'
  | 'statement'    // non-input display text
  | 'unknown';

interface FormlessField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: string[];          // for select, multiselect, ranking
  min?: number;                // for rating, number
  max?: number;
  minLength?: number;          // for text, textarea
  maxLength?: number;
  allowMultiple?: boolean;     // for file
  hidden?: boolean;            // hidden fields
}

interface FormlessSchema {
  title: string;
  description?: string;
  platform: 'typeform' | 'tally' | 'google-forms' | 'unknown';
  sourceUrl: string;
  parsedAt: string;            // ISO timestamp
  fields: FormlessField[];
}
```

---

## v1 — "Zero to Useful"

**Goal:** A working CLI and web UI that handles Typeform and Tally reliably, with clean JSON Schema and Markdown output.

**Target ship date:** 4–6 weeks from start.

---

### v1 Features

#### 1. Platform Detection (`detector.ts`)

Automatically identifies the platform from the URL pattern. No user input needed.

```
https://yourworkspace.typeform.com/to/abc123    → typeform
https://tally.so/r/abc123                       → tally
https://forms.gle/abc123                        → google-forms (unsupported in v1, clear error)
anything else                                   → unknown (clear error)
```

Rules:
- Match by hostname and path pattern
- Return platform slug or throw `UnsupportedPlatformError` with a helpful message
- Error message should tell the user which platforms are supported and invite them to open an issue

---

#### 2. Typeform Adapter (`adapters/typeform.ts`)

Typeform exposes form structure via a **public, unauthenticated API endpoint** baked into every published form. No API key required.

**How it works:**

1. Fetch the form's embed page HTML
2. Extract the form ID from the URL (`/to/{form_id}`)
3. Call `https://api.typeform.com/forms/{form_id}` — returns full field definitions publicly for published forms
4. Map Typeform field types to `FormlessField` types

**Typeform → FormlessField type mapping:**

| Typeform type | FormlessField type |
|---|---|
| `short_text` | `text` |
| `long_text` | `textarea` |
| `email` | `email` |
| `number` | `number` |
| `phone_number` | `phone` |
| `website` | `url` |
| `date` | `date` |
| `dropdown` | `select` |
| `multiple_choice` | `select` / `multiselect` |
| `yes_no` | `boolean` |
| `opinion_scale` / `rating` | `rating` |
| `ranking` | `ranking` |
| `file_upload` | `file` |
| `statement` | `statement` |
| `hidden` | (captured but flagged `hidden: true`) |

**Fields to extract per Typeform field:**
- `ref` → `id`
- `title` → `label`
- `validations.required` → `required`
- `properties.description` → `description`
- `properties.placeholder` → `placeholder`
- `properties.choices[].label` → `options[]`
- `properties.min_value` / `max_value` → `min` / `max`

---

#### 3. Tally Adapter (`adapters/tally.ts`)

Tally renders forms as a React app. The field data is embedded in a `__NEXT_DATA__` script tag in the page HTML — no headless browser needed for most forms.

**How it works:**

1. Fetch the Tally form page HTML (plain `fetch`)
2. Parse the `<script id="__NEXT_DATA__">` JSON blob
3. Navigate `props.pageProps.form.blocks` — each block is a field
4. Map Tally block types to `FormlessField` types

**Tally → FormlessField type mapping:**

| Tally block type | FormlessField type |
|---|---|
| `INPUT_TEXT` | `text` |
| `INPUT_EMAIL` | `email` |
| `INPUT_NUMBER` | `number` |
| `INPUT_PHONE_NUMBER` | `phone` |
| `INPUT_LINK` | `url` |
| `INPUT_DATE` | `date` |
| `TEXTAREA` | `textarea` |
| `DROPDOWN` | `select` |
| `MULTIPLE_CHOICE` | `select` / `multiselect` |
| `CHECKBOXES` | `multiselect` |
| `LINEAR_SCALE` | `rating` |
| `FILE_UPLOAD` | `file` |
| `STATEMENT` | `statement` |
| `HIDDEN_FIELDS` | (captured, flagged `hidden: true`) |

**Fallback:** If `__NEXT_DATA__` is missing or the structure changes, fall back to Playwright-based scraping with a clear warning in output. Playwright is an optional peer dependency — if not installed, the fallback throws a clear install instruction.

---

#### 4. Output: JSON Schema (`outputs/json-schema.ts`)

Converts a `FormlessSchema` into a valid [JSON Schema Draft-07](https://json-schema.org/draft-07/schema) document.

**Rules:**
- Each non-hidden, non-statement field becomes a property
- Required fields are listed in the top-level `required` array
- `select` → `enum` array
- `multiselect` → `type: "array"` with `items: { enum: [...] }`
- `rating` → `type: "integer"` with `minimum` / `maximum`
- `boolean` → `type: "boolean"`
- `email` → `type: "string", format: "email"`
- `url` → `type: "string", format: "uri"`
- `date` → `type: "string", format: "date"`
- `file` → `type: "string", format: "uri"` (file URL after upload)
- `minLength` / `maxLength` preserved when present
- `description` preserved as JSON Schema `description`

**Example output:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Job Application",
  "description": "Parsed by formless from Typeform",
  "type": "object",
  "properties": {
    "full_name": {
      "type": "string",
      "description": "Your full legal name",
      "minLength": 2,
      "maxLength": 100
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "years_experience": {
      "type": "integer",
      "minimum": 0,
      "maximum": 50
    },
    "role": {
      "type": "string",
      "enum": ["Engineering", "Design", "Product", "Marketing"]
    },
    "skills": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["React", "Node.js", "Python", "Figma"]
      }
    }
  },
  "required": ["full_name", "email", "role"]
}
```

---

#### 5. Output: Markdown Spec (`outputs/markdown.ts`)

A human-readable field spec, useful for documentation, handoffs to devs, or dropping into a project README.

**Format:**

```markdown
# Job Application

> Source: https://yourworkspace.typeform.com/to/abc123
> Platform: Typeform
> Parsed: 2026-04-25T10:00:00Z
> Fields: 8 (5 required)

---

## Fields

### 1. Full name `required`
- **Type:** text
- **Description:** Your full legal name
- **Max length:** 100

### 2. Email address `required`
- **Type:** email

### 3. Years of experience
- **Type:** number
- **Range:** 0 – 50

### 4. Role `required`
- **Type:** select
- **Options:** Engineering, Design, Product, Marketing

### 5. Skills
- **Type:** multiselect
- **Options:** React, Node.js, Python, Figma

---

*Generated by [formless](https://github.com/your-username/formless)*
```

---

#### 6. CLI (`packages/cli`)

**Install / run:**
```bash
npx formless <url>
npx formless <url> --format json
npx formless <url> --format md
npx formless <url> --format both
npx formless <url> --out ./output      # writes files to disk
npx formless <url> --pretty            # pretty-print JSON
```

**Default behavior (no flags):** outputs both JSON Schema and Markdown to stdout, separated by a divider.

**Flags:**

| Flag | Default | Description |
|---|---|---|
| `--format` | `both` | Output format: `json`, `md`, or `both` |
| `--out <dir>` | — | Write files to directory instead of stdout |
| `--pretty` | `false` | Pretty-print JSON output |
| `--no-color` | `false` | Disable colored terminal output |
| `--silent` | `false` | Suppress progress spinners and info messages |

**Terminal output includes:**
- Spinner while fetching/parsing (using `ora` or built-in citty)
- Platform detected badge (e.g. `✓ Detected: Typeform`)
- Field count summary (e.g. `✓ Parsed 8 fields (5 required)`)
- Colored output with field types highlighted

**Error handling:**
- Unsupported platform → clear message + link to open a GitHub issue
- Private/password-protected form → clear message explaining the limitation
- Network error → retry once, then fail with message
- Unexpected page structure → warn and output what was parsed, with a note to open an issue

---

#### 7. Web UI (`packages/web`)

A minimal Next.js app. Single-purpose, zero bloat.

**Pages:**
- `/` — main page with URL input, format toggle, output panel

**Layout:**
```
┌─────────────────────────────────────────┐
│  formless                      [GitHub] │
├─────────────────────────────────────────┤
│                                         │
│  [ Paste a form URL here...         ]   │
│                   [ Parse ]             │
│                                         │
│  Format: [ JSON Schema ] [ Markdown ]   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  {                                │  │
│  │    "$schema": "...",              │  │
│  │    "title": "Job Application",   │  │
│  │    ...                            │  │
│  │  }                                │  │
│  └───────────────────────────────────┘  │
│                    [ Copy to clipboard ] │
│                                         │
│  Supported: Typeform · Tally            │
└─────────────────────────────────────────┘
```

**API route (`/api/parse`):**
- `POST { url, format }` → returns parsed schema
- Rate-limited to 30 req/min per IP (using Vercel Edge middleware)
- Returns `{ jsonSchema?, markdown?, meta: { platform, fieldCount, parsedAt } }`

**UX details:**
- Input validates URL format client-side before submitting
- Loading state with skeleton output panel
- Error states with specific, helpful messages
- Output panel uses a code block with syntax highlighting (Shiki)
- Copy to clipboard button with confirmation feedback
- Keyboard shortcut: `Cmd/Ctrl + Enter` to parse

---

#### 8. CI/CD

**GitHub Actions — `ci.yml`** (runs on every PR):
- Typecheck with `tsc --noEmit`
- Lint with ESLint
- Run unit tests

**GitHub Actions — `release.yml`** (runs on `v*` tags):
- Build all packages
- Publish `@formless/core` and `formless` (CLI) to npm
- Create GitHub release with changelog

**Unit tests to write for v1:**
- `detector.ts` — URL pattern matching for all supported/unsupported platforms
- `normalizer.ts` — field type mapping correctness
- `json-schema.ts` — output structure validity against JSON Schema spec
- `markdown.ts` — output format correctness
- Adapter tests using fixture JSON (recorded Typeform/Tally responses, no live calls)

---

#### 9. README (launch quality)

The README is a first-class deliverable for v1. It must include:

- A one-sentence description
- A short terminal screen recording (GIF) of the CLI in action
- Install and usage instructions
- Example output (both formats) from a real form
- Supported platforms table with v2 roadmap column
- Contributing guide link
- License (MIT)

---

### v1 What's Explicitly Out of Scope

- Google Forms (needs Puppeteer, too heavy for v1)
- Microsoft Forms (requires auth)
- Authentication / API key support for private forms
- Zod schema output
- Form diffing (comparing two versions of a form)
- Browser extension
- Saving/history in the web UI

---

## v2 — "More Platforms, Better Output"

**Target:** 6–10 weeks after v1 ship.

| Feature | Details |
|---|---|
| Google Forms support | Playwright adapter — headless browser scrapes the rendered form. Optional peer dependency. |
| Zod schema output | `--format zod` — generates a Zod v3 schema string, ready to paste into a TypeScript project |
| `--watch` flag | Watches clipboard; re-runs automatically when a new form URL is copied |
| Field descriptions in JSON | Preserve Typeform/Tally descriptions as JSON Schema `description` (more complete mapping) |
| Web UI history | localStorage-based recent parses (last 5 URLs, no backend) |
| `formless diff <url1> <url2>` | Compare two versions of a form, output added/removed/changed fields |
| Improved error messages | Detect private forms earlier, suggest making the form public |
| Microsoft Forms (partial) | Read-only embed scrape — limited field data, clearly labeled as experimental |

---

## v3 and Beyond — "Ecosystem"

These are directional, not committed. Ship v1 and v2 first, then validate demand.

| Feature | Notes |
|---|---|
| Jotform adapter | Large user base, public embed HTML is parseable |
| Notion Forms adapter | Newer platform, growing fast |
| Yup schema output | Companion to Zod for teams still on Yup |
| TypeScript interface output | `--format ts` — outputs `interface FormData { ... }` |
| React Hook Form output | `--format rhf` — generates a full `useForm` setup with validation |
| VS Code extension | Run `formless` on a URL directly from the editor command palette |
| GitHub Action | `formless-action` — parse a form URL as part of CI, fail if schema breaks |
| Webhooks / API | Hosted API for teams that want to integrate formless into their own tools |
| Schema versioning | Track form changes over time, store diffs in a simple format |

---

## Launch Checklist

Before calling v1 done, all of these must be true:

- [ ] `npx formless https://tally.so/r/[any-public-form]` works end-to-end
- [ ] `npx formless https://[workspace].typeform.com/to/[id]` works end-to-end
- [ ] JSON Schema output validates against draft-07 spec
- [ ] Markdown output renders correctly on GitHub
- [ ] Web UI deployed and accessible at public URL
- [ ] Rate limiting active on web UI API route
- [ ] README has GIF demo and real example output
- [ ] npm package published and `npx formless` works without install
- [ ] GitHub repo has: description, topics, license, contributing guide
- [ ] All CI checks green

---

*Plan version: 1.0 — April 2026*