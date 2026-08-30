import type { StudioAsset, StudioProject, StudioSequence } from './studio';
import type { DialogueLine, ModelCapabilityProfile, SequenceProductionPlan } from './production-system';

export const CURRENT_DATA_SCHEMA_VERSION = 4 as const;
export const SUPPORTED_DATA_SCHEMA_VERSIONS = [1, 2, 3, 4] as const;

export type IntegrityStatus = 'Passed' | 'Needs Review' | 'Failed';
export type ProjectLifecycleState =
  | 'Story Draft'
  | 'Story Approved'
  | 'Assets Pending'
  | 'Assets Approved'
  | 'Sequences Ready'
  | 'Production Started'
  | 'Final Review'
  | 'Completed';

export interface ProjectStateTransition {
  from: ProjectLifecycleState;
  to: ProjectLifecycleState;
  at: string;
  reason: string;
}

export interface ProjectStateMachine {
  current: ProjectLifecycleState;
  allowedNext: ProjectLifecycleState[];
  legalActions: string[];
  blockers: string[];
  history: ProjectStateTransition[];
  evaluatedAt: string;
}

export interface DecisionPin {
  id: string;
  targetType: 'character-identity' | 'costume' | 'location' | 'dialogue' | 'camera-rule' | 'asset-version' | 'sequence-version';
  targetId: string;
  field: string;
  valueJson: string;
  status: 'Active' | 'Released';
  approvedByUser: true;
  createdAt: string;
  releasedAt: string | null;
}

export interface AssetRetirementRecord {
  assetId: string;
  assetNumber: number;
  status: 'Active' | 'Retired';
  retiredAt: string | null;
  reason: string;
  linkedSequenceNumbers: number[];
}

export interface OrphanAssetFinding {
  assetId: string;
  assetNumber: number;
  name: string;
  category: string;
  status: 'Orphaned' | 'Connected' | 'Retired';
  reason: string;
  detectedAt: string;
}

export interface ModelVersionPin {
  targetType: 'asset-generation' | 'sequence-generation';
  targetId: string;
  provider: string;
  model: string;
  modelVersion: string;
  capabilityRevision: string;
  approved: boolean;
  pinnedAt: string;
}

export interface GenerationQueuePolicy {
  maxConcurrentByProvider: number;
  activeByProvider: Record<string, number>;
  waitingJobIds: string[];
  idempotencyKeys: Record<string, string>;
  timeoutPolicy: string;
  duplicateSubmissionPolicy: string;
}

export interface StorageManagementSnapshot {
  originalBytes: number;
  previewBytes: number;
  generatedBytes: number;
  totalBytes: number;
  protectedReferenceIds: string[];
  cleanupCandidateIds: string[];
  lastCalculatedAt: string;
  cleanupPolicy: string;
}

export interface ProductionWarning {
  id: string;
  severity: 'Blocker' | 'Recommendation';
  scope: string;
  message: string;
  userCanContinue: boolean;
}

export interface RelationshipConfidence {
  id: string;
  subjectId: string;
  relationship: string;
  confidence: number;
  source: 'Approved' | 'Explicit user instruction' | 'Filename inference' | 'Content inference' | 'System rule';
  editable: true;
  locked: boolean;
  reviewRequired: boolean;
}

export interface InferredDecision {
  id: string;
  field: string;
  value: string;
  rationale: string;
  editable: true;
  permanentLock: false;
  createdAt: string;
}

export interface ComparisonRecord {
  targetType: 'asset' | 'sequence';
  targetId: string;
  versions: Array<{ version: number; status: string; mediaKey: string | null; provider: string; model: string; createdAt: string }>;
  approvedVersion: number | null;
}

export interface RepairReport {
  id: string;
  createdAt: string;
  repaired: string[];
  requiresUserInput: string[];
  status: 'Repaired' | 'Needs User Input' | 'No Changes Needed';
}

export interface ArchiveVerificationRecord {
  id: string;
  kind: 'full-project' | 'flat-assets';
  expectedFileCount: number;
  verifiedFileCount: number;
  status: 'Passed' | 'Failed';
  manifestHash: string;
  verifiedAt: string;
}

export interface ReservedProductionNumber {
  kind: 'asset' | 'sequence';
  number: number;
  stableId: string;
  status: 'active' | 'retired' | 'deleted' | 'superseded';
  reservedAt: string;
}

export interface ExplicitSequenceDependency {
  id: string;
  sequenceNumber: number;
  dependsOnType: 'sequence' | 'asset-version' | 'transformation' | 'injury' | 'prop-state' | 'story-event';
  dependsOnId: string;
  requiredVersion: number | null;
  description: string;
  status: 'current' | 'needs-review' | 'missing';
}

export interface ReferenceBindingFinding {
  id: string;
  sequenceNumber: number;
  severity: 'Blocking' | 'Review';
  subject: string;
  message: string;
  confidence: number;
  inferred: boolean;
}

export interface DialogueTimingAudit {
  sequenceNumber: number;
  totalWindowSeconds: number;
  occupiedSeconds: number;
  fits: boolean;
  overlaps: string[];
  untimedDialogueIds: string[];
  message: string;
}

export interface ProviderTranslation {
  sequenceNumber: number;
  provider: string;
  model: string;
  capabilityRevision: string;
  structuredStateHash: string;
  translatedPrompt: string;
  testedAt: string;
  status: 'Ready' | 'Needs Review';
}

export interface ProductionFreezeSnapshot {
  id: string;
  createdAt: string;
  reason: string;
  storyVersion: number;
  worldBibleVersion: number;
  filmBibleVersion: number;
  assetVersions: Record<string, number>;
  sequenceVersions: Record<string, number>;
  dialogueIds: string[];
  rules: string[];
  immutable: true;
}

export interface ResultProvenance {
  id: string;
  sequenceNumber: number;
  sequenceVersion: number;
  assetVersions: Array<{ assetId: string; assetNumber: number; version: number; fileName: string }>;
  scenarioVersion: number;
  dialogueIds: string[];
  prompt: string;
  provider: string;
  model: string;
  modelVersion: string;
  capabilityRevision: string;
  settings: { durationSeconds: number; resolution: string; referencePackageId: string };
  generationSnapshotId: string;
  resultMediaKey: string;
  createdAt: string;
}

export interface FinalSequenceSource {
  sequenceNumber: number;
  sequenceVersion: number;
  resultMediaKey: string;
  provenanceId: string;
  approvedAt: string;
}

export interface ChangeLogEntry {
  id: string;
  revision: number;
  scope: string;
  summary: string;
  createdAt: string;
}

export interface ProjectImportRecord {
  id: string;
  kind: 'archive' | 'screenplay' | 'story' | 'sequence-plan' | 'asset-folder' | 'previous-project';
  sourceName: string;
  importedAt: string;
  summary: string;
  sourceSchemaVersion?: number;
  mappingApproved?: boolean;
}

export interface PendingReferenceReplacement {
  id: string;
  assetId: string;
  assetNumber: number;
  requestedAttachmentId: string;
  affectedSequenceNumbers: number[];
  affectedAssetIds: string[];
  affectedPromptIds: string[];
  affectedCheckpointIds: string[];
  createdAt: string;
}

export interface ProjectIntegrityAudit {
  id: string;
  createdAt: string;
  status: IntegrityStatus;
  checks: Array<{ id: string; status: IntegrityStatus; label: string; detail: string }>;
  missing: string[];
}

export interface ProductionControlSystem {
  dataSchema: {
    currentVersion: typeof CURRENT_DATA_SCHEMA_VERSION;
    createdWithVersion: number;
    migratedFromVersions: number[];
    supportedVersions: number[];
    lastMigratedAt: string | null;
  };
  stateMachine: ProjectStateMachine;
  decisionPins: DecisionPin[];
  assetLifecycle: Record<string, AssetRetirementRecord>;
  orphanAssets: OrphanAssetFinding[];
  modelVersionPins: ModelVersionPin[];
  generationQueuePolicy: GenerationQueuePolicy;
  storage: StorageManagementSnapshot;
  warnings: ProductionWarning[];
  relationshipConfidence: RelationshipConfidence[];
  inferredDecisions: InferredDecision[];
  comparisons: { assets: ComparisonRecord[]; sequences: ComparisonRecord[] };
  repairReports: RepairReport[];
  archiveVerifications: ArchiveVerificationRecord[];
  authorityPolicy: {
    sourceOfTruth: 'database-structured-state';
    rule: string;
    promptCompilationRule: string;
  };
  exportIdentity: { projectId: string; collisionSafeSlug: string };
  reservedNumbers: ReservedProductionNumber[];
  sequenceDependencies: ExplicitSequenceDependency[];
  referenceBindingFindings: ReferenceBindingFinding[];
  dialogueTimingAudits: Record<string, DialogueTimingAudit>;
  providerTranslations: Record<string, ProviderTranslation>;
  freezeSnapshots: ProductionFreezeSnapshot[];
  resultProvenance: ResultProvenance[];
  finalSourceMap: FinalSequenceSource[];
  changeLog: ChangeLogEntry[];
  importHistory: ProjectImportRecord[];
  pendingReferenceReplacement: PendingReferenceReplacement | null;
  integrityAudit: ProjectIntegrityAudit;
  languageLocks: { projectLanguage: string; projectDialect: string; lockedAt: string | null };
  contextPolicy: {
    mode: 'relevant-only';
    rule: string;
    lastLoadedSections: string[];
    lastLoadedAt: string | null;
  };
}

const PROJECT_STATE_ORDER: ProjectLifecycleState[] = [
  'Story Draft', 'Story Approved', 'Assets Pending', 'Assets Approved',
  'Sequences Ready', 'Production Started', 'Final Review', 'Completed',
];

const PROJECT_STATE_ACTIONS: Record<ProjectLifecycleState, string[]> = {
  'Story Draft': ['Edit story', 'Approve story'],
  'Story Approved': ['Approve World Bible', 'Approve Film Bible'],
  'Assets Pending': ['Upload references', 'Approve or retire assets'],
  'Assets Approved': ['Review sequence plan', 'Resolve blockers'],
  'Sequences Ready': ['Prepare generation', 'Prepare external Seedance package'],
  'Production Started': ['Validate generation results', 'Approve sequences'],
  'Final Review': ['Verify final assembly', 'Approve final assembly'],
  Completed: ['Export verified project archive', 'Export flat asset folder'],
};

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeName(value: string) {
  const synonyms: Record<string, string> = {
    automobile: 'car', auto: 'car', sedan: 'car', canine: 'dog', puppy: 'dog', feline: 'cat',
    handgun: 'pistol', revolver: 'pistol', dwelling: 'house', residence: 'house', apartment: 'interior',
    hero: 'protagonist', heroine: 'protagonist', villain: 'antagonist', wardrobe: 'costume', outfit: 'costume',
  };
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean).map((token) => synonyms[token] ?? token);
}

export function findDuplicateAsset(project: StudioProject, candidateName: string, description = '') {
  const candidate = new Set(normalizeName(`${candidateName} ${description}`));
  let best: { asset: StudioAsset; score: number } | null = null;
  for (const asset of project.assets) {
    const existing = new Set(normalizeName(`${asset.name} ${asset.description} ${asset.permanentIdentity}`));
    const intersection = [...candidate].filter((token) => existing.has(token)).length;
    const union = new Set([...candidate, ...existing]).size || 1;
    const exactName = normalizeName(candidateName).join(' ') === normalizeName(asset.name).join(' ');
    const score = exactName ? 1 : intersection / union;
    if (!best || score > best.score) best = { asset, score };
  }
  return best && best.score >= 0.52 ? best : null;
}

export function auditDialogueTiming(sequence: StudioSequence, dialogue: DialogueLine[]): DialogueTimingAudit {
  const sorted = [...dialogue].sort((a, b) => a.startSecond - b.startSecond);
  const overlaps: string[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].startSecond < sorted[index - 1].endSecond && !sorted[index].overlapWithDialogueId) {
      overlaps.push(`${sorted[index - 1].dialogueId}/${sorted[index].dialogueId}`);
    }
  }
  const untimedDialogueIds = sorted.filter((line) => line.durationSeconds <= 0 || line.endSecond <= line.startSecond).map((line) => line.dialogueId);
  const occupiedSeconds = Number(sorted.reduce((sum, line) => sum + Math.max(0, line.durationSeconds + line.pauseBeforeSeconds + line.pauseAfterSeconds), 0).toFixed(2));
  const fits = occupiedSeconds <= sequence.duration && overlaps.length === 0 && untimedDialogueIds.length === 0 && sorted.every((line) => line.endSecond <= sequence.duration);
  return {
    sequenceNumber: sequence.number,
    totalWindowSeconds: sequence.duration,
    occupiedSeconds,
    fits,
    overlaps,
    untimedDialogueIds,
    message: fits ? `All ${dialogue.length} dialogue turn(s) fit inside ${sequence.duration}s.` : `Dialogue timing needs revision: ${occupiedSeconds}s occupied in a ${sequence.duration}s sequence.`,
  };
}

export function auditReferenceBindings(project: StudioProject, sequence: StudioSequence, plan: SequenceProductionPlan) {
  const findings: ReferenceBindingFinding[] = [];
  const includedIds = new Set(plan.referencePackage.rankedReferences.filter((reference) => reference.included).map((reference) => reference.assetId).filter(Boolean));
  for (const line of plan.dialogue) {
    const speaker = project.assets.find((asset) => asset.id === line.speakerAssetId);
    if (!speaker || speaker.category !== 'Characters') findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Blocking', subject: line.dialogueId, message: `Speaker Asset ${String(line.speakerAssetNumber).padStart(3, '0')} is missing or is not a character identity.`, confidence: 1, inferred: false });
    else if (!includedIds.has(speaker.id)) findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Blocking', subject: line.dialogueId, message: `Speaker Asset ${String(speaker.projectNumber).padStart(3, '0')} is not included in the upload package.`, confidence: 1, inferred: false });
  }
  for (const action of plan.scenario.actions) {
    if (!action.actorAssetId || !project.assets.some((asset) => asset.id === action.actorAssetId)) findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Blocking', subject: action.id, message: 'Action actor is not bound to a permanent numbered asset.', confidence: 1, inferred: false });
    if (action.hand === 'Unspecified' && action.targetAssetId) findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Review', subject: action.id, message: 'Object action needs an explicit left, right, both, or not-applicable hand binding.', confidence: 0.55, inferred: true });
  }
  for (const assetId of sequence.assetIds) {
    const asset = project.assets.find((item) => item.id === assetId);
    if (!asset) findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Blocking', subject: assetId, message: 'Sequence manifest contains a missing asset.', confidence: 1, inferred: false });
    else if (!includedIds.has(assetId) && ['Story critical', 'Recurring', 'Location anchor'].includes(asset.importance)) findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Blocking', subject: asset.generatedFileName, message: `Required ${asset.category} reference Asset ${String(asset.projectNumber).padStart(3, '0')} is excluded.`, confidence: 1, inferred: false });
  }
  return findings;
}

export function buildExplicitDependencies(project: StudioProject): ExplicitSequenceDependency[] {
  const dependencies: ExplicitSequenceDependency[] = [];
  const add = (sequence: StudioSequence, type: ExplicitSequenceDependency['dependsOnType'], id: string, version: number | null, description: string, status: ExplicitSequenceDependency['status'] = 'current') => {
    dependencies.push({ id: `${sequence.id}:${type}:${id}`, sequenceNumber: sequence.number, dependsOnType: type, dependsOnId: id, requiredVersion: version, description, status });
  };
  for (const sequence of project.sequences) {
    if (sequence.number > 1) {
      const previous = project.sequences.find((item) => item.number === sequence.number - 1);
      add(sequence, 'sequence', previous?.id ?? `SEQUENCE_${String(sequence.number - 1).padStart(3, '0')}`, previous?.version ?? null, 'Opening state depends on the previous approved ending.', previous ? 'current' : 'missing');
    }
    for (const assetId of sequence.assetIds) {
      const asset = project.assets.find((item) => item.id === assetId);
      add(sequence, 'asset-version', assetId, asset?.version ?? null, asset ? `Uses Asset ${String(asset.projectNumber).padStart(3, '0')} version ${asset.version}.` : 'Referenced asset is missing.', asset ? 'current' : 'missing');
      if (!asset) continue;
      if (asset.currentState.transformation && asset.currentState.transformation !== 'None') add(sequence, 'transformation', asset.id, asset.version, asset.currentState.transformation);
      if (asset.currentState.damage && asset.currentState.damage !== 'None') add(sequence, 'injury', asset.id, asset.version, asset.currentState.damage);
      if (['Props', 'Weapons', 'Vehicles', 'Mechanical'].includes(asset.category)) add(sequence, 'prop-state', asset.id, asset.version, `${asset.currentState.condition}; ${asset.currentState.holder}; ${asset.currentState.currentLocation}`);
    }
    add(sequence, 'story-event', `${sequence.id}:purpose`, project.story.version, sequence.purpose);
  }
  return dependencies;
}

export function translateProviderPrompt(sequence: StudioSequence, plan: SequenceProductionPlan, profile: ModelCapabilityProfile): ProviderTranslation {
  const header = profile.provider.toLowerCase().includes('seedance')
    ? `[SEEDANCE ${profile.model} | ${sequence.duration}s | ${profile.maximumReferenceImages ?? 'unknown'} reference limit]`
    : `[PROVIDER-NEUTRAL VIDEO PACKAGE | ${profile.provider} ${profile.model}]`;
  const upload = plan.referencePackage.rankedReferences.filter((reference) => reference.included).sort((a, b) => a.uploadOrder - b.uploadOrder).map((reference) => `${reference.uploadOrder}. ${reference.fileName}`).join('\n');
  const translatedPrompt = `${header}\n[UPLOAD IN THIS EXACT ORDER]\n${upload || 'No visual references selected'}\n${plan.compiledPrompt}`;
  return {
    sequenceNumber: sequence.number,
    provider: profile.provider,
    model: profile.model,
    capabilityRevision: profile.capabilityRevision,
    structuredStateHash: hashText(JSON.stringify({ scenario: plan.scenario, dialogue: plan.dialogue, references: plan.referencePackage.rankedReferences })),
    translatedPrompt,
    testedAt: nowIso(),
    status: profile.maximumReferenceImages === null ? 'Needs Review' : 'Ready',
  };
}

export function createFreezeSnapshot(project: StudioProject, reason: string): ProductionFreezeSnapshot {
  return {
    id: uid('production_freeze'), createdAt: nowIso(), reason,
    storyVersion: project.story.version, worldBibleVersion: project.worldBible.version, filmBibleVersion: project.filmBible.version,
    assetVersions: Object.fromEntries(project.assets.map((asset) => [asset.id, asset.version])),
    sequenceVersions: Object.fromEntries(project.sequences.map((sequence) => [sequence.id, sequence.version])),
    dialogueIds: Object.values(project.production.sequencePlans).flatMap((plan) => plan.dialogue.map((line) => line.dialogueId)),
    rules: [...project.filmBible.worldRules, ...project.filmBible.characterRules, ...project.filmBible.visualRules, ...project.filmBible.continuityRules, ...project.filmBible.negativeRules],
    immutable: true,
  };
}

function deriveLifecycleState(project: StudioProject): ProjectLifecycleState {
  // Approved prerequisites remain authoritative even after render history exists.
  // If an upstream story or Bible revision invalidates them, the workflow must
  // return to the corresponding approval state so the user can legally recover.
  if (project.story.status !== 'Approved') return 'Story Draft';
  if (project.worldBible.status !== 'Approved' || project.filmBible.status !== 'Approved') return 'Story Approved';
  if (project.production?.finalAssembly?.status === 'Approved' && project.production?.finalQuality?.status === 'Passed') return 'Completed';
  if (project.sequences.length > 0 && project.sequences.every((sequence) => sequence.status === 'Approved')) return 'Final Review';
  if ((project.production?.renderQueue?.length ?? 0) > 0 || project.sequences.some((sequence) => ['Generating', 'Generated', 'Passed', 'Approved'].includes(sequence.status))) return 'Production Started';
  const activeAssets = project.assets.filter((asset) => asset.lifecycleStatus !== 'Retired');
  const assetsApproved = activeAssets.length > 0 && activeAssets.every((asset) => ['Approved', 'Locked'].includes(asset.approvalState));
  if (assetsApproved) {
    const plans = Object.values(project.production?.sequencePlans ?? {});
    return plans.length === project.sequences.length && plans.every((plan) => plan.readinessChecklist.readyForGeneration) ? 'Sequences Ready' : 'Assets Approved';
  }
  return 'Assets Pending';
}

function lifecycleBlockers(project: StudioProject, state: ProjectLifecycleState) {
  if (state === 'Story Draft') return project.story.status === 'Approved' ? [] : ['Story approval is required before later production stages.'];
  if (state === 'Story Approved') return [
    ...(project.worldBible.status === 'Approved' ? [] : ['World Bible approval is required.']),
    ...(project.filmBible.status === 'Approved' ? [] : ['Film Bible approval is required.']),
  ];
  if (state === 'Assets Pending') return project.assets.filter((asset) => asset.lifecycleStatus !== 'Retired' && !['Approved', 'Locked'].includes(asset.approvalState)).map((asset) => `Asset ${String(asset.projectNumber).padStart(3, '0')} needs approval or retirement.`);
  if (state === 'Assets Approved') return Object.values(project.production?.sequencePlans ?? {}).flatMap((plan) => plan.readinessChecklist.blockers.map((blocker) => `Sequence ${plan.sequenceNumber}: ${blocker}`));
  if (state === 'Sequences Ready') return [];
  if (state === 'Production Started') return project.sequences.filter((sequence) => sequence.status !== 'Approved').map((sequence) => `Sequence ${sequence.number} is ${sequence.status}.`);
  if (state === 'Final Review') return project.production.finalQuality.checks.filter((check) => check.status !== 'Passed').map((check) => check.name);
  return [];
}

export function buildProjectStateMachine(project: StudioProject, previous?: ProjectStateMachine): ProjectStateMachine {
  const current = deriveLifecycleState(project);
  const previousCurrent = previous?.current ?? 'Story Draft';
  const previousIndex = PROJECT_STATE_ORDER.indexOf(previousCurrent);
  const currentIndex = PROJECT_STATE_ORDER.indexOf(current);
  const history = [...(previous?.history ?? [])];
  if (current !== previousCurrent) {
    const direction = currentIndex >= previousIndex ? 1 : -1;
    let cursor = previousIndex;
    while (cursor !== currentIndex && cursor >= 0) {
      const nextIndex = cursor + direction;
      history.push({ from: PROJECT_STATE_ORDER[cursor], to: PROJECT_STATE_ORDER[nextIndex], at: nowIso(), reason: direction > 0 ? 'Required approved project state became available.' : 'An approved prerequisite changed and the project returned to the last legal state.' });
      cursor = nextIndex;
    }
  }
  return {
    current,
    allowedNext: currentIndex < PROJECT_STATE_ORDER.length - 1 ? [PROJECT_STATE_ORDER[currentIndex + 1]] : [],
    legalActions: PROJECT_STATE_ACTIONS[current],
    blockers: lifecycleBlockers(project, current),
    history,
    evaluatedAt: nowIso(),
  };
}

export function canPerformProjectAction(project: StudioProject, action: 'approve-world' | 'approve-film' | 'approve-assets' | 'prepare-generation' | 'approve-final') {
  const state = project.production.control.stateMachine.current;
  if (action === 'approve-world') return state === 'Story Approved' && project.story.status === 'Approved';
  if (action === 'approve-film') return state === 'Story Approved' && project.story.status === 'Approved' && project.worldBible.status === 'Approved';
  if (action === 'approve-assets') return state === 'Assets Pending';
  if (action === 'prepare-generation') return state === 'Assets Approved' || state === 'Sequences Ready' || state === 'Production Started';
  return state === 'Final Review';
}

export function createDecisionPin(project: StudioProject, input: Omit<DecisionPin, 'id' | 'status' | 'approvedByUser' | 'createdAt' | 'releasedAt'>) {
  const existing = project.production.control.decisionPins.find((pin) => pin.status === 'Active' && pin.targetType === input.targetType && pin.targetId === input.targetId && pin.field === input.field);
  if (existing) return existing;
  const pin: DecisionPin = { ...input, id: uid('pin'), status: 'Active', approvedByUser: true, createdAt: nowIso(), releasedAt: null };
  project.production.control.decisionPins.push(pin);
  return pin;
}

export function releaseDecisionPin(project: StudioProject, targetType: DecisionPin['targetType'], targetId: string) {
  const pins = project.production.control.decisionPins.filter((pin) => pin.status === 'Active' && pin.targetType === targetType && pin.targetId === targetId);
  for (const pin of pins) { pin.status = 'Released'; pin.releasedAt = nowIso(); }
  return pins;
}

export function activeDecisionPins(project: StudioProject, targetId?: string) {
  return project.production.control.decisionPins.filter((pin) => pin.status === 'Active' && (!targetId || pin.targetId === targetId));
}

export function retireProductionAsset(project: StudioProject, asset: StudioAsset, reason: string) {
  const blockingPins = activeDecisionPins(project, asset.id);
  if (blockingPins.length) throw new Error(`Asset ${String(asset.projectNumber).padStart(3, '0')} has ${blockingPins.length} active decision pin(s). Explicitly release them before retirement.`);
  asset.lifecycleStatus = 'Retired';
  const record = project.production.control.assetLifecycle[asset.id] ?? {
    assetId: asset.id, assetNumber: asset.projectNumber, status: 'Active' as const, retiredAt: null, reason: '', linkedSequenceNumbers: [],
  };
  record.status = 'Retired';
  record.retiredAt = nowIso();
  record.reason = reason;
  record.linkedSequenceNumbers = project.sequences.filter((sequence) => sequence.assetIds.includes(asset.id)).map((sequence) => sequence.number);
  project.production.control.assetLifecycle[asset.id] = record;
  const reservation = project.production.control.reservedNumbers.find((item) => item.kind === 'asset' && item.number === asset.projectNumber);
  if (reservation) reservation.status = 'retired';
  return record;
}

export function detectOrphanAssets(project: StudioProject): OrphanAssetFinding[] {
  const activeLinks = new Set(project.sequences.flatMap((sequence) => sequence.assetIds));
  return project.assets.map((asset) => ({
    assetId: asset.id,
    assetNumber: asset.projectNumber,
    name: asset.name,
    category: asset.category,
    status: asset.lifecycleStatus === 'Retired' ? 'Retired' : activeLinks.has(asset.id) ? 'Connected' : 'Orphaned',
    reason: asset.lifecycleStatus === 'Retired' ? 'Retired intentionally; permanent number remains reserved.' : activeLinks.has(asset.id) ? 'Used by at least one active sequence.' : 'No active sequence currently references this asset.',
    detectedAt: nowIso(),
  }));
}

function buildWarnings(project: StudioProject, findings: ReferenceBindingFinding[]): ProductionWarning[] {
  const warnings: ProductionWarning[] = findings.map((finding) => ({ id: `warning:${finding.id}`, severity: finding.severity === 'Blocking' ? 'Blocker' : 'Recommendation', scope: `Sequence ${finding.sequenceNumber}`, message: finding.message, userCanContinue: finding.severity !== 'Blocking' }));
  const mainCharacter = project.assets.find((asset) => asset.id === 'CHARACTER_001' && asset.lifecycleStatus !== 'Retired');
  if (mainCharacter && mainCharacter.referenceCount === 0) warnings.push({ id: 'warning:main-character-reference', severity: 'Blocker', scope: 'Asset 001', message: 'The main character has no identity reference.', userCanContinue: false });
  for (const asset of project.assets.filter((item) => item.lifecycleStatus !== 'Retired' && ['Background', 'Incidental'].includes(item.importance) && item.referenceCount === 0)) {
    warnings.push({ id: `warning:optional:${asset.id}`, severity: 'Recommendation', scope: `Asset ${String(asset.projectNumber).padStart(3, '0')}`, message: `Optional ${asset.category.toLowerCase()} reference quality may be limited.`, userCanContinue: true });
  }
  return warnings;
}

function buildConfidence(project: StudioProject, findings: ReferenceBindingFinding[]): RelationshipConfidence[] {
  const fromFindings = findings.map((finding) => ({ id: `confidence:${finding.id}`, subjectId: finding.subject, relationship: finding.message, confidence: finding.confidence, source: finding.inferred ? 'Content inference' as const : 'System rule' as const, editable: true as const, locked: false, reviewRequired: finding.inferred && finding.confidence < 0.8 }));
  const fromAttachments = project.attachments.flatMap((attachment) => attachment.referenceRoles.map((role) => ({ id: `confidence:${attachment.id}:${role}`, subjectId: attachment.id, relationship: role, confidence: attachment.roleOverrides?.length ? 1 : 0.68, source: attachment.roleOverrides?.length ? 'Explicit user instruction' as const : 'Filename inference' as const, editable: true as const, locked: Boolean(attachment.roleOverrides?.length), reviewRequired: !attachment.roleOverrides?.length })));
  return [...fromFindings, ...fromAttachments];
}

function buildComparisons(project: StudioProject): ProductionControlSystem['comparisons'] {
  const sequences = project.sequences.map<ComparisonRecord>((sequence) => {
    const plan = project.production.sequencePlans[sequence.id];
    const versions = (plan?.revisions ?? []).map((revision) => {
      const provenance = project.production.control?.resultProvenance?.findLast((item) => item.sequenceNumber === sequence.number && item.sequenceVersion === revision.revision);
      return { version: revision.revision, status: revision.status, mediaKey: provenance?.resultMediaKey ?? null, provider: provenance?.provider ?? 'Not generated', model: provenance?.modelVersion ?? provenance?.model ?? 'Not generated', createdAt: revision.createdAt };
    });
    return { targetType: 'sequence', targetId: sequence.id, versions, approvedVersion: plan?.activeApprovedRevision ?? null };
  });
  const assets = project.assets.map<ComparisonRecord>((asset) => {
    const lineage = project.production.assetLineage?.[asset.id];
    const versionNumbers = [...new Set([...(lineage?.previousVersions ?? []), asset.version])].sort((a, b) => a - b);
    return { targetType: 'asset', targetId: asset.id, versions: versionNumbers.map((version) => ({ version, status: version === lineage?.approvedVersion ? 'Approved' : version === asset.version ? asset.approvalState : 'Superseded', mediaKey: null, provider: lineage?.provider ?? project.settings.imageProvider, model: lineage?.modelVersion ?? lineage?.model ?? 'Not selected', createdAt: lineage?.generatedAt ?? project.updatedAt })), approvedVersion: lineage?.approvedVersion ?? null };
  });
  return { assets, sequences };
}

export function searchProjectData(project: StudioProject, query: string) {
  const normalized = query.toLowerCase();
  const matchedAssets = project.assets.filter((asset) => normalized.includes(String(asset.projectNumber).padStart(3, '0')) || normalized.includes(asset.name.toLowerCase()) || normalized.includes(asset.category.toLowerCase().replace(/s$/, '')));
  const explicit = matchedAssets.length ? matchedAssets : project.assets.filter((asset) => asset.sequences.some((number) => project.sequences.find((sequence) => sequence.number === number)?.purpose.toLowerCase().includes(normalized)));
  return explicit.map((asset) => ({ assetId: asset.id, assetNumber: asset.projectNumber, name: asset.name, category: asset.category, lifecycleStatus: asset.lifecycleStatus, sequences: project.sequences.filter((sequence) => sequence.assetIds.includes(asset.id)).map((sequence) => ({ number: sequence.number, title: sequence.title, purpose: sequence.purpose })) }));
}

export function repairProjectState(project: StudioProject): RepairReport {
  const repaired: string[] = [];
  const requiresUserInput: string[] = [];
  const assetsById = new Map(project.assets.map((asset) => [asset.id, asset]));
  for (const sequence of project.sequences) {
    const validIds = sequence.assetIds.filter((id) => assetsById.has(id));
    if (validIds.length !== sequence.assetIds.length) {
      sequence.assetIds = validIds;
      repaired.push(`Removed unresolved asset links from Sequence ${sequence.number}.`);
    }
    const validAssets = validIds.map((id) => assetsById.get(id)!);
    const expectedNumbers = validAssets.map((asset) => asset.projectNumber);
    const expectedFiles = validAssets.map((asset) => asset.generatedFileName);
    if (JSON.stringify(sequence.assetNumbers) !== JSON.stringify(expectedNumbers) || JSON.stringify(sequence.assetFiles) !== JSON.stringify(expectedFiles)) {
      sequence.assetNumbers = expectedNumbers;
      sequence.assetFiles = expectedFiles;
      repaired.push(`Rebuilt numbered reference links for Sequence ${sequence.number}.`);
    }
  }
  for (const asset of project.assets) {
    const lifecycle = project.production.control.assetLifecycle[asset.id];
    if (!lifecycle) {
      project.production.control.assetLifecycle[asset.id] = { assetId: asset.id, assetNumber: asset.projectNumber, status: asset.lifecycleStatus, retiredAt: asset.lifecycleStatus === 'Retired' ? nowIso() : null, reason: asset.lifecycleStatus === 'Retired' ? 'Recovered retirement record.' : '', linkedSequenceNumbers: project.sequences.filter((sequence) => sequence.assetIds.includes(asset.id)).map((sequence) => sequence.number) };
      repaired.push(`Rebuilt lifecycle record for Asset ${String(asset.projectNumber).padStart(3, '0')}.`);
    }
  }
  const duplicateNumbers = project.assets.filter((asset, index) => project.assets.findIndex((item) => item.projectNumber === asset.projectNumber) !== index);
  if (duplicateNumbers.length) requiresUserInput.push(`Duplicate permanent asset numbers require review: ${duplicateNumbers.map((asset) => String(asset.projectNumber).padStart(3, '0')).join(', ')}.`);
  const missingFiles = project.attachments.filter((attachment) => attachment.integrityStatus === 'Missing');
  if (missingFiles.length) requiresUserInput.push(`${missingFiles.length} media file(s) are missing and cannot be recreated safely.`);
  project.production.control.orphanAssets = detectOrphanAssets(project);
  const report: RepairReport = { id: uid('repair'), createdAt: nowIso(), repaired: [...new Set(repaired)], requiresUserInput, status: requiresUserInput.length ? 'Needs User Input' : repaired.length ? 'Repaired' : 'No Changes Needed' };
  project.production.control.repairReports.push(report);
  return report;
}

export function buildProjectIntegrityAudit(project: StudioProject): ProjectIntegrityAudit {
  const duplicateAssetNumbers = project.assets.filter((asset, index) => project.assets.findIndex((item) => item.projectNumber === asset.projectNumber) !== index);
  const duplicateSequenceNumbers = project.sequences.filter((sequence, index) => project.sequences.findIndex((item) => item.number === sequence.number) !== index);
  const missingSequenceAssets = project.sequences.flatMap((sequence) => sequence.assetIds.filter((id) => !project.assets.some((asset) => asset.id === id)).map((id) => `${sequence.id} references missing asset ${id}`));
  const approvedWithoutSource = project.sequences.filter((sequence) => sequence.status === 'Approved' && !project.production.control?.finalSourceMap.some((source) => source.sequenceNumber === sequence.number));
  const missingAttachmentLinks = project.attachments.filter((attachment) => attachment.linkedAssetId && !project.assets.some((asset) => asset.id === attachment.linkedAssetId));
  const unsafeNames = project.assets.filter((asset) => !/^\d{3}_[A-Z0-9_]+_GENERATED\.png$/.test(asset.generatedFileName) || !asset.generatedFileName.startsWith(`${String(asset.projectNumber).padStart(3, '0')}_`));
  const retiredWithoutReservation = project.assets.filter((asset) => asset.lifecycleStatus === 'Retired' && !project.production.control?.reservedNumbers.some((reservation) => reservation.kind === 'asset' && reservation.number === asset.projectNumber));
  const schemaCurrent = project.production.schemaVersion === CURRENT_DATA_SCHEMA_VERSION && project.production.control?.dataSchema?.currentVersion === CURRENT_DATA_SCHEMA_VERSION;
  const orphaned = project.production.control?.orphanAssets?.filter((finding) => finding.status === 'Orphaned') ?? [];
  const checks: ProjectIntegrityAudit['checks'] = [
    { id: 'asset-numbers', status: duplicateAssetNumbers.length ? 'Failed' : 'Passed', label: 'Permanent asset numbers', detail: duplicateAssetNumbers.length ? `${duplicateAssetNumbers.length} duplicate assignment(s).` : `${project.assets.length} unique permanent assignments.` },
    { id: 'sequence-numbers', status: duplicateSequenceNumbers.length ? 'Failed' : 'Passed', label: 'Permanent sequence numbers', detail: duplicateSequenceNumbers.length ? `${duplicateSequenceNumbers.length} duplicate assignment(s).` : `${project.sequences.length} unique permanent assignments.` },
    { id: 'sequence-assets', status: missingSequenceAssets.length ? 'Failed' : 'Passed', label: 'Sequence asset links', detail: missingSequenceAssets.length ? missingSequenceAssets.join(' ') : 'Every sequence asset link resolves.' },
    { id: 'approved-sources', status: approvedWithoutSource.length ? 'Failed' : 'Passed', label: 'Approved render source map', detail: approvedWithoutSource.length ? `Missing source for ${approvedWithoutSource.map((item) => item.id).join(', ')}.` : 'Every approved sequence has one exact source render.' },
    { id: 'attachment-links', status: missingAttachmentLinks.length ? 'Failed' : 'Passed', label: 'Attachment links', detail: missingAttachmentLinks.length ? `${missingAttachmentLinks.length} broken attachment link(s).` : 'Every attachment link resolves.' },
    { id: 'portable-names', status: unsafeNames.length ? 'Failed' : 'Passed', label: 'Portable deterministic filenames', detail: unsafeNames.length ? `${unsafeNames.length} unsafe or mismatched generated filename(s).` : 'Every filename is portable and begins with its permanent numeric prefix.' },
    { id: 'retired-reservations', status: retiredWithoutReservation.length ? 'Failed' : 'Passed', label: 'Retired number reservations', detail: retiredWithoutReservation.length ? `${retiredWithoutReservation.length} retired asset number(s) lack a reservation.` : 'Every retired asset number remains permanently reserved.' },
    { id: 'data-schema', status: schemaCurrent ? 'Passed' : 'Failed', label: 'Database schema version', detail: schemaCurrent ? `Project data is migrated to version ${CURRENT_DATA_SCHEMA_VERSION}.` : 'Project data version is unsupported or incomplete.' },
    { id: 'source-of-truth', status: project.production.control?.authorityPolicy?.sourceOfTruth === 'database-structured-state' ? 'Passed' : 'Failed', label: 'Authoritative project state', detail: 'Structured database state is authoritative; chat, filenames, media text, and historical prompts cannot override it.' },
    { id: 'orphan-assets', status: orphaned.length ? 'Needs Review' : 'Passed', label: 'Orphan assets', detail: orphaned.length ? `${orphaned.length} active asset(s) are not connected to an active sequence.` : 'Every active asset is connected or intentionally retired.' },
  ];
  const missing = checks.filter((check) => check.status !== 'Passed').map((check) => `${check.label}: ${check.detail}`);
  return { id: uid('integrity'), createdAt: nowIso(), status: checks.some((check) => check.status === 'Failed') ? 'Failed' : checks.some((check) => check.status === 'Needs Review') ? 'Needs Review' : 'Passed', checks, missing };
}

export function initializeProductionControl(project: StudioProject, previous?: ProductionControlSystem, legacySchemaVersion?: number): ProductionControlSystem {
  const at = nowIso();
  const reservations = new Map((previous?.reservedNumbers ?? []).map((item) => [`${item.kind}:${item.number}`, item]));
  for (const asset of project.assets) {
    const key = `asset:${asset.projectNumber}`;
    if (!reservations.has(key)) reservations.set(key, { kind: 'asset', number: asset.projectNumber, stableId: asset.id, status: asset.lifecycleStatus === 'Retired' ? 'retired' : 'active', reservedAt: project.createdAt });
    else if (asset.lifecycleStatus === 'Retired') reservations.get(key)!.status = 'retired';
  }
  for (const sequence of project.sequences) {
    const key = `sequence:${sequence.number}`;
    if (!reservations.has(key)) reservations.set(key, { kind: 'sequence', number: sequence.number, stableId: sequence.id, status: 'active', reservedAt: project.createdAt });
  }
  const dialogueTimingAudits = Object.fromEntries(project.sequences.map((sequence) => [sequence.id, auditDialogueTiming(sequence, project.production.sequencePlans[sequence.id]?.dialogue ?? [])]));
  const findings = project.sequences.flatMap((sequence) => {
    const plan = project.production.sequencePlans[sequence.id];
    return plan ? auditReferenceBindings(project, sequence, plan) : [];
  });
  const profile = project.production.modelCapabilities.find((item) => item.id === project.production.selectedCapabilityProfileId) ?? project.production.modelCapabilities[0];
  const providerTranslations = Object.fromEntries(project.sequences.map((sequence) => {
    const plan = project.production.sequencePlans[sequence.id];
    const old = previous?.providerTranslations?.[sequence.id];
    return [sequence.id, plan && profile ? translateProviderPrompt(sequence, plan, profile) : old];
  }).filter((entry): entry is [string, ProviderTranslation] => Boolean(entry[1])));
  const sourceSchemaVersion = previous?.dataSchema?.currentVersion ?? legacySchemaVersion ?? Number(project.production.schemaVersion ?? 3);
  const migratedFromVersions = [...new Set([...(previous?.dataSchema?.migratedFromVersions ?? []), ...(sourceSchemaVersion < CURRENT_DATA_SCHEMA_VERSION ? [sourceSchemaVersion] : [])])];
  const assetLifecycle = Object.fromEntries(project.assets.map((asset) => {
    const old = previous?.assetLifecycle?.[asset.id];
    return [asset.id, old ?? { assetId: asset.id, assetNumber: asset.projectNumber, status: asset.lifecycleStatus, retiredAt: asset.lifecycleStatus === 'Retired' ? at : null, reason: asset.lifecycleStatus === 'Retired' ? 'Migrated retired asset.' : '', linkedSequenceNumbers: project.sequences.filter((sequence) => sequence.assetIds.includes(asset.id)).map((sequence) => sequence.number) }];
  }));
  const activeByProvider = project.production.renderQueue.filter((job) => ['Preparing', 'Generating'].includes(job.status)).reduce<Record<string, number>>((counts, job) => { counts[job.provider] = (counts[job.provider] ?? 0) + 1; return counts; }, {});
  const generatedPins = (previous?.modelVersionPins ?? []).slice();
  for (const provenance of previous?.resultProvenance ?? []) {
    const targetId = project.sequences.find((sequence) => sequence.number === provenance.sequenceNumber)?.id ?? `SEQUENCE_${String(provenance.sequenceNumber).padStart(3, '0')}`;
    if (!generatedPins.some((pin) => pin.targetType === 'sequence-generation' && pin.targetId === targetId && pin.modelVersion === (provenance.modelVersion || provenance.model))) {
      generatedPins.push({ targetType: 'sequence-generation', targetId, provider: provenance.provider, model: provenance.model, modelVersion: provenance.modelVersion || provenance.model, capabilityRevision: provenance.capabilityRevision || 'legacy', approved: Boolean(previous?.finalSourceMap.some((source) => source.provenanceId === provenance.id)), pinnedAt: provenance.createdAt });
    }
  }
  const inferredDecisions = previous?.inferredDecisions ?? [
    { id: uid('inference'), field: 'visualStyle', value: project.visualStyle, rationale: 'Inferred from the movie idea and genre; user-editable.', editable: true, permanentLock: false, createdAt: project.createdAt },
    { id: uid('inference'), field: 'cameraStyle', value: project.cameraStyle, rationale: 'Routine filmmaking choice inferred for a coherent first plan; user-editable.', editable: true, permanentLock: false, createdAt: project.createdAt },
    { id: uid('inference'), field: 'lightingDirection', value: project.lightingDirection, rationale: 'Inferred from setting and time cues; user-editable.', editable: true, permanentLock: false, createdAt: project.createdAt },
  ];
  const collisionSafeSlug = `${project.title.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase() || 'MOVIE'}_${project.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
  const provisional: ProductionControlSystem = {
    dataSchema: {
      currentVersion: CURRENT_DATA_SCHEMA_VERSION,
      createdWithVersion: previous?.dataSchema?.createdWithVersion ?? sourceSchemaVersion,
      migratedFromVersions,
      supportedVersions: [...SUPPORTED_DATA_SCHEMA_VERSIONS],
      lastMigratedAt: sourceSchemaVersion < CURRENT_DATA_SCHEMA_VERSION ? at : previous?.dataSchema?.lastMigratedAt ?? null,
    },
    stateMachine: buildProjectStateMachine(project, previous?.stateMachine),
    decisionPins: previous?.decisionPins ?? [],
    assetLifecycle,
    orphanAssets: detectOrphanAssets(project),
    modelVersionPins: generatedPins,
    generationQueuePolicy: {
      maxConcurrentByProvider: previous?.generationQueuePolicy?.maxConcurrentByProvider ?? 1,
      activeByProvider,
      waitingJobIds: project.production.renderQueue.filter((job) => job.status === 'Waiting').map((job) => job.id),
      idempotencyKeys: Object.fromEntries(project.production.renderQueue.map((job) => [job.idempotencyKey || job.id, job.id])),
      timeoutPolicy: 'A timeout never creates a new paid request automatically. Poll the provider request ID, then resume the same idempotency key.',
      duplicateSubmissionPolicy: 'One immutable request fingerprint maps to one generation job and one provider submission token.',
    },
    storage: previous?.storage ?? { originalBytes: project.attachments.reduce((sum, attachment) => sum + attachment.byteSize, 0), previewBytes: 0, generatedBytes: 0, totalBytes: project.attachments.reduce((sum, attachment) => sum + attachment.byteSize, 0), protectedReferenceIds: project.attachments.map((attachment) => attachment.id), cleanupCandidateIds: project.production.renderQueue.filter((job) => ['Failed', 'Cancelled'].includes(job.status) && Boolean(job.resultMediaKey)).map((job) => job.id), lastCalculatedAt: at, cleanupPolicy: 'Originals, approved assets, approved sequence results, provenance sources, and recovery data are protected. Only unused previews and failed unapproved generation media are removable.' },
    warnings: buildWarnings(project, findings),
    relationshipConfidence: buildConfidence(project, findings),
    inferredDecisions,
    comparisons: previous?.comparisons ?? { assets: [], sequences: [] },
    repairReports: previous?.repairReports ?? [],
    archiveVerifications: previous?.archiveVerifications ?? [],
    authorityPolicy: previous?.authorityPolicy ?? { sourceOfTruth: 'database-structured-state', rule: 'The saved structured database state controls the movie. Chat text, filenames, generated image text, and historical prompts are evidence only and never override current approved state.', promptCompilationRule: 'Before every Seedance request, rebuild the final prompt from current approved structured state and create a new immutable attempt freeze. Never reuse an old prompt blindly.' },
    exportIdentity: { projectId: project.id, collisionSafeSlug },
    reservedNumbers: [...reservations.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.number - b.number),
    sequenceDependencies: buildExplicitDependencies(project),
    referenceBindingFindings: findings,
    dialogueTimingAudits,
    providerTranslations,
    freezeSnapshots: previous?.freezeSnapshots ?? [],
    resultProvenance: previous?.resultProvenance ?? [],
    finalSourceMap: previous?.finalSourceMap ?? [],
    changeLog: previous?.changeLog ?? [],
    importHistory: previous?.importHistory ?? [],
    pendingReferenceReplacement: previous?.pendingReferenceReplacement ?? null,
    integrityAudit: previous?.integrityAudit ?? { id: uid('integrity'), createdAt: at, status: 'Needs Review', checks: [], missing: ['Initial integrity audit pending.'] },
    languageLocks: previous?.languageLocks ?? { projectLanguage: project.dialogueLanguage, projectDialect: 'Story and region appropriate', lockedAt: null },
    contextPolicy: previous?.contextPolicy ?? { mode: 'relevant-only', rule: 'Load the current request, active sequence, referenced assets, applicable bibles, continuity checkpoint, provider capability, and nearby dependencies only.', lastLoadedSections: [], lastLoadedAt: null },
  };
  project.production.control = provisional;
  provisional.comparisons = buildComparisons(project);
  provisional.integrityAudit = buildProjectIntegrityAudit(project);
  return provisional;
}

export function buildRelevantProjectContext(project: StudioProject, input: string) {
  const match = input.match(/sequence\s*0*(\d+)/i);
  const number = match ? Number(match[1]) : project.currentSequence;
  const sequence = project.sequences.find((item) => item.number === number);
  const plan = sequence ? project.production.sequencePlans[sequence.id] : undefined;
  const assetNumbers = new Set([...(sequence?.assetNumbers ?? []), ...[...input.matchAll(/asset\s*0*(\d+)/gi)].map((item) => Number(item[1]))]);
  const context = {
    project: { id: project.id, title: project.title, stage: project.stage, dialogueLanguage: project.dialogueLanguage },
    story: project.story,
    worldRules: project.worldBible.restrictions,
    filmRules: [...project.filmBible.continuityRules, ...project.filmBible.negativeRules],
    sequence: sequence ? { ...sequence, prompt: undefined } : null,
    scenario: plan?.scenario ?? null,
    dialogue: plan?.dialogue ?? [],
    assets: project.assets.filter((asset) => assetNumbers.has(asset.projectNumber)),
    checkpoint: project.production.checkpoints.findLast((item) => item.sequenceNumber < number) ?? null,
    capability: project.production.modelCapabilities.find((item) => item.id === project.production.selectedCapabilityProfileId) ?? null,
  };
  project.production.control.contextPolicy.lastLoadedSections = Object.entries(context).filter(([, value]) => value !== null && (!Array.isArray(value) || value.length)).map(([key]) => key);
  project.production.control.contextPolicy.lastLoadedAt = nowIso();
  return context;
}
