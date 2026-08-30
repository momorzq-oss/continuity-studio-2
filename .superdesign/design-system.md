# Continuity Studio 2 design system

## Product and job

Continuity Studio 2 is a dedicated, persistent filmmaking assistant. Its primary job is to let a filmmaker move from an idea through production preparation by talking naturally in one continuous conversation. Advanced production state exists behind the chat and appears only when requested.

## Primary experience

- The first viewport is a working conversation, never a marketing page or a pipeline dashboard.
- The fixed composer is the primary affordance and accepts text plus visual references throughout production.
- Creative results appear as inline expandable documents or media cards in the conversation.
- Direct Copy, Download, Edit, and Regenerate actions stay attached to the relevant result.
- The project sidebar is quiet supporting navigation. Advanced control is intentionally secondary.
- Paid image/video actions are visually and semantically distinct from non-paid preparation.

## Visual language

- Theme: dark cinematic workroom with restrained warm amber accents.
- Background: near-black blue (`oklch(0.108 0.012 255)`).
- Cards: lifted blue-black (`oklch(0.16 0.015 255)`) with low-contrast white borders.
- Primary accent: warm production amber (`oklch(0.72 0.16 64)`).
- Ready state: green (`oklch(0.77 0.16 145)`).
- Type: Geist Sans for interface and documents; Geist Mono for permanent asset numbers, filenames, timing, and structured reference details.
- Radius: 10px base, 16–20px for conversation artifacts and composer.
- Shadows: deep, soft, and sparse. Use glow only for active/ready state or the composer.
- Motion: short opacity, color, and translate transitions; no decorative looping motion.

## Information hierarchy

1. User instruction and assistant creative response.
2. Inline creative document or generated visual.
3. Contextual actions for that artifact.
4. Lightweight status and next step.
5. Expandable structured details.

Avoid exposing database terminology, internal IDs, queue machinery, dependency graphs, or state-machine labels in the normal conversation. Permanent asset numbers and exact production filenames are exceptions because filmmakers use them directly.

## Responsive behavior

- Desktop: 248px project sidebar plus centered conversation up to roughly 820px.
- Mobile: sidebar becomes an overlay; result actions wrap; document content remains readable without horizontal scrolling.
- Composer remains reachable above device safe areas and supports keyboard, touch, drag/drop, and paste.

## Component rules

- Use the installed shadcn/Base UI primitives and Lucide icons.
- Text-result cards use a document icon, type/version/status row, concise preview, expandable clean content, and a consistent direct-action bar.
- Visual-result cards show the single generated file first, then its permanent number and relevant actions.
- Attachment drafts show real image thumbnails when possible, file identity, and a direct remove button.
- Approval choice is conversational: Automatic Production, Master Approval, or Manual Approval. Never show repeated per-stage approval controls when automatic mode is selected.
- “Continue” always means the next logical non-paid preparation action. It never renders video.

## Hard production constraints

- One requested master sheet is one composite file and one production asset, regardless of its panels.
- Uploaded source references are not numbered production assets.
- No standalone audio-generation interface.
- Video generation appears only after an explicit user generation command and confirmation safeguards.
- A new project has no sample, test, generated, or placeholder media.
