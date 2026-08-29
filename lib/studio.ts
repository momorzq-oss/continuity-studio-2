export type Approval = 'Draft' | 'Approved';
export type AssetApproval = 'Pending' | 'Approved' | 'Locked' | 'Needs Review';
export type SequenceStatus =
  | 'Planned'
  | 'Ready'
  | 'Generating'
  | 'Generated'
  | 'Passed'
  | 'Needs Review'
  | 'Approved';

export interface StudioAsset {
  id: string;
  name: string;
  category: string;
  description: string;
  storyPurpose: string;
  sequences: number[];
  approvalState: AssetApproval;
  lockState: 'Unlocked' | 'Locked';
  version: number;
  referenceCount: number;
  notes: string;
  continuityConstraints: string[];
}

export interface StudioSequence {
  id: string;
  number: number;
  duration: number;
  title: string;
  purpose: string;
  location: string;
  timeOfDay: string;
  assetIds: string[];
  openingState: string;
  closingState: string;
  continuitySource: string;
  status: SequenceStatus;
  version: number;
  prompt: string;
}

export interface StudioMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata?: {
    kind?: 'story' | 'bible' | 'assets' | 'sequence' | 'status' | 'export' | 'attachment' | 'note';
    sequenceNumber?: number;
    assetIds?: string[];
  };
}

export interface ContinuityEvent {
  id: string;
  sequenceNumber: number;
  assetId: string;
  field: string;
  previousValue: string;
  nextValue: string;
  reason: string;
  createdAt: string;
}

export interface StudioProject {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  archived: boolean;
  idea: string;
  durationSeconds: number;
  sequenceDurationSeconds: number;
  sequenceCount: number;
  genre: string;
  subgenre: string;
  setting: string;
  region: string;
  period: string;
  dialogueLanguage: string;
  aspectRatio: string;
  resolution: string;
  visualStyle: string;
  cameraStyle: string;
  lensDirection: string;
  lightingDirection: string;
  colorDirection: string;
  soundDirection: string;
  story: {
    version: number;
    status: Approval;
    logline: string;
    protagonist: string;
    conflict: string;
    beginning: string;
    escalation: string;
    midpoint: string;
    climax: string;
    ending: string;
  };
  filmBible: {
    version: number;
    status: Approval;
    worldRules: string[];
    characterRules: string[];
    visualRules: string[];
    soundRules: string[];
    continuityRules: string[];
    negativeRules: string[];
  };
  assets: StudioAsset[];
  sequences: StudioSequence[];
  continuity: {
    status: string;
    events: ContinuityEvent[];
  };
  stage: 'Story' | 'Film Bible' | 'Assets' | 'Sequences' | 'Generation' | 'Assembly';
  currentSequence: number;
  exportStatus: string;
  attachments: Array<{
    id: string;
    name: string;
    role: string;
    contentType: string;
    byteSize: number;
    createdAt: string;
  }>;
  settings: {
    automaticMode: boolean;
    imageProvider: string;
    videoProvider: string;
    defaultAspectRatio: string;
    defaultResolution: string;
    privacyMode: boolean;
  };
}

export interface ProjectSummary {
  id: string;
  title: string;
  updatedAt: string;
  durationSeconds: number;
  sequenceCount: number;
  stage: StudioProject['stage'];
  pinned: boolean;
  archived: boolean;
  progress: number;
}

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
};

function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function inferDurationSeconds(text: string, fallback = 180) {
  const lower = text.toLowerCase();
  const numeric = lower.match(/(\d+(?:\.\d+)?)\s*(?:minute|minutes|min\b)/);
  if (numeric) return Math.max(30, Math.round(Number(numeric[1]) * 60));
  for (const [word, value] of Object.entries(numberWords)) {
    if (new RegExp(`\\b${word}[- ]?minute`).test(lower)) return value * 60;
  }
  return fallback;
}

function inferGenre(text: string) {
  const lower = text.toLowerCase();
  if (/horror|scary|terrifying|haunted|monster/.test(lower)) return ['Horror', 'Atmospheric horror'];
  if (/comedy|funny|comic/.test(lower)) return ['Comedy', 'Character comedy'];
  if (/documentary|true story|real life/.test(lower)) return ['Documentary', 'Observational'];
  if (/science fiction|sci-fi|space|future/.test(lower)) return ['Science fiction', 'Speculative drama'];
  if (/thriller|chase|conspiracy/.test(lower)) return ['Thriller', 'Suspense'];
  if (/romance|love story/.test(lower)) return ['Romance', 'Drama'];
  if (/fantasy|myth|magic/.test(lower)) return ['Fantasy', 'Mythic adventure'];
  return ['Drama', 'Cinematic short'];
}

function inferContext(text: string) {
  const lower = text.toLowerCase();
  const region = /uae|emirates|dubai|abu dhabi/.test(lower)
    ? 'United Arab Emirates'
    : /desert/.test(lower)
      ? 'Desert region'
      : 'Unspecified region';
  const period = text.match(/\b(18|19|20)\d{2}\b/)?.[0] ?? 'Contemporary';
  const setting = /desert/.test(lower)
    ? 'Open desert and an isolated encampment'
    : /city|urban/.test(lower)
      ? 'Urban environment'
      : /forest|woods/.test(lower)
        ? 'Remote woodland'
        : /space|planet/.test(lower)
          ? 'Deep-space environment'
          : 'Story-defined locations';
  return { region, period, setting };
}

function inferTitle(text: string) {
  const lower = text.toLowerCase();
  if (/camp/.test(lower) && /(dark|night|horror|strange)/.test(lower)) return 'The Camp After Dark';
  if (/desert/.test(lower)) return 'Across the Empty Sand';
  if (/space|planet/.test(lower)) return 'Beyond the Last Signal';
  if (/forest|woods/.test(lower)) return 'Where the Trees Listen';
  const about = text.match(/about\s+(?:an?|the)?\s*([^,.]{3,52})/i)?.[1]?.trim();
  if (about) {
    const words = about.split(/\s+/).slice(0, 6);
    return words.map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  }
  return 'Untitled Production';
}

function makeAssets(idea: string, sequenceCount: number, setting: string): StudioAsset[] {
  const lower = idea.toLowerCase();
  const allSequences = Array.from({ length: sequenceCount }, (_, i) => i + 1);
  const protagonist = /traveller|traveler/.test(lower) ? 'The Traveller' : 'Protagonist';
  const assets: StudioAsset[] = [
    {
      id: 'CHARACTER_001',
      name: protagonist,
      category: 'Characters',
      description: `The story’s central character. Identity, silhouette, proportions, wardrobe, and physical state must stay stable across the production.`,
      storyPurpose: 'Carries the audience through the story.',
      sequences: allSequences,
      approvalState: 'Pending',
      lockState: 'Unlocked',
      version: 1,
      referenceCount: 0,
      notes: 'A likeness reference can be attached directly in chat.',
      continuityConstraints: ['One consistent identity', 'Track wardrobe, injuries, dirt, and held objects'],
    },
    {
      id: 'LOCATION_001',
      name: /desert/.test(lower) ? 'Desert Crossing' : 'Primary Location',
      category: 'Locations',
      description: setting,
      storyPurpose: 'Primary world and spatial anchor.',
      sequences: allSequences,
      approvalState: 'Pending',
      lockState: 'Unlocked',
      version: 1,
      referenceCount: 0,
      notes: '',
      continuityConstraints: ['Track time of day, weather, damage, and object placement'],
    },
  ];

  if (/camp|encampment/.test(lower)) {
    assets.push({
      id: 'LOCATION_002', name: 'The Strange Camp', category: 'Locations',
      description: 'An isolated camp whose layout and practical light sources remain spatially consistent.',
      storyPurpose: 'The story’s discovery point and primary source of unease.',
      sequences: allSequences.filter((n) => n > Math.floor(sequenceCount / 3)), approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Lock tent placement, fire state, entrances, and practical lights'],
    });
  }
  if (/horror|strange|monster|creature|haunted/.test(lower)) {
    assets.push({
      id: 'CREATURE_001', name: 'The Presence', category: 'Creatures',
      description: 'An unsettling, partially obscured threat. Its scale, silhouette, and transformation state remain controlled.',
      storyPurpose: 'Antagonistic force.', sequences: allSequences.filter((n) => n >= Math.ceil(sequenceCount / 2)), approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Never duplicate', 'Lock silhouette, scale, damage, and behavior state'],
    });
  }
  if (/camel/.test(lower)) {
    assets.push({
      id: 'ANIMAL_001', name: 'Traveller’s Camel', category: 'Animals',
      description: 'One identifiable camel with permanent tack, blanket, rope, and saddle references.',
      storyPurpose: 'Transport and emotional continuity anchor.', sequences: allSequences, approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Exactly one camel', 'Track saddle, blanket, rope, injuries, and position'],
    });
    assets.push({
      id: 'PROP_001', name: 'Camel Saddle', category: 'Props',
      description: 'Period-appropriate saddle and tack, always mapped to ANIMAL_001.',
      storyPurpose: 'Recurring visual and continuity detail.', sequences: allSequences, approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Must remain attached to ANIMAL_001 unless the script records a change'],
    });
  }
  if (/night|dark|lantern|camp/.test(lower)) {
    assets.push({
      id: `PROP_${String(assets.some((asset) => asset.id === 'PROP_001') ? 2 : 1).padStart(3, '0')}`,
      name: 'Lantern', category: 'Props',
      description: 'A practical period-appropriate lantern whose owner, hand, flame, position, and damage are tracked.',
      storyPurpose: 'Motivated light source and suspense device.', sequences: allSequences.filter((n) => n > 1), approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Track who holds it, flame state, placement, and damage'],
    });
  }
  assets.push({
    id: 'COSTUME_001', name: `${protagonist} Wardrobe`, category: 'Costumes',
    description: `A period-appropriate complete wardrobe for ${protagonist}, including footwear, accessories, and optional head covering.`,
    storyPurpose: 'Locks the protagonist’s silhouette and temporal condition.', sequences: allSequences, approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
    continuityConstraints: ['Track head covering, dust, tears, wetness, and blood'],
  });
  return assets;
}

function buildPrompt(project: Pick<StudioProject, 'aspectRatio' | 'resolution' | 'visualStyle' | 'cameraStyle' | 'lensDirection' | 'lightingDirection' | 'colorDirection' | 'soundDirection'>, sequence: Omit<StudioSequence, 'prompt'>) {
  return [
    `${sequence.id} — ${sequence.duration} seconds`,
    `Format: ${project.aspectRatio}, ${project.resolution}. Generation mode: reference-led cinematic sequence.`,
    `Continuity source: ${sequence.continuitySource}.`,
    `Reference assets: ${sequence.assetIds.join(', ')}. Use exactly these identities and no unplanned recurring elements.`,
    `Opening frame: ${sequence.openingState}.`,
    `Location/time: ${sequence.location}; ${sequence.timeOfDay}.`,
    `Visual direction: ${project.visualStyle}. Camera: ${project.cameraStyle}. Lens: ${project.lensDirection}.`,
    `Lighting: ${project.lightingDirection}. Color: ${project.colorDirection}.`,
    `Primary action and performance: ${sequence.purpose}.`,
    `Sound: ${project.soundDirection}.`,
    `Ending frame: ${sequence.closingState}.`,
    'Negative constraints: no duplicate protagonist, no identity morphing, no extra people, no untracked props, no wardrobe changes, no unexplained location changes, no conflicting screen direction.',
  ].join('\n');
}

function makeSequences(project: Omit<StudioProject, 'sequences'>): StudioSequence[] {
  const beats = ['Arrival', 'Orientation', 'First disturbance', 'Discovery', 'Escalation', 'Point of no return', 'Revelation', 'Confrontation', 'Reversal', 'Final pursuit', 'Climax', 'Aftermath'];
  let remaining = project.durationSeconds;
  const sequences: StudioSequence[] = [];
  for (let index = 0; index < project.sequenceCount; index += 1) {
    const number = index + 1;
    const duration = Math.min(project.sequenceDurationSeconds, remaining);
    remaining -= duration;
    const title = beats[Math.min(Math.floor((index / Math.max(1, project.sequenceCount - 1)) * (beats.length - 1)), beats.length - 1)];
    const relevantAssets = project.assets.filter((asset) => asset.sequences.includes(number)).map((asset) => asset.id);
    const openingState = number === 1 ? `Establish ${project.story.protagonist} and the untouched world.` : `Inherit the approved closing state of SEQUENCE_${String(number - 1).padStart(3, '0')}.`;
    const closingState = number === project.sequenceCount ? `Resolve the immediate conflict and hold the final emotional image.` : `End on a specific physical and emotional change that motivates Sequence ${number + 1}.`;
    const sequenceBase: Omit<StudioSequence, 'prompt'> = {
      id: `SEQUENCE_${String(number).padStart(3, '0')}`,
      number,
      duration,
      title,
      purpose: number === 1 ? project.story.beginning : number === project.sequenceCount ? project.story.ending : `${title}: advance the central conflict without repeating the previous action.`,
      location: number > Math.floor(project.sequenceCount / 3) && project.assets.some((asset) => asset.id === 'LOCATION_002') ? 'LOCATION_002 — The Strange Camp' : 'LOCATION_001 — Primary story location',
      timeOfDay: /night|dark/i.test(project.idea) ? 'Night' : 'Story-defined progression',
      assetIds: relevantAssets,
      openingState,
      closingState,
      continuitySource: number === 1 ? 'Film Bible and approved reference assets' : `Approved ending state of SEQUENCE_${String(number - 1).padStart(3, '0')}`,
      status: 'Planned',
      version: 1,
    };
    sequences.push({ ...sequenceBase, prompt: buildPrompt(project, sequenceBase) });
  }
  return sequences;
}

export function createProjectFromIdea(idea: string): StudioProject {
  const createdAt = nowIso();
  const [genre, subgenre] = inferGenre(idea);
  const { region, period, setting } = inferContext(idea);
  const durationSeconds = inferDurationSeconds(idea);
  const sequenceDurationSeconds = 30;
  const sequenceCount = Math.ceil(durationSeconds / sequenceDurationSeconds);
  const protagonist = /traveller|traveler/i.test(idea) ? 'The Traveller' : 'The protagonist';
  const title = inferTitle(idea);
  const story = {
    version: 1,
    status: 'Draft' as const,
    logline: `${protagonist} enters ${setting.toLowerCase()} and faces a discovery that turns the journey into a test of survival and resolve.`,
    protagonist,
    conflict: `A clear outward obstacle forces ${protagonist.toLowerCase()} to confront an escalating personal and physical threat.`,
    beginning: `Establish ${protagonist.toLowerCase()}, the journey, the world’s normal rules, and the first unease.`,
    escalation: 'Each sequence narrows the available choices while revealing a new consequence of the central mystery.',
    midpoint: 'The apparent explanation collapses, making the threat immediate and personal.',
    climax: `${protagonist} must act with incomplete information as the visual and emotional continuity converge.`,
    ending: 'Resolve the immediate action while leaving a final image that feels earned by every earlier sequence.',
  };
  const filmBible = {
    version: 1,
    status: 'Draft' as const,
    worldRules: [`Period: ${period}. Region: ${region}.`, 'The environment changes only when a sequence records the change.'],
    characterRules: ['One stable identity per character asset ID.', 'Wardrobe, position, injuries, dirt, wetness, and held objects carry forward.'],
    visualRules: ['Grounded cinematic realism with restrained stylization.', 'Motivated camera movement; no decorative coverage that breaks geography.'],
    soundRules: ['Preserve environmental perspective.', 'No music or subtitles unless the user adds them to the Film Bible.'],
    continuityRules: ['Every approved closing state becomes the next expected opening state.', 'Exact stable asset IDs must be listed in every sequence.'],
    negativeRules: ['No duplicate identities.', 'No unplanned people, props, animals, vehicles, creatures, or locations.', 'No unexplained costume, light, weather, or screen-direction changes.'],
  };
  const projectBase = {
    id: uid('project'), title, createdAt, updatedAt: createdAt, pinned: false, archived: false, idea,
    durationSeconds, sequenceDurationSeconds, sequenceCount, genre, subgenre, setting, region, period,
    dialogueLanguage: 'Story-defined', aspectRatio: '16:9', resolution: '4K',
    visualStyle: genre === 'Horror' ? 'Grounded atmospheric realism with controlled shadows and tactile texture' : 'Grounded cinematic realism with coherent production design',
    cameraStyle: 'Deliberate, motivated movement with stable screen direction', lensDirection: '35mm and 50mm natural-perspective language',
    lightingDirection: /night|dark/i.test(idea) ? 'Motivated night sources with protected facial identity' : 'Motivated naturalistic light with consistent direction',
    colorDirection: genre === 'Horror' ? 'Muted earth tones, deep navy shadows, restrained warm practicals' : 'Natural color with a controlled tonal arc',
    soundDirection: 'Production-led ambience, clear dialogue, and purposeful silence', story, filmBible,
    assets: [] as StudioAsset[], continuity: { status: 'Not started', events: [] as ContinuityEvent[] },
    stage: 'Story' as const, currentSequence: 1, exportStatus: 'Not exported', attachments: [],
    settings: { automaticMode: true, imageProvider: 'Not connected', videoProvider: 'Seedance prompt adapter', defaultAspectRatio: '16:9', defaultResolution: '4K', privacyMode: true },
  };
  projectBase.assets = makeAssets(idea, sequenceCount, setting);
  return { ...projectBase, sequences: makeSequences(projectBase) };
}

export function projectProgress(project: StudioProject) {
  const milestones = [
    project.story.status === 'Approved',
    project.filmBible.status === 'Approved',
    project.assets.length > 0 && project.assets.every((asset) => asset.approvalState === 'Locked' || asset.approvalState === 'Approved'),
    project.sequences.some((sequence) => sequence.status === 'Approved'),
    project.sequences.length > 0 && project.sequences.every((sequence) => sequence.status === 'Approved'),
  ];
  return Math.round((milestones.filter(Boolean).length / milestones.length) * 100);
}

export function summarizeProject(project: StudioProject): ProjectSummary {
  return {
    id: project.id, title: project.title, updatedAt: project.updatedAt, durationSeconds: project.durationSeconds,
    sequenceCount: project.sequenceCount, stage: project.stage, pinned: project.pinned, archived: project.archived,
    progress: projectProgress(project),
  };
}

function rebuildSequences(project: StudioProject, durationSeconds: number) {
  project.durationSeconds = durationSeconds;
  project.sequenceCount = Math.ceil(durationSeconds / project.sequenceDurationSeconds);
  project.assets = project.assets.map((asset) => ({
    ...asset,
    sequences: Array.from({ length: project.sequenceCount }, (_, i) => i + 1).filter((n) => asset.category !== 'Creatures' || n >= Math.ceil(project.sequenceCount / 2)),
    approvalState: asset.approvalState === 'Locked' ? 'Needs Review' : asset.approvalState,
  }));
  project.sequences = makeSequences(project);
  project.stage = 'Story';
}

function findAsset(project: StudioProject, text: string) {
  const lower = text.toLowerCase();
  const explicitId = lower.match(/(character|creature|animal|location|interior|vehicle|prop|weapon|costume)[ _-]?(\d+)/)?.slice(1);
  if (explicitId) {
    const stable = `${explicitId[0].toUpperCase()}_${String(Number(explicitId[1])).padStart(3, '0')}`;
    return project.assets.find((asset) => asset.id === stable);
  }
  return project.assets.find((asset) => lower.includes(asset.name.toLowerCase())) ?? project.assets.find((asset) => lower.includes(asset.id.toLowerCase()));
}

function message(content: string, metadata?: StudioMessage['metadata']): StudioMessage {
  return { id: uid('message'), role: 'assistant', content, createdAt: nowIso(), metadata };
}

export function interpretStudioMessage(project: StudioProject, input: string): { project: StudioProject; response: StudioMessage; sideEffect?: 'export' } {
  const next = structuredClone(project);
  const lower = input.trim().toLowerCase();
  next.updatedAt = nowIso();

  const requestedDuration = inferDurationSeconds(input, 0);
  if (requestedDuration > 0 && /(make it|change|duration|movie|minute)/.test(lower)) {
    rebuildSequences(next, requestedDuration);
    next.story.version += 1;
    next.story.status = 'Draft';
    next.filmBible.status = 'Draft';
    return { project: next, response: message(`The movie is now ${requestedDuration / 60} minutes: ${next.sequenceCount} sequences at 30 seconds${requestedDuration % 30 ? ', with a shorter final sequence' : ''}. I kept the prior version and marked the story and Film Bible for review.`, { kind: 'status' }) };
  }

  if (/approve(?: the)? story|story approved/.test(lower)) {
    next.story.status = 'Approved';
    next.stage = 'Film Bible';
    return { project: next, response: message(`Story approved. I’ve prepared Film Bible v${next.filmBible.version} with the visual, sound, identity, and continuity rules for this production.`, { kind: 'bible' }) };
  }
  if (/approve(?: the)? film bible|film bible approved|approve bible/.test(lower)) {
    next.filmBible.status = 'Approved';
    next.stage = 'Assets';
    return { project: next, response: message(`Film Bible approved. The asset manifest contains ${next.assets.length} tracked assets. ${next.assets[0]?.name ?? 'The main character'} still needs an approved identity reference before sequence generation.`, { kind: 'assets', assetIds: next.assets.map((asset) => asset.id) }) };
  }
  if (/use my (?:photo|picture|image)|main character reference|my likeness/.test(lower)) {
    const mainCharacter = next.assets.find((item) => item.id === 'CHARACTER_001');
    if (!mainCharacter) {
      return { project: next, response: message('The main character asset is not in the current manifest. I kept the instruction and marked the story for review.', { kind: 'note' }) };
    }
    if (mainCharacter.referenceCount === 0) {
      return { project: next, response: message(`Attach one or more clear images here. I’ll store the originals under ${mainCharacter.id}, build the identity profile, and keep the likeness locked across every sequence.`, { kind: 'assets', assetIds: [mainCharacter.id] }) };
    }
    mainCharacter.approvalState = 'Needs Review';
    mainCharacter.notes = `${mainCharacter.referenceCount} likeness reference${mainCharacter.referenceCount === 1 ? '' : 's'} attached; character sheet approval is pending.`;
    return { project: next, response: message(`${mainCharacter.referenceCount} reference image${mainCharacter.referenceCount === 1 ? ' is' : 's are'} attached to ${mainCharacter.id}. The identity profile is ready for a character-sheet provider.`, { kind: 'assets', assetIds: [mainCharacter.id] }) };
  }
  if (/approve all assets|lock all assets/.test(lower)) {
    next.assets = next.assets.map((asset) => ({ ...asset, approvalState: 'Locked', lockState: 'Locked' }));
    next.stage = 'Sequences';
    return { project: next, response: message(`All ${next.assets.length} assets are approved and locked. The ${next.sequenceCount}-sequence plan is ready for review.`, { kind: 'sequence', sequenceNumber: 1 }) };
  }

  const asset = findAsset(next, input);
  if (asset && /approve|lock/.test(lower)) {
    asset.approvalState = 'Locked';
    asset.lockState = 'Locked';
    const remaining = next.assets.filter((item) => item.approvalState !== 'Locked' && item.approvalState !== 'Approved').length;
    if (remaining === 0) next.stage = 'Sequences';
    return { project: next, response: message(`${asset.name} (${asset.id}) is approved and identity-locked. ${remaining ? `${remaining} assets still need review.` : 'All required assets are now ready.'}`, { kind: 'assets', assetIds: [asset.id] }) };
  }
  if (asset && /regenerate|new version|try again/.test(lower)) {
    asset.version += 1;
    asset.approvalState = 'Pending';
    asset.lockState = 'Unlocked';
    return { project: next, response: message(`I created ${asset.id} version ${asset.version} as a new pending version. The previously approved version is preserved and can be restored at any time.`, { kind: 'assets', assetIds: [asset.id] }) };
  }

  if (/show (?:me )?(?:all )?characters|\/characters/.test(lower)) {
    const characters = next.assets.filter((item) => item.category === 'Characters');
    return { project: next, response: message(`${characters.length} character${characters.length === 1 ? '' : 's'} in this movie: ${characters.map((item) => `${item.name} (${item.id})`).join(', ')}.`, { kind: 'assets', assetIds: characters.map((item) => item.id) }) };
  }
  if (/show (?:me )?(?:all )?locations|\/locations/.test(lower)) {
    const locations = next.assets.filter((item) => ['Locations', 'Interiors'].includes(item.category));
    return { project: next, response: message(`${locations.length} location asset${locations.length === 1 ? '' : 's'}: ${locations.map((item) => `${item.name} (${item.id})`).join(', ')}.`, { kind: 'assets', assetIds: locations.map((item) => item.id) }) };
  }
  if (/show (?:me )?(?:all )?assets|how many assets|asset manifest|\/assets/.test(lower)) {
    const counts = Object.entries(next.assets.reduce<Record<string, number>>((acc, item) => { acc[item.category] = (acc[item.category] ?? 0) + 1; return acc; }, {}));
    return { project: next, response: message(`${next.assets.length} total assets: ${counts.map(([category, count]) => `${count} ${category.toLowerCase()}`).join(', ')}.`, { kind: 'assets', assetIds: next.assets.map((item) => item.id) }) };
  }

  const sequenceNumber = Number(lower.match(/sequence\s*(\d+)/)?.[1] ?? 0);
  const sequence = next.sequences.find((item) => item.number === sequenceNumber);
  if (sequence && /approve/.test(lower)) {
    sequence.status = 'Approved';
    next.currentSequence = Math.min(next.sequenceCount, sequence.number + 1);
    next.continuity.status = 'Passed';
    const following = next.sequences.find((item) => item.number === sequence.number + 1);
    if (following) following.continuitySource = `Approved ending state of ${sequence.id}`;
    const event: ContinuityEvent = {
      id: uid('continuity'), sequenceNumber: sequence.number, assetId: next.assets[0]?.id ?? 'PROJECT', field: 'sequence boundary',
      previousValue: sequence.openingState, nextValue: sequence.closingState, reason: 'Approved sequence closing state', createdAt: nowIso(),
    };
    next.continuity.events.push(event);
    if (next.sequences.every((item) => item.status === 'Approved')) next.stage = 'Assembly';
    return { project: next, response: message(`${sequence.id} is approved. Its closing state is now the continuity source for ${following?.id ?? 'final assembly'}.`, { kind: 'sequence', sequenceNumber: sequence.number }) };
  }
  if (sequence && /generate/.test(lower)) {
    const blockers: string[] = [];
    if (next.story.status !== 'Approved') blockers.push('story approval');
    if (next.filmBible.status !== 'Approved') blockers.push('Film Bible approval');
    const pending = sequence.assetIds.filter((id) => next.assets.find((item) => item.id === id)?.approvalState !== 'Locked');
    if (pending.length) blockers.push(`${pending.length} locked reference asset${pending.length === 1 ? '' : 's'}`);
    if (blockers.length) return { project: next, response: message(`${sequence.id} is safe, but generation is blocked by ${blockers.join(', ')}. I kept its prompt and all existing work unchanged.`, { kind: 'sequence', sequenceNumber: sequence.number }) };
    sequence.status = 'Ready';
    next.stage = 'Generation';
    return { project: next, response: message(`${sequence.id} passed its dependency check. The Seedance prompt is ready; connect a video provider in Settings to start the generation job.`, { kind: 'sequence', sequenceNumber: sequence.number }) };
  }
  if (sequence && /(show|prompt|seedance)/.test(lower)) {
    return { project: next, response: message(`${sequence.id} is ${sequence.status.toLowerCase()}. It uses ${sequence.assetIds.join(', ')} and inherits continuity from ${sequence.continuitySource}.`, { kind: 'sequence', sequenceNumber: sequence.number }) };
  }
  if (/show (?:me )?(?:all )?sequences|sequence plan|\/sequences/.test(lower)) {
    return { project: next, response: message(`${next.sequenceCount} sequences total. Each planned sequence stores exact asset IDs, opening and closing states, a continuity source, and a production-ready Seedance prompt.`, { kind: 'sequence', sequenceNumber: next.currentSequence }) };
  }

  if (/head covering/.test(lower) && sequenceNumber > 0) {
    const protagonistAsset = next.assets.find((item) => item.id === 'CHARACTER_001');
    const remove = /remove|off|without/.test(lower);
    const event: ContinuityEvent = {
      id: uid('continuity'), sequenceNumber, assetId: protagonistAsset?.id ?? 'CHARACTER_001', field: 'head covering',
      previousValue: remove ? 'ON' : 'OFF', nextValue: remove ? 'OFF' : 'ON', reason: input, createdAt: nowIso(),
    };
    next.continuity.events.push(event);
    next.sequences.filter((item) => item.number >= sequenceNumber).forEach((item) => { item.status = 'Needs Review'; item.version += 1; });
    return { project: next, response: message(`Recorded: ${event.assetId} head covering is ${event.nextValue} from Sequence ${sequenceNumber}. I marked Sequence ${sequenceNumber} and every later sequence for continuity review.`, { kind: 'sequence', sequenceNumber }) };
  }

  if (/make (?:the )?(?:entire )?movie.*night|night only/.test(lower)) {
    next.filmBible.version += 1;
    next.filmBible.status = 'Draft';
    next.lightingDirection = 'Night-only motivated lighting with stable direction and exposure rules';
    next.filmBible.visualRules.push('Every sequence occurs at night; no daylight or dawn imagery.');
    next.sequences.forEach((item) => { item.timeOfDay = 'Night'; item.status = 'Needs Review'; item.version += 1; });
    return { project: next, response: message(`Film Bible v${next.filmBible.version} now locks the entire movie to night. All ${next.sequenceCount} sequences are marked for review; their previous approved versions are preserved.`, { kind: 'bible' }) };
  }

  if (/status|\/status/.test(lower)) {
    const approvedAssets = next.assets.filter((item) => item.approvalState === 'Locked' || item.approvalState === 'Approved').length;
    const approvedSequences = next.sequences.filter((item) => item.status === 'Approved').length;
    return { project: next, response: message(`${next.title}: Story ${next.story.status}. Film Bible ${next.filmBible.status}. Assets ${approvedAssets}/${next.assets.length} approved. Sequences ${approvedSequences}/${next.sequenceCount} approved. Current Sequence ${next.currentSequence}. Continuity ${next.continuity.status}.`, { kind: 'status' }) };
  }

  if (/export (?:the )?(?:whole|full|entire|everything|project)|\/export/.test(lower)) {
    next.exportStatus = 'Ready';
    return { project: next, response: message(`The complete project package is ready. It includes the project state, story, Film Bible, asset manifest, sequence plan, prompts, continuity report, references, and export history. API keys are never included.`, { kind: 'export' }), sideEffect: 'export' };
  }

  if (/^continue\.?$|what(?:'s| is) next/.test(lower)) {
    if (next.story.status !== 'Approved') return { project: next, response: message('Your story draft is ready. Review it here, then say “Approve the story” when its direction feels right.', { kind: 'story' }) };
    if (next.filmBible.status !== 'Approved') return { project: next, response: message('The next step is the Film Bible. It locks the world, visual language, sound, and continuity rules before asset approval.', { kind: 'bible' }) };
    const pending = next.assets.filter((item) => item.approvalState !== 'Locked');
    if (pending.length) return { project: next, response: message(`${pending.length} assets need approval. Start with ${pending[0].name} (${pending[0].id}); attach a reference or ask me to prepare an AI generation brief.`, { kind: 'assets', assetIds: [pending[0].id] }) };
    const pendingSequence = next.sequences.find((item) => item.status !== 'Approved');
    if (pendingSequence) return { project: next, response: message(`Next is ${pendingSequence.id}: ${pendingSequence.title}. Its asset mapping and continuity source are ready for review.`, { kind: 'sequence', sequenceNumber: pendingSequence.number }) };
    return { project: next, response: message('Every sequence is approved. The production is ready for final assembly and a complete project export.', { kind: 'export' }) };
  }

  next.story.version += 1;
  next.story.status = 'Draft';
  next.sequences.forEach((item) => { if (item.status === 'Approved') item.status = 'Needs Review'; });
  return { project: next, response: message(`I recorded that creative direction in Story v${next.story.version}. Existing approved material is preserved, and affected sequence assumptions are marked for review.`, { kind: 'note' }) };
}
