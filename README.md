# Continuity Studio 2

Continuity Studio 2 is a chat-first, project-based filmmaking production system. It manages story development, World and Film Bibles, permanent numbered production assets, structured scenarios, dialogue and character-reference binding, sequence planning, Seedance prompt preparation, continuity, recovery, and flat asset exports.

## Core rules

- One movie uses one flat, globally numbered visual asset folder with no subfolders.
- Uploaded source references remain unnumbered; generated production sheets receive permanent asset numbers.
- One composite character, costume, environment, or prop sheet counts as one asset regardless of its internal panels.
- Seedance handles generated dialogue and sound inside explicitly requested video.
- Story, asset, script, scenario, sequence, and prompt preparation never starts video automatically.
- The structured database state is the production source of truth.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000/`.

Useful checks:

```bash
npm run lint
npm run build
npm test
```

The acceptance suite expects the local development server to be available at `http://localhost:3000` unless `CONTINUITY_STUDIO_URL` is set.

## Project documentation

The authoritative production contract is in [`specification/CONTINUITY_STUDIO_2.md`](specification/CONTINUITY_STUDIO_2.md).
