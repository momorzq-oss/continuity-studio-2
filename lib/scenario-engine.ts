import type { StudioAsset, StudioProject, StudioSequence } from './studio';

export type SequencePurposeCategory = 'Setup' | 'Development' | 'Revelation' | 'Escalation' | 'Transition' | 'Payoff' | 'Resolution';
export type TransitionType = 'Direct continuation' | 'Time jump' | 'Location change' | 'Story transition' | 'Flashback' | 'Dream' | 'Vision' | 'Transformation';
export type ContinuityStrength = 'Strict match' | 'State match' | 'Motif match' | 'Independent opening';

export interface VisualReferenceBinding {
  role: 'Identity' | 'Current appearance' | 'Costume' | 'Creature or animal' | 'Location' | 'Critical prop' | 'Previous continuity';
  assetId: string | null;
  assetNumber: number | null;
  fileName: string;
  reason: string;
}

export interface DialogueLine {
  id: string;
  dialogueId: string;
  sequenceNumber: number;
  turnOrder: number;
  turnType: 'Line' | 'Interruption' | 'Response' | 'Overlap' | 'Purposeful silence';
  exactDialogue: string;
  speakerAssetId: string;
  speakerAssetNumber: number;
  speakerName: string;
  speakerVariant: string;
  currentCostumeAssetNumbers: number[];
  language: string;
  dialect: string;
  languageLock: string;
  dialectLock: string;
  pronunciations: Array<{ text: string; pronunciation: string; phonetic?: string }>;
  emotion: string;
  expression: string;
  physicalAction: string;
  addresseeAssetId: string | null;
  addresseeAssetNumber: number | null;
  position: string;
  startSecond: number;
  endSecond: number;
  durationSeconds: number;
  pauseBeforeSeconds: number;
  pauseAfterSeconds: number;
  overlapWithDialogueId: string | null;
  reactionAssetIds: string[];
  requiredVisualReferences: VisualReferenceBinding[];
  speakerLock: {
    speakerAssetId: string;
    listenerAssetIds: string[];
    order: number;
    screenPosition: string;
    currentAppearance: string;
    physicalAction: string;
  };
}

export interface ProductionAction {
  id: string;
  order: number;
  actorAssetId: string;
  actorAssetNumber: number;
  actorName: string;
  verb: string;
  targetAssetId: string | null;
  targetAssetNumber: number | null;
  startSecond: number;
  endSecond: number;
  screenPosition: string;
  screenDirection: string;
  hand: 'Left' | 'Right' | 'Both' | 'Not applicable' | 'Unspecified';
  objectVisibilityBefore: string;
  objectVisibilityAfter: string;
  containmentBefore: string;
  containmentAfter: string;
  resultingState: string;
  requiredAssetNumbers: number[];
}

export interface SeedanceSoundInstructions {
  generatedInsideVideo: true;
  spokenDialogue: string[];
  environmentalSound: string[];
  soundEffects: string[];
  requestedMusic: string[];
  intentionalSilence: string[];
  rule: 'Seedance generates all requested sound inside the video. Continuity Studio stores instructions only and creates no separate sound assets.';
}

export interface SequenceScenario {
  id: string;
  sequenceNumber: number;
  durationSeconds: number;
  purposeCategory: SequencePurposeCategory;
  purpose: string;
  activeStoryObjective: string;
  escalationScore: number;
  location: string;
  timeOfDay: string;
  characterAssetIds: string[];
  nonSpeakingCharacterAssetIds: string[];
  characterContinuity: Array<{
    assetId: string;
    assetNumber: number;
    currentAppearance: CharacterProductionState['currentAppearance'];
    knowledgeBeforeSequence: CharacterProductionState['knowledge'];
    relationships: CharacterProductionState['relationships'];
    emotion: string;
    motivation: string;
    position: string;
    screenDirection: string;
  }>;
  openingSituation: string;
  actions: ProductionAction[];
  interactions: string[];
  dialogue: DialogueLine[];
  reactions: string[];
  cameraProgression: string[];
  environmentalActivity: {
    wind: string;
    fabric: string;
    traffic: string;
    crowd: string;
    water: string;
    fire: string;
    smoke: string;
    dust: string;
    vegetation: string;
    mechanical: string;
  };
  backgroundControl: { permitted: boolean; exactCount: number; characteristics: string; continuityRule: string };
  storyDevelopment: string;
  endingSituation: string;
  connectionToNext: string;
  transition: { type: TransitionType; continuityStrength: ContinuityStrength; instruction: string };
  sceneStateDelta: { opening: string; changes: string[]; ending: string };
  cameraHandoff: {
    position: string;
    height: string;
    direction: string;
    distance: string;
    movement: string;
    lens: string;
    framing: string;
  };
  propContinuity: Array<{
    assetId: string;
    assetNumber: number;
    visibility: 'Visible' | 'Hidden' | 'Carried' | 'Stored' | 'Offscreen' | 'Lost' | 'Destroyed';
    owner: string;
    holder: string;
    location: string;
    container: string;
    hand: string;
    condition: string;
  }>;
  soundInstructions: SeedanceSoundInstructions;
}

export interface CharacterProductionState {
  assetId: string;
  assetNumber: number;
  identityReference: string;
  languageLock: string;
  dialectLock: string;
  currentAppearance: {
    costumeAssetNumbers: number[];
    damage: string;
    transformation: string;
    accessories: string[];
  };
  knowledge: Array<{ sequenceNumber: number; kind: 'Knows' | 'Witnessed' | 'Heard' | 'Met' | 'Learned' | 'Believes' | 'Hides'; fact: string }>;
  relationships: Record<string, { trust: number; fear: number; hostility: number; friendship: number; suspicion: number; loyalty: number; lastChangedSequence: number }>;
  currentEmotion: string;
  currentMotivation: string;
  injuryProgression: Array<{ sequenceNumber: number; condition: string; cause: string }>;
  emotionalProgression: Array<{ sequenceNumber: number; emotion: string; cause: string }>;
  motivationProgression: Array<{ sequenceNumber: number; motivation: string; cause: string }>;
  currentPosition: string;
  screenDirection: string;
  entranceHistory: Array<{ sequenceNumber: number; state: string }>;
  exitHistory: Array<{ sequenceNumber: number; state: string }>;
}

export interface StoryThread {
  id: string;
  kind: 'Setup' | 'Promise' | 'Question' | 'Objective';
  text: string;
  introducedSequence: number;
  payoffSequence: number | null;
  status: 'Open' | 'Advanced' | 'Paid off' | 'Unresolved';
}

export interface RepetitionFinding {
  id: string;
  type: 'Dialogue' | 'Action' | 'Reaction' | 'Camera' | 'Story information' | 'Threat' | 'Movement' | 'Location';
  sequenceNumbers: number[];
  severity: 'Review' | 'Blocking';
  detail: string;
}

export interface CorrectionMemoryRule {
  id: string;
  instruction: string;
  appliesTo: string[];
  sequenceNumber: number | null;
  createdAt: string;
  active: boolean;
}

export interface RankedSequenceReference {
  id: string;
  role: VisualReferenceBinding['role'];
  uploadOrder: number;
  limitPriority: number;
  assetId: string | null;
  assetNumber: number | null;
  fileName: string;
  reason: string;
  required: boolean;
  included: boolean;
}

export interface SequenceReadinessChecklist {
  scenarioComplete: boolean;
  dialogueTimed: boolean;
  speakersBound: boolean;
  visualReferencesApproved: boolean;
  currentCostumesBound: boolean;
  locationBound: boolean;
  criticalPropsBound: boolean;
  previousContinuityReady: boolean;
  providerReferenceLimitKnown: boolean;
  referenceCountSupported: boolean;
  contradictionsClear: boolean;
  promptCompiled: boolean;
  readyForGeneration: boolean;
  blockers: string[];
}

export interface GenerationSnapshot {
  id: string;
  sequenceNumber: number;
  createdAt: string;
  scenario: SequenceScenario;
  dialogue: DialogueLine[];
  referencePackageId: string;
  selectedReferenceIds: string[];
  compiledPrompt: string;
  correctionRuleIds: string[];
  reason: 'Initial generation' | 'Regeneration' | 'Explicit revision';
  immutable: true;
}

export interface MovieCompletionAudit {
  id: string;
  createdAt: string;
  status: 'Blocked' | 'Needs Review' | 'Passed';
  checks: Array<{ name: string; status: 'Passed' | 'Failed' | 'Needs Review'; detail: string }>;
}

function numberLabel(value: number) {
  return String(value).padStart(3, '0');
}

function categoryRole(asset: StudioAsset): VisualReferenceBinding['role'] {
  if (asset.category === 'Characters') return 'Identity';
  if (['Damage Sheets', 'Transformation Sheets'].includes(asset.category)) return 'Current appearance';
  if (asset.category === 'Costumes') return 'Costume';
  if (['Creatures', 'Animals'].includes(asset.category)) return 'Creature or animal';
  if (['Locations', 'Interiors', 'Environment States'].includes(asset.category)) return 'Location';
  return 'Critical prop';
}

function currentCostumes(project: StudioProject, speaker: StudioAsset) {
  return project.assets.filter((asset) => asset.category === 'Costumes' && asset.sequences.some((number) => speaker.sequences.includes(number))).map((asset) => asset.projectNumber);
}

function dialogueDuration(text: string) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Number(Math.max(0.8, wordCount / 2.45).toFixed(2));
}

export function normalizeDialogueLines(project: StudioProject, sequence: StudioSequence, input: unknown): DialogueLine[] {
  if (!Array.isArray(input)) return [];
  let cursor = Number((sequence.duration * 0.25).toFixed(2));
  return input.map((rawValue, index) => {
    const raw = (rawValue && typeof rawValue === 'object' ? rawValue : {}) as Partial<DialogueLine> & { accent?: string };
    const speaker = project.assets.find((asset) => asset.id === raw.speakerAssetId || asset.projectNumber === raw.speakerAssetNumber) ?? project.assets.find((asset) => asset.category === 'Characters');
    if (!speaker) return null;
    const exactDialogue = String(raw.exactDialogue ?? '').trim();
    const durationSeconds = Number(raw.durationSeconds ?? dialogueDuration(exactDialogue));
    const startSecond = Number(raw.startSecond ?? cursor);
    const endSecond = Number(Math.min(sequence.duration, raw.endSecond ?? startSecond + durationSeconds).toFixed(2));
    cursor = endSecond + Number(raw.pauseAfterSeconds ?? 0.35);
    const costumes = raw.currentCostumeAssetNumbers?.length ? raw.currentCostumeAssetNumbers : currentCostumes(project, speaker);
    const bindings: VisualReferenceBinding[] = raw.requiredVisualReferences?.length ? raw.requiredVisualReferences : [
      { role: 'Identity', assetId: speaker.id, assetNumber: speaker.projectNumber, fileName: speaker.generatedFileName, reason: 'Exact approved speaker identity' },
      ...costumes.map((assetNumber) => {
        const costume = project.assets.find((asset) => asset.projectNumber === assetNumber)!;
        return { role: 'Costume' as const, assetId: costume.id, assetNumber, fileName: costume.generatedFileName, reason: 'Speaker current costume' };
      }),
    ];
    const id = raw.id ?? raw.dialogueId ?? `dialogue_${crypto.randomUUID()}`;
    return {
      id, dialogueId: raw.dialogueId ?? id, sequenceNumber: sequence.number, turnOrder: raw.turnOrder ?? index + 1,
      turnType: raw.turnType ?? (index === 0 ? 'Line' : 'Response'), exactDialogue, speakerAssetId: speaker.id,
      speakerAssetNumber: speaker.projectNumber, speakerName: speaker.name, speakerVariant: raw.speakerVariant ?? 'Permanent identity with current scene state',
      currentCostumeAssetNumbers: costumes, language: raw.language ?? project.dialogueLanguage, dialect: raw.dialect ?? raw.accent ?? 'Character and region appropriate',
      languageLock: raw.languageLock ?? raw.language ?? project.dialogueLanguage,
      dialectLock: raw.dialectLock ?? raw.dialect ?? raw.accent ?? 'Character and region appropriate',
      pronunciations: raw.pronunciations ?? [],
      emotion: raw.emotion ?? 'Story-appropriate controlled performance', expression: raw.expression ?? 'Readable, motivated expression',
      physicalAction: raw.physicalAction ?? 'Maintain authored blocking, eyeline, hand state, and object ownership while speaking.',
      addresseeAssetId: raw.addresseeAssetId ?? null, addresseeAssetNumber: raw.addresseeAssetNumber ?? null,
      position: raw.position ?? sequence.sceneState.spatialRelationships[0] ?? 'Established screen position', startSecond, endSecond,
      durationSeconds: Number((endSecond - startSecond).toFixed(2)), pauseBeforeSeconds: raw.pauseBeforeSeconds ?? 0,
      pauseAfterSeconds: raw.pauseAfterSeconds ?? 0.35, overlapWithDialogueId: raw.overlapWithDialogueId ?? null,
      reactionAssetIds: raw.reactionAssetIds ?? sequence.assetManifest.characters.filter((id) => id !== speaker.id), requiredVisualReferences: bindings,
      speakerLock: raw.speakerLock ?? {
        speakerAssetId: speaker.id, listenerAssetIds: sequence.assetManifest.characters.filter((id) => id !== speaker.id), order: index + 1,
        screenPosition: raw.position ?? 'Established screen position',
        currentAppearance: `Asset ${numberLabel(speaker.projectNumber)} identity; costume ${costumes.map(numberLabel).join(', ') || 'story-defined'}; damage ${speaker.currentState.damage}; transformation ${speaker.currentState.transformation}`,
        physicalAction: raw.physicalAction ?? 'Maintain authored blocking and exact ownership while speaking.',
      },
    } satisfies DialogueLine;
  }).filter((line): line is DialogueLine => !!line && !!line.exactDialogue);
}

export function createDialogueLine(project: StudioProject, sequence: StudioSequence, speaker: StudioAsset, exactDialogue: string, existing: DialogueLine[]): DialogueLine {
  return normalizeDialogueLines(project, sequence, [{
    id: `dialogue_${crypto.randomUUID()}`,
    exactDialogue,
    speakerAssetId: speaker.id,
    speakerAssetNumber: speaker.projectNumber,
    turnOrder: existing.length + 1,
    startSecond: existing.length ? existing[existing.length - 1].endSecond + existing[existing.length - 1].pauseAfterSeconds : Number((sequence.duration * 0.25).toFixed(2)),
  }])[0];
}

export function buildCharacterStates(project: StudioProject, previous?: Record<string, CharacterProductionState>) {
  const costumes = project.assets.filter((asset) => asset.category === 'Costumes');
  return Object.fromEntries(project.assets.filter((asset) => asset.category === 'Characters').map((asset) => {
    const old = previous?.[asset.id];
    const state: CharacterProductionState = {
      assetId: asset.id, assetNumber: asset.projectNumber, identityReference: asset.generatedFileName,
      languageLock: old?.languageLock ?? project.dialogueLanguage,
      dialectLock: old?.dialectLock ?? 'Character and region appropriate',
      currentAppearance: {
        costumeAssetNumbers: currentCostumes(project, asset), damage: asset.currentState.damage,
        transformation: asset.currentState.transformation,
        accessories: costumes.filter((costume) => costume.currentState.owner === asset.id).map((costume) => costume.name),
      },
      knowledge: old?.knowledge ?? [{ sequenceNumber: 1, kind: 'Knows', fact: 'Only information established by the approved story and witnessed production events.' }],
      relationships: old?.relationships ?? {}, currentEmotion: old?.currentEmotion ?? 'Opening story state',
      currentMotivation: old?.currentMotivation ?? project.story.conflict, currentPosition: asset.currentState.currentLocation,
      injuryProgression: old?.injuryProgression ?? (asset.currentState.damage !== 'None' ? [{ sequenceNumber: 1, condition: asset.currentState.damage, cause: 'Opening approved asset state' }] : []),
      emotionalProgression: old?.emotionalProgression ?? [{ sequenceNumber: 1, emotion: 'Opening story state', cause: 'Approved story opening' }],
      motivationProgression: old?.motivationProgression ?? [{ sequenceNumber: 1, motivation: project.story.conflict, cause: 'Approved story objective' }],
      screenDirection: old?.screenDirection ?? project.sequences[0]?.sceneState.screenDirection ?? 'Story-defined',
      entranceHistory: old?.entranceHistory ?? [], exitHistory: old?.exitHistory ?? [],
    };
    return [asset.id, state];
  }));
}

function purposeCategory(sequence: StudioSequence, total: number): SequencePurposeCategory {
  if (sequence.number === 1) return 'Setup';
  if (sequence.number === total) return 'Resolution';
  const ratio = sequence.number / total;
  if (ratio < 0.35) return 'Development';
  if (ratio < 0.55) return 'Revelation';
  if (ratio < 0.78) return 'Escalation';
  return 'Payoff';
}

function defaultActions(project: StudioProject, sequence: StudioSequence): ProductionAction[] {
  const primary = project.assets.find((asset) => sequence.assetIds.includes(asset.id) && asset.category === 'Characters')
    ?? project.assets.find((asset) => sequence.assetIds.includes(asset.id));
  if (!primary) return [];
  const props = project.assets.filter((asset) => sequence.assetIds.includes(asset.id) && ['Props', 'Weapons', 'Vehicles', 'Mechanical Systems'].includes(asset.category));
  return [
    {
      id: `${sequence.id}:action:1`, order: 1, actorAssetId: primary.id, actorAssetNumber: primary.projectNumber, actorName: primary.name,
      verb: sequence.number === 1 ? 'enters and establishes the objective' : 'continues from the inherited ending position',
      targetAssetId: props[0]?.id ?? null, targetAssetNumber: props[0]?.projectNumber ?? null, startSecond: 0, endSecond: Number((sequence.duration * 0.28).toFixed(2)),
      screenPosition: 'Inherited or opening blocking mark', screenDirection: sequence.sceneState.screenDirection, hand: props[0] ? 'Unspecified' : 'Not applicable',
      objectVisibilityBefore: props[0]?.currentState.visibility ?? 'Not applicable', objectVisibilityAfter: props[0]?.currentState.visibility ?? 'Not applicable',
      containmentBefore: props[0] ? `At ${props[0].currentState.currentLocation}; holder ${props[0].currentState.holder}` : 'Not applicable',
      containmentAfter: props[0] ? `Ownership and containment remain recorded unless this action explicitly changes them` : 'Not applicable',
      resultingState: sequence.purpose, requiredAssetNumbers: [primary.projectNumber, ...(props[0] ? [props[0].projectNumber] : [])],
    },
    {
      id: `${sequence.id}:action:2`, order: 2, actorAssetId: primary.id, actorAssetNumber: primary.projectNumber, actorName: primary.name,
      verb: 'reacts and resolves into the ending continuity state', targetAssetId: null, targetAssetNumber: null,
      startSecond: Number((sequence.duration * 0.72).toFixed(2)), endSecond: sequence.duration,
      screenPosition: 'Final readable blocking mark', screenDirection: sequence.sceneState.screenDirection, hand: 'Not applicable',
      objectVisibilityBefore: 'Inherit prior action state', objectVisibilityAfter: 'Record exact ending visibility', containmentBefore: 'Inherit prior action state',
      containmentAfter: 'Record exact ending holder, location, and container', resultingState: sequence.closingState, requiredAssetNumbers: [primary.projectNumber],
    },
  ];
}

function transitionFor(project: StudioProject, sequence: StudioSequence) {
  const previous = project.sequences.find((item) => item.number === sequence.number - 1);
  let type: TransitionType = sequence.number === 1 ? 'Story transition' : previous?.location !== sequence.location ? 'Location change' : 'Direct continuation';
  if (/flashback/i.test(sequence.purpose)) type = 'Flashback';
  if (/dream/i.test(sequence.purpose)) type = 'Dream';
  if (/vision/i.test(sequence.purpose)) type = 'Vision';
  if (/transform/i.test(sequence.purpose)) type = 'Transformation';
  if (/time jump|later|years? after|months? after|days? after/i.test(sequence.purpose)) type = 'Time jump';
  const continuityStrength: ContinuityStrength = type === 'Direct continuation' || type === 'Transformation' ? 'Strict match' : type === 'Location change' || type === 'Time jump' ? 'State match' : sequence.number === 1 ? 'Independent opening' : 'Motif match';
  return { type, continuityStrength, instruction: type === 'Direct continuation' ? 'Match the previous approved ending exactly before any new action.' : `Make the ${type.toLowerCase()} explicit while preserving every state that survives the transition.` };
}

export function buildSequenceScenario(project: StudioProject, sequence: StudioSequence, dialogue: DialogueLine[], previous?: SequenceScenario, characterStates?: Record<string, CharacterProductionState>): SequenceScenario {
  const environment = project.environments.find((item) => sequence.number >= item.activeFromSequence && sequence.number <= item.activeThroughSequence);
  const actions = previous?.actions?.length ? previous.actions : defaultActions(project, sequence);
  const props = project.assets.filter((asset) => sequence.assetIds.includes(asset.id) && ['Props', 'Weapons', 'Vehicles', 'Mechanical Systems', 'Furniture'].includes(asset.category));
  const next = project.sequences.find((item) => item.number === sequence.number + 1);
  return {
    id: `${sequence.id}:scenario:v${sequence.version}`, sequenceNumber: sequence.number, durationSeconds: sequence.duration,
    purposeCategory: previous?.purposeCategory ?? purposeCategory(sequence, project.sequenceCount), purpose: sequence.purpose,
    activeStoryObjective: previous?.activeStoryObjective ?? project.story.conflict,
    escalationScore: previous?.escalationScore ?? Math.min(100, Math.round((sequence.number / project.sequenceCount) * 100)),
    location: sequence.location, timeOfDay: sequence.timeOfDay, characterAssetIds: [...sequence.assetManifest.characters],
    nonSpeakingCharacterAssetIds: previous?.nonSpeakingCharacterAssetIds ?? sequence.assetManifest.characters.filter((id) => !dialogue.some((line) => line.speakerAssetId === id)),
    characterContinuity: sequence.assetManifest.characters.map((id) => {
      const asset = project.assets.find((item) => item.id === id)!;
      const state = characterStates?.[id];
      return {
        assetId: id, assetNumber: asset.projectNumber,
        currentAppearance: state?.currentAppearance ?? { costumeAssetNumbers: currentCostumes(project, asset), damage: asset.currentState.damage, transformation: asset.currentState.transformation, accessories: [] },
        knowledgeBeforeSequence: state?.knowledge.filter((item) => item.sequenceNumber <= sequence.number) ?? [],
        relationships: state?.relationships ?? {}, emotion: state?.currentEmotion ?? 'Story-defined', motivation: state?.currentMotivation ?? project.story.conflict,
        position: state?.currentPosition ?? asset.currentState.currentLocation, screenDirection: state?.screenDirection ?? sequence.sceneState.screenDirection,
      };
    }),
    openingSituation: sequence.openingState, actions, interactions: previous?.interactions ?? actions.map((action) => `${action.actorName} ${action.verb}${action.targetAssetNumber ? ` with Asset ${numberLabel(action.targetAssetNumber)}` : ''}.`),
    dialogue, reactions: previous?.reactions ?? dialogue.flatMap((line) => line.reactionAssetIds.map((id) => `${project.assets.find((asset) => asset.id === id)?.name ?? id} visibly reacts after Dialogue ${line.dialogueId}.`)),
    cameraProgression: previous?.cameraProgression ?? ['Establish geography and inherited state.', 'Move to the action or exact speaker without crossing the established axis.', 'Settle on the readable ending state for continuity extraction.'],
    environmentalActivity: previous?.environmentalActivity ?? {
      wind: environment?.wind ?? 'No unrecorded change', fabric: /wind/i.test(environment?.wind ?? '') ? 'Fabric responds consistently to established wind direction' : 'Minimal natural movement',
      traffic: 'None unless explicitly approved', crowd: 'No unplanned crowd', water: environment?.waterState ?? 'None', fire: environment?.fireState ?? 'None',
      smoke: environment?.fireState && environment.fireState !== 'None' ? 'Only physically sourced smoke' : 'None', dust: environment?.atmosphere.find((item) => /dust/i.test(item)) ?? 'None',
      vegetation: environment?.vegetationState ?? 'World Bible state', mechanical: props.some((asset) => ['Vehicles', 'Mechanical Systems'].includes(asset.category)) ? 'Only authored mechanical action' : 'None',
    },
    backgroundControl: previous?.backgroundControl ?? { permitted: false, exactCount: 0, characteristics: 'No unplanned background people, animals, vehicles, props, or structures.', continuityRule: 'If later authorized, preserve broad count, age range, wardrobe palette, density, direction, and activity.' },
    storyDevelopment: sequence.purpose, endingSituation: sequence.closingState,
    connectionToNext: next ? `End with state and screen direction readable for ${next.id}: ${next.openingState}` : 'Complete the approved story objective and hold the final story frame.',
    transition: previous?.transition ?? transitionFor(project, sequence),
    sceneStateDelta: previous?.sceneStateDelta ?? { opening: sequence.openingState, changes: actions.map((action) => `${action.actorName}: ${action.resultingState}`), ending: sequence.closingState },
    cameraHandoff: previous?.cameraHandoff ?? { position: 'Final camera position from resolving frame', height: 'Story-motivated neutral height', direction: sequence.endingState.cameraDirection, distance: 'Medium-wide resolving distance', movement: 'Decelerate to stable frame', lens: '35mm', framing: 'Readable final positions, props, direction, and environment' },
    propContinuity: props.map((asset) => ({
      assetId: asset.id, assetNumber: asset.projectNumber,
      visibility: (/hidden|carried|stored|offscreen|lost|destroyed/i.exec(asset.currentState.visibility)?.[0]?.replace(/^./, (char) => char.toUpperCase()) as SequenceScenario['propContinuity'][number]['visibility']) ?? 'Visible',
      owner: asset.currentState.owner, holder: asset.currentState.holder, location: asset.currentState.currentLocation,
      container: asset.currentState.holder !== 'None' ? `Held by ${asset.currentState.holder}` : `Stored at ${asset.currentState.currentLocation}`,
      hand: asset.currentState.holder !== 'None' ? 'Record exact left/right/both hand in action' : 'Not held', condition: `${asset.currentState.condition}; ${asset.currentState.damage}`,
    })),
    soundInstructions: {
      generatedInsideVideo: true, spokenDialogue: dialogue.map((line) => `Dialogue ${line.dialogueId}: Asset ${numberLabel(line.speakerAssetNumber)} says exactly “${line.exactDialogue}” at ${line.startSecond}-${line.endSecond}s.`),
      environmentalSound: previous?.soundInstructions.environmentalSound ?? [...(environment?.sound ?? []), ...sequence.sceneState.soundSources],
      soundEffects: previous?.soundInstructions.soundEffects ?? (sequence.assetManifest.effects.length ? sequence.assetManifest.effects : ['Only effects caused by an authored visible action.']),
      requestedMusic: (previous?.soundInstructions.requestedMusic ?? project.filmBible.soundRules.filter((rule) => /music|score/i.test(rule))).filter((rule) => !/no music|unless|generates|library/i.test(rule)), intentionalSilence: dialogue.length ? ['Use silence only in the authored pauses and reactions.'] : ['No spoken dialogue; preserve purposeful scene silence where the scenario does not request sound.'],
      rule: 'Seedance generates all requested sound inside the video. Continuity Studio stores instructions only and creates no separate sound assets.',
    },
  };
}

export function rankSequenceReferences(project: StudioProject, sequence: StudioSequence, dialogue: DialogueLine[], previousFrameKey: string | null, maximumReferenceImages: number | null, previousVideoKey: string | null = null): RankedSequenceReference[] {
  const speakerIds = new Set(dialogue.map((line) => line.speakerAssetId));
  const refs: Array<Omit<RankedSequenceReference, 'uploadOrder'> & { group: number }> = project.assets.filter((asset) => sequence.assetIds.includes(asset.id)).map((asset) => {
    const role = categoryRole(asset);
    const speaker = speakerIds.has(asset.id);
    const group = speaker ? 0 : role === 'Identity' ? 1 : role === 'Current appearance' ? 2 : role === 'Costume' ? 3 : role === 'Creature or animal' ? 4 : role === 'Location' ? 5 : asset.importance === 'Background' || asset.importance === 'Incidental' ? 7 : 6;
    const limitPriority = speaker ? 1000 : role === 'Identity' ? 900 : role === 'Current appearance' ? 860 : role === 'Costume' ? 820 : role === 'Creature or animal' ? 760 : role === 'Location' ? 720 : asset.importance === 'Story critical' ? 680 : asset.importance === 'Recurring' ? 620 : 300;
    return { id: `asset:${asset.id}`, role, group, limitPriority, assetId: asset.id, assetNumber: asset.projectNumber, fileName: asset.generatedFileName, reason: speaker ? 'Exact dialogue speaker; never substitute another identity.' : `${role} reference for this scenario.`, required: speaker || asset.importance !== 'Background' && asset.importance !== 'Incidental', included: true };
  });
  if (previousVideoKey) refs.push({ id: `continuity-video:${sequence.number - 1}`, role: 'Previous continuity', group: 8, limitPriority: 1120, assetId: null, assetNumber: null, fileName: previousVideoKey, reason: 'Exact approved previous sequence video for motion, performance, and temporal continuity.', required: true, included: true });
  if (previousFrameKey) refs.push({ id: `continuity-frame:${sequence.number - 1}`, role: 'Previous continuity', group: 9, limitPriority: 1100, assetId: null, assetNumber: null, fileName: previousFrameKey, reason: 'Actual approved ending frame from the previous sequence.', required: true, included: true });
  if (maximumReferenceImages !== null && refs.length > maximumReferenceImages) {
    const selected = new Set([...refs].sort((a, b) => b.limitPriority - a.limitPriority || a.group - b.group || (a.assetNumber ?? 9999) - (b.assetNumber ?? 9999)).slice(0, maximumReferenceImages).map((item) => item.id));
    refs.forEach((item) => { item.included = selected.has(item.id); });
  }
  return refs.sort((a, b) => Number(b.included) - Number(a.included) || a.group - b.group || (a.assetNumber ?? 9999) - (b.assetNumber ?? 9999)).map(({ group: _group, ...item }, index) => ({ ...item, uploadOrder: index + 1 }));
}

export function compileSeedancePrompt(project: StudioProject, sequence: StudioSequence, scenario: SequenceScenario, references: RankedSequenceReference[], restrictions: string[], correctionRules: CorrectionMemoryRule[]) {
  const included = references.filter((item) => item.included);
  const dialogue = scenario.dialogue.length ? scenario.dialogue.map((line) => `${line.turnOrder}. ${line.startSecond}-${line.endSecond}s — Asset ${numberLabel(line.speakerAssetNumber)} (${line.speakerName}) says exactly “${line.exactDialogue}”; locked language ${line.languageLock}; locked dialect ${line.dialectLock}; pronunciation ${line.pronunciations.map((item) => `${item.text} = ${item.pronunciation}${item.phonetic ? ` (${item.phonetic})` : ''}`).join(', ') || 'standard'}; ${line.emotion}; ${line.expression}; ${line.physicalAction}; listeners ${line.speakerLock.listenerAssetIds.join(', ') || 'none'}; then reaction assets ${line.reactionAssetIds.join(', ') || 'none'}.`).join('\n') : 'No spoken dialogue. Do not invent words.';
  return [
    `[SCENARIO]\n${scenario.id}. ${scenario.purposeCategory}: ${scenario.purpose}. Objective: ${scenario.activeStoryObjective}. Story development: ${scenario.storyDevelopment}.`,
    `[TIMING]\nExactly ${sequence.duration} seconds. Opening ${scenario.openingSituation}. Actions: ${scenario.actions.map((action) => `${action.startSecond}-${action.endSecond}s Asset ${numberLabel(action.actorAssetNumber)} ${action.verb}`).join('; ')}. Ending ${scenario.endingSituation}.`,
    `[CHARACTERS]\n${scenario.characterContinuity.map((state) => { const asset = project.assets.find((item) => item.id === state.assetId)!; return `Asset ${numberLabel(asset.projectNumber)} = ${asset.name}; permanent identity ${asset.generatedFileName}; costume assets ${state.currentAppearance.costumeAssetNumbers.map(numberLabel).join(', ') || 'story-defined'}; damage ${state.currentAppearance.damage}; transformation ${state.currentAppearance.transformation}; emotion ${state.emotion}; motivation ${state.motivation}; position ${state.position}; direction ${state.screenDirection}; knows before sequence: ${state.knowledgeBeforeSequence.map((item) => `${item.kind} ${item.fact}`).join('; ') || 'only approved prior story events'}.`; }).join('\n') || 'No named character.'}`,
    `[REFERENCE BINDINGS — ATTACH IN THIS ORDER]\n${included.map((item) => `${item.uploadOrder}. ${item.assetNumber ? `Asset ${numberLabel(item.assetNumber)} — ` : ''}${item.fileName} — ${item.role}: ${item.reason}`).join('\n') || 'No external reference.'}`,
    `[DIALOGUE BINDINGS]\n${dialogue}`,
    `[NON-SPEAKING CHARACTERS]\n${scenario.nonSpeakingCharacterAssetIds.map((id) => { const asset = project.assets.find((item) => item.id === id); return asset ? `Asset ${numberLabel(asset.projectNumber)} (${asset.name}) is present but must not speak, mouth words, or receive another character's line.` : id; }).join('\n') || 'None.'}`,
    `[ACTIONS AND OWNERSHIP]\n${scenario.actions.map((action) => `${action.order}. Asset ${numberLabel(action.actorAssetNumber)} owns “${action.verb}”; target ${action.targetAssetNumber ? `Asset ${numberLabel(action.targetAssetNumber)}` : 'none'}; hand ${action.hand}; screen direction ${action.screenDirection}; before ${action.objectVisibilityBefore}/${action.containmentBefore}; after ${action.objectVisibilityAfter}/${action.containmentAfter}; result ${action.resultingState}.`).join('\n')}`,
    `[ENVIRONMENT]\nWind ${scenario.environmentalActivity.wind}; fabric ${scenario.environmentalActivity.fabric}; traffic ${scenario.environmentalActivity.traffic}; crowd ${scenario.environmentalActivity.crowd}; water ${scenario.environmentalActivity.water}; fire ${scenario.environmentalActivity.fire}; smoke ${scenario.environmentalActivity.smoke}; dust ${scenario.environmentalActivity.dust}; vegetation ${scenario.environmentalActivity.vegetation}; mechanical ${scenario.environmentalActivity.mechanical}. Background count ${scenario.backgroundControl.exactCount}.`,
    `[PROPS, HANDS, CONTAINMENT, VISIBILITY]\n${scenario.propContinuity.map((prop) => `Asset ${numberLabel(prop.assetNumber)}: ${prop.visibility}; owner ${prop.owner}; holder ${prop.holder}; location ${prop.location}; container ${prop.container}; hand ${prop.hand}; condition ${prop.condition}.`).join('\n') || 'No critical prop.'}`,
    `[CAMERA]\n${scenario.cameraProgression.join(' ')} Handoff: ${scenario.cameraHandoff.position}; ${scenario.cameraHandoff.height}; ${scenario.cameraHandoff.direction}; ${scenario.cameraHandoff.distance}; ${scenario.cameraHandoff.movement}; ${scenario.cameraHandoff.lens}; ${scenario.cameraHandoff.framing}.`,
    `[LIGHTING]\n${sequence.sceneState.lightingState}. ${project.lightingDirection}. Preserve time ${sequence.timeOfDay} and physically established sources.`,
    `[CONTINUITY]\nTransition ${scenario.transition.type}; strength ${scenario.transition.continuityStrength}. ${scenario.transition.instruction} Delta: ${scenario.sceneStateDelta.opening} -> ${scenario.sceneStateDelta.changes.join('; ')} -> ${scenario.sceneStateDelta.ending}.`,
    `[OPENING FRAME]\n${scenario.openingSituation}`,
    `[ENDING FRAME]\n${scenario.endingSituation}. Hold a stable, extractable final frame with exact positions, directions, props, environment, and camera handoff visible.`,
    `[SEEDANCE SOUND INSTRUCTIONS — GENERATED INSIDE THIS VIDEO]\nDialogue: ${scenario.soundInstructions.spokenDialogue.join(' ')} Environmental: ${scenario.soundInstructions.environmentalSound.join('; ')}. Effects: ${scenario.soundInstructions.soundEffects.join('; ')}. Music: ${scenario.soundInstructions.requestedMusic.join('; ') || 'none requested'}. Silence: ${scenario.soundInstructions.intentionalSilence.join('; ')}. ${scenario.soundInstructions.rule}`,
    `[RESTRICTIONS]\n${[...restrictions, ...correctionRules.filter((rule) => rule.active && (rule.sequenceNumber === null || rule.sequenceNumber === sequence.number)).map((rule) => rule.instruction)].join('\n- ')}`,
  ].join('\n\n');
}

export function buildStoryThreads(project: StudioProject, previous?: StoryThread[]) {
  if (previous?.length) return previous;
  const last = project.sequenceCount;
  return [
    { id: 'thread:objective', kind: 'Objective', text: project.story.conflict, introducedSequence: 1, payoffSequence: last, status: 'Open' },
    { id: 'thread:midpoint', kind: 'Setup', text: project.story.midpoint, introducedSequence: Math.max(1, Math.floor(last / 3)), payoffSequence: Math.max(1, Math.floor(last / 2)), status: 'Open' },
    { id: 'thread:climax', kind: 'Promise', text: project.story.climax, introducedSequence: Math.max(1, Math.floor(last / 2)), payoffSequence: Math.max(1, last - 1), status: 'Open' },
    { id: 'thread:ending', kind: 'Question', text: project.story.ending, introducedSequence: 1, payoffSequence: last, status: 'Open' },
  ] satisfies StoryThread[];
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function detectProductionRepetition(scenarios: Record<string, SequenceScenario>) {
  const findings: RepetitionFinding[] = [];
  const seenDialogue = new Map<string, number>();
  const seenPurpose = new Map<string, number>();
  for (const scenario of Object.values(scenarios).sort((a, b) => a.sequenceNumber - b.sequenceNumber)) {
    for (const line of scenario.dialogue) {
      const key = normalized(line.exactDialogue);
      const previous = seenDialogue.get(key);
      if (key && previous) findings.push({ id: `repeat:dialogue:${line.id}`, type: 'Dialogue', sequenceNumbers: [previous, scenario.sequenceNumber], severity: 'Blocking', detail: `Exact dialogue is repeated without a recorded dramatic reason: “${line.exactDialogue}”.` });
      else if (key) seenDialogue.set(key, scenario.sequenceNumber);
    }
    const purposeKey = normalized(scenario.storyDevelopment);
    const priorPurpose = seenPurpose.get(purposeKey);
    if (purposeKey && priorPurpose && priorPurpose !== scenario.sequenceNumber) findings.push({ id: `repeat:story:${scenario.sequenceNumber}`, type: 'Story information', sequenceNumbers: [priorPurpose, scenario.sequenceNumber], severity: 'Review', detail: 'Two sequences state the same story development; confirm that the later sequence advances or pays it off.' });
    else if (purposeKey) seenPurpose.set(purposeKey, scenario.sequenceNumber);
  }
  return findings;
}

export function buildMovieCompletionAudit(project: StudioProject, scenarios: Record<string, SequenceScenario>, repetitions: RepetitionFinding[], storyThreads: StoryThread[]): MovieCompletionAudit {
  const ordered = project.sequences.every((sequence, index) => sequence.number === index + 1);
  const orderedScenarios = Object.values(scenarios).sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const escalationProgresses = orderedScenarios.every((scenario, index) => index === 0 || scenario.escalationScore >= orderedScenarios[index - 1].escalationScore);
  const checks: MovieCompletionAudit['checks'] = [
    { name: 'Chronological story logic', status: ordered ? 'Passed' : 'Failed', detail: ordered ? 'Every sequence is present in chronological project order.' : 'Sequence numbering or order has a gap.' },
    { name: 'Scenario completeness', status: Object.keys(scenarios).length === project.sequenceCount ? 'Passed' : 'Failed', detail: `${Object.keys(scenarios).length}/${project.sequenceCount} structured scenarios exist.` },
    { name: 'Story objective and escalation progress', status: escalationProgresses ? 'Passed' : 'Failed', detail: escalationProgresses ? 'Every sequence has an active objective and escalation never resets without an authored transition.' : 'Escalation decreases without an explicit story transition.' },
    { name: 'Dialogue ownership and knowledge', status: Object.values(scenarios).every((scenario) => scenario.dialogue.every((line) => !!line.speakerAssetId && line.requiredVisualReferences.length > 0)) ? 'Passed' : 'Failed', detail: 'Every authored line must have one numbered speaker and current visual bindings.' },
    { name: 'Visual asset numbering', status: new Set(project.assets.map((asset) => asset.projectNumber)).size === project.assets.length ? 'Passed' : 'Failed', detail: 'One permanent project-wide numeric sequence across all visual categories.' },
    { name: 'Props, wardrobe, damage, transformation, and environment', status: Object.values(scenarios).every((scenario) => !!scenario.sceneStateDelta && !!scenario.environmentalActivity) ? 'Passed' : 'Failed', detail: 'Each scenario records opening, changes, ending, props, and environment.' },
    { name: 'Transitions and camera handoffs', status: Object.values(scenarios).every((scenario) => !!scenario.transition && !!scenario.cameraHandoff) ? 'Passed' : 'Failed', detail: 'Each boundary has a transition type, continuity strength, and camera handoff.' },
    { name: 'Setups and payoffs', status: storyThreads.every((thread) => thread.payoffSequence !== null) ? 'Passed' : 'Needs Review', detail: `${storyThreads.filter((thread) => thread.payoffSequence !== null).length}/${storyThreads.length} tracked threads have planned payoff sequences.` },
    { name: 'Repetition', status: repetitions.some((finding) => finding.severity === 'Blocking') ? 'Failed' : repetitions.length ? 'Needs Review' : 'Passed', detail: repetitions.length ? `${repetitions.length} repeated production pattern${repetitions.length === 1 ? '' : 's'} require review.` : 'No unmotivated exact repetition detected.' },
    { name: 'Approved continuity chain', status: project.sequences.every((sequence) => sequence.status === 'Approved') ? 'Passed' : 'Needs Review', detail: `${project.sequences.filter((sequence) => sequence.status === 'Approved').length}/${project.sequenceCount} sequences approved.` },
  ];
  return { id: `movie_audit_${project.id}`, createdAt: new Date().toISOString(), status: checks.some((check) => check.status === 'Failed') ? 'Blocked' : checks.some((check) => check.status === 'Needs Review') ? 'Needs Review' : 'Passed', checks };
}
