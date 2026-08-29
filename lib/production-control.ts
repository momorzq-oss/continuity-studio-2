import type { StudioAsset, StudioProject, StudioSequence } from './studio';
import type { DialogueLine, ModelCapabilityProfile, SequenceProductionPlan } from './production-system';

export type IntegrityStatus = 'Passed' | 'Needs Review' | 'Failed';

export interface ReservedProductionNumber {
  kind: 'asset' | 'sequence';
  number: number;
  stableId: string;
  status: 'active' | 'deleted' | 'superseded';
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
    if (!speaker || speaker.category !== 'Characters') findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Blocking', subject: line.dialogueId, message: `Speaker Asset ${String(line.speakerAssetNumber).padStart(3, '0')} is missing or is not a character identity.` });
    else if (!includedIds.has(speaker.id)) findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Blocking', subject: line.dialogueId, message: `Speaker Asset ${String(speaker.projectNumber).padStart(3, '0')} is not included in the upload package.` });
  }
  for (const action of plan.scenario.actions) {
    if (!action.actorAssetId || !project.assets.some((asset) => asset.id === action.actorAssetId)) findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Blocking', subject: action.id, message: 'Action actor is not bound to a permanent numbered asset.' });
    if (action.hand === 'Unspecified' && action.targetAssetId) findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Review', subject: action.id, message: 'Object action needs an explicit left, right, both, or not-applicable hand binding.' });
  }
  for (const assetId of sequence.assetIds) {
    const asset = project.assets.find((item) => item.id === assetId);
    if (!asset) findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Blocking', subject: assetId, message: 'Sequence manifest contains a missing asset.' });
    else if (!includedIds.has(assetId) && ['Story critical', 'Recurring', 'Location anchor'].includes(asset.importance)) findings.push({ id: uid('binding'), sequenceNumber: sequence.number, severity: 'Blocking', subject: asset.generatedFileName, message: `Required ${asset.category} reference Asset ${String(asset.projectNumber).padStart(3, '0')} is excluded.` });
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

export function buildProjectIntegrityAudit(project: StudioProject): ProjectIntegrityAudit {
  const duplicateAssetNumbers = project.assets.filter((asset, index) => project.assets.findIndex((item) => item.projectNumber === asset.projectNumber) !== index);
  const duplicateSequenceNumbers = project.sequences.filter((sequence, index) => project.sequences.findIndex((item) => item.number === sequence.number) !== index);
  const missingSequenceAssets = project.sequences.flatMap((sequence) => sequence.assetIds.filter((id) => !project.assets.some((asset) => asset.id === id)).map((id) => `${sequence.id} references missing asset ${id}`));
  const approvedWithoutSource = project.sequences.filter((sequence) => sequence.status === 'Approved' && !project.production.control?.finalSourceMap.some((source) => source.sequenceNumber === sequence.number));
  const missingAttachmentLinks = project.attachments.filter((attachment) => attachment.linkedAssetId && !project.assets.some((asset) => asset.id === attachment.linkedAssetId));
  const checks: ProjectIntegrityAudit['checks'] = [
    { id: 'asset-numbers', status: duplicateAssetNumbers.length ? 'Failed' : 'Passed', label: 'Permanent asset numbers', detail: duplicateAssetNumbers.length ? `${duplicateAssetNumbers.length} duplicate assignment(s).` : `${project.assets.length} unique permanent assignments.` },
    { id: 'sequence-numbers', status: duplicateSequenceNumbers.length ? 'Failed' : 'Passed', label: 'Permanent sequence numbers', detail: duplicateSequenceNumbers.length ? `${duplicateSequenceNumbers.length} duplicate assignment(s).` : `${project.sequences.length} unique permanent assignments.` },
    { id: 'sequence-assets', status: missingSequenceAssets.length ? 'Failed' : 'Passed', label: 'Sequence asset links', detail: missingSequenceAssets.length ? missingSequenceAssets.join(' ') : 'Every sequence asset link resolves.' },
    { id: 'approved-sources', status: approvedWithoutSource.length ? 'Failed' : 'Passed', label: 'Approved render source map', detail: approvedWithoutSource.length ? `Missing source for ${approvedWithoutSource.map((item) => item.id).join(', ')}.` : 'Every approved sequence has one exact source render.' },
    { id: 'attachment-links', status: missingAttachmentLinks.length ? 'Failed' : 'Passed', label: 'Attachment links', detail: missingAttachmentLinks.length ? `${missingAttachmentLinks.length} broken attachment link(s).` : 'Every attachment link resolves.' },
  ];
  const missing = checks.filter((check) => check.status !== 'Passed').map((check) => `${check.label}: ${check.detail}`);
  return { id: uid('integrity'), createdAt: nowIso(), status: checks.some((check) => check.status === 'Failed') ? 'Failed' : checks.some((check) => check.status === 'Needs Review') ? 'Needs Review' : 'Passed', checks, missing };
}

export function initializeProductionControl(project: StudioProject, previous?: ProductionControlSystem): ProductionControlSystem {
  const at = nowIso();
  const reservations = new Map((previous?.reservedNumbers ?? []).map((item) => [`${item.kind}:${item.number}`, item]));
  for (const asset of project.assets) {
    const key = `asset:${asset.projectNumber}`;
    if (!reservations.has(key)) reservations.set(key, { kind: 'asset', number: asset.projectNumber, stableId: asset.id, status: 'active', reservedAt: project.createdAt });
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
  const provisional: ProductionControlSystem = {
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
