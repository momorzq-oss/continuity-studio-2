# Continuity Studio 2 tutorial

This tutorial takes one blank project from a movie idea to a restorable production archive. It uses the local application so Codex can act as the reasoning brain without a second Continuity Studio sign-in.

## 1. Prepare the local environment

Install Node.js 22.13 or newer and make sure `node`, `npm`, and `codex` are available from the terminal.

If Codex is not installed or authenticated, follow the [official Codex CLI guide](https://learn.chatgpt.com/docs/codex/cli). Run `codex` once and complete its offered sign-in flow. Continuity Studio will reuse that authorization.

Clone and install the project:

```bash
git clone https://github.com/momorzq-oss/continuity-studio-2.git
cd continuity-studio-2
npm install
```

Start the Studio:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 2. Confirm the Codex brain

Open **Settings** and look at **Studio access**.

![Settings showing the local Codex connection](screenshots/settings-codex-connected.png)

The healthy state is **Codex connected**. This means the browser is speaking to the loopback bridge and the bridge is using the existing Codex desktop/CLI environment.

If the status says **Fallback**:

1. Confirm `codex` runs successfully in a terminal.
2. Stop the Studio with `Ctrl+C`.
3. Start it again with `npm run dev` rather than `npm run dev:web`.
4. Check that another program is not using port `4317`.
5. Reload `http://localhost:3000`.

## 3. Start with only an idea

Choose **New Movie**. Enter a concise premise, desired length, protagonist, central problem, and any important setting or tone.

Example:

> A three-minute quiet mystery about Ilyas, a municipal clock repairer who discovers a brass gear that remembers tomorrow inside a flooded bell tower during a solar eclipse.

Codex reasons from the complete idea and returns a structured blueprint. The production engine then creates the project, story, World Bible, Film Bible, asset manifest, and sequence plan without starting image or video generation.

## 4. Review the story and choose an approval mode

Read the story card in the conversation. Use **Copy**, **Download**, **Edit**, or **Regenerate** as needed.

Choose one approval style:

- **Automatic Production** advances approved, non-paid planning while still stopping before image and video provider actions.
- **Master Approval** records one approval across the non-paid planning pipeline.
- **Manual Approval** pauses at each major production document.

![The chat-first production workspace](screenshots/studio-chat-workflow.png)

Useful chat instructions include:

```text
Continue
Change the ending so Ilyas saves the tower but loses the gear.
Show Sequence 2.
What is missing from my movie?
Repair this project.
```

## 5. Upload main-character references

Attach four or more clear reference images in the composer. Use different useful angles when possible: face, profile, three-quarter, full body, costume, or rear view.

Tell the Studio:

```text
Use these as my main character likeness references.
```

The uploads remain unnumbered source references. They all contribute to one character identity instead of creating duplicate characters or consuming new asset numbers.

## 6. Prepare or generate the master character sheet

Ask:

```text
Create the master character sheet.
```

Without an image provider, the Studio prepares an honest generation brief and stops. With GPT Image configured, an explicit generate request sends every relevant reference in one edit request and stores one composite result.

The result follows three permanent rules:

- one character;
- one asset number;
- one image containing multiple useful panels.

Internal front, profile, three-quarter, full-body, rear, and detail panels never become separate project assets.

## 7. Inspect complete asset discovery

Open **Asset Library**.

![The flat, permanently numbered asset library](screenshots/flat-numbered-asset-library.png)

The manifest can include characters, costumes, creatures, animals, locations, interiors, environments, props, weapons, vehicles, furniture, transformations, damage states, mechanical systems, and other visual production requirements discovered from the movie.

Every category shares one sequence:

```text
001_ILYAS_GENERATED.png
002_ILYAS_MAINTENANCE_UNIFORM_GENERATED.png
003_FLOODED_BELL_TOWER_GENERATED.png
004_CLOCK_CHAMBER_GENERATED.png
```

Regenerating or replacing an existing asset keeps its permanent number. A genuinely new asset receives the next unused project number.

## 8. Approve and version production assets

Review each prepared or generated sheet before approving it. The status can remain **Pending** or **Needs Review** until the visual reference is production-safe.

When an approved asset is regenerated:

- the permanent number does not change;
- the new version becomes the current version;
- prior media and generation provenance remain preserved;
- existing sequence references do not silently move to another asset.

## 9. Review sequences, dialogue, and references

Each sequence contains a scenario, script, sequence plan, and Seedance prompt package. Dialogue lines bind exact text and timing to the permanent speaker asset number.

Verify for every sequence:

- opening state and connection from the previous sequence;
- character, costume, prop, location, and environment references;
- exact dialogue, speaker asset number, language, dialect, emotion, and timing;
- camera progression, actions, reactions, and environmental behavior;
- closing state and continuity requirements for the next sequence.

Example change:

```text
Change dialogue in Sequence 2: CHARACTER_001 says "We still have one minute" from 4 to 7 seconds.
```

After dialogue changes, regenerate the affected Seedance prompt before generating or importing video.

## 10. Generate or import a finished sequence

Planning commands do not generate video. Video begins only after an explicit sequence-generation instruction and the required paid-attempt confirmation.

For an external Seedance workflow:

1. Open the sequence prompt.
2. Attach the exact numbered files requested by the prompt.
3. Generate the clip in Seedance or another provider.
4. Import the finished clip back into the matching sequence.
5. Validate the result against references, dialogue, timing, and continuity.

The Studio is provider-independent: it prepares and preserves the contract but does not pretend an external clip exists before it is received.

## 11. Continue into the next sequence

After validation, record or extract the ending frame and approve the closing state. Sequence 2 should open from the preserved result of Sequence 1 rather than reconstructing continuity from memory.

Repeat this loop:

```text
plan → bind references → prepare prompt → generate/import → validate → approve ending state → continue
```

## 12. Export the movie project

Open **Exports**.

![Flat assets and complete project export](screenshots/flat-folder-and-project-export.png)

**Download all assets** creates one folder containing every approved generated visual asset in permanent numeric order. It creates no character, location, prop, category, or sequence subfolders.

**Download full project** creates a restorable archive containing the structured project, documents, references, provenance, version history, continuity records, reports, and the same flat numbered generated-asset folder. API keys are never included.

## 13. Verify restoration

Close the Studio, restart it with `npm run dev`, and confirm the project appears in the sidebar. For a fresh installation, use **Import Project** and select the exported archive.

Check that these remain intact:

- project and asset IDs;
- permanent asset numbers;
- generated filenames and versions;
- source references;
- sequence numbers and dialogue ownership;
- generation snapshots and provider provenance;
- continuity and ending-state records;
- approval and recovery state.

## 14. Optional GPT Image setup

Copy `.dev.vars.example` to `.dev.vars`, add a server-side OpenAI API key, and restart the Studio.

```dotenv
OPENAI_API_KEY=your-server-side-key
OPENAI_IMAGE_MODEL=gpt-image-2
```

The Settings screen should change Image Generation from **Not connected** to **Connected**. Never commit `.dev.vars`.

## 15. Run the qualification suite

```bash
npm run lint
npm run typecheck
npm run build
npm run test:all
```

The browser suite starts from the visible chat interface, creates a blank movie, uses a structured Codex blueprint fixture, uploads four unique references, prepares one composite sheet, verifies numbered assets, opens Advanced Control, reloads, and confirms restoration.
