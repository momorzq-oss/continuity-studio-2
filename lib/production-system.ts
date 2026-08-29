import type { StudioAsset, StudioProject, StudioSequence } from './studio';
import {
  buildCharacterStates,
  buildMovieCompletionAudit,
  buildSequenceScenario,
  buildStoryThreads,
  compileSeedancePrompt,
  createDialogueLine,
  detectProductionRepetition,
  normalizeDialogueLines,
  rankSequenceReferences,
} from './scenario-engine';
import type {
  CharacterProductionState,
  CorrectionMemoryRule,
  DialogueLine,
  GenerationSnapshot,
  MovieCompletionAudit,
  RankedSequenceReference,
  RepetitionFinding,
  SequenceReadinessChecklist,
  SequenceScenario,
  StoryThread,
} from './scenario-engine';
import {
  createFreezeSnapshot,
  initializeProductionControl,
} from './production-control';
import type { ProductionControlSystem } from './production-control';

export type { DialogueLine } from './scenario-engine';

export type FreshnessStatus = 'Current' | 'Needs Review' | 'Outdated' | 'Missing Reference' | 'Ready';
export type ProductionReadiness =
  | 'Story Ready'
  | 'Assets Incomplete'
  | 'Assets Ready'
  | 'Sequences Ready'
  | 'Production In Progress'
  | 'Final Review'
  | 'Completed';
export type RenderStatus = 'Awaiting Confirmation' | 'Waiting' | 'Paused' | 'Cancelled' | 'External' | 'Preparing' | 'Generating' | 'Completed' | 'Failed' | 'Needs Review' | 'Approved';

export interface DependencyImpact {
  id: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relationship: string;
  freshness: FreshnessStatus;
  reason: string;
  detectedAt: string;
}

export interface TimingBeat {
  id: string;
  label: 'Opening action' | 'Movement' | 'Dialogue timing' | 'Camera change' | 'Reaction' | 'Complication' | 'Transition' | 'Ending position';
  startSecond: number;
  endSecond: number;
  instruction: string;
}

export interface ShotInstruction {
  id: string;
  startSecond: number;
  endSecond: number;
  shotSize: string;
  cameraHeight: string;
  lens: string;
  movement: string;
  focus: string;
  blocking: string;
  screenDirection: string;
  eyeline: string;
  foreground: string;
  background: string;
  depth: string;
  movementSpeed: string;
}

export interface PromptConflict {
  id: string;
  type: 'Count' | 'Wardrobe' | 'Location' | 'Day/Night' | 'Camera' | 'Dialogue' | 'Asset' | 'Continuity' | 'Model capability';
  severity: 'Blocking' | 'Review';
  message: string;
  resolution: string;
  status: 'Open' | 'Resolved';
}

export interface SequenceReferencePackage {
  packageId: string;
  sequenceNumber: number;
  assetNumbers: number[];
  assetFiles: string[];
  previousApprovedSequence: string | null;
  previousApprovedVideoKey: string | null;
  previousEndingFrameKey: string | null;
  prompt: string;
  dialogue: DialogueLine[];
  rankedReferences: RankedSequenceReference[];
  excludedReferenceIds: string[];
  providerReferenceLimit: number | null;
  continuityInstruction: string;
  negativeConstraints: string[];
  priorityRules: string[];
  uploadInstruction: string;
  freshness: FreshnessStatus;
}

export interface SequenceRevision {
  revision: number;
  label: string;
  status: 'Draft' | 'Needs Review' | 'Approved' | 'Superseded';
  createdAt: string;
  reason: string;
  prompt: string;
  assetNumbers: number[];
}

export interface ContinuityCheckpoint {
  id: string;
  sequenceNumber: number;
  sequenceRevision: number;
  createdAt: string;
  assetStates: Record<string, StudioAsset['currentState']>;
  environmentState: string;
  endingState: StudioSequence['endingState'];
  lastFrameKey: string | null;
  openingExpectationForNextSequence: string;
  entryExitState: { entry: string; exit: string; travel: string };
}

export interface SequenceProductionPlan {
  sequenceId: string;
  sequenceNumber: number;
  timing: TimingBeat[];
  shots: ShotInstruction[];
  scenario: SequenceScenario;
  dialogue: DialogueLine[];
  compiledPrompt: string;
  referencePackage: SequenceReferencePackage;
  conflicts: PromptConflict[];
  negativeContinuityRules: string[];
  expectedCounts: Record<string, number>;
  backgroundPopulationRule: string;
  entryExit: { entry: string; exit: string; travel: string };
  revision: number;
  activeApprovedRevision: number | null;
  revisions: SequenceRevision[];
  lockState: 'Unlocked' | 'Locked' | 'Needs Review';
  freshness: FreshnessStatus;
  readiness: FreshnessStatus;
  expectedOpeningFrame: string;
  actualOpeningFrame: string | null;
  lastFrameKey: string | null;
  checkpointIds: string[];
  readinessChecklist: SequenceReadinessChecklist;
}

export interface AssetLineage {
  assetId: string;
  assetNumber: number;
  permanentFileName: string;
  referenceAttachmentIds: string[];
  sourcePrompt: string;
  provider: string;
  model: string;
  generatedAt: string | null;
  currentVersion: number;
  previousVersions: number[];
  approvedVersion: number | null;
  relatedAssetIds: string[];
  sequenceNumbers: number[];
}

export interface RenderQueueItem {
  id: string;
  targetId: string;
  sequenceNumber: number;
  status: RenderStatus;
  provider: string;
  model: string;
  durationSeconds: number;
  resolution: string;
  generationCount: number;
  estimatedCredits: number;
  estimatedCostUsd: number | null;
  actualCostUsd: number | null;
  prompt: string;
  referencePackageId: string;
  generationSnapshotId: string;
  assetNumbers: number[];
  continuityState: string;
  failureMessage: string | null;
  retryHistory: Array<{ attempt: number; at: string; reason: string }>;
  resultMediaKey: string | null;
  continuityFrameKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationCheck {
  id: string;
  name: string;
  status: 'Passed' | 'Failed' | 'Needs Review';
  expected: string;
  actual: string;
  correction: string;
}

export interface ValidationReport {
  id: string;
  targetId: string;
  sequenceNumber: number;
  mediaKey: string | null;
  status: 'Pending' | 'Passed' | 'Failed' | 'Needs Correction';
  checks: ValidationCheck[];
  createdAt: string;
  correctionInstruction: string;
}

export interface CorrectionRequest {
  id: string;
  sequenceNumber: number;
  validationId: string;
  failedCheckIds: string[];
  instruction: string;
  status: 'Open' | 'Queued' | 'Resolved';
  createdAt: string;
}

export interface ModelCapabilityProfile {
  id: string;
  provider: string;
  model: string;
  connectionStatus: 'Not connected' | 'Connected';
  maximumDurationSeconds: number | null;
  supportedDurations: number[];
  supportedResolutions: string[];
  referenceImageSupport: 'Unknown' | 'Supported' | 'Unsupported';
  maximumReferenceImages: number | null;
  generatedSoundInVideo: 'Unknown' | 'Supported' | 'Unsupported';
  promptCharacterLimit: number | null;
  imageToVideo: 'Unknown' | 'Supported' | 'Unsupported';
  supportedReferenceTypes: string[];
  supportedFileExtensions: string[];
  capabilityRevision: string;
  refreshedAt: string;
  limitationPolicy: string;
}

export interface FinalAssemblyPlan {
  id: string;
  version: number;
  status: 'Blocked' | 'Ready' | 'In Progress' | 'Needs Review' | 'Approved';
  orderedSequenceNumbers: number[];
  transitionPlan: string[];
  soundContinuityPlan: string[];
  colorPlan: string[];
  stabilizationPlan: string[];
  creditsPlan: string;
  missingSequenceNumbers: number[];
  createdAt: string;
}

export interface FinalQualityReport {
  id: string;
  status: 'Pending' | 'Passed' | 'Failed';
  checks: ValidationCheck[];
  createdAt: string;
}

export interface ProductionSystem {
  schemaVersion: 3;
  pipelineStages: string[];
  currentPipelineStage: string;
  readiness: ProductionReadiness;
  nextLogicalAction: string;
  storyLock: { status: 'Unlocked' | 'Locked' | 'Needs Review'; lockedAt: string | null; reason: string };
  dependencies: DependencyImpact[];
  sequencePlans: Record<string, SequenceProductionPlan>;
  characterStates: Record<string, CharacterProductionState>;
  storyThreads: StoryThread[];
  repetitionFindings: RepetitionFinding[];
  correctionMemory: CorrectionMemoryRule[];
  generationSnapshots: GenerationSnapshot[];
  completionAudit: MovieCompletionAudit;
  audioPolicy: {
    separateAudioAssetsAllowed: false;
    generationOwner: 'Seedance video generation';
    studioResponsibility: 'Scenario, exact dialogue, speaker binding, timing, sound instructions, and continuity only';
  };
  assetLineage: Record<string, AssetLineage>;
  renderQueue: RenderQueueItem[];
  validations: ValidationReport[];
  corrections: CorrectionRequest[];
  checkpoints: ContinuityCheckpoint[];
  modelCapabilities: ModelCapabilityProfile[];
  selectedCapabilityProfileId: string;
  costLedger: { estimatedCredits: number; estimatedCostUsd: number; actualCostUsd: number; generationCount: number; pricingStatus: string };
  finalAssembly: FinalAssemblyPlan;
  finalQuality: FinalQualityReport;
  control: ProductionControlSystem;
  autosave: { enabled: true; lastSavedAt: string; recoverySnapshotCount: number; lastRecoveryReason: string };
}

export const PIPELINE_STAGES = [
  'IDEA', 'STORY', 'WORLD BIBLE', 'FILM BIBLE', 'COMPLETE MOVIE ANALYSIS', 'ASSET DISCOVERY',
  'REFERENCE UPLOAD', 'ASSET GENERATION', 'ASSET APPROVAL', 'SCENE INTELLIGENCE', 'SEQUENCE PLAN',
  'CONTINUITY STATE', 'REFERENCE PACKAGE', 'PROMPT GENERATION', 'CONFLICT CHECK', 'VIDEO GENERATION',
  'VISUAL VALIDATION', 'CORRECTION', 'SEQUENCE APPROVAL', 'CONTINUITY CHECKPOINT', 'NEXT SEQUENCE',
  'FINAL ASSEMBLY', 'FINAL QUALITY CHECK', 'EXPORT',
] as const;

export const REFERENCE_PRIORITY_RULES = [
  '1. The latest explicit user instruction has highest authority and creates a scoped impact record when it changes approved work.',
  '2. The approved current version of each permanently numbered visual asset controls identity and appearance.',
  '3. The current approved continuity checkpoint and previous ending frame control inherited scene state.',
  '4. The approved Film Bible controls filmmaking language and restrictions.',
  '5. The approved World Bible controls geography, period, culture, materials, technology, and physical rules.',
  '6. The approved script and structured sequence scenario control exact story action and dialogue.',
  '7. AI inference and provider defaults have lowest authority and may never override approved production state.',
];

const NEGATIVE_CONTINUITY_RULES = [
  'Do not duplicate, remove, merge, or morph a named person, creature, animal, vehicle, prop, or location.',
  'Do not change wardrobe, damage, held objects, position, direction, eyeline, weather, lighting, or time without a recorded action.',
  'Do not add background people, vehicles, animals, props, weapons, signage, or structures outside the approved manifest.',
  'Do not let lower-priority prompt text override numbered references, the World Bible, or the latest checkpoint.',
  'Do not reset object condition, placement, ownership, transformation, tracks, debris, fire, water, or environmental effects.',
];

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function formatNumber(value: number) {
  return String(value).padStart(3, '0');
}

function timingPlan(sequence: StudioSequence): TimingBeat[] {
  const ratios = [0, 0.1, 0.24, 0.43, 0.57, 0.7, 0.83, 0.93, 1];
  const labels: TimingBeat['label'][] = ['Opening action', 'Movement', 'Dialogue timing', 'Camera change', 'Reaction', 'Complication', 'Transition', 'Ending position'];
  const instructions = [
    `Begin from the exact expected opening frame: ${sequence.openingState}`,
    'Stage deliberate movement and blocking while preserving screen direction and object ownership.',
    'Reserve this window for authored dialogue, synchronized emotion, and a matching physical action; remain silent when no line is authored.',
    'Make one motivated camera or focus change without resetting geography.',
    'Hold the reaction long enough to read; maintain eyelines, costume, identity, and held objects.',
    'Introduce the sequence complication without adding unplanned assets or population.',
    'Transition the action toward the next continuity checkpoint.',
    `Land on a stable, extractable final image: ${sequence.closingState}`,
  ];
  return labels.map((label, index) => ({
    id: `${sequence.id}:timing:${index + 1}`,
    label,
    startSecond: Number((sequence.duration * ratios[index]).toFixed(2)),
    endSecond: Number((sequence.duration * ratios[index + 1]).toFixed(2)),
    instruction: instructions[index],
  }));
}

function shotPlan(project: StudioProject, sequence: StudioSequence): ShotInstruction[] {
  const cuts = [0, Number((sequence.duration * 0.43).toFixed(2)), Number((sequence.duration * 0.7).toFixed(2)), sequence.duration];
  return [
    {
      id: `${sequence.id}:shot:1`, startSecond: cuts[0], endSecond: cuts[1], shotSize: sequence.number === 1 ? 'Wide establishing to medium-wide' : 'Medium-wide continuity match',
      cameraHeight: 'Eye level', lens: '35mm', movement: 'Slow motivated track', focus: 'Environment to principal subject',
      blocking: 'Enter from the inherited screen side and preserve established spacing', screenDirection: sequence.sceneState.screenDirection,
      eyeline: 'Toward the next story objective', foreground: 'Approved spatial anchor only', background: 'Approved location and exact population only', depth: 'Three readable planes', movementSpeed: 'Measured',
    },
    {
      id: `${sequence.id}:shot:2`, startSecond: cuts[1], endSecond: cuts[2], shotSize: 'Medium performance frame', cameraHeight: 'Eye level', lens: '50mm',
      movement: 'Restrained push or locked frame', focus: 'Speaking or reacting subject', blocking: 'Keep hands, props, and partner eyelines readable',
      screenDirection: sequence.sceneState.screenDirection, eyeline: 'Match the established partner or object axis', foreground: 'No unplanned occlusion',
      background: 'Continuity-safe depth without new elements', depth: 'Shallow-to-moderate', movementSpeed: 'Performance-led',
    },
    {
      id: `${sequence.id}:shot:3`, startSecond: cuts[2], endSecond: cuts[3], shotSize: 'Medium-wide resolving frame', cameraHeight: 'Story-motivated neutral height', lens: '35mm',
      movement: 'Settle into an extractable ending frame', focus: 'Final physical and emotional state', blocking: 'Resolve exact exit, held objects, direction, and relative positions',
      screenDirection: sequence.sceneState.screenDirection, eyeline: 'Carry into the following sequence', foreground: 'Stable final-frame anchor',
      background: 'Preserve approved population and location state', depth: 'Deep enough to validate placement', movementSpeed: 'Decelerating to still',
    },
  ];
}

function expectedCounts(project: StudioProject, sequence: StudioSequence) {
  const counts: Record<string, number> = {};
  for (const assetId of sequence.assetIds) {
    const category = project.assets.find((asset) => asset.id === assetId)?.category ?? 'Unknown';
    counts[category] = (counts[category] ?? 0) + 1;
  }
  return counts;
}

function modelProfiles(project: StudioProject, previous?: ModelCapabilityProfile[]) {
  if (previous?.length) return previous.map((profile) => ({
    ...profile,
    generatedSoundInVideo: profile.generatedSoundInVideo ?? 'Unknown',
    supportedReferenceTypes: profile.supportedReferenceTypes ?? ['image', 'previous-video', 'previous-ending-frame'],
    supportedFileExtensions: profile.supportedFileExtensions ?? ['png', 'jpg', 'jpeg', 'webp', 'mp4', 'mov'],
    capabilityRevision: profile.capabilityRevision ?? 'unverified-1',
    refreshedAt: profile.refreshedAt ?? project.updatedAt,
  }));
  return [
    {
      id: 'video-adapter-unconfigured', provider: project.settings.videoProvider, model: 'Provider model not selected', connectionStatus: 'Not connected' as const,
      maximumDurationSeconds: null, supportedDurations: [], supportedResolutions: [], referenceImageSupport: 'Unknown' as const,
      maximumReferenceImages: null, generatedSoundInVideo: 'Unknown' as const, promptCharacterLimit: null, imageToVideo: 'Unknown' as const,
      supportedReferenceTypes: ['image', 'previous-video', 'previous-ending-frame'], supportedFileExtensions: ['png', 'jpg', 'jpeg', 'webp', 'mp4', 'mov'],
      capabilityRevision: 'unverified-1', refreshedAt: project.updatedAt,
      limitationPolicy: 'Capability values must be loaded from the connected provider adapter before execution. Unknown limits block automatic submission but never discard the prepared job.',
    },
    {
      id: 'image-adapter-unconfigured', provider: project.settings.imageProvider, model: 'Provider model not selected', connectionStatus: 'Not connected' as const,
      maximumDurationSeconds: null, supportedDurations: [], supportedResolutions: [], referenceImageSupport: 'Unknown' as const,
      maximumReferenceImages: null, generatedSoundInVideo: 'Unknown' as const, promptCharacterLimit: null, imageToVideo: 'Unknown' as const,
      supportedReferenceTypes: ['image'], supportedFileExtensions: ['png', 'jpg', 'jpeg', 'webp'],
      capabilityRevision: 'unverified-1', refreshedAt: project.updatedAt,
      limitationPolicy: 'The asset generation adapter must publish its reference, resolution, prompt, cost, and output limits before automatic execution.',
    },
  ];
}

function detectConflicts(project: StudioProject, sequence: StudioSequence, dialogue: DialogueLine[], profile: ModelCapabilityProfile, pkg?: SequenceReferencePackage, scenario?: SequenceScenario): PromptConflict[] {
  const conflicts: PromptConflict[] = [];
  const add = (type: PromptConflict['type'], severity: PromptConflict['severity'], message: string, resolution: string) => {
    conflicts.push({ id: `${sequence.id}:conflict:${type}:${conflicts.length + 1}`, type, severity, message, resolution, status: 'Open' });
  };
  if (new Set(sequence.assetNumbers).size !== sequence.assetNumbers.length) add('Asset', 'Blocking', 'The sequence contains a duplicate permanent asset number.', 'Remove the duplicate manifest entry without renumbering any asset.');
  if (sequence.assetFiles.length !== sequence.assetNumbers.length) add('Asset', 'Blocking', 'Numbered reference files do not match the asset number count.', 'Rebuild the exact numbered reference package.');
  sequence.assetFiles.forEach((file, index) => {
    if (!file.startsWith(`${formatNumber(sequence.assetNumbers[index])}_`)) add('Asset', 'Blocking', `Asset ${formatNumber(sequence.assetNumbers[index])} does not match ${file}.`, 'Use the permanent filename mapped to that project number.');
  });
  if (/night/i.test(sequence.timeOfDay) && /\b(daylight|midday|sunny day)\b/i.test(sequence.prompt)) add('Day/Night', 'Blocking', 'Prompt language conflicts with the approved night state.', 'Remove daylight wording and inherit the approved environment lighting.');
  for (const line of dialogue) {
    if (!sequence.assetIds.includes(line.speakerAssetId)) add('Dialogue', 'Blocking', `Dialogue speaker Asset ${formatNumber(line.speakerAssetNumber)} is not in the sequence manifest.`, 'Add the approved speaker asset or move the line to a sequence containing that identity.');
    if (!line.requiredVisualReferences.some((reference) => reference.role === 'Identity' && reference.assetNumber === line.speakerAssetNumber)) add('Dialogue', 'Blocking', `Dialogue ${line.dialogueId} has no exact approved identity binding for Asset ${formatNumber(line.speakerAssetNumber)}.`, 'Bind the line to the permanent character identity and current appearance references.');
    if (line.endSecond > sequence.duration || line.startSecond < 0 || line.endSecond <= line.startSecond) add('Dialogue', 'Blocking', `Dialogue ${line.dialogueId} falls outside the ${sequence.duration}s sequence window.`, 'Redistribute dialogue, pauses, reactions, action, and camera timing without changing exact text.');
    const costumeMissing = line.currentCostumeAssetNumbers.filter((number) => !sequence.assetNumbers.includes(number));
    if (costumeMissing.length) add('Wardrobe', 'Blocking', `Dialogue speaker Asset ${formatNumber(line.speakerAssetNumber)} current costume Asset ${costumeMissing.map(formatNumber).join(', ')} is not in the sequence manifest.`, 'Add the approved current costume reference without creating another identity.');
  }
  const orderedDialogue = [...dialogue].sort((a, b) => a.turnOrder - b.turnOrder);
  orderedDialogue.slice(1).forEach((line, index) => {
    const previousLine = orderedDialogue[index];
    if (line.startSecond < previousLine.endSecond && !['Overlap', 'Interruption'].includes(line.turnType)) add('Dialogue', 'Blocking', `Dialogue turns ${previousLine.turnOrder} and ${line.turnOrder} overlap without an authored overlap or interruption.`, 'Preserve exact turn order and assign explicit pause, interruption, response, or overlap timing.');
  });
  if (!sequence.assetManifest.locations.length && !sequence.assetManifest.interiors.length) add('Location', 'Blocking', 'No approved numbered location or interior reference is bound to the scenario.', 'Bind the exact approved location/current interior before generation.');
  if (!sequence.prompt.includes('[PROPS, HANDS, CONTAINMENT, VISIBILITY]')) add('Continuity', 'Blocking', 'The compiled prompt is missing object visibility, containment, and hand continuity.', 'Recompile from structured production state.');
  if (!sequence.prompt.includes('[CAMERA]') || !sequence.prompt.includes('[OPENING FRAME]') || !sequence.prompt.includes('[ENDING FRAME]')) add('Camera', 'Blocking', 'The prompt is missing camera handoff or frame expectations.', 'Recompile camera position, height, direction, distance, movement, lens, framing, opening, and ending sections.');
  if (scenario && scenario.actions.some((action) => !action.actorAssetId || !action.actorAssetNumber)) add('Continuity', 'Blocking', 'One or more actions have no permanent numbered owner.', 'Assign every action to the exact character, creature, animal, vehicle, or object that performs it.');
  if (scenario?.actions.some((action) => action.targetAssetId && action.hand === 'Unspecified')) add('Continuity', 'Blocking', 'An action uses a carried or handled object without an exact left, right, or both-hand assignment.', 'Set the hand in the structured action before generation.');
  if (pkg?.rankedReferences.some((reference) => reference.required && !reference.included)) add('Model capability', 'Blocking', 'The provider reference limit excludes at least one required identity, current appearance, location, prop, or continuity frame.', 'Use a provider/reference strategy that retains every required binding or revise the scenario explicitly.');
  const pending = sequence.assetIds.filter((id) => project.assets.find((asset) => asset.id === id)?.lockState !== 'Locked');
  if (pending.length) add('Asset', 'Blocking', `${pending.length} required numbered asset reference${pending.length === 1 ? ' is' : 's are'} not locked.`, 'Approve the exact assets before generation.');
  if (profile.connectionStatus !== 'Connected') add('Model capability', 'Review', 'No video provider capability profile is connected.', 'Keep the job in Waiting and load adapter limits before submission.');
  if (profile.maximumDurationSeconds !== null && sequence.duration > profile.maximumDurationSeconds) add('Model capability', 'Blocking', `${sequence.duration}s exceeds the selected model limit of ${profile.maximumDurationSeconds}s.`, 'Split the timed plan into supported clips while preserving the same checkpoint boundary.');
  if (profile.maximumReferenceImages !== null && sequence.assetFiles.length > profile.maximumReferenceImages) add('Model capability', 'Blocking', `${sequence.assetFiles.length} references exceed the model limit of ${profile.maximumReferenceImages}.`, 'Use a provider-supported reference strategy without changing permanent asset numbers.');
  return conflicts;
}

function latestCheckpoint(system: ProductionSystem | undefined, sequenceNumber: number) {
  return system?.checkpoints.filter((checkpoint) => checkpoint.sequenceNumber === sequenceNumber).sort((a, b) => b.sequenceRevision - a.sequenceRevision)[0];
}

function referencePackage(project: StudioProject, sequence: StudioSequence, dialogue: DialogueLine[], profile: ModelCapabilityProfile, prompt: string, previous?: ProductionSystem): SequenceReferencePackage {
  const checkpoint = latestCheckpoint(previous, sequence.number - 1);
  const previousApprovedVideoKey = previous?.control?.finalSourceMap.find((item) => item.sequenceNumber === sequence.number - 1)?.resultMediaKey
    ?? previous?.renderQueue.findLast((item) => item.sequenceNumber === sequence.number - 1 && item.status === 'Approved')?.resultMediaKey
    ?? null;
  const negativeConstraints = [...NEGATIVE_CONTINUITY_RULES, ...project.filmBible.negativeRules];
  const rankedReferences = rankSequenceReferences(project, sequence, dialogue, checkpoint?.lastFrameKey ?? null, profile.maximumReferenceImages, previousApprovedVideoKey);
  const included = rankedReferences.filter((item) => item.included);
  return {
    packageId: `${sequence.id}:reference-package:v${sequence.version}`,
    sequenceNumber: sequence.number,
    assetNumbers: [...sequence.assetNumbers],
    assetFiles: [...sequence.assetFiles],
    previousApprovedSequence: sequence.number > 1 ? `SEQUENCE_${formatNumber(sequence.number - 1)}` : null,
    previousApprovedVideoKey,
    previousEndingFrameKey: checkpoint?.lastFrameKey ?? null,
    prompt,
    dialogue,
    rankedReferences,
    excludedReferenceIds: rankedReferences.filter((item) => !item.included).map((item) => item.id),
    providerReferenceLimit: profile.maximumReferenceImages,
    continuityInstruction: checkpoint?.openingExpectationForNextSequence ?? sequence.continuitySource,
    negativeConstraints,
    priorityRules: REFERENCE_PRIORITY_RULES,
    uploadInstruction: `Attach in this exact order: ${included.map((item) => `${item.uploadOrder}. ${item.assetNumber ? `Asset ${formatNumber(item.assetNumber)} ` : ''}(${item.fileName})`).join(', ')}. Do not attach or introduce any unlisted recurring production reference.${rankedReferences.some((item) => !item.included) ? ` Provider limit excluded ${rankedReferences.filter((item) => !item.included).map((item) => item.assetNumber ? `Asset ${formatNumber(item.assetNumber)}` : item.fileName).join(', ')} by production priority.` : ''}`,
    freshness: sequence.number === 1 || !!checkpoint?.lastFrameKey ? 'Ready' : 'Missing Reference',
  };
}

function sequenceReadiness(project: StudioProject, sequence: StudioSequence, scenario: SequenceScenario, pkg: SequenceReferencePackage, conflicts: PromptConflict[], profile: ModelCapabilityProfile): SequenceReadinessChecklist {
  const blockers: string[] = [];
  const scenarioComplete = !!scenario.purpose && !!scenario.openingSituation && !!scenario.endingSituation && scenario.actions.every((action) => !!action.actorAssetId);
  const dialogueTimed = scenario.dialogue.every((line) => line.startSecond >= 0 && line.endSecond <= sequence.duration && line.endSecond > line.startSecond);
  const speakersBound = scenario.dialogue.every((line) => line.requiredVisualReferences.some((reference) => reference.role === 'Identity' && reference.assetNumber === line.speakerAssetNumber));
  const visualReferencesApproved = sequence.assetIds.every((id) => project.assets.find((asset) => asset.id === id)?.lockState === 'Locked');
  const currentCostumesBound = scenario.dialogue.every((line) => line.currentCostumeAssetNumbers.every((number) => pkg.rankedReferences.some((reference) => reference.assetNumber === number && reference.included)));
  const locationBound = sequence.assetManifest.locations.concat(sequence.assetManifest.interiors, sequence.assetManifest.environments).every((id) => pkg.rankedReferences.some((reference) => reference.assetId === id));
  const criticalProps = project.assets.filter((asset) => sequence.assetIds.includes(asset.id) && ['Story critical', 'Recurring'].includes(asset.importance) && !['Characters', 'Costumes', 'Locations', 'Interiors', 'Environment States'].includes(asset.category));
  const criticalPropsBound = criticalProps.every((asset) => pkg.rankedReferences.some((reference) => reference.assetId === asset.id && reference.included));
  const previousContinuityReady = sequence.number === 1 || pkg.rankedReferences.some((reference) => reference.role === 'Previous continuity' && reference.included);
  const providerReferenceLimitKnown = profile.maximumReferenceImages !== null;
  const referenceCountSupported = profile.maximumReferenceImages !== null && pkg.rankedReferences.filter((reference) => reference.included).length <= profile.maximumReferenceImages && pkg.rankedReferences.filter((reference) => !reference.included && reference.required).length === 0;
  const contradictionsClear = !conflicts.some((conflict) => conflict.severity === 'Blocking' && conflict.status === 'Open');
  const promptCompiled = !!pkg.prompt && pkg.prompt.includes('[DIALOGUE BINDINGS]') && pkg.prompt.includes('[SEEDANCE SOUND INSTRUCTIONS');
  if (!scenarioComplete) blockers.push('Structured scenario is incomplete.');
  if (!dialogueTimed) blockers.push('Dialogue does not fit the sequence timing window.');
  if (!speakersBound) blockers.push('Every dialogue line needs one approved numbered speaker identity.');
  if (!visualReferencesApproved) blockers.push('One or more required visual references are not approved and locked.');
  if (!currentCostumesBound) blockers.push('A dialogue speaker current costume is missing from the reference package.');
  if (!locationBound) blockers.push('The approved location/environment binding is incomplete.');
  if (!criticalPropsBound) blockers.push('A critical prop reference was removed by the provider limit.');
  if (!previousContinuityReady) blockers.push('The previous approved continuity frame is missing.');
  if (!providerReferenceLimitKnown) blockers.push('The selected provider reference limit is unknown.');
  if (providerReferenceLimitKnown && !referenceCountSupported) blockers.push('The provider limit cannot include every required reference.');
  if (!contradictionsClear) blockers.push('Blocking prompt contradictions remain open.');
  if (!promptCompiled) blockers.push('The Seedance prompt has not been compiled from structured production state.');
  return {
    scenarioComplete, dialogueTimed, speakersBound, visualReferencesApproved, currentCostumesBound, locationBound, criticalPropsBound,
    previousContinuityReady, providerReferenceLimitKnown, referenceCountSupported, contradictionsClear, promptCompiled,
    readyForGeneration: blockers.length === 0, blockers,
  };
}

function lineage(project: StudioProject, asset: StudioAsset, previous?: AssetLineage): AssetLineage {
  return {
    assetId: asset.id, assetNumber: asset.projectNumber, permanentFileName: asset.generatedFileName,
    referenceAttachmentIds: project.attachments.filter((attachment) => attachment.linkedAssetId === asset.id).map((attachment) => attachment.id),
    sourcePrompt: previous?.sourcePrompt ?? asset.description, provider: previous?.provider ?? project.settings.imageProvider,
    model: previous?.model ?? 'Provider model not selected', generatedAt: previous?.generatedAt ?? null, currentVersion: asset.version,
    previousVersions: Array.from({ length: Math.max(0, asset.version - 1) }, (_, index) => index + 1),
    approvedVersion: asset.lockState === 'Locked' ? asset.version : previous?.approvedVersion ?? null,
    relatedAssetIds: project.knowledgeGraph?.edges.filter((edge) => edge.from === asset.id || edge.to === asset.id).flatMap((edge) => [edge.from, edge.to]).filter((id) => id !== asset.id) ?? [],
    sequenceNumbers: [...asset.sequences],
  };
}

function dependencyGraph(project: StudioProject, previous?: ProductionSystem): DependencyImpact[] {
  const previousMap = new Map(previous?.dependencies.map((item) => [item.id, item]) ?? []);
  const dependencies: DependencyImpact[] = [];
  const add = (sourceId: string, sourceType: string, targetId: string, targetType: string, relationship: string) => {
    const id = `${sourceId}->${targetId}:${relationship}`;
    const old = previousMap.get(id);
    dependencies.push({ id, sourceId, sourceType, targetId, targetType, relationship, freshness: old?.freshness ?? 'Current', reason: old?.reason ?? 'Dependency is synchronized.', detectedAt: old?.detectedAt ?? project.updatedAt });
  };
  add('STORY', 'Story', 'WORLD_BIBLE', 'World Bible', 'defines');
  add('WORLD_BIBLE', 'World Bible', 'FILM_BIBLE', 'Film Bible', 'constrains');
  for (const asset of project.assets) {
    add('STORY', 'Story', asset.id, 'Asset', 'requires');
    add('WORLD_BIBLE', 'World Bible', asset.id, 'Asset', 'constrains');
    for (const sequenceNumber of asset.sequences) add(asset.id, 'Asset', `SEQUENCE_${formatNumber(sequenceNumber)}`, 'Sequence', 'referenced by');
  }
  for (const sequence of project.sequences) {
    add('STORY', 'Story', sequence.id, 'Sequence', 'defines narrative purpose for');
    add('WORLD_BIBLE', 'World Bible', sequence.id, 'Sequence', 'constrains physical world of');
    add('FILM_BIBLE', 'Film Bible', sequence.id, 'Sequence', 'governs');
    add(sequence.id, 'Sequence', `${sequence.id}:PROMPT`, 'Prompt', 'generates');
    add(sequence.id, 'Sequence', `${sequence.id}:COST`, 'Cost', 'estimates');
    if (sequence.number < project.sequenceCount) add(sequence.id, 'Sequence', `SEQUENCE_${formatNumber(sequence.number + 1)}`, 'Sequence', 'hands off continuity to');
  }
  return dependencies;
}

function readiness(project: StudioProject, system: ProductionSystem): { status: ProductionReadiness; action: string; stage: string } {
  if (project.story.status !== 'Approved') return { status: 'Story Ready', action: 'Review and approve the story to freeze the narrative baseline.', stage: 'STORY' };
  if (project.worldBible.status !== 'Approved') return { status: 'Story Ready', action: 'Approve the World Bible so every asset and location inherits one physical world.', stage: 'WORLD BIBLE' };
  if (project.filmBible.status !== 'Approved') return { status: 'Story Ready', action: 'Approve the Film Bible to lock visual, Seedance sound-instruction, and continuity rules.', stage: 'FILM BIBLE' };
  const unreadyAssets = project.assets.filter((asset) => asset.lockState !== 'Locked');
  if (unreadyAssets.length) return { status: 'Assets Incomplete', action: `Review ${unreadyAssets.length} remaining production asset${unreadyAssets.length === 1 ? '' : 's'}; start with Asset ${formatNumber(unreadyAssets[0].projectNumber)}.`, stage: 'ASSET APPROVAL' };
  if (system.dependencies.some((item) => ['Needs Review', 'Outdated', 'Missing Reference'].includes(item.freshness))) return { status: 'Assets Ready', action: 'Resolve dependency impacts before preparing the next reference package.', stage: 'CONTINUITY STATE' };
  const current = project.sequences.find((sequence) => sequence.number === project.currentSequence) ?? project.sequences[0];
  const currentJob = system.renderQueue.findLast((job) => job.sequenceNumber === current?.number);
  if (system.finalAssembly.status === 'Approved' && system.finalQuality.status === 'Passed') return { status: 'Completed', action: 'Export the complete portable archive and the separate flat numbered asset folder.', stage: 'EXPORT' };
  if (project.sequences.every((sequence) => sequence.status === 'Approved')) return { status: 'Final Review', action: 'Build the ordered final assembly and run the final quality check.', stage: 'FINAL ASSEMBLY' };
  if (currentJob && ['Awaiting Confirmation', 'Waiting', 'Paused', 'Preparing', 'Generating', 'Completed', 'Failed', 'Needs Review'].includes(currentJob.status)) {
    const action = currentJob.status === 'Failed' ? `Retry ${currentJob.id}; its exact prompt, references, and continuity state are preserved.`
      : currentJob.status === 'Awaiting Confirmation' ? `Review the visible cost summary and confirm or cancel Sequence ${current?.number}; no credit has been used.`
        : currentJob.status === 'Paused' ? `Resume or cancel Sequence ${current?.number}; its immutable inputs remain preserved.`
      : currentJob.status === 'Completed' || currentJob.status === 'Needs Review' ? `Validate Sequence ${current?.number} against its expected references and checkpoint.`
        : `Continue the queued production job for Sequence ${current?.number}.`;
    return { status: 'Production In Progress', action, stage: currentJob.status === 'Completed' ? 'VISUAL VALIDATION' : 'VIDEO GENERATION' };
  }
  const currentPlan = current ? system.sequencePlans[current.id] : undefined;
  if (current && currentPlan?.referencePackage.freshness === 'Missing Reference') {
    return { status: 'Production In Progress', action: `Extract or attach the approved last frame from Sequence ${current.number - 1}; it is required at highest reference priority before Sequence ${current.number}.`, stage: 'REFERENCE PACKAGE' };
  }
  if (current && currentPlan?.conflicts.some((conflict) => conflict.severity === 'Blocking' && conflict.status === 'Open')) {
    return { status: 'Sequences Ready', action: `Resolve the blocking prompt conflicts in Sequence ${current.number} before queueing generation.`, stage: 'CONFLICT CHECK' };
  }
  if (current) return { status: project.sequences.some((sequence) => sequence.status === 'Approved') ? 'Production In Progress' : 'Sequences Ready', action: `Prepare and generate Sequence ${current.number} from its exact numbered reference package.`, stage: 'REFERENCE PACKAGE' };
  return { status: 'Assets Ready', action: 'Review the complete sequence plan.', stage: 'SEQUENCE PLAN' };
}

function qualityReport(project: StudioProject, previous?: FinalQualityReport): FinalQualityReport {
  const allApproved = project.sequences.every((sequence) => sequence.status === 'Approved');
  const checkpointComplete = (project.production?.checkpoints?.length ?? 0) >= project.sequences.length;
  const checks: ValidationCheck[] = [
    { id: 'final:sequence-order', name: 'Sequence order and completeness', status: allApproved ? 'Passed' : 'Failed', expected: `${project.sequenceCount} approved sequences in order`, actual: `${project.sequences.filter((sequence) => sequence.status === 'Approved').length} approved`, correction: 'Approve every validated sequence before final assembly.' },
    { id: 'final:continuity', name: 'Continuity checkpoint chain', status: checkpointComplete ? 'Passed' : 'Failed', expected: `${project.sequences.length} approved sequence checkpoints`, actual: `${project.production?.checkpoints?.length ?? 0} checkpoints`, correction: 'Create a locked checkpoint from every approved sequence ending.' },
    { id: 'final:assets', name: 'Permanent asset numbering', status: new Set(project.assets.map((asset) => asset.projectNumber)).size === project.assets.length ? 'Passed' : 'Failed', expected: 'Unique permanent project-wide numbers', actual: `${project.assets.length} assets`, correction: 'Repair duplicate numbers without moving existing permanent assignments.' },
  ];
  return { id: previous?.id ?? uid('final_quality'), status: checks.some((check) => check.status === 'Failed') ? 'Failed' : checks.every((check) => check.status === 'Passed') ? 'Passed' : 'Pending', checks, createdAt: previous?.createdAt ?? nowIso() };
}

export function initializeProductionSystem(project: StudioProject): ProductionSystem {
  const previous = project.production;
  const capabilities = modelProfiles(project, previous?.modelCapabilities);
  const selectedCapabilityProfileId = previous?.selectedCapabilityProfileId && capabilities.some((profile) => profile.id === previous.selectedCapabilityProfileId)
    ? previous.selectedCapabilityProfileId : capabilities[0].id;
  const profile = capabilities.find((item) => item.id === selectedCapabilityProfileId) ?? capabilities[0];
  const characterStates = buildCharacterStates(project, previous?.characterStates);
  const storyThreads = buildStoryThreads(project, previous?.storyThreads);
  const correctionMemory = previous?.correctionMemory ?? [];
  const sequencePlans: Record<string, SequenceProductionPlan> = {};
  for (const sequence of project.sequences) {
    const old = previous?.sequencePlans?.[sequence.id];
    const dialogue = normalizeDialogueLines(project, sequence, old?.dialogue ?? []);
    const scenario = buildSequenceScenario(project, sequence, dialogue, old?.scenario, characterStates);
    const draftPackage = referencePackage(project, sequence, dialogue, profile, '', previous);
    const compiledPrompt = compileSeedancePrompt(project, sequence, scenario, draftPackage.rankedReferences, [...NEGATIVE_CONTINUITY_RULES, ...project.filmBible.negativeRules], correctionMemory);
    sequence.prompt = compiledPrompt;
    const pkg = referencePackage(project, sequence, dialogue, profile, compiledPrompt, previous);
    const conflicts = detectConflicts(project, sequence, dialogue, profile, pkg, scenario);
    const blocking = conflicts.some((conflict) => conflict.severity === 'Blocking' && conflict.status === 'Open');
    const referenceReady = pkg.freshness === 'Ready' || sequence.number === 1;
    sequencePlans[sequence.id] = {
      sequenceId: sequence.id, sequenceNumber: sequence.number, timing: timingPlan(sequence), shots: shotPlan(project, sequence), scenario, dialogue, compiledPrompt,
      referencePackage: pkg, conflicts, negativeContinuityRules: [...NEGATIVE_CONTINUITY_RULES], expectedCounts: expectedCounts(project, sequence),
      backgroundPopulationRule: old?.backgroundPopulationRule ?? 'Zero unplanned background people, animals, creatures, vehicles, props, weapons, or structures. Only the exact manifest may appear.',
      entryExit: old?.entryExit ?? { entry: sequence.number === 1 ? 'Story-defined entrance into the established world' : `Enter from the approved exit and screen side of SEQUENCE_${formatNumber(sequence.number - 1)}`, exit: sequence.number === project.sequenceCount ? 'Hold final story position' : `Exit or settle toward SEQUENCE_${formatNumber(sequence.number + 1)}`, travel: sequence.number === 1 ? 'Opening geography establishes the route' : 'Travel must follow approved connected locations and elapsed story time' },
      revision: old?.revision ?? sequence.version, activeApprovedRevision: old?.activeApprovedRevision ?? (sequence.status === 'Approved' ? sequence.version : null),
      revisions: old?.revisions ?? [{ revision: sequence.version, label: `V${String(sequence.version).padStart(2, '0')}`, status: sequence.status === 'Approved' ? 'Approved' : 'Draft', createdAt: project.updatedAt, reason: 'Initial sequence plan', prompt: sequence.prompt, assetNumbers: [...sequence.assetNumbers] }],
      lockState: old?.lockState ?? (sequence.status === 'Approved' ? 'Locked' : 'Unlocked'),
      freshness: old?.freshness ?? (blocking ? 'Needs Review' : referenceReady ? 'Current' : 'Missing Reference'),
      readiness: blocking ? 'Needs Review' : referenceReady ? 'Ready' : 'Missing Reference',
      expectedOpeningFrame: old?.expectedOpeningFrame ?? pkg.continuityInstruction, actualOpeningFrame: old?.actualOpeningFrame ?? null,
      lastFrameKey: old?.lastFrameKey ?? null, checkpointIds: old?.checkpointIds ?? [],
      readinessChecklist: sequenceReadiness(project, sequence, scenario, pkg, conflicts, profile),
    };
  }
  const scenarios = Object.fromEntries(Object.entries(sequencePlans).map(([id, plan]) => [id, plan.scenario]));
  const repetitionFindings = detectProductionRepetition(scenarios);
  const assetLineage = Object.fromEntries(project.assets.map((asset) => [asset.id, lineage(project, asset, previous?.assetLineage?.[asset.id])]));
  const renderQueue = previous?.renderQueue ?? [];
  const estimatedCredits = renderQueue.reduce((sum, item) => sum + item.estimatedCredits, 0);
  const costLedger = {
    estimatedCredits, estimatedCostUsd: renderQueue.reduce((sum, item) => sum + (item.estimatedCostUsd ?? 0), 0),
    actualCostUsd: renderQueue.reduce((sum, item) => sum + (item.actualCostUsd ?? 0), 0),
    generationCount: renderQueue.reduce((sum, item) => sum + item.generationCount, 0),
    pricingStatus: renderQueue.some((item) => item.estimatedCostUsd === null) ? 'Provider pricing required for USD estimate; credit attempts are tracked.' : 'Provider pricing loaded.',
  };
  const finalAssembly: FinalAssemblyPlan = previous?.finalAssembly ?? {
    id: uid('assembly'), version: 1, status: 'Blocked', orderedSequenceNumbers: project.sequences.map((sequence) => sequence.number),
    transitionPlan: project.sequences.slice(1).map((sequence) => `Match the approved last frame and authored sound-continuity instruction into Sequence ${sequence.number}.`),
    soundContinuityPlan: ['Seedance generates spoken dialogue, ambience, effects, requested music, and silence inside each video.', 'Match authored sound sources and intentional silence at every approved sequence boundary; do not create or export separate sound assets.'],
    colorPlan: ['Match exposure, white balance, palette, and time-of-day across every approved boundary.'],
    stabilizationPlan: ['Apply stabilization only where it does not alter approved framing, scale, or motion intention.'], creditsPlan: 'Append approved project credits after the final story frame.',
    missingSequenceNumbers: project.sequences.filter((sequence) => sequence.status !== 'Approved').map((sequence) => sequence.number), createdAt: project.updatedAt,
  };
  finalAssembly.soundContinuityPlan ??= ['Seedance generates requested sound inside each video; Continuity Studio exports instructions and continuity state only.'];
  finalAssembly.missingSequenceNumbers = project.sequences.filter((sequence) => sequence.status !== 'Approved').map((sequence) => sequence.number);
  finalAssembly.status = finalAssembly.missingSequenceNumbers.length ? 'Blocked' : finalAssembly.status === 'Approved' ? 'Approved' : 'Ready';
  const system = {
    schemaVersion: 3, pipelineStages: [...PIPELINE_STAGES], currentPipelineStage: 'STORY', readiness: 'Story Ready', nextLogicalAction: '',
    storyLock: previous?.storyLock ?? { status: 'Unlocked', lockedAt: null, reason: 'Story remains editable until production begins.' },
    dependencies: dependencyGraph(project, previous), sequencePlans, characterStates, storyThreads, repetitionFindings, correctionMemory,
    generationSnapshots: previous?.generationSnapshots ?? [], completionAudit: buildMovieCompletionAudit(project, scenarios, repetitionFindings, storyThreads),
    audioPolicy: { separateAudioAssetsAllowed: false, generationOwner: 'Seedance video generation', studioResponsibility: 'Scenario, exact dialogue, speaker binding, timing, sound instructions, and continuity only' },
    assetLineage,
    renderQueue, validations: previous?.validations ?? [], corrections: previous?.corrections ?? [], checkpoints: previous?.checkpoints ?? [],
    modelCapabilities: capabilities, selectedCapabilityProfileId, costLedger, finalAssembly,
    finalQuality: qualityReport(project, previous?.finalQuality),
    control: previous?.control,
    autosave: previous?.autosave ?? { enabled: true, lastSavedAt: project.updatedAt, recoverySnapshotCount: 0, lastRecoveryReason: 'Project created' },
  } as ProductionSystem;
  project.production = system;
  system.control = initializeProductionControl(project, previous?.control);
  const state = readiness(project, system);
  system.readiness = state.status;
  system.nextLogicalAction = state.action;
  system.currentPipelineStage = state.stage;
  system.autosave.lastSavedAt = project.updatedAt;
  return system;
}

export function refreshProductionSystem(project: StudioProject) {
  project.production = initializeProductionSystem(project);
  return project;
}

export function markDependencyChange(project: StudioProject, sourceId: string, reason: string) {
  project.production ??= initializeProductionSystem(project);
  const at = nowIso();
  for (const dependency of project.production.dependencies) {
    if (dependency.sourceId !== sourceId) continue;
    dependency.freshness = dependency.targetType === 'Sequence' || dependency.targetType === 'Prompt' ? 'Outdated' : 'Needs Review';
    dependency.reason = reason;
    dependency.detectedAt = at;
    const plan = project.production.sequencePlans[dependency.targetId];
    if (!plan) continue;
    if (!plan.revisions.some((revision) => revision.revision === plan.revision && revision.status === 'Approved') && plan.activeApprovedRevision === plan.revision) {
      plan.revisions.push({ revision: plan.revision, label: `V${String(plan.revision).padStart(2, '0')}`, status: 'Approved', createdAt: at, reason: 'Preserved approved baseline before dependency change', prompt: dependency.targetId, assetNumbers: [] });
    }
    plan.revision += 1;
    plan.revisions.push({ revision: plan.revision, label: `V${String(plan.revision).padStart(2, '0')}`, status: 'Needs Review', createdAt: at, reason, prompt: project.sequences.find((sequence) => sequence.id === plan.sequenceId)?.prompt ?? '', assetNumbers: project.sequences.find((sequence) => sequence.id === plan.sequenceId)?.assetNumbers ?? [] });
    plan.lockState = 'Needs Review';
    plan.freshness = 'Outdated';
    const sequence = project.sequences.find((item) => item.id === plan.sequenceId);
    if (sequence && sequence.status === 'Approved') sequence.status = 'Needs Review';
    for (const validation of project.production.validations.filter((item) => item.sequenceNumber === plan.sequenceNumber)) {
      validation.status = 'Needs Correction';
      validation.correctionInstruction = `Revalidate only the consequences of this dependency change: ${reason}`;
      const checkId = `${validation.id}:dependency:${sourceId}`;
      const dependencyCheck: ValidationCheck = {
        id: checkId,
        name: 'Upstream dependency freshness',
        status: 'Failed',
        expected: 'Generated output matches the latest approved upstream production state',
        actual: reason,
        correction: `Revalidate only the visual, dialogue ownership, Seedance sound instructions, timing, prompt, and continuity consequences of ${sourceId}; preserve every unaffected approved field.`,
      };
      const existingCheck = validation.checks.findIndex((check) => check.id === checkId);
      if (existingCheck >= 0) validation.checks[existingCheck] = dependencyCheck;
      else validation.checks.push(dependencyCheck);
    }
    const job = project.production.renderQueue.findLast((item) => item.sequenceNumber === plan.sequenceNumber);
    if (job && ['Completed', 'Needs Review', 'Approved'].includes(job.status)) {
      job.status = 'Needs Review';
      job.failureMessage = `Upstream dependency changed after generation: ${reason}`;
      job.updatedAt = at;
    }
  }
  return refreshProductionSystem(project);
}

export function resolveDependencyTarget(project: StudioProject, targetId: string, reason: string) {
  project.production ??= initializeProductionSystem(project);
  const at = nowIso();
  for (const dependency of project.production.dependencies) {
    if (dependency.targetId !== targetId) continue;
    dependency.freshness = 'Current';
    dependency.reason = reason;
    dependency.detectedAt = at;
  }
  const plan = project.production.sequencePlans[targetId];
  if (plan) {
    plan.freshness = 'Current';
    plan.readiness = plan.conflicts.some((conflict) => conflict.severity === 'Blocking' && conflict.status === 'Open') ? 'Needs Review' : 'Ready';
  }
  return refreshProductionSystem(project);
}

export function addDialogueLine(project: StudioProject, sequence: StudioSequence, speaker: StudioAsset, exactDialogue: string) {
  project.production ??= initializeProductionSystem(project);
  const plan = project.production.sequencePlans[sequence.id];
  if (speaker.category !== 'Characters') throw new Error(`Asset ${formatNumber(speaker.projectNumber)} is not a character identity and cannot own dialogue.`);
  const line = createDialogueLine(project, sequence, speaker, exactDialogue, plan.dialogue);
  plan.dialogue.push(line);
  sequence.version += 1;
  sequence.status = 'Needs Review';
  plan.revision = sequence.version;
  plan.revisions.push({ revision: plan.revision, label: `V${String(plan.revision).padStart(2, '0')}`, status: 'Needs Review', createdAt: nowIso(), reason: `Exact dialogue ${line.dialogueId} added for Asset ${formatNumber(speaker.projectNumber)}.`, prompt: plan.compiledPrompt, assetNumbers: [...sequence.assetNumbers] });
  plan.freshness = 'Needs Review';
  refreshProductionSystem(project);
  const refreshedPlan = project.production.sequencePlans[sequence.id];
  const revision = refreshedPlan.revisions.findLast((item) => item.revision === refreshedPlan.revision);
  if (revision) revision.prompt = refreshedPlan.compiledPrompt;
  return project;
}

export function queueSequenceGeneration(project: StudioProject, sequence: StudioSequence) {
  project.production ??= initializeProductionSystem(project);
  const plan = project.production.sequencePlans[sequence.id];
  const profile = project.production.modelCapabilities.find((item) => item.id === project.production.selectedCapabilityProfileId)!;
  const existing = project.production.renderQueue.findLast((item) => item.sequenceNumber === sequence.number && !['Failed', 'Cancelled', 'Approved'].includes(item.status));
  if (existing) return existing;
  const at = nowIso();
  const blocking = !plan.readinessChecklist.readyForGeneration || plan.conflicts.some((conflict) => conflict.severity === 'Blocking' && conflict.status === 'Open') || ['Outdated', 'Missing Reference'].includes(plan.freshness);
  const snapshot: GenerationSnapshot = {
    id: uid('generation_snapshot'), sequenceNumber: sequence.number, createdAt: at,
    scenario: structuredClone(plan.scenario), dialogue: structuredClone(plan.dialogue), referencePackageId: plan.referencePackage.packageId,
    selectedReferenceIds: plan.referencePackage.rankedReferences.filter((reference) => reference.included).map((reference) => reference.id),
    compiledPrompt: plan.compiledPrompt, correctionRuleIds: project.production.correctionMemory.filter((rule) => rule.active && (rule.sequenceNumber === null || rule.sequenceNumber === sequence.number)).map((rule) => rule.id),
    reason: project.production.generationSnapshots.some((item) => item.sequenceNumber === sequence.number) ? 'Regeneration' : 'Initial generation', immutable: true,
  };
  project.production.generationSnapshots.push(snapshot);
  const job: RenderQueueItem = {
    id: uid('render'), targetId: sequence.id, sequenceNumber: sequence.number,
    status: blocking ? 'Waiting' : 'Awaiting Confirmation', provider: profile.provider, model: profile.model,
    durationSeconds: sequence.duration, resolution: project.resolution, generationCount: 0, estimatedCredits: 0,
    estimatedCostUsd: null, actualCostUsd: null, prompt: plan.compiledPrompt, referencePackageId: plan.referencePackage.packageId, generationSnapshotId: snapshot.id,
    assetNumbers: [...sequence.assetNumbers], continuityState: plan.referencePackage.continuityInstruction,
    failureMessage: blocking ? plan.readinessChecklist.blockers.join(' ') || 'Blocked by unresolved prompt or dependency conflicts.' : 'Paid generation has not started. Confirm the visible provider, model, duration, resolution, sequence, and one-credit estimate first.',
    retryHistory: [], resultMediaKey: null, continuityFrameKey: null, createdAt: at, updatedAt: at,
  };
  project.production.renderQueue.push(job);
  project.production.storyLock = { status: 'Locked', lockedAt: project.production.storyLock.lockedAt ?? at, reason: 'Production started; story changes now create dependency impacts instead of overwriting approved work.' };
  sequence.status = 'Ready';
  refreshProductionSystem(project);
  return job;
}

export function retryRenderJob(project: StudioProject, job: RenderQueueItem) {
  const at = nowIso();
  job.retryHistory.push({ attempt: job.generationCount, at, reason: job.failureMessage ?? 'Targeted retry requested' });
  job.status = 'Awaiting Confirmation';
  job.failureMessage = 'Exact prompt, numbered references, provider settings, and continuity state are preserved. Confirm the next paid attempt before any credit can be used.';
  job.updatedAt = at;
  refreshProductionSystem(project);
  return job;
}

export function confirmRenderJob(project: StudioProject, job: RenderQueueItem) {
  project.production ??= initializeProductionSystem(project);
  const profile = project.production.modelCapabilities.find((item) => item.id === project.production.selectedCapabilityProfileId);
  if (!['Awaiting Confirmation', 'Paused', 'Failed'].includes(job.status)) return job;
  if (!project.production.control.freezeSnapshots.length) {
    project.production.control.freezeSnapshots.push(createFreezeSnapshot(project, `Production baseline frozen before the first confirmed paid generation attempt for Sequence ${job.sequenceNumber}.`));
  }
  const at = nowIso();
  if (!profile || profile.connectionStatus !== 'Connected') {
    job.status = 'Waiting';
    job.failureMessage = 'Confirmation recorded, but no compatible provider is connected. No generation attempt or credit was consumed.';
  } else {
    job.status = 'Preparing';
    job.generationCount += 1;
    job.estimatedCredits += 1;
    job.failureMessage = null;
    const sequence = project.sequences.find((item) => item.number === job.sequenceNumber);
    if (sequence) sequence.status = 'Generating';
  }
  job.updatedAt = at;
  refreshProductionSystem(project);
  return job;
}

export function pauseRenderJob(project: StudioProject, job: RenderQueueItem) {
  if (!['Preparing', 'Generating', 'Waiting'].includes(job.status)) return job;
  job.status = 'Paused';
  job.failureMessage = 'Paused with the immutable generation snapshot, prompt, reference order, provider settings, and continuity state preserved.';
  job.updatedAt = nowIso();
  refreshProductionSystem(project);
  return job;
}

export function cancelRenderJob(project: StudioProject, job: RenderQueueItem) {
  if (['Approved', 'Completed'].includes(job.status)) return job;
  job.status = 'Cancelled';
  job.failureMessage = 'Cancelled. The immutable preparation snapshot remains available for retry or audit; text and production state were not discarded.';
  job.updatedAt = nowIso();
  refreshProductionSystem(project);
  return job;
}

export function registerGeneratedSequenceResult(project: StudioProject, sequence: StudioSequence, attachmentId: string) {
  project.production ??= initializeProductionSystem(project);
  const plan = project.production.sequencePlans[sequence.id];
  const job = project.production.renderQueue.findLast((item) => item.sequenceNumber === sequence.number);
  if (!job) throw new Error(`${sequence.id} has no generation job to receive a result.`);
  const mediaKey = `reference:${attachmentId}`;
  job.status = 'Completed';
  job.resultMediaKey = mediaKey;
  job.continuityFrameKey = `${mediaKey}#last-frame`;
  job.failureMessage = null;
  job.updatedAt = nowIso();
  plan.actualOpeningFrame = `${mediaKey}#first-frame`;
  plan.lastFrameKey = job.continuityFrameKey;
  sequence.status = 'Generated';
  const provenanceId = uid('provenance');
  project.production.control.resultProvenance.push({
    id: provenanceId,
    sequenceNumber: sequence.number,
    sequenceVersion: sequence.version,
    assetVersions: sequence.assetIds.map((assetId) => project.assets.find((asset) => asset.id === assetId)).filter((asset): asset is StudioAsset => Boolean(asset)).map((asset) => ({ assetId: asset.id, assetNumber: asset.projectNumber, version: asset.version, fileName: asset.generatedFileName })),
    scenarioVersion: plan.revision,
    dialogueIds: plan.dialogue.map((line) => line.dialogueId),
    prompt: job.prompt,
    provider: job.provider,
    model: job.model,
    settings: { durationSeconds: job.durationSeconds, resolution: job.resolution, referencePackageId: job.referencePackageId },
    generationSnapshotId: job.generationSnapshotId,
    resultMediaKey: mediaKey,
    createdAt: nowIso(),
  });
  refreshProductionSystem(project);
  return job;
}

export function rememberCorrection(project: StudioProject, instruction: string, sequenceNumber: number | null) {
  project.production ??= initializeProductionSystem(project);
  const rule: CorrectionMemoryRule = {
    id: uid('correction_memory'), instruction, appliesTo: ['Scenario', 'Reference package', 'Seedance prompt', 'Validation'],
    sequenceNumber, createdAt: nowIso(), active: true,
  };
  project.production.correctionMemory.push(rule);
  refreshProductionSystem(project);
  return rule;
}

export function setSelectedModelReferenceLimit(project: StudioProject, maximumReferenceImages: number) {
  project.production ??= initializeProductionSystem(project);
  const profile = project.production.modelCapabilities.find((item) => item.id === project.production.selectedCapabilityProfileId);
  if (!profile) throw new Error('No selected video capability profile exists.');
  profile.maximumReferenceImages = Math.max(1, Math.trunc(maximumReferenceImages));
  profile.referenceImageSupport = 'Supported';
  refreshProductionSystem(project);
  return profile;
}

export function validateSequence(project: StudioProject, sequence: StudioSequence) {
  project.production ??= initializeProductionSystem(project);
  const plan = project.production.sequencePlans[sequence.id];
  const job = project.production.renderQueue.findLast((item) => item.sequenceNumber === sequence.number);
  const mediaAvailable = !!job && ['Completed', 'Needs Review', 'Approved'].includes(job.status);
  const checks: ValidationCheck[] = [
    { id: uid('check'), name: 'Opening frame match', status: mediaAvailable ? 'Needs Review' : 'Failed', expected: plan.expectedOpeningFrame, actual: mediaAvailable ? plan.actualOpeningFrame ?? 'Awaiting visual comparison annotation' : 'No generated video or opening frame is stored', correction: 'Compare the generated first frame against the prior approved checkpoint and correct only mismatched state.' },
    { id: uid('check'), name: 'Exact people and asset counts', status: mediaAvailable ? 'Needs Review' : 'Failed', expected: JSON.stringify(plan.expectedCounts), actual: mediaAvailable ? 'Awaiting image/video validation annotation' : 'No media available', correction: 'Remove duplicates and unplanned elements; preserve exact named counts and permanent asset identities.' },
    { id: uid('check'), name: 'Wardrobe, props, damage, and object permanence', status: mediaAvailable ? 'Needs Review' : 'Failed', expected: plan.referencePackage.continuityInstruction, actual: mediaAvailable ? 'Awaiting frame comparison' : 'No media available', correction: 'Correct only the failed continuity fields using approved numbered references.' },
    { id: uid('check'), name: 'Exact dialogue ownership and in-video sound result', status: plan.dialogue.length === 0 ? 'Passed' : mediaAvailable ? 'Needs Review' : 'Failed', expected: plan.dialogue.length ? `${plan.dialogue.length} exact timed line(s), each owned by one numbered speaker and generated by Seedance inside the video` : 'No spoken dialogue requested', actual: plan.dialogue.length === 0 ? 'No spoken dialogue requested' : mediaAvailable ? 'Awaiting result inspection when dialogue is audible and inspectable' : 'No media available', correction: 'Correct the Seedance scenario or exact speaker binding while preserving every approved visual state and story beat.' },
    { id: uid('check'), name: 'Ending checkpoint and extractable last frame', status: mediaAvailable ? 'Needs Review' : 'Failed', expected: sequence.closingState, actual: mediaAvailable ? plan.lastFrameKey ?? 'Last frame extraction pending' : 'No generated ending frame', correction: 'Correct the ending position/state and extract the actual last frame for the next reference package.' },
  ];
  const report: ValidationReport = {
    id: uid('validation'), targetId: sequence.id, sequenceNumber: sequence.number, mediaKey: null,
    status: checks.some((check) => check.status === 'Failed') ? 'Needs Correction' : checks.every((check) => check.status === 'Passed') ? 'Passed' : 'Pending',
    checks, createdAt: nowIso(), correctionInstruction: checks.filter((check) => check.status !== 'Passed').map((check) => `${check.name}: ${check.correction}`).join(' '),
  };
  project.production.validations.push(report);
  if (report.status === 'Needs Correction') {
    project.production.corrections.push({ id: uid('correction'), sequenceNumber: sequence.number, validationId: report.id, failedCheckIds: checks.filter((check) => check.status === 'Failed').map((check) => check.id), instruction: report.correctionInstruction, status: 'Open', createdAt: report.createdAt });
  }
  sequence.status = report.status === 'Passed' ? 'Passed' : 'Needs Review';
  refreshProductionSystem(project);
  return report;
}

export function approveSequenceAndCheckpoint(project: StudioProject, sequence: StudioSequence) {
  project.production ??= initializeProductionSystem(project);
  const plan = project.production.sequencePlans[sequence.id];
  const at = nowIso();
  plan.revisions = plan.revisions.map((revision) => ({ ...revision, status: revision.revision === plan.revision ? 'Approved' : revision.status === 'Approved' ? 'Superseded' : revision.status }));
  plan.activeApprovedRevision = plan.revision;
  plan.lockState = 'Locked';
  plan.freshness = 'Current';
  const checkpoint: ContinuityCheckpoint = {
    id: uid('checkpoint'), sequenceNumber: sequence.number, sequenceRevision: plan.revision, createdAt: at,
    assetStates: Object.fromEntries(sequence.assetIds.map((assetId) => [assetId, structuredClone(project.assets.find((asset) => asset.id === assetId)?.currentState ?? { condition: 'Unknown', owner: 'Unknown', holder: 'Unknown', currentLocation: 'Unknown', previousLocation: 'Unknown', damage: 'Unknown', transformation: 'Unknown', visibility: 'Unknown' })])),
    environmentState: sequence.endingState.environmentState, endingState: structuredClone(sequence.endingState), lastFrameKey: plan.lastFrameKey,
    openingExpectationForNextSequence: `Match approved ${sequence.id} revision V${String(plan.revision).padStart(2, '0')}: ${sequence.closingState}. Preserve the checkpoint asset, environment, direction, time, sound, and object states exactly.`,
    entryExitState: structuredClone(plan.entryExit),
  };
  project.production.checkpoints.push(checkpoint);
  plan.checkpointIds.push(checkpoint.id);
  for (const characterId of sequence.assetManifest.characters) {
    const state = project.production.characterStates[characterId];
    if (!state) continue;
    state.entranceHistory.push({ sequenceNumber: sequence.number, state: plan.entryExit.entry });
    state.exitHistory.push({ sequenceNumber: sequence.number, state: plan.entryExit.exit });
    state.currentPosition = sequence.endingState.characterPositions[characterId] ?? sequence.sceneState.locationId;
    state.screenDirection = sequence.endingState.characterDirections[characterId] ?? sequence.endingState.screenDirection;
    state.currentEmotion = sequence.endingState.characterConditions[characterId] ?? sequence.closingState;
    state.currentMotivation = plan.scenario.activeStoryObjective;
    state.emotionalProgression.push({ sequenceNumber: sequence.number, emotion: state.currentEmotion, cause: sequence.closingState });
    state.motivationProgression.push({ sequenceNumber: sequence.number, motivation: state.currentMotivation, cause: plan.scenario.storyDevelopment });
  }
  for (const thread of project.production.storyThreads) {
    if (thread.payoffSequence !== null && sequence.number >= thread.payoffSequence) thread.status = 'Paid off';
    else if (sequence.number >= thread.introducedSequence) thread.status = 'Advanced';
  }
  const following = project.sequences.find((item) => item.number === sequence.number + 1);
  if (following) {
    const followingPlan = project.production.sequencePlans[following.id];
    followingPlan.expectedOpeningFrame = checkpoint.openingExpectationForNextSequence;
    followingPlan.referencePackage.previousEndingFrameKey = checkpoint.lastFrameKey;
    followingPlan.referencePackage.continuityInstruction = checkpoint.openingExpectationForNextSequence;
    followingPlan.referencePackage.freshness = checkpoint.lastFrameKey ? 'Ready' : 'Missing Reference';
  }
  project.production.storyLock = { status: 'Locked', lockedAt: project.production.storyLock.lockedAt ?? at, reason: 'An approved sequence now depends on the locked story baseline.' };
  const job = project.production.renderQueue.findLast((item) => item.sequenceNumber === sequence.number && Boolean(item.resultMediaKey));
  const provenance = project.production.control.resultProvenance.findLast((item) => item.sequenceNumber === sequence.number && item.resultMediaKey === job?.resultMediaKey);
  if (job?.resultMediaKey && provenance) {
    project.production.control.finalSourceMap = [
      ...project.production.control.finalSourceMap.filter((item) => item.sequenceNumber !== sequence.number),
      { sequenceNumber: sequence.number, sequenceVersion: sequence.version, resultMediaKey: job.resultMediaKey, provenanceId: provenance.id, approvedAt: at },
    ].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    job.status = 'Approved';
  }
  refreshProductionSystem(project);
  return checkpoint;
}

export function runFinalAssemblyCheck(project: StudioProject) {
  project.production ??= initializeProductionSystem(project);
  project.production.finalAssembly.missingSequenceNumbers = project.sequences.filter((sequence) => sequence.status !== 'Approved').map((sequence) => sequence.number);
  project.production.finalAssembly.status = project.production.finalAssembly.missingSequenceNumbers.length ? 'Blocked' : 'Ready';
  project.production.finalQuality = qualityReport(project, project.production.finalQuality);
  refreshProductionSystem(project);
  return { assembly: project.production.finalAssembly, quality: project.production.finalQuality };
}
