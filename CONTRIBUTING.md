# Contributing to Continuity Studio 2

Contributions are welcome when they preserve the production contract and keep the filmmaker experience chat-first.

## Development setup

```bash
git clone https://github.com/momorzq-oss/continuity-studio-2.git
cd continuity-studio-2
npm install
npm run dev
```

Use Node.js 22.13 or newer. `npm run dev` starts the web app, Codex bridge, and local runtime manager. Run `npm run dev:web` when you need the web surface only.

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
- Provider audiovisual capability is verified per mode; never restore the obsolete assumption that only one provider owns generated audio.
- Canonical cinematic intentions remain provider-neutral; MiniMax H3 and Seedance translations never replace structured movie state.
- Stable `@` reference tags and their sequence schedules remain independent of provider-native numbering.
- Runtime installs remain allowlisted, pinned, external to the MIT core, and license-aware. Never commit model weights.
- Workflow changes require checksum and live semantic-binding validation; raw numeric node IDs are hints, not authority.
- Exact dialogue remains bound to its speaker asset and timing.
- Database state remains canonical; binary media stays in object storage.
- Codex proposes structured intent; the production engine validates and commits it.
- API keys never enter browser state, project exports, logs, or committed files.

## Database changes

Update `db/schema.ts`, generate a migration with `npm run db:generate`, inspect the SQL, and include both schema and migration files in the pull request. Add acceptance coverage for recovery and restoration when state shape changes.

## UI changes

Preserve the established chat-first interface. Advanced production controls belong behind secondary navigation. Add or update the Playwright test when changing the composer, attachments, project navigation, assets, exports, settings, or restore flow.
