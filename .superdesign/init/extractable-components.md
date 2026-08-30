# Extractable components

## StudioSidebar

- Source: `components/studio-app.tsx`
- Category: layout
- Description: Persistent movie/project navigation with New Movie, import, project list, and settings.
- Extractable props: `activeView`, `activeProjectId`, `projectCount`, `mobileNavOpen`
- Hardcoded: Continuity Studio brand treatment, navigation labels, Lucide icon choices, layout classes.

## ChatComposer

- Source: `components/studio-app.tsx`
- Category: basic
- Description: Main natural-language composer with attachment selection and send control.
- Extractable props: `hasProject`, `working`, `attachmentCount`
- Hardcoded: composer structure, icon choices, keyboard hint, visual treatment.

## ProductionDocumentCard

- Source: `components/studio-app.tsx`
- Category: basic
- Description: Inline expandable creative document with status and direct production actions.
- Extractable props: `documentType`, `status`, `expanded`
- Hardcoded: action positions, typography hierarchy, document surface treatment.

## AssetMiniCard

- Source: `components/studio-app.tsx`
- Category: basic
- Description: Permanent numbered visual-production asset summary.
- Extractable props: `assetNumber`, `approvalState`, `locked`, `coverage`
- Hardcoded: numeric hierarchy, category color mapping, filename treatment.

## SequenceCard

- Source: `components/studio-app.tsx`
- Category: basic
- Description: Inline sequence scenario, reference, dialogue, continuity, and Seedance prompt workspace.
- Extractable props: `sequenceNumber`, `status`, `freshness`, `hasGenerationJob`
- Hardcoded: sequence information architecture, timing strip, reference and generation controls.
