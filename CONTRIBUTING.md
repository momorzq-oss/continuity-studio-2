# Contributing to Continuity Studio 2

Contributions are welcome when they preserve the production contract and keep the filmmaker experience chat-first.

## Development setup

```bash
git clone https://github.com/momorzq-oss/continuity-studio-2.git
cd continuity-studio-2
npm install
npm run dev
```

Use Node.js 22.13 or newer. Run `npm run dev:web` when you do not need the local Codex bridge.

## Before opening a pull request

```bash
npm run lint
npm run typecheck
npm run build
npm run test:all
```

Describe the user-visible behavior, tests added or changed, database migrations, and any effect on exports or permanent references.

## Invariants that changes must preserve

- One project-wide asset numbering sequence across every visual category.
- Regeneration and replacement never renumber existing assets.
- One flat approved-asset export folder with no subfolders.
- Uploaded references do not consume generated asset numbers.
- Composite sheet panels remain inside one asset.
- Planning does not start paid image or video generation.
- No separate audio asset system.
- Exact dialogue remains bound to its speaker asset and timing.
- Database state remains canonical; binary media stays in object storage.
- Codex proposes structured intent; the production engine validates and commits it.
- API keys never enter browser state, project exports, logs, or committed files.

## Database changes

Update `db/schema.ts`, generate a migration with `npm run db:generate`, inspect the SQL, and include both schema and migration files in the pull request. Add acceptance coverage for recovery and restoration when state shape changes.

## UI changes

Preserve the established chat-first interface. Advanced production controls belong behind secondary navigation. Add or update the Playwright test when changing the composer, attachments, project navigation, assets, exports, settings, or restore flow.
