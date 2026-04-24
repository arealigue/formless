# Contributing to formless

Thanks for your interest in contributing. formless is a small open-source project and every contribution helps — whether it's a bug report, a new platform adapter, or a documentation fix.

---

## Before you start

For anything beyond a small bug fix or typo, **please open an issue first**. Describe what you want to build and why. This saves you from investing time in something that might not align with the project's direction, and gives us a chance to discuss the best approach together.

---

## Project structure

```
formless/
├── packages/
│   ├── core/      ← shared parser, adapters, output builders
│   ├── cli/       ← CLI entrypoint
│   └── web/       ← Next.js web UI
```

Most contributions will touch `packages/core`. The CLI and web UI are thin layers on top of it.

---

## Setup

**Requirements:** Node.js 20+, npm 10+

```bash
git clone https://github.com/arealigue/formless.git
cd formless
npm install        # installs all workspace dependencies
npm run build      # builds all packages
```

**Run the CLI locally:**

```bash
cd packages/cli
npm run dev -- https://yourworkspace.typeform.com/to/abc123
```

**Run the web UI locally:**

```bash
cd packages/web
npm run dev        # starts at http://localhost:3000
```

---

## Development workflow

```bash
# typecheck all packages
npm run typecheck

# lint all packages
npm run lint

# run all tests
npm run test

# run tests in watch mode
npm run test:watch
```

All three must pass before opening a pull request. CI will check them automatically.

---

## Adding a new platform adapter

This is the most impactful contribution you can make. Here's the exact pattern to follow:

**1. Create the adapter file**

```
packages/core/src/adapters/your-platform.ts
```

**2. Implement the `Adapter` interface**

```typescript
import type { FormlessSchema } from '../types';

export async function fetchYourPlatform(url: string): Promise<FormlessSchema> {
  // 1. fetch the form data (API call or HTML scrape)
  // 2. map fields to FormlessField[]
  // 3. return a FormlessSchema
}
```

**3. Register it in `detector.ts`**

Add a URL pattern match that returns your platform slug.

**4. Register it in `core/index.ts`**

Wire up the new platform slug to your adapter function.

**5. Add fixture data**

Save a real API response or scraped HTML as a fixture file in:

```
packages/core/src/__fixtures__/your-platform/
  ├── raw-response.json   ← what the platform returns
  └── expected-output.json ← what formless should produce
```

**6. Write tests**

Tests must cover:
- Field type mapping (one test per field type your adapter handles)
- Required field detection
- Options/enum extraction for select fields
- Edge cases: empty form, form with only one field, hidden fields

---

## Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add Jotform adapter
fix(cli): handle empty form gracefully
docs: update contributing guide
chore: bump dependencies
```

Types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`

Scope is optional but helpful: `core`, `cli`, `web`.

---

## Pull request checklist

Before opening a PR, make sure:

- [ ] `npm run typecheck` passes with no errors
- [ ] `npm run lint` passes with no warnings
- [ ] `npm run test` passes
- [ ] New code has test coverage (adapters especially)
- [ ] The PR description explains what changed and why
- [ ] If it's a new platform adapter, fixture data is included

---

## Reporting bugs

Open a GitHub issue with:

- The form URL you were trying to parse (if it's public)
- The command or action you ran
- What you expected to happen
- What actually happened (paste the full error output)

---

## Code style

- TypeScript strict mode is on — no `any` without a comment explaining why
- Prefer `const` over `let`
- Async/await over `.then()` chains
- No external dependencies in `packages/core` without discussion first — keep it lean

---

## Questions?

Open a GitHub Discussion or drop a comment on any relevant issue. Happy to help you get started.
