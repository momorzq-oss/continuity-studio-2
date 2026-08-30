# Continuity Studio 2

Continuity Studio 2 is a chat-first, project-based filmmaking production system. It manages story development, World and Film Bibles, permanent numbered production assets, structured scenarios, dialogue and character-reference binding, sequence planning, Seedance prompt preparation, continuity, recovery, and flat asset exports.

## Core rules

- One movie uses one flat, globally numbered visual asset folder with no subfolders.
- Uploaded source references remain unnumbered; generated production sheets receive permanent asset numbers.
- One composite character, costume, environment, or prop sheet counts as one asset regardless of its internal panels.
- Seedance handles generated dialogue and sound inside explicitly requested video.
- Story, asset, script, scenario, sequence, and prompt preparation never starts video automatically.
- The structured database state is the production source of truth.
- Codex supplies schema-constrained creative reasoning and natural-language interpretation; it never writes project state directly.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000/`.

`npm run dev` starts the web application and a loopback-only Codex app-server host. The host uses the Codex desktop/CLI session already authorized on this computer, runs the filmmaking brain in a read-only sandbox, and exposes only the narrow structured-reasoning endpoint used by the Studio. There is no separate Continuity Studio sign-in. If Codex is unavailable, the web application remains usable and labels the deterministic fallback honestly.

To enable real composite production-sheet generation, copy `.dev.vars.example` to `.dev.vars` and set a server-side `OPENAI_API_KEY`. The key never enters the browser, project archive, or asset export. The default model is `gpt-image-2`; `OPENAI_IMAGE_MODEL` can override it. A provider call occurs only after an explicit sheet-generation instruction.

Useful checks:

```bash
npm run lint
npm run build
npm test
npm run test:ui
npm run test:all
```

The API acceptance suite expects the local development server to be available at `http://localhost:3000` unless `CONTINUITY_STUDIO_URL` is set. The Playwright suite starts or reuses the web server, drives the real composer and controls, uploads four references, prepares one composite sheet, opens Advanced Control, reloads, and verifies restoration. Install its browser once with `npx playwright install chromium`.

Useful focused commands:

```bash
npm run dev:web  # web application only; deterministic fallback remains available
npm run brain    # loopback Codex reasoning host only
```

## Project documentation

The authoritative production contract is in [`specification/CONTINUITY_STUDIO_2.md`](specification/CONTINUITY_STUDIO_2.md).
