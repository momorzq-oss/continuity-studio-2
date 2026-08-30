# Routes

## `/`

- Entry: `app/page.tsx`
- Layout: `app/layout.tsx`
- Primary UI: `components/studio-app.tsx`
- Purpose: Continuity Studio 2 chat-first movie workspace.

## API routes

- `/api/studio` → `app/api/studio/route.ts` — persistent project chat and commands.
- `/api/files` → `app/api/files/route.ts` — original reference upload and retrieval.
- `/api/assets` → `app/api/assets/route.ts` — flat numbered asset export.
- `/api/export` → `app/api/export/route.ts` — full project archive export.
- `/api/import` → `app/api/import/route.ts` — archive and production-file import.
- `/api/storage` → `app/api/storage/route.ts` — storage inspection and safe cleanup.

There is no client router. Vinext/Next file routing renders the single workspace route.
