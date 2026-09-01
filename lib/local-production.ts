import type { DialogueLine, SequenceScenario } from './scenario-engine';
import type { StudioAsset, StudioProject, StudioSequence } from './studio';

export type H3GenerationMode = 'T2VA' | 'I2VA' | 'FL2VA' | 'L2VA' | 'Ref2VA';
export type LocalQueueStatus = 'Preparing' | 'Waiting for GPU' | 'Loading model' | 'Generating' | 'Decoding' | 'Saving' | 'Validating' | 'Needs Review' | 'Approved' | 'Failed' | 'Paused' | 'Cancelled';

export interface StableReference {
  id: string;
  stableTag: string;
  kind: 'image' | 'video' | 'audio';
  role: 'identity' | 'appearance' | 'wardrobe' | 'location' | 'prop' | 'vehicle' | 'creature' | 'storyboard' | 'previous-scene' | 'other';
  assetId: string | null;
  assetNumber: number | null;
  sourceIdentifier: string;
  previewAttachmentId: string | null;
  approvedVersion: number | null;
  activeSequenceNumbers: number[];
  scheduleSource: 'automatic' | 'manual';
  enabled: boolean;
}

export interface NativeReferenceMapping {
  stableReferenceId: string;
  stableTag: string;
  nativeTag: string;
  kind: StableReference['kind'];
  sourceIdentifier: string;
  scheduleSequenceNumber: number;
}

export interface StoryboardPanel {
  id: string;
  boardId: string;
  label: string;
  sequenceId: string | null;
  sequenceNumber: number | null;
  prompt: string;
  characterReferenceIds: string[];
  wardrobeState: string[];
  locationReferenceIds: string[];
  propReferenceIds: string[];
  cameraInstructions: string;
  visualStyle: string;
  seed: number;
  generatedFile: string | null;
  approvalState: 'Draft' | 'Generated' | 'Approved' | 'Needs Review';
  version: number;
  lineage: Array<{ version: number; prompt: string; generatedFile: string | null; approvalState: StoryboardPanel['approvalState']; createdAt: string; reason: string }>;
  updatedAt: string;
}

export interface StoryboardBoard {
  id: string;
  name: string;
  provider: 'Krea 2';
  workflowId: string;
  columns: number;
  panelCount: number;
  approvalState: 'Draft' | 'Generated' | 'Approved' | 'Needs Review';
  generatedCompositeFile: string | null;
  version: number;
  panels: StoryboardPanel[];
  createdAt: string;
  updatedAt: string;
}

export interface CinematicSequenceIntention {
  id: string;
  sequenceId: string;
  sequenceNumber: number;
  revision: number;
  durationSeconds: number;
  purpose: string;
  storyObjective: string;
  location: string;
  timeOfDay: string;
  openingState: string;
  endingState: string;
  characterAssetNumbers: number[];
  wardrobeAssetNumbers: number[];
  propAssetNumbers: number[];
  actions: SequenceScenario['actions'];
  dialogue: DialogueLine[];
  camera: SequenceScenario['cameraHandoff'];
  visualStyle: string;
  lighting: string;
  color: string;
  environmentalSound: string[];
  soundEffects: string[];
  musicPolicy: string[];
  intentionalSilence: string[];
  transition: SequenceScenario['transition'];
  storyboardPanelIds: string[];
  continuityRequirements: string[];
  correctionMemory: string[];
  negativeRules: string[];
  intentionHash: string;
}

export interface ProviderTranslation {
  id: string;
  sequenceId: string;
  provider: 'MiniMax H3' | 'Seedance';
  mode: H3GenerationMode | 'Provider default';
  modeSelection: 'automatic' | 'manual';
  compiledPrompt: string;
  sourceIntentionHash: string;
  referenceMapping: NativeReferenceMapping[];
  compiledAt: string;
  warnings: string[];
}

export interface SequenceWorkspace {
  sequenceId: string;
  sequenceNumber: number;
  selectedProvider: 'MiniMax H3' | 'Seedance';
  h3Mode: H3GenerationMode;
  h3ModeSelection: 'automatic' | 'manual';
  seed: number;
  steps: number;
  sampler: string;
  scheduler: string;
  loras: Array<{ id: string; strength: number }>;
  candidateCount: number;
  width: number;
  height: number;
  contextFrames: number;
  audioContextFrames: number;
  continuationMode: 'Automatic' | 'Direct continuation' | 'Independent opening';
  storyboardPanelIds: string[];
  canonicalIntention: CinematicSequenceIntention;
  translations: ProviderTranslation[];
  activeReferenceIds: string[];
  staleReasons: string[];
  updatedAt: string;
}

export interface SequenceCandidate {
  id: string;
  sequenceId: string;
  sequenceNumber: number;
  generationSnapshotId: string;
  status: 'Queued' | 'Generated' | 'Validating' | 'Needs Review' | 'Approved' | 'Rejected' | 'Superseded';
  mediaPath: string | null;
  posterPath: string | null;
  seed: number;
  prompt: string;
  correctionScope: string | null;
  validationReportId: string | null;
  createdAt: string;
}

export interface ContinuityHandoff {
  id: string;
  sequenceId: string;
  sequenceNumber: number;
  candidateId: string;
  approvedVideoPath: string | null;
  endingFramePaths: string[];
  continuationFramePaths: string[];
  endingLatentPath: string | null;
  contextFramePaths: string[];
  audioContextPath: string | null;
  state: StudioSequence['endingState'];
  locationState: string;
  nextOpeningExpectation: string;
  immutable: true;
  createdAt: string;
}

export interface LocalProductionJob {
  id: string;
  sequenceId: string;
  sequenceNumber: number;
  candidateId: string;
  status: LocalQueueStatus;
  progress: number;
  provider: 'MiniMax H3';
  modelId: string;
  workflowId: string;
  workflowVersion: string;
  workflowChecksum: string;
  resolution: string;
  durationSeconds: number;
  seed: number;
  steps: number;
  referenceIds: string[];
  estimatedVramGb: number;
  elapsedSeconds: number;
  outputPath: string | null;
  failure: string | null;
  retryCount: number;
  checkpointId: string | null;
  runtimeProvenance: Record<string, unknown> | null;
  immutableSnapshot: {
    projectId: string;
    sequenceId: string;
    providerPrompt: string;
    referenceMapping: NativeReferenceMapping[];
    seed: number;
    steps: number;
    sampler: string;
    scheduler: string;
    loras: Array<{ id: string; strength: number }>;
    h3Mode: H3GenerationMode;
    contextFrames: number;
    audioContextFrames: number;
    durationSeconds: number;
    resolution: string;
    modelId: string;
    workflowId: string;
    workflowVersion: string;
    workflowChecksum: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LocalProductionState {
  schemaVersion: 1;
  workflowPin: {
    id: 'short-film-director-krea-minimax-h3';
    version: '1.0.0-imported';
    checksumSha256: '712f09a2295a6b18ba326578ce3328f185abb18e1a24befd254f198249d284ff';
    source: string;
    compatibilityStatus: 'Requires live validation';
  };
  engine: {
    runtimeUrl: 'http://127.0.0.1:4318';
    comfyUrl: 'http://127.0.0.1:8188';
    lastKnownStatus: 'Unknown' | 'Ready' | 'Blocked' | 'Offline';
    lastCheckedAt: string | null;
  };
  references: StableReference[];
  storyboards: StoryboardBoard[];
  sequenceWorkspaces: Record<string, SequenceWorkspace>;
  candidates: SequenceCandidate[];
  handoffs: ContinuityHandoff[];
  queue: LocalProductionJob[];
  selectedSequenceNumber: number;
  selectedCandidateId: string | null;
  assembly: {
    status: 'Blocked' | 'Ready' | 'Assembling' | 'Needs Review' | 'Approved';
    orderedCandidateIds: string[];
    outputPath: string | null;
    manifestPath: string | null;
    updatedAt: string;
  };
}

const WORKFLOW_PIN = {
  id: 'short-film-director-krea-minimax-h3' as const,
  version: '1.0.0-imported' as const,
  checksumSha256: '712f09a2295a6b18ba326578ce3328f185abb18e1a24befd254f198249d284ff' as const,
  source: 'Short Film Director Pipeline (Krea + MiniMax H3).json',
  compatibilityStatus: 'Requires live validation' as const,
};

function stableHash(value: unknown) {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableSeed(projectId: string, suffix: string) {
  return Number.parseInt(stableHash(`${projectId}:${suffix}`), 16) >>> 0;
}

function slug(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'reference';
}

function assetRole(asset: StudioAsset): StableReference['role'] {
  if (asset.category === 'Characters') return 'identity';
  if (asset.category === 'Costumes') return 'wardrobe';
  if (['Locations', 'Interiors', 'Environments'].includes(asset.category)) return 'location';
  if (asset.category === 'Vehicles') return 'vehicle';
  if (['Creatures', 'Animals'].includes(asset.category)) return 'creature';
  if (['Props', 'Weapons', 'Furniture', 'Mechanical'].includes(asset.category)) return 'prop';
  return 'other';
}

function stableReferenceTags(project: StudioProject, previous: StableReference[] = []) {
  const previousMap = new Map(previous.filter((reference) => reference.assetId && reference.id === `ref_asset_${reference.assetId}`).map((reference) => [reference.assetId as string, reference]));
  const used = new Set<string>();
  const characterIds = project.assets.filter((asset) => asset.category === 'Characters' && asset.lifecycleStatus !== 'Retired').map((asset) => asset.id);
  const references: StableReference[] = [];
  for (const asset of project.assets.filter((item) => item.lifecycleStatus !== 'Retired')) {
    const old = previousMap.get(asset.id);
    let tag = old?.stableTag;
    if (!tag) {
      if (asset.id === characterIds[0]) tag = '@hero';
      else if (asset.id === characterIds[1]) tag = '@villain';
      else tag = `@${slug(asset.name)}`;
    }
    if (used.has(tag)) tag = `${tag}_${String(asset.projectNumber).padStart(3, '0')}`;
    used.add(tag);
    const attachment = project.attachments.find((item) => item.linkedAssetId === asset.id && item.contentType.startsWith('image/'));
    references.push({
      id: old?.id ?? `ref_asset_${asset.id}`,
      stableTag: tag,
      kind: 'image',
      role: assetRole(asset),
      assetId: asset.id,
      assetNumber: asset.projectNumber,
      sourceIdentifier: attachment?.id ?? asset.generatedFileName,
      previewAttachmentId: attachment?.id ?? null,
      approvedVersion: asset.lockState === 'Locked' ? asset.version : null,
      activeSequenceNumbers: old?.scheduleSource === 'manual' ? old.activeSequenceNumbers : [...asset.sequences],
      scheduleSource: old?.scheduleSource ?? 'automatic',
      enabled: old?.enabled ?? true,
    });
    if (asset.category === 'Characters') {
      const faceTag = tag === '@hero' ? '@hero_face' : `${tag}_face`;
      if (!used.has(faceTag)) {
        used.add(faceTag);
        references.push({
          id: `${old?.id ?? `ref_asset_${asset.id}`}:face`, stableTag: faceTag, kind: 'image', role: 'identity', assetId: asset.id,
          assetNumber: asset.projectNumber, sourceIdentifier: attachment?.id ?? asset.generatedFileName, previewAttachmentId: attachment?.id ?? null,
          approvedVersion: asset.lockState === 'Locked' ? asset.version : null, activeSequenceNumbers: [...asset.sequences], scheduleSource: 'automatic', enabled: true,
        });
      }
    }
  }
  return references;
}

function panelLabel(index: number, columns: number) {
  const row = Math.floor(index / columns);
  let letters = '';
  let value = row;
  do {
    letters = String.fromCharCode(65 + (value % 26)) + letters;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return `${letters}${(index % columns) + 1}`;
}

function panelPrompt(project: StudioProject, sequence: StudioSequence | undefined, label: string) {
  if (!sequence) return `${label}: a continuity-safe supporting composition for ${project.title}, matching the approved Film Bible and World Bible.`;
  return `${label}: Sequence ${sequence.number}, ${sequence.title}. ${sequence.purpose} ${sequence.openingState} Camera: ${project.cameraStyle}; ${project.lensDirection}. Style: ${project.visualStyle}. Lighting: ${project.lightingDirection}. Preserve exact numbered identities, wardrobe, location, props, screen direction, and ending handoff.`;
}

export function createStoryboard(project: StudioProject, panelCount = Math.max(16, project.sequences.length), previous?: StoryboardBoard): StoryboardBoard {
  const count = Math.max(1, Math.trunc(panelCount));
  const columns = count <= 4 ? count : count <= 16 ? 4 : Math.ceil(Math.sqrt(count));
  const at = project.updatedAt;
  const panels = Array.from({ length: count }, (_, index): StoryboardPanel => {
    const label = panelLabel(index, columns);
    const sequence = project.sequences[index % Math.max(1, project.sequences.length)];
    const old = previous?.panels.find((panel) => panel.label === label);
    if (old) return old;
    const assets = sequence?.assetIds.map((id) => project.assets.find((asset) => asset.id === id)).filter((asset): asset is StudioAsset => Boolean(asset)) ?? [];
    const prompt = panelPrompt(project, sequence, label);
    return {
      id: `storyboard_master_${label.toLowerCase()}`, boardId: 'storyboard_master', label, sequenceId: sequence?.id ?? null,
      sequenceNumber: sequence?.number ?? null, prompt,
      characterReferenceIds: assets.filter((asset) => asset.category === 'Characters').map((asset) => `ref_asset_${asset.id}`),
      wardrobeState: assets.filter((asset) => asset.category === 'Costumes').map((asset) => `Asset ${String(asset.projectNumber).padStart(3, '0')} ${asset.name}`),
      locationReferenceIds: assets.filter((asset) => ['Locations', 'Interiors', 'Environments'].includes(asset.category)).map((asset) => `ref_asset_${asset.id}`),
      propReferenceIds: assets.filter((asset) => ['Props', 'Weapons', 'Vehicles', 'Furniture', 'Mechanical'].includes(asset.category)).map((asset) => `ref_asset_${asset.id}`),
      cameraInstructions: sequence ? `${sequence.sceneState.cameraDirection}; ${project.cameraStyle}; ${project.lensDirection}` : project.cameraStyle,
      visualStyle: `${project.visualStyle}; ${project.lightingDirection}; ${project.colorDirection}`,
      seed: stableSeed(project.id, `storyboard:${label}`), generatedFile: null, approvalState: 'Draft', version: 1,
      lineage: [{ version: 1, prompt, generatedFile: null, approvalState: 'Draft', createdAt: at, reason: 'Initial storyboard discovery' }], updatedAt: at,
    };
  });
  return {
    id: 'storyboard_master', name: `${project.title} Master Storyboard`, provider: 'Krea 2', workflowId: WORKFLOW_PIN.id,
    columns, panelCount: count, approvalState: previous?.approvalState ?? 'Draft', generatedCompositeFile: previous?.generatedCompositeFile ?? null,
    version: previous?.version ?? 1, panels, createdAt: previous?.createdAt ?? at, updatedAt: at,
  };
}

function relevantAssets(project: StudioProject, sequence: StudioSequence) {
  return sequence.assetIds.map((id) => project.assets.find((asset) => asset.id === id)).filter((asset): asset is StudioAsset => Boolean(asset));
}

function canonicalIntention(project: StudioProject, sequence: StudioSequence, board: StoryboardBoard | undefined): CinematicSequenceIntention {
  const plan = project.production.sequencePlans[sequence.id];
  const scenario = plan.scenario;
  const assets = relevantAssets(project, sequence);
  const panelIds = board?.panels.filter((panel) => panel.sequenceId === sequence.id).map((panel) => panel.id) ?? [];
  const intentionBase = {
    id: `${sequence.id}:cinematic-intention:v${sequence.version}`,
    sequenceId: sequence.id,
    sequenceNumber: sequence.number,
    revision: sequence.version,
    durationSeconds: sequence.duration,
    purpose: sequence.purpose,
    storyObjective: scenario.activeStoryObjective,
    location: scenario.location,
    timeOfDay: scenario.timeOfDay,
    openingState: sequence.openingState,
    endingState: sequence.closingState,
    characterAssetNumbers: assets.filter((asset) => asset.category === 'Characters').map((asset) => asset.projectNumber),
    wardrobeAssetNumbers: assets.filter((asset) => asset.category === 'Costumes').map((asset) => asset.projectNumber),
    propAssetNumbers: assets.filter((asset) => ['Props', 'Weapons', 'Vehicles', 'Furniture', 'Mechanical'].includes(asset.category)).map((asset) => asset.projectNumber),
    actions: structuredClone(scenario.actions),
    dialogue: structuredClone(plan.dialogue),
    camera: structuredClone(scenario.cameraHandoff),
    visualStyle: project.visualStyle,
    lighting: project.lightingDirection,
    color: project.colorDirection,
    environmentalSound: [...scenario.soundInstructions.environmentalSound],
    soundEffects: [...scenario.soundInstructions.soundEffects],
    musicPolicy: [...scenario.soundInstructions.requestedMusic],
    intentionalSilence: [...scenario.soundInstructions.intentionalSilence],
    transition: structuredClone(scenario.transition),
    storyboardPanelIds: panelIds,
    continuityRequirements: [...project.filmBible.continuityRules, plan.referencePackage.continuityInstruction, scenario.connectionToNext],
    correctionMemory: project.production.correctionMemory.filter((rule) => rule.active && (rule.sequenceNumber === null || rule.sequenceNumber === sequence.number)).map((rule) => rule.instruction),
    negativeRules: [...project.filmBible.negativeRules, ...plan.negativeContinuityRules],
  };
  return { ...intentionBase, intentionHash: stableHash(intentionBase) };
}

function activeReferences(project: StudioProject, stateReferences: StableReference[], sequence: StudioSequence, board?: StoryboardBoard) {
  const assetIds = new Set(sequence.assetIds);
  const references = stateReferences.filter((reference) => reference.enabled && reference.assetId && assetIds.has(reference.assetId) && reference.activeSequenceNumbers.includes(sequence.number));
  const activePanels = board?.panels.filter((panel) => panel.sequenceId === sequence.id) ?? [];
  if (activePanels.length) references.push({
    id: `ref_storyboard_${sequence.id}`, stableTag: '@storyboard', kind: 'image', role: 'storyboard', assetId: null, assetNumber: null,
    sourceIdentifier: board?.generatedCompositeFile ?? `storyboard://${board?.id ?? 'storyboard_master'}#${activePanels.map((panel) => panel.label).join(',')}`,
    previewAttachmentId: null, approvedVersion: board?.version ?? null, activeSequenceNumbers: [sequence.number], scheduleSource: 'automatic', enabled: true,
  });
  if (sequence.number > 1) references.push({
    id: `ref_previous_${sequence.id}`, stableTag: '@previous_scene', kind: 'video', role: 'previous-scene', assetId: null, assetNumber: null,
    sourceIdentifier: `handoff://sequence/${sequence.number - 1}`, previewAttachmentId: null, approvedVersion: null,
    activeSequenceNumbers: [sequence.number], scheduleSource: 'automatic', enabled: true,
  });
  return references;
}

function referenceMapping(references: StableReference[], sequenceNumber: number): NativeReferenceMapping[] {
  let pictures = 0;
  let videos = 0;
  let audio = 0;
  return references.map((reference) => {
    const nativeTag = reference.kind === 'image' ? `<Picture ${++pictures}>` : reference.kind === 'video' ? `<Video ${++videos}>` : `<Audio ${++audio}>`;
    return { stableReferenceId: reference.id, stableTag: reference.stableTag, nativeTag, kind: reference.kind, sourceIdentifier: reference.sourceIdentifier, scheduleSequenceNumber: sequenceNumber };
  });
}

function dialogueText(line: DialogueLine) {
  if (line.turnType === 'Purposeful silence') return `00:${line.startSecond.toFixed(3)}-00:${line.endSecond.toFixed(3)} purposeful silence; ${line.physicalAction}`;
  const pronunciations = line.pronunciations.length ? ` Pronunciation: ${line.pronunciations.map((item) => `${item.text}=${item.pronunciation}`).join('; ')}.` : '';
  return `At ${line.startSecond.toFixed(3)}s, <Subject ${line.speakerAssetNumber}> ${line.physicalAction} and says <d>[${line.language}] ${line.exactDialogue}</d> with ${line.emotion}; end by ${line.endSecond.toFixed(3)}s.${pronunciations}`;
}

function replaceStableTags(value: string, mapping: NativeReferenceMapping[]) {
  return [...mapping].sort((left, right) => right.stableTag.length - left.stableTag.length).reduce((result, item) => result.replaceAll(item.stableTag, item.nativeTag), value);
}

function compileH3(intention: CinematicSequenceIntention, mode: H3GenerationMode, mapping: NativeReferenceMapping[]) {
  const subjects = intention.characterAssetNumbers.map((number) => `<Subject ${number}> is permanent Asset ${String(number).padStart(3, '0')}; preserve exact identity, face, hair, body, age, and current approved appearance.`);
  const bindings = mapping.map((item) => `${item.stableTag} resolves to ${item.nativeTag} for this immutable generation snapshot.`);
  const actions = intention.actions.map((action, index) => `[Shot ${index + 1}] At ${action.startSecond.toFixed(3)}s-${action.endSecond.toFixed(3)}s, <Subject ${action.actorAssetNumber}> ${action.verb}; screen direction ${action.screenDirection}; ${action.hand} hand; resulting state: ${action.resultingState}.`);
  const dialogue = intention.dialogue.map(dialogueText);
  const camera = `Camera begins ${intention.camera.position}, ${intention.camera.height}, facing ${intention.camera.direction}, at ${intention.camera.distance}; ${intention.camera.movement}; ${intention.camera.lens}; ${intention.camera.framing}.`;
  const detailed = [
    `The target audiovisual sequence lasts exactly ${intention.durationSeconds.toFixed(3)} seconds in ${intention.visualStyle}. Lighting: ${intention.lighting}. Color: ${intention.color}.`,
    `Opening state: ${intention.openingState}`,
    camera,
    ...actions,
    ...dialogue,
    `Transition: ${intention.transition.type}; ${intention.transition.instruction}`,
    `Ending state and next-scene handoff: ${intention.endingState}`,
    `Continuity requirements: ${intention.continuityRequirements.join(' ')}`,
    `Negative requirements: ${intention.negativeRules.join(' ')}`,
  ].join('\n');
  const soundscape = [...intention.environmentalSound, ...intention.soundEffects, ...intention.intentionalSilence].join('; ') || 'Natural diegetic ambience and production-authored silence only.';
  const music = intention.musicPolicy.length ? intention.musicPolicy.join('; ') : 'None — no score, no music bed, and no musical sting unless explicitly authored in the Film Bible.';
  if (mode === 'Ref2VA') {
    const prompt = [
      'subject_definitions:', ...subjects, ...bindings,
      '', 'summary:', `[reference generation] Sequence ${intention.sequenceNumber}: ${intention.purpose} ${intention.storyObjective}`,
      '', 'retention_analysis:', ...mapping.map((item) => `${item.nativeTag} (${item.stableTag}): fully_preserved where visible — retain its approved identity, appearance, composition, materials, and continuity role.`),
      '', 'detailed_description:', detailed,
      '', 'overall_soundscape:', soundscape,
      '', 'non_diegetic_music:', music,
    ].join('\n');
    return replaceStableTags(prompt, mapping);
  }
  const inputNote = mode === 'T2VA' ? 'No visual reference input is required.'
    : mode === 'I2VA' ? 'Use the supplied first image as the opening-frame anchor.'
      : mode === 'FL2VA' ? 'Use the supplied first and last images as exact boundary anchors.'
        : 'Use the supplied last image as the ending-frame anchor.';
  return [
    'integrated_multimodal_description:',
    `[${mode}] ${inputNote}`,
    ...subjects,
    ...bindings,
    `Sequence ${intention.sequenceNumber}: ${intention.purpose} ${intention.storyObjective}`,
    detailed,
    '', 'overall_soundscape:', soundscape,
    '', 'non_diegetic_music:', music,
  ].join('\n');
}

function automaticH3Mode(sequence: StudioSequence, references: StableReference[]): H3GenerationMode {
  if (references.some((reference) => reference.role === 'previous-scene') || references.filter((reference) => reference.kind === 'image').length > 1) return 'Ref2VA';
  if (references.some((reference) => reference.kind === 'image')) return 'I2VA';
  return sequence.number === 1 ? 'T2VA' : 'Ref2VA';
}

function buildWorkspace(project: StudioProject, sequence: StudioSequence, references: StableReference[], board: StoryboardBoard | undefined, previous?: SequenceWorkspace): SequenceWorkspace {
  const intention = canonicalIntention(project, sequence, board);
  const active = activeReferences(project, references, sequence, board);
  const mapping = referenceMapping(active, sequence.number);
  const automaticMode = automaticH3Mode(sequence, active);
  const mode = previous?.h3ModeSelection === 'manual' ? previous.h3Mode : automaticMode;
  const h3Prompt = compileH3(intention, mode, mapping);
  const seedancePrompt = project.production.sequencePlans[sequence.id].compiledPrompt;
  const priorH3 = previous?.translations.find((translation) => translation.provider === 'MiniMax H3');
  const priorSeedance = previous?.translations.find((translation) => translation.provider === 'Seedance');
  const compiledAt = project.updatedAt;
  const warnings = mode === 'Ref2VA' ? ['Execution remains blocked until the runtime validates a genuine Ref2VA checkpoint; the supplied graph currently selects FL2VA.'] : [];
  const translations: ProviderTranslation[] = [
    priorH3?.sourceIntentionHash === intention.intentionHash && priorH3.mode === mode ? priorH3 : {
      id: `${sequence.id}:translation:h3:v${sequence.version}`, sequenceId: sequence.id, provider: 'MiniMax H3', mode,
      modeSelection: previous?.h3ModeSelection ?? 'automatic', compiledPrompt: h3Prompt, sourceIntentionHash: intention.intentionHash,
      referenceMapping: mapping, compiledAt, warnings,
    },
    priorSeedance?.sourceIntentionHash === intention.intentionHash ? priorSeedance : {
      id: `${sequence.id}:translation:seedance:v${sequence.version}`, sequenceId: sequence.id, provider: 'Seedance', mode: 'Provider default',
      modeSelection: 'automatic', compiledPrompt: seedancePrompt, sourceIntentionHash: intention.intentionHash,
      referenceMapping: mapping, compiledAt, warnings: [],
    },
  ];
  return {
    sequenceId: sequence.id, sequenceNumber: sequence.number, selectedProvider: previous?.selectedProvider ?? 'MiniMax H3', h3Mode: mode,
    h3ModeSelection: previous?.h3ModeSelection ?? 'automatic', seed: previous?.seed ?? stableSeed(project.id, `sequence:${sequence.number}`),
    steps: previous?.steps ?? 15, sampler: previous?.sampler ?? 'euler', scheduler: previous?.scheduler ?? 'simple',
    loras: previous?.loras ?? [], candidateCount: previous?.candidateCount ?? 1,
    width: previous?.width ?? 1280, height: previous?.height ?? 720,
    contextFrames: previous?.contextFrames ?? 22, audioContextFrames: previous?.audioContextFrames ?? 22,
    continuationMode: previous?.continuationMode ?? (sequence.number === 1 ? 'Independent opening' : 'Automatic'),
    storyboardPanelIds: intention.storyboardPanelIds, canonicalIntention: intention, translations,
    activeReferenceIds: active.map((reference) => reference.id), staleReasons: previous?.staleReasons ?? [], updatedAt: project.updatedAt,
  };
}

export function initializeLocalProduction(project: StudioProject, previous?: LocalProductionState): LocalProductionState {
  const references = stableReferenceTags(project, previous?.references);
  const board = createStoryboard(project, previous?.storyboards?.[0]?.panelCount ?? Math.max(16, project.sequences.length), previous?.storyboards?.[0]);
  const sequenceWorkspaces = Object.fromEntries(project.sequences.map((sequence) => [sequence.id, buildWorkspace(project, sequence, references, board, previous?.sequenceWorkspaces?.[sequence.id])])) as Record<string, SequenceWorkspace>;
  const approvedCandidateIds = (previous?.candidates ?? []).filter((candidate) => candidate.status === 'Approved').sort((left, right) => left.sequenceNumber - right.sequenceNumber).map((candidate) => candidate.id);
  return {
    schemaVersion: 1,
    workflowPin: WORKFLOW_PIN,
    engine: previous?.engine ?? { runtimeUrl: 'http://127.0.0.1:4318', comfyUrl: 'http://127.0.0.1:8188', lastKnownStatus: 'Unknown', lastCheckedAt: null },
    references,
    storyboards: [board, ...(previous?.storyboards?.slice(1) ?? [])],
    sequenceWorkspaces,
    candidates: previous?.candidates ?? [],
    handoffs: previous?.handoffs ?? [],
    queue: (previous?.queue ?? []).map((job) => ({ ...job, runtimeProvenance: job.runtimeProvenance ?? null })),
    selectedSequenceNumber: Math.min(project.sequenceCount, Math.max(1, previous?.selectedSequenceNumber ?? project.currentSequence)),
    selectedCandidateId: previous?.selectedCandidateId ?? null,
    assembly: previous?.assembly ?? { status: approvedCandidateIds.length === project.sequenceCount ? 'Ready' : 'Blocked', orderedCandidateIds: approvedCandidateIds, outputPath: null, manifestPath: null, updatedAt: project.updatedAt },
  };
}

export function setH3Mode(project: StudioProject, sequenceNumber: number, mode: H3GenerationMode, selection: 'automatic' | 'manual' = 'manual') {
  const sequence = project.sequences.find((item) => item.number === sequenceNumber);
  if (!sequence) return null;
  const workspace = project.localProduction.sequenceWorkspaces[sequence.id];
  workspace.h3Mode = mode;
  workspace.h3ModeSelection = selection;
  const board = project.localProduction.storyboards[0];
  project.localProduction.sequenceWorkspaces[sequence.id] = buildWorkspace(project, sequence, project.localProduction.references, board, workspace);
  return project.localProduction.sequenceWorkspaces[sequence.id];
}

export function updateLocalGenerationSettings(project: StudioProject, sequenceNumber: number, settings: Partial<Pick<SequenceWorkspace, 'seed' | 'steps' | 'sampler' | 'scheduler' | 'loras' | 'candidateCount' | 'width' | 'height' | 'contextFrames' | 'audioContextFrames' | 'continuationMode'>>) {
  const sequence = project.sequences.find((item) => item.number === sequenceNumber);
  if (!sequence) return null;
  const workspace = project.localProduction.sequenceWorkspaces[sequence.id];
  if (!workspace) return null;
  if (settings.seed !== undefined) workspace.seed = Math.max(0, Math.trunc(settings.seed));
  if (settings.steps !== undefined) workspace.steps = Math.min(100, Math.max(1, Math.trunc(settings.steps)));
  if (settings.candidateCount !== undefined) workspace.candidateCount = Math.min(8, Math.max(1, Math.trunc(settings.candidateCount)));
  if (settings.width !== undefined) workspace.width = Math.min(4096, Math.max(256, Math.trunc(settings.width / 16) * 16));
  if (settings.height !== undefined) workspace.height = Math.min(4096, Math.max(256, Math.trunc(settings.height / 16) * 16));
  if (settings.contextFrames !== undefined) workspace.contextFrames = Math.min(256, Math.max(0, Math.trunc(settings.contextFrames)));
  if (settings.audioContextFrames !== undefined) workspace.audioContextFrames = Math.min(256, Math.max(0, Math.trunc(settings.audioContextFrames)));
  if (settings.sampler !== undefined && /^[a-zA-Z0-9_+.-]{1,40}$/.test(settings.sampler)) workspace.sampler = settings.sampler;
  if (settings.scheduler !== undefined && /^[a-zA-Z0-9_+.-]{1,40}$/.test(settings.scheduler)) workspace.scheduler = settings.scheduler;
  if (settings.loras !== undefined) workspace.loras = settings.loras.filter((lora) => /^[a-zA-Z0-9_+.-]{1,100}$/.test(lora.id) && Number.isFinite(lora.strength)).map((lora) => ({ id: lora.id, strength: Math.min(2, Math.max(-2, lora.strength)) }));
  if (settings.continuationMode !== undefined) workspace.continuationMode = settings.continuationMode;
  workspace.updatedAt = project.updatedAt;
  return workspace;
}

export function recompileH3Prompt(project: StudioProject, sequenceNumber: number) {
  const sequence = project.sequences.find((item) => item.number === sequenceNumber);
  if (!sequence) return null;
  const workspace = project.localProduction.sequenceWorkspaces[sequence.id];
  const translation = workspace.translations.find((item) => item.provider === 'MiniMax H3');
  if (translation) translation.sourceIntentionHash = 'explicit-recompile-request';
  project.localProduction.sequenceWorkspaces[sequence.id] = buildWorkspace(project, sequence, project.localProduction.references, project.localProduction.storyboards[0], workspace);
  return project.localProduction.sequenceWorkspaces[sequence.id].translations.find((item) => item.provider === 'MiniMax H3') ?? null;
}

export function editH3Prompt(project: StudioProject, sequenceNumber: number, instruction: string) {
  const sequence = project.sequences.find((item) => item.number === sequenceNumber);
  if (!sequence) return null;
  const workspace = project.localProduction.sequenceWorkspaces[sequence.id];
  const translation = workspace.translations.find((item) => item.provider === 'MiniMax H3');
  if (!translation) return null;
  translation.compiledPrompt = `${translation.compiledPrompt}\n\nmanual_sequence_direction:\n${instruction.trim()}`;
  translation.compiledAt = project.updatedAt;
  translation.warnings = [...new Set([...translation.warnings, 'Manual provider-translation direction is recorded; canonical continuity and numbered references still have higher authority.'])];
  workspace.updatedAt = project.updatedAt;
  return translation;
}

export function updateStoryboardPanel(project: StudioProject, label: string, instruction: string, regenerate: boolean) {
  const board = project.localProduction.storyboards[0];
  const panel = board?.panels.find((item) => item.label.toLowerCase() === label.toLowerCase());
  if (!board || !panel) return null;
  panel.lineage.push({ version: panel.version, prompt: panel.prompt, generatedFile: panel.generatedFile, approvalState: panel.approvalState, createdAt: panel.updatedAt, reason: regenerate ? 'Preserved before scoped regeneration' : 'Preserved before scoped edit' });
  panel.version += 1;
  panel.prompt = instruction.trim() ? `${panel.prompt}\nScoped direction: ${instruction.trim()}` : panel.prompt;
  panel.generatedFile = null;
  panel.approvalState = 'Draft';
  panel.updatedAt = project.updatedAt;
  board.version += 1;
  board.approvalState = 'Needs Review';
  board.updatedAt = project.updatedAt;
  if (panel.sequenceId) {
    const workspace = project.localProduction.sequenceWorkspaces[panel.sequenceId];
    if (workspace && !workspace.staleReasons.includes(`Storyboard panel ${panel.label} changed.`)) workspace.staleReasons.push(`Storyboard panel ${panel.label} changed.`);
  }
  return panel;
}

export function approveStoryboard(project: StudioProject) {
  const board = project.localProduction.storyboards[0];
  if (!board) return 0;
  const eligible = board.panels.filter((panel) => panel.generatedFile && ['Generated', 'Needs Review'].includes(panel.approvalState));
  for (const panel of eligible) panel.approvalState = 'Approved';
  board.approvalState = board.panels.every((panel) => panel.approvalState === 'Approved') ? 'Approved' : 'Needs Review';
  board.updatedAt = project.updatedAt;
  return eligible.length;
}

export function queueLocalSequenceRange(project: StudioProject, fromSequence: number, throughSequence: number, forceCandidate = false) {
  const start = Math.max(1, Math.min(fromSequence, throughSequence));
  const end = Math.min(project.sequenceCount, Math.max(fromSequence, throughSequence));
  const created: LocalProductionJob[] = [];
  for (const sequence of project.sequences.filter((item) => item.number >= start && item.number <= end)) {
    const workspace = project.localProduction.sequenceWorkspaces[sequence.id];
    const translation = workspace.translations.find((item) => item.provider === 'MiniMax H3');
    if (!translation) continue;
    const existing = project.localProduction.queue.findLast((job) => job.sequenceId === sequence.id && !['Cancelled', 'Failed', 'Approved'].includes(job.status));
    if (existing && !forceCandidate) continue;
    const createdAt = project.updatedAt;
    const jobId = `local_job_${crypto.randomUUID()}`;
    const candidateId = `candidate_${crypto.randomUUID()}`;
    const snapshot = {
      projectId: project.id, sequenceId: sequence.id, providerPrompt: translation.compiledPrompt,
      referenceMapping: structuredClone(translation.referenceMapping), seed: workspace.seed, steps: workspace.steps,
      sampler: workspace.sampler, scheduler: workspace.scheduler, loras: structuredClone(workspace.loras), h3Mode: workspace.h3Mode,
      contextFrames: workspace.contextFrames, audioContextFrames: workspace.audioContextFrames,
      durationSeconds: sequence.duration, resolution: `${workspace.width}x${workspace.height}`,
      modelId: workspace.h3Mode === 'Ref2VA' ? 'minimax-h3-ref2va-int8' : `minimax-h3-${workspace.h3Mode.toLowerCase()}`,
      workflowId: WORKFLOW_PIN.id, workflowVersion: WORKFLOW_PIN.version, workflowChecksum: WORKFLOW_PIN.checksumSha256, createdAt,
    };
    const job: LocalProductionJob = {
      id: jobId, sequenceId: sequence.id, sequenceNumber: sequence.number, candidateId, status: 'Preparing', progress: 0,
      provider: 'MiniMax H3', modelId: snapshot.modelId, workflowId: snapshot.workflowId, workflowVersion: snapshot.workflowVersion,
      workflowChecksum: snapshot.workflowChecksum, resolution: snapshot.resolution, durationSeconds: sequence.duration,
      seed: workspace.seed, steps: workspace.steps, referenceIds: [...workspace.activeReferenceIds], estimatedVramGb: workspace.h3Mode === 'Ref2VA' ? 24 : 16,
      elapsedSeconds: 0, outputPath: null, failure: null, retryCount: 0, checkpointId: null, runtimeProvenance: null, immutableSnapshot: snapshot, createdAt, updatedAt: createdAt,
    };
    project.localProduction.queue.push(job);
    project.localProduction.candidates.push({
      id: candidateId, sequenceId: sequence.id, sequenceNumber: sequence.number, generationSnapshotId: jobId, status: 'Queued',
      mediaPath: null, posterPath: null, seed: workspace.seed, prompt: translation.compiledPrompt, correctionScope: null,
      validationReportId: null, createdAt,
    });
    created.push(job);
  }
  return created;
}

export function pauseLocalQueue(project: StudioProject) {
  let count = 0;
  for (const job of project.localProduction.queue) {
    if (['Preparing', 'Waiting for GPU', 'Loading model', 'Generating'].includes(job.status)) {
      job.status = 'Paused';
      job.updatedAt = project.updatedAt;
      count += 1;
    }
  }
  return count;
}

export function resumeLocalQueue(project: StudioProject, fromSequence = 1) {
  let count = 0;
  for (const job of project.localProduction.queue) {
    if (job.sequenceNumber >= fromSequence && ['Paused', 'Failed'].includes(job.status)) {
      job.status = 'Preparing';
      job.failure = null;
      job.retryCount += 1;
      job.updatedAt = project.updatedAt;
      count += 1;
    }
  }
  return count;
}

export function selectCandidate(project: StudioProject, candidateId: string) {
  const candidate = project.localProduction.candidates.find((item) => item.id === candidateId);
  if (!candidate || !candidate.mediaPath || !['Generated', 'Needs Review'].includes(candidate.status)) return null;
  for (const item of project.localProduction.candidates.filter((item) => item.sequenceId === candidate.sequenceId && item.id !== candidate.id && item.status === 'Approved')) item.status = 'Superseded';
  candidate.status = 'Approved';
  project.localProduction.selectedCandidateId = candidate.id;
  const sequence = project.sequences.find((item) => item.id === candidate.sequenceId);
  if (sequence) {
    const handoff: ContinuityHandoff = {
      id: `handoff_${crypto.randomUUID()}`, sequenceId: sequence.id, sequenceNumber: sequence.number, candidateId: candidate.id,
      approvedVideoPath: candidate.mediaPath, endingFramePaths: candidate.posterPath ? [candidate.posterPath] : [], continuationFramePaths: [], endingLatentPath: null,
      contextFramePaths: [], audioContextPath: null, state: structuredClone(sequence.endingState), locationState: sequence.location,
      nextOpeningExpectation: sequence.closingState, immutable: true, createdAt: project.updatedAt,
    };
    project.localProduction.handoffs.push(handoff);
  }
  return candidate;
}
