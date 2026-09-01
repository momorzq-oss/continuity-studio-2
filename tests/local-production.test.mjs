import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

import {
  approveStoryboard,
  initializeLocalProduction,
  queueLocalSequenceRange,
  selectCandidate,
  setH3Mode,
  updateStoryboardPanel,
} from '../lib/local-production.ts';
import { safeLoopbackUrl, assertPathInside, runtimeConfiguration, workflowManifest } from '../runtime/manifest-loader.mjs';
import { applySemanticBindings, loadWorkflowTemplate, validateWorkflow } from '../runtime/workflow-adapter.mjs';

function fixture() {
  const at = '2026-09-01T00:00:00.000Z';
  const endingState = {
    characterPositions: { CHARACTER_001: 'center frame' }, characterDirections: { CHARACTER_001: 'screen right' }, characterConditions: { CHARACTER_001: 'alert' },
    wardrobe: { CHARACTER_001: 'Asset 002 rain coat' }, heldObjects: { CHARACTER_001: 'Asset 004 case' }, droppedObjects: [], animalStates: {}, creatureStates: {}, vehicleStates: {},
    propStates: { PROP_001: 'held' }, environmentState: 'night rain', locationDamage: 'none', lighting: 'wet neon', weather: 'rain', effects: [],
    cameraDirection: 'east', screenDirection: 'left to right', elapsedTimeSeconds: 10, soundState: ['rain', 'traffic'],
  };
  const makeSequence = (number) => ({
    id: `SEQUENCE_${String(number).padStart(3, '0')}`, number, duration: 10, title: `Crossing ${number}`, purpose: 'Move the witness toward safety.', location: 'Manhattan street', timeOfDay: 'Night',
    assetIds: ['CHARACTER_001', 'COSTUME_001', 'LOCATION_001', 'PROP_001'], assetNumbers: [1, 2, 3, 4], assetFiles: [],
    openingState: number === 1 ? 'Courier enters frame.' : 'Continue the approved prior handoff.', closingState: 'Courier exits screen right.', continuitySource: number === 1 ? 'Film Bible' : `SEQUENCE_${String(number - 1).padStart(3, '0')}`,
    status: 'Planned', version: 1, prompt: '', assetManifest: {}, sceneState: { cameraDirection: 'east' }, sceneGraph: { nodes: [], edges: [] }, endingState: structuredClone(endingState), lookAhead: {},
  });
  const sequences = [makeSequence(1), makeSequence(2)];
  const assets = [
    { id: 'CHARACTER_001', projectNumber: 1, category: 'Characters', name: 'Courier', lifecycleStatus: 'Active', generatedFileName: '001_COURIER_GENERATED.png', sequences: [1, 2], lockState: 'Locked', version: 1 },
    { id: 'COSTUME_001', projectNumber: 2, category: 'Costumes', name: 'Rain coat', lifecycleStatus: 'Active', generatedFileName: '002_RAIN_COAT_GENERATED.png', sequences: [1, 2], lockState: 'Locked', version: 1 },
    { id: 'LOCATION_001', projectNumber: 3, category: 'Locations', name: 'Manhattan street', lifecycleStatus: 'Active', generatedFileName: '003_MANHATTAN_STREET_GENERATED.png', sequences: [1, 2], lockState: 'Locked', version: 1 },
    { id: 'PROP_001', projectNumber: 4, category: 'Props', name: 'Case', lifecycleStatus: 'Active', generatedFileName: '004_CASE_GENERATED.png', sequences: [1, 2], lockState: 'Locked', version: 1 },
  ];
  const project = {
    id: 'project_local_fixture', title: 'Night Courier', updatedAt: at, currentSequence: 1, sequenceCount: 2,
    visualStyle: 'cinematic realism', lightingDirection: 'wet neon', colorDirection: 'cyan and amber', cameraStyle: 'controlled handheld', lensDirection: '35mm',
    assets, attachments: [{ id: 'reference_hero', linkedAssetId: 'CHARACTER_001', contentType: 'image/png' }], sequences,
    filmBible: { continuityRules: ['Preserve exact identity and screen direction.'], negativeRules: ['No unplanned characters.', 'No music.'] },
    production: {
      correctionMemory: [],
      sequencePlans: Object.fromEntries(sequences.map((sequence) => [sequence.id, {
        sequenceId: sequence.id, sequenceNumber: sequence.number,
        scenario: {
          activeStoryObjective: 'Protect the witness.', location: sequence.location, timeOfDay: sequence.timeOfDay,
          actions: [{ startSecond: 0, endSecond: 8, actorAssetNumber: 1, verb: 'moves through rain', screenDirection: 'left to right', hand: 'right', resultingState: 'reaches the next block' }],
          cameraHandoff: { position: 'street level', height: 'chest', direction: 'east', distance: 'medium', movement: 'tracking', lens: '35mm', framing: 'medium wide' },
          soundInstructions: { environmentalSound: ['rain'], soundEffects: ['footsteps'], requestedMusic: [], intentionalSilence: [] },
          transition: { type: 'direct continuation', instruction: 'preserve motion' }, connectionToNext: 'exit screen right',
        },
        dialogue: [], referencePackage: { continuityInstruction: 'Use locked assets 001-004.' }, negativeContinuityRules: ['No identity drift.'], compiledPrompt: '[SCENARIO]\nProtect the witness.',
      }])),
    },
  };
  project.localProduction = initializeLocalProduction(project);
  return project;
}

test('provider-neutral sequence workspaces preserve stable references and official H3 fields', () => {
  const project = fixture();
  const sequence = project.sequences[0];
  const workspace = setH3Mode(project, 1, 'Ref2VA');
  const h3 = workspace.translations.find((translation) => translation.provider === 'MiniMax H3');
  const seedance = workspace.translations.find((translation) => translation.provider === 'Seedance');
  assert.equal(workspace.canonicalIntention.sequenceId, sequence.id);
  assert.equal(h3.mode, 'Ref2VA');
  assert.match(h3.compiledPrompt, /^subject_definitions:/);
  assert.match(h3.compiledPrompt, /summary:/);
  assert.match(h3.compiledPrompt, /retention_analysis:/);
  assert.match(h3.compiledPrompt, /detailed_description:/);
  assert.match(h3.compiledPrompt, /overall_soundscape:/);
  assert.match(h3.compiledPrompt, /non_diegetic_music:/);
  assert.ok(seedance.compiledPrompt.includes('[SCENARIO]'));
  assert.ok(h3.referenceMapping.every((mapping) => /^<(?:Picture|Video|Audio) \d+>$/.test(mapping.nativeTag)));
  assert.equal(new Set(project.localProduction.references.map((reference) => reference.id)).size, project.localProduction.references.length);
});

test('storyboard panel edits are scoped and preserve lineage while queue snapshots stay immutable', () => {
  const project = fixture();
  const board = project.localProduction.storyboards[0];
  const untouchedBefore = structuredClone(board.panels.find((panel) => panel.label === 'A2'));
  const panel = updateStoryboardPanel(project, 'A1', 'Use a low-angle close-up with rain on the lens.', true);
  assert.equal(panel.version, 2);
  assert.equal(panel.lineage.length, 2);
  assert.equal(panel.approvalState, 'Draft');
  assert.equal(panel.generatedFile, null);
  assert.deepEqual(board.panels.find((item) => item.label === 'A2'), untouchedBefore);
  for (const item of board.panels) {
    item.generatedFile = `http://127.0.0.1:4318/v1/jobs/storyboard/output/${item.label}`;
    item.approvalState = 'Generated';
  }
  assert.equal(approveStoryboard(project), board.panelCount);
  assert.ok(board.panels.every((item) => item.approvalState === 'Approved'));

  const jobs = queueLocalSequenceRange(project, 1, 2);
  assert.equal(jobs.length, 2);
  const snapshot = structuredClone(jobs[0].immutableSnapshot);
  project.localProduction.sequenceWorkspaces[jobs[0].sequenceId].seed += 1;
  assert.deepEqual(jobs[0].immutableSnapshot, snapshot);
  const candidate = project.localProduction.candidates.find((item) => item.id === jobs[0].candidateId);
  candidate.mediaPath = 'http://127.0.0.1:4318/v1/jobs/example/output/0';
  candidate.posterPath = 'http://127.0.0.1:4318/v1/jobs/example/output/1';
  candidate.status = 'Needs Review';
  const selected = selectCandidate(project, candidate.id);
  assert.equal(selected.status, 'Approved');
  assert.equal(project.localProduction.handoffs.at(-1).immutable, true);
  assert.deepEqual(project.localProduction.handoffs.at(-1).state, project.sequences[0].endingState);
});

test('local queue jobs never fake generated candidates', () => {
  const project = fixture();
  setH3Mode(project, 1, 'Ref2VA');
  queueLocalSequenceRange(project, 1, 1);
  const job = project.localProduction.queue.at(-1);
  const candidate = project.localProduction.candidates.find((item) => item.id === job.candidateId);
  assert.equal(job.status, 'Preparing');
  assert.equal(candidate.status, 'Queued');
  assert.equal(candidate.mediaPath, null);
  assert.equal(job.immutableSnapshot.workflowChecksum, project.localProduction.workflowPin.checksumSha256);
});

test('runtime path and URL guards reject non-loopback and escaping paths', () => {
  assert.equal(safeLoopbackUrl('http://127.0.0.1:8188/path?x=1'), 'http://127.0.0.1:8188');
  assert.throws(() => safeLoopbackUrl('https://example.com'), /loopback/);
  const config = runtimeConfiguration({ LOCALAPPDATA: 'C:/ContinuityTest', CONTINUITY_RUNTIME_PORT: '4318' });
  assert.equal(assertPathInside(`${config.runtimeRoot}/child`, config.runtimeRoot), `${config.runtimeRoot}\\child`);
  assert.throws(() => assertPathInside('C:/outside', config.runtimeRoot), /must stay inside/);
});

const workflowDescriptor = workflowManifest.workflows[0];
const workflowAvailable = existsSync(workflowDescriptor.sourcePathHint);

test('the supplied workflow uses semantic bindings and isolates its known Ref2VA mismatch', { skip: !workflowAvailable }, async () => {
  const config = runtimeConfiguration({ CONTINUITY_WORKFLOW_PATH: workflowDescriptor.sourcePathHint });
  const { sourcePath, workflow } = loadWorkflowTemplate(workflowDescriptor, config);
  const original = await validateWorkflow(workflowDescriptor, workflow, { sourcePath });
  assert.equal(original.compatible, false);
  assert.ok(original.findings.some((finding) => finding.id === 'ref2va-model-selection' && finding.severity === 'blocking'));

  const storyboard = await validateWorkflow(workflowDescriptor, workflow, { sourcePath, target: 'storyboard' });
  assert.equal(storyboard.compatible, true, 'the unrelated H3 model mismatch must not block Krea storyboard execution');

  const corrected = applySemanticBindings(workflow, workflowDescriptor, { 'h3-model': 'MiniMax-H3-Ref2VA-pruned_int8_convrot.safetensors' });
  const h3 = await validateWorkflow(workflowDescriptor, corrected, { sourcePath, target: 'h3-chain' });
  assert.equal(h3.compatible, true);
});
