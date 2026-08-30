# Continuity Studio 2 architecture

Continuity Studio separates creative reasoning, deterministic production rules, persistent state, media storage, and external generation. This keeps the chat flexible without allowing a language model to bypass continuity or mutation rules.

## Local request flow

```text
User at localhost:3000
        │
        ▼
Continuity Studio conversation UI
        │
        ▼
Loopback Codex bridge at 127.0.0.1:4317
        │
        ▼
Codex app-server using the existing desktop/CLI authorization
        │
        ▼
Schema-constrained blueprint or canonical command
        │
        ▼
Deterministic production engine and validation
        │
        ├── D1: canonical project state, revisions, jobs, recovery, provenance
        └── R2: original references, generated media, finished clips, archives
```

The Codex bridge is loopback-only. It accepts the local Studio origin, requests read-only Codex turns, and returns structured reasoning. It cannot directly write project state.

## Reasoning boundary

Codex owns tasks that benefit from whole-story understanding:

- story, genre, tone, and world reasoning;
- comprehensive visual asset discovery;
- World Bible and Film Bible drafting;
- sequence breakdown and production dependencies;
- natural-language command interpretation.

The deterministic engine owns permanent rules:

- globally sequential asset numbering;
- immutable IDs and version relationships;
- approval and paid-generation gates;
- attachment and speaker binding;
- legal state transitions;
- flat-folder naming and export;
- transactional persistence and revision checks.

If Codex is unavailable, the UI reports fallback mode and uses a bounded deterministic interpreter. The fallback is never presented as live Codex reasoning.

## Storage boundary

D1 is the source of truth for structured production state. R2 stores binary media. Project snapshots are compressed when needed, and database writes use revision checks so stale clients cannot silently overwrite newer state.

Original references and old generated versions remain preserved. A replacement changes the current version pointer without renumbering other assets.

## Image generation boundary

The image route accepts only explicit generation actions. It reads the asset's prepared brief and all linked visual references, calls the configured image provider, stores the returned bytes, creates a new immutable asset version, and marks the result for review.

The OpenAI API key is server-side only. It is not serialized into project state or exports.

## Video provider boundary

Continuity Studio prepares provider-neutral sequence packages. Seedance or another generator receives exact dialogue, timing, actions, environment behavior, and numbered references. Video generation never begins because story or planning advanced.

Finished clips may be returned by an integration or imported manually. The Studio validates and versions the result, records its ending state, and carries continuity into the next sequence.

## Export boundary

The flat asset export contains approved generated visual assets only:

```text
MOVIE_NAME_ASSETS/
  001_NAME_GENERATED.png
  002_NAME_GENERATED.png
  003_NAME_GENERATED.png
```

No category or sequence directories are permitted inside that folder. The full project archive contains the restorable production record plus the same flat asset folder.
