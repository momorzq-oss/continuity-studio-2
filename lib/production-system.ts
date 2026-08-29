import type { StudioAsset, StudioProject, StudioSequence } from './studio';

export type FreshnessStatus = 'Current' | 'Needs Review' | 'Outdated' | 'Missing Reference' | 'Ready';
export type ProductionReadiness =
  | 'Story Ready'
  | 'Assets Incomplete'
  | 'Assets Ready'
  | 'Sequences Ready'
  | 'Production In Progress'
  | 'Final Review'
  | 'Completed';
export type RenderStatus = 'Waiting' | 'Preparing' | 'Generating' | 'Completed' | 'Failed' | 'Needs Review' | 'Approved';
export type DialogueGenerationPath = 'Direct in video model' | 'Generate afterward' | 'Lip-synced audio' | 'Voice first' | 'Silent';

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

export interface DialogueLine {
  id: string;
  speakerAssetId: string;
  speakerAssetNumber: number;
  exactDialogue: string;
  language: string;
  accent: string;
  emotion: string;
  startSecond: number;
  endSecond: number;
  physicalAction: string;
}

export interface VoiceIdentity {
  characterAssetId: string;
  characterAssetNumber: number;
  identityLabel: string;
  language: string;
  accent: string;
  vocalAge: string;
  timbre: string;
  pace: string;
  emotionalRange: string;
  referenceAttachmentIds: string[];
  approvalStatus: 'Pending' | 'Approved' | 'Locked';
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
  previousEndingFrameKey: string | null;
  prompt: string;
  dialogue: DialogueLine[];
  audioReferenceIds: string[];
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
  dialogue: DialogueLine[];
  dialoguePath: DialogueGenerationPath;
  shotAudioInstruction: string;
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
  assetNumbers: number[];
  continuityState: string;
  failureMessage: string | null;
  retryHistory: Array<{ attempt: number; at: string; reason: string }>;
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
  audioSupport: 'Unknown' | 'Supported' | 'Unsupported';
  promptCharacterLimit: number | null;
  imageToVideo: 'Unknown' | 'Supported' | 'Unsupported';
  limitationPolicy: string;
}

export interface FinalAssemblyPlan {
  id: string;
  version: number;
  status: 'Blocked' | 'Ready' | 'In Progress' | 'Needs Review' | 'Approved';
  orderedSequenceNumbers: number[];
  transitionPlan: string[];
  audioPlan: string[];
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
  schemaVersion: 1;
  pipelineStages: string[];
  currentPipelineStage: string;
  readiness: ProductionReadiness;
  nextLogicalAction: string;
  storyLock: { status: 'Unlocked' | 'Locked' | 'Needs Review'; lockedAt: string | null; reason: string };
  dependencies: DependencyImpact[];
  sequencePlans: Record<string, SequenceProductionPlan>;
  voiceIdentities: Record<string, VoiceIdentity>;
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
  '1. The latest approved continuity checkpoint and previous approved ending frame have highest authority.',
  '2. Approved permanently numbered asset references override descriptive prompt wording.',
  '3. Approved World Bible and Film Bible rules override sequence improvisation.',
  '4. The current sequence plan and exact dialogue govern performance inside those higher rules.',
  '5. Provider defaults have lowest authority and may never override approved production state.',
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
  if (previous?.length) return previous;
  return [
    {
      id: 'video-adapter-unconfigured', provider: project.settings.videoProvider, model: 'Provider model not selected', connectionStatus: 'Not connected' as const,
      maximumDurationSeconds: null, supportedDurations: [], supportedResolutions: [], referenceImageSupport: 'Unknown' as const,
      maximumReferenceImages: null, audioSupport: 'Unknown' as const, promptCharacterLimit: null, imageToVideo: 'Unknown' as const,
      limitationPolicy: 'Capability values must be loaded from the connected provider adapter before execution. Unknown limits block automatic submission but never discard the prepared job.',
    },
    {
      id: 'image-adapter-unconfigured', provider: project.settings.imageProvider, model: 'Provider model not selected', connectionStatus: 'Not connected' as const,
      maximumDurationSeconds: null, supportedDurations: [], supportedResolutions: [], referenceImageSupport: 'Unknown' as const,
      maximumReferenceImages: null, audioSupport: 'Unknown' as const, promptCharacterLimit: null, imageToVideo: 'Unknown' as const,
      limitationPolicy: 'The asset generation adapter must publish its reference, resolution, prompt, cost, and output limits before automatic execution.',
    },
  ];
}

function detectConflicts(project: StudioProject, sequence: StudioSequence, dialogue: DialogueLine[], profile: ModelCapabilityProfile): PromptConflict[] {
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
  }
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

function referencePackage(project: StudioProject, sequence: StudioSequence, dialogue: DialogueLine[], previous?: ProductionSystem): SequenceReferencePackage {
  const checkpoint = latestCheckpoint(previous, sequence.number - 1);
  const audioReferenceIds = dialogue.flatMap((line) => previous?.voiceIdentities[line.speakerAssetId]?.referenceAttachmentIds ?? []);
  const negativeConstraints = [...NEGATIVE_CONTINUITY_RULES, ...project.filmBible.negativeRules];
  return {
    packageId: `${sequence.id}:reference-package:v${sequence.version}`,
    sequenceNumber: sequence.number,
    assetNumbers: [...sequence.assetNumbers],
    assetFiles: [...sequence.assetFiles],
    previousApprovedSequence: sequence.number > 1 ? `SEQUENCE_${formatNumber(sequence.number - 1)}` : null,
    previousEndingFrameKey: checkpoint?.lastFrameKey ?? null,
    prompt: sequence.prompt,
    dialogue,
    audioReferenceIds: Array.from(new Set(audioReferenceIds)),
    continuityInstruction: checkpoint?.openingExpectationForNextSequence ?? sequence.continuitySource,
    negativeConstraints,
    priorityRules: REFERENCE_PRIORITY_RULES,
    uploadInstruction: `Attach exactly ${sequence.assetFiles.map((file, index) => `Asset ${formatNumber(sequence.assetNumbers[index])} (${file})`).join(', ')}${checkpoint?.lastFrameKey ? ` and previous approved ending frame ${checkpoint.lastFrameKey}` : ''}. Do not attach or introduce any unlisted recurring production reference.`,
    freshness: sequence.number === 1 || !!checkpoint?.lastFrameKey ? 'Ready' : 'Missing Reference',
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
  if (project.filmBible.status !== 'Approved') return { status: 'Story Ready', action: 'Approve the Film Bible to lock visual, audio, and continuity rules.', stage: 'FILM BIBLE' };
  const unreadyAssets = project.assets.filter((asset) => asset.lockState !== 'Locked');
  if (unreadyAssets.length) return { status: 'Assets Incomplete', action: `Review ${unreadyAssets.length} remaining production asset${unreadyAssets.length === 1 ? '' : 's'}; start with Asset ${formatNumber(unreadyAssets[0].projectNumber)}.`, stage: 'ASSET APPROVAL' };
  if (system.dependencies.some((item) => ['Needs Review', 'Outdated', 'Missing Reference'].includes(item.freshness))) return { status: 'Assets Ready', action: 'Resolve dependency impacts before preparing the next reference package.', stage: 'CONTINUITY STATE' };
  const current = project.sequences.find((sequence) => sequence.number === project.currentSequence) ?? project.sequences[0];
  const currentJob = system.renderQueue.findLast((job) => job.sequenceNumber === current?.number);
  if (system.finalAssembly.status === 'Approved' && system.finalQuality.status === 'Passed') return { status: 'Completed', action: 'Export the complete portable archive and the separate flat numbered asset folder.', stage: 'EXPORT' };
  if (project.sequences.every((sequence) => sequence.status === 'Approved')) return { status: 'Final Review', action: 'Build the ordered final assembly and run the final quality check.', stage: 'FINAL ASSEMBLY' };
  if (currentJob && ['Waiting', 'Preparing', 'Generating', 'Completed', 'Failed', 'Needs Review'].includes(currentJob.status)) {
    const action = currentJob.status === 'Failed' ? `Retry ${currentJob.id}; its exact prompt, references, and continuity state are preserved.`
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
  const sequencePlans: Record<string, SequenceProductionPlan> = {};
  for (const sequence of project.sequences) {
    const old = previous?.sequencePlans?.[sequence.id];
    const dialogue = old?.dialogue ?? [];
    const pkg = referencePackage(project, sequence, dialogue, previous);
    const conflicts = detectConflicts(project, sequence, dialogue, profile);
    const blocking = conflicts.some((conflict) => conflict.severity === 'Blocking' && conflict.status === 'Open');
    const referenceReady = pkg.freshness === 'Ready' || sequence.number === 1;
    sequencePlans[sequence.id] = {
      sequenceId: sequence.id, sequenceNumber: sequence.number, timing: timingPlan(sequence), shots: shotPlan(project, sequence), dialogue,
      dialoguePath: old?.dialoguePath ?? 'Silent',
      shotAudioInstruction: old?.shotAudioInstruction ?? 'Use production ambience and purposeful silence. Generate no spoken words until exact dialogue and voice ownership are authored.',
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
    };
  }
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
    transitionPlan: project.sequences.slice(1).map((sequence) => `Match the approved last frame and audio tail into Sequence ${sequence.number}.`),
    audioPlan: ['Normalize dialogue intelligibility without changing voice identity.', 'Bridge approved ambience; preserve intentional silence and authored transitions.'],
    colorPlan: ['Match exposure, white balance, palette, and time-of-day across every approved boundary.'],
    stabilizationPlan: ['Apply stabilization only where it does not alter approved framing, scale, or motion intention.'], creditsPlan: 'Append approved project credits after the final story frame.',
    missingSequenceNumbers: project.sequences.filter((sequence) => sequence.status !== 'Approved').map((sequence) => sequence.number), createdAt: project.updatedAt,
  };
  finalAssembly.missingSequenceNumbers = project.sequences.filter((sequence) => sequence.status !== 'Approved').map((sequence) => sequence.number);
  finalAssembly.status = finalAssembly.missingSequenceNumbers.length ? 'Blocked' : finalAssembly.status === 'Approved' ? 'Approved' : 'Ready';
  const system: ProductionSystem = {
    schemaVersion: 1, pipelineStages: [...PIPELINE_STAGES], currentPipelineStage: 'STORY', readiness: 'Story Ready', nextLogicalAction: '',
    storyLock: previous?.storyLock ?? { status: 'Unlocked', lockedAt: null, reason: 'Story remains editable until production begins.' },
    dependencies: dependencyGraph(project, previous), sequencePlans, voiceIdentities: previous?.voiceIdentities ?? {}, assetLineage,
    renderQueue, validations: previous?.validations ?? [], corrections: previous?.corrections ?? [], checkpoints: previous?.checkpoints ?? [],
    modelCapabilities: capabilities, selectedCapabilityProfileId, costLedger, finalAssembly,
    finalQuality: qualityReport(project, previous?.finalQuality),
    autosave: previous?.autosave ?? { enabled: true, lastSavedAt: project.updatedAt, recoverySnapshotCount: 0, lastRecoveryReason: 'Project created' },
  };
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
        correction: `Revalidate only the visual, audio, timing, prompt, and continuity consequences of ${sourceId}; preserve every unaffected approved field.`,
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
  const line: DialogueLine = {
    id: uid('dialogue'), speakerAssetId: speaker.id, speakerAssetNumber: speaker.projectNumber, exactDialogue,
    language: project.dialogueLanguage, accent: 'Character-defined; lock before voice generation', emotion: 'Story-appropriate controlled performance',
    startSecond: Number((sequence.duration * 0.27).toFixed(2)), endSecond: Number((sequence.duration * 0.43).toFixed(2)),
    physicalAction: 'Maintain the authored blocking, eyeline, held objects, and emotional state while speaking.',
  };
  plan.dialogue.push(line);
  plan.dialoguePath = 'Voice first';
  plan.shotAudioInstruction = `Asset ${formatNumber(speaker.projectNumber)} owns the exact line “${exactDialogue}”. Generate the locked voice first, then use lip-synced audio or a model with verified direct-dialogue support.`;
  project.production.voiceIdentities[speaker.id] ??= {
    characterAssetId: speaker.id, characterAssetNumber: speaker.projectNumber, identityLabel: `${speaker.name} voice identity`,
    language: project.dialogueLanguage, accent: 'Pending approval', vocalAge: 'Match approved character identity', timbre: 'Pending locked voice reference',
    pace: 'Performance-defined', emotionalRange: 'Controlled by sequence dialogue metadata', referenceAttachmentIds: [], approvalStatus: 'Pending',
  };
  return refreshProductionSystem(project);
}

export function queueSequenceGeneration(project: StudioProject, sequence: StudioSequence) {
  project.production ??= initializeProductionSystem(project);
  const plan = project.production.sequencePlans[sequence.id];
  const profile = project.production.modelCapabilities.find((item) => item.id === project.production.selectedCapabilityProfileId)!;
  const existing = project.production.renderQueue.findLast((item) => item.sequenceNumber === sequence.number && !['Failed', 'Approved'].includes(item.status));
  if (existing) return existing;
  const at = nowIso();
  const blocking = plan.conflicts.some((conflict) => conflict.severity === 'Blocking' && conflict.status === 'Open') || ['Outdated', 'Needs Review', 'Missing Reference'].includes(plan.freshness);
  const job: RenderQueueItem = {
    id: uid('render'), targetId: sequence.id, sequenceNumber: sequence.number,
    status: blocking || profile.connectionStatus !== 'Connected' ? 'Waiting' : 'Preparing', provider: profile.provider, model: profile.model,
    durationSeconds: sequence.duration, resolution: project.resolution, generationCount: 1, estimatedCredits: 1,
    estimatedCostUsd: null, actualCostUsd: null, prompt: sequence.prompt, referencePackageId: plan.referencePackage.packageId,
    assetNumbers: [...sequence.assetNumbers], continuityState: plan.referencePackage.continuityInstruction,
    failureMessage: blocking ? 'Blocked by unresolved prompt or dependency conflicts.' : profile.connectionStatus !== 'Connected' ? 'Video provider capability profile is not connected.' : null,
    retryHistory: [], createdAt: at, updatedAt: at,
  };
  project.production.renderQueue.push(job);
  project.production.storyLock = { status: 'Locked', lockedAt: project.production.storyLock.lockedAt ?? at, reason: 'Production started; story changes now create dependency impacts instead of overwriting approved work.' };
  sequence.status = job.status === 'Preparing' ? 'Generating' : 'Ready';
  refreshProductionSystem(project);
  return job;
}

export function retryRenderJob(project: StudioProject, job: RenderQueueItem) {
  const at = nowIso();
  job.retryHistory.push({ attempt: job.generationCount, at, reason: job.failureMessage ?? 'Targeted retry requested' });
  job.generationCount += 1;
  job.estimatedCredits += 1;
  job.status = 'Waiting';
  job.failureMessage = 'Exact prompt, numbered reference package, and continuity state preserved; waiting for a compatible connected provider.';
  job.updatedAt = at;
  refreshProductionSystem(project);
  return job;
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
    { id: uid('check'), name: 'Dialogue, voice, and lip synchronization', status: plan.dialoguePath === 'Silent' ? 'Passed' : mediaAvailable ? 'Needs Review' : 'Failed', expected: plan.dialogue.length ? `${plan.dialogue.length} exact authored line(s), owned by numbered speakers` : 'Silent sequence', actual: plan.dialoguePath === 'Silent' ? 'No dialogue requested' : mediaAvailable ? 'Awaiting audio/video validation' : 'No media available', correction: 'Regenerate or replace only the audio/lip-sync path while preserving approved picture when possible.' },
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
  const following = project.sequences.find((item) => item.number === sequence.number + 1);
  if (following) {
    const followingPlan = project.production.sequencePlans[following.id];
    followingPlan.expectedOpeningFrame = checkpoint.openingExpectationForNextSequence;
    followingPlan.referencePackage.previousEndingFrameKey = checkpoint.lastFrameKey;
    followingPlan.referencePackage.continuityInstruction = checkpoint.openingExpectationForNextSequence;
    followingPlan.referencePackage.freshness = checkpoint.lastFrameKey ? 'Ready' : 'Missing Reference';
  }
  project.production.storyLock = { status: 'Locked', lockedAt: project.production.storyLock.lockedAt ?? at, reason: 'An approved sequence now depends on the locked story baseline.' };
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
