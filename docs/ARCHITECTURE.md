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
        ├── R2: original references, generated media, finished clips, archives
        └── Local runtime manager at 127.0.0.1:4318
                  │
                  ├── registries: components, models, workflows
                  ├── semantic workflow adapter + live preflight
                  └── ComfyUI at 127.0.0.1:8188
                            ├── Krea 2 / Multi Shot storyboards
                            ├── MiniMax H3 / scheduled Ref2VA
                            ├── H3 Contex Loop / transactional review
                            └── FFmpeg assembly
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

## Canonical sequence and provider boundary

Every sequence has one canonical cinematic intention built from structured scenario, Film and World Bibles, approved asset versions, storyboard panels, dialogue, correction memory, opening/ending state, and dependencies. Provider compilers translate that same intention into official MiniMax H3 or Seedance syntax. A provider prompt is not the source of truth.

Stable Studio tags are scheduled by sequence and resolved into provider-native reference numbers only inside an immutable generation snapshot. The mapping, prompt, model, workflow checksum, versions, seed, steps, resolution, duration, and references are retained as provenance.

Video generation never begins merely because story or planning advanced.

Finished clips may be returned by an integration or imported manually. The Studio validates and versions the result, records its ending state, and carries continuity into the next sequence.

## Local runtime trust boundary

The runtime manager is a separate loopback-only Node process. The browser cannot provide an arbitrary repository, model path, node ID, shell command, or remote URL. Component actions operate only on allowlisted registry entries and pinned commits. ComfyUI start/stop controls affect only the process the runtime started itself.

Visual reference staging is capability-scoped. A request may name only the local Studio file route for the same project or a completed output from a known runtime job in that project. Studio verifies stored file integrity before response; the runtime then enforces image type and size and uploads a generated safe filename to ComfyUI. Workflow sample filenames are never accepted as production references. Completed outputs are exposed through a read-only loopback job-output route and synchronized back into D1-backed project state.

The supplied UI workflow remains outside the MIT source until its redistribution license is confirmed. Studio stores its checksum and semantic bindings, converts only the required execution ancestry into ComfyUI API format, validates live node schemas, and blocks known mode/model contradictions before queue submission.

## Transactional long-form production

The local queue preserves immutable inputs before execution. Generated scenes stop at a Review Gate. Approval creates a structured handoff containing the video, ending and context frames, supported latent/audio context, character positions and directions, wardrobe, objects, vehicle/prop/environment states, lighting, weather, screen direction, sound state, elapsed time, and next opening expectation. Resume verifies prior checkpoint history; it never relies on the last frame alone.

## Export boundary

The flat asset export contains approved generated visual assets only:

```text
MOVIE_NAME_ASSETS/
  001_NAME_GENERATED.png
  002_NAME_GENERATED.png
  003_NAME_GENERATED.png
```

No category or sequence directories are permitted inside that folder. The full project archive contains the restorable production record plus the same flat asset folder.
