# Page dependency trees

## `/` — Continuity Studio

Entry: `app/page.tsx`

Dependencies:

- `components/studio-app.tsx`
  - `components/ui/badge.tsx`
    - `lib/utils.ts`
  - `components/ui/button.tsx`
    - `lib/utils.ts`
  - `components/ui/input.tsx`
    - `lib/utils.ts`
  - `components/ui/progress.tsx`
    - `lib/utils.ts`
  - `components/ui/switch.tsx`
    - `lib/utils.ts`
  - `lib/studio.ts` (types and client-visible project state)
  - `lucide-react`
- `app/layout.tsx`
  - `app/globals.css`

The desktop render branch is the persistent left project sidebar plus a flexible main conversation surface. The mobile branch turns the sidebar into a dismissible overlay. The composer is fixed above the bottom edge in both branches.
