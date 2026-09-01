# Continuity Studio 2

[![CI](https://github.com/momorzq-oss/continuity-studio-2/actions/workflows/ci.yml/badge.svg)](https://github.com/momorzq-oss/continuity-studio-2/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b.svg)](LICENSE)
[![Node.js 22.13+](https://img.shields.io/badge/Node.js-22.13%2B-3c873a.svg)](https://nodejs.org/)

Continuity Studio 2 is a chat-first, project-based local AI filmmaking system. It turns an idea into a persistent production workspace covering story development, World and Film Bibles, complete asset discovery, permanent numbered references, Krea storyboards, provider-neutral sequence intentions, official MiniMax H3 and Seedance translations, local rendering, candidate review, structured continuity handoffs, recovery, assembly, and export.

![Continuity Studio chat-first production workspace](docs/screenshots/studio-chat-workflow.png)

## What makes it different

- **Codex is the local reasoning brain.** The Studio connects to the Codex desktop/CLI environment already authorized on your computer. There is no separate Continuity Studio sign-in.
- **One movie, one asset folder.** Every approved generated visual asset uses one permanent project-wide number and exports into one flat folder with no subfolders.
- **Continuity is production state.** Dialogue, costumes, references, opening states, ending states, immutable generation snapshots, and sequence dependencies remain bound to the project.
- **Local rendering stays behind Studio.** A loopback runtime manager validates ComfyUI, Krea 2, MiniMax H3, Ref2VA, Contex Loop, FFmpeg, models, workflow bindings, and hardware before it submits a job.
- **Generation is explicit.** Planning never starts image or video generation automatically. A verified H3 or Seedance capability may generate audiovisual output; the Studio does not create a separate audio asset pipeline.
- **The database is the source of truth.** Structured state, revision checks, recovery records, and immutable versions protect long-running productions.
- **References remain stable.** Filmmakers use `@hero_face`, `@storyboard`, `@car`, and `@previous_scene`; each immutable request records the native Picture/Video mapping used by that provider attempt.

## Screenshots

| Local Codex connection | Flat numbered asset library |
| --- | --- |
| ![Settings showing Codex connected](docs/screenshots/settings-codex-connected.png) | ![Permanent numbered production assets](docs/screenshots/flat-numbered-asset-library.png) |

| Flat asset and project exports |
| --- |
| ![One flat asset folder and full project archive](docs/screenshots/flat-folder-and-project-export.png) |

## Quick start

### Requirements

- Node.js 22.13 or newer
- npm
- Codex desktop or the Codex CLI, already signed in
- Windows 10/11 for the managed local-runtime path (other platforms can use an externally managed ComfyUI instance)
- Python and FFmpeg for local rendering
- An NVIDIA CUDA GPU for local Krea/H3 generation; Studio still runs without one and reports the blocker honestly

The [official Codex CLI guide](https://learn.chatgpt.com/docs/codex/cli) explains installation and the first ChatGPT sign-in. Continuity Studio reuses that local authorization; it does not show another OpenAI login inside the application.

### Install and run

```bash
git clone https://github.com/momorzq-oss/continuity-studio-2.git
cd continuity-studio-2
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). In **Settings**, the Studio should show **Codex connected**.

`npm run dev` starts the complete local application:

- the Continuity Studio web interface on `localhost:3000`;
- a loopback-only Codex bridge on `127.0.0.1:4317`;
- the local AI runtime manager on `127.0.0.1:4318`.

If Codex is temporarily unavailable, the Studio remains usable and labels the deterministic fallback honestly.

## Optional GPT Image generation

The Studio can turn prepared production-sheet briefs into real image assets with GPT Image. Copy the example environment file and add a server-side key:

```bash
cp .dev.vars.example .dev.vars
```

On PowerShell:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Then edit `.dev.vars`:

```dotenv
OPENAI_API_KEY=your-server-side-key
OPENAI_IMAGE_MODEL=gpt-image-2
```

The key is ignored by Git, remains server-side, and never enters browser state, project archives, or asset exports. Provider calls happen only after an explicit image-generation request.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Studio and local Codex bridge |
| `npm run dev:web` | Start only the web app with fallback reasoning available |
| `npm run brain` | Start only the loopback Codex bridge |
| `npm run runtime` | Start only the loopback local AI runtime manager |
| `npm run lint` | Run the source linter |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run build` | Create the production build |
| `npm test` | Run API, persistence, workflow, and provider tests |
| `npm run test:ui` | Run the Chromium end-to-end test |
| `npm run test:all` | Run the complete automated test suite |

Install the Playwright browser once before running UI tests locally:

```bash
npx playwright install chromium
```

## Core production rules

- One movie uses one flat, globally numbered visual asset folder with no subfolders.
- Uploaded source references remain unnumbered; generated production sheets receive permanent asset numbers.
- One composite character, costume, environment, or prop sheet counts as one asset regardless of its internal panels.
- Regeneration retains the permanent asset number and filename position.
- The canonical sequence intention compiles independently to MiniMax H3 and Seedance; future providers can add translators without changing movie state.
- MiniMax H3 and Seedance may generate dialogue and sound only when the selected verified capability supports audiovisual output.
- Story, asset, scenario, script, sequence, and prompt preparation never starts video automatically.
- Codex supplies schema-constrained creative reasoning and natural-language interpretation; it never writes project state directly.
- The production engine validates every mutation before the database commits it.

## Local AI backend

Open **Local AI Engine** inside Studio to inspect the real machine state and use the guarded controls. The runtime registry pins compatible upstream repositories and records their independent licenses. It does not copy third-party GPL code into the MIT application core, does not commit model weights, does not execute arbitrary shell input, and binds its APIs to loopback only.

The supplied `Short Film Director Pipeline (Krea + MiniMax H3).json` is registered by checksum and loaded from an external path. Semantic bindings are validated against live ComfyUI `/object_info` schemas before submission. A known blocking issue is deliberately surfaced: the supplied node titled **H3 REF2VA MODEL** selects an FL2VA checkpoint. Studio will not pretend those modes are interchangeable.

Before ComfyUI receives an image, the runtime accepts only a project-matching `http://localhost:3000/api/files` reference, lets Studio re-verify its stored checksum, enforces the media-size/type limits, and stages it through ComfyUI's input API. Arbitrary remote URLs and arbitrary local paths are rejected. Completed runtime outputs are proxied through the loopback manager and synchronized into the canonical project as storyboard results, candidates, queue outcomes, and runtime provenance.

Model manifests describe expected files, sources, licenses, hashes where available, and 12/16/24/high-memory hardware presets. Model downloads remain explicit because weights are large and may carry separate terms.

The Movie Workspace keeps ordinary controls simple. Expand **Advanced generation controls** for per-sequence H3 mode, resolution, seed, steps, sampler, scheduler, LoRA overrides, video/audio context, continuation mode, candidate count, and the pinned workflow version. Every submitted attempt freezes those values in its immutable snapshot.

## Documentation

- [Complete filmmaker tutorial](docs/TUTORIAL.md)
- [Architecture and data flow](docs/ARCHITECTURE.md)
- [Authoritative production specification](specification/CONTINUITY_STUDIO_2.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Hosted version

The current Sites build is available at [continuity-studio-2.momorabeeh.chatgpt.site](https://continuity-studio-2.momorabeeh.chatgpt.site). The local build is the intended setup when using the Codex desktop/CLI session as the Studio brain. The hosted version cannot reach a loopback Codex bridge on your computer.

## License

Continuity Studio 2 is available under the [MIT License](LICENSE).
