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
  projectNumber: number;
  generatedFileName: string;
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
  importance: 'Story critical' | 'Recurring' | 'Location anchor' | 'Background' | 'Incidental';
  referenceDepth: 'Comprehensive' | 'Standard' | 'Minimal';
  permanentIdentity: string;
  referenceCoverage: {
    identity: number;
    face: number;
    profile: number;
    body: number;
    rear: number;
    costume: number;
    object: number;
    location: number;
    material: number;
    continuity: number;
  };
  currentState: {
    condition: string;
    owner: string;
    holder: string;
    currentLocation: string;
    previousLocation: string;
    damage: string;
    transformation: string;
    visibility: string;
  };
}

export interface WorldBible {
  version: number;
  status: Approval;
  geography: string;
  historicalPeriod: string;
  culture: string;
  technologyLevel: string;
  architecture: string[];
  constructionMaterials: string[];
  interiorDesign: string[];
  furnitureStyle: string[];
  terrain: string[];
  climate: string[];
  vegetation: string[];
  transportation: string[];
  wardrobeRules: string[];
  objectRules: string[];
  weaponRules: string[];
  languageRules: string[];
  visualRules: string[];
  lightingRules: string[];
  environmentalRules: string[];
  physicalRules: string[];
  restrictions: string[];
}

export interface WorldLocation {
  id: string;
  name: string;
  type: 'Exterior' | 'Interior' | 'Connected space';
  description: string;
  period: string;
  geography: string;
  terrain: string;
  architecture: string;
  scale: string;
  dimensions: string;
  materials: { ground: string; walls: string; floor: string; ceiling: string };
  entrances: string[];
  exits: string[];
  doors: string[];
  windows: string[];
  furniture: string[];
  permanentObjects: string[];
  temporaryObjects: string[];
  lightingSources: string[];
  environmentalFeatures: string[];
  vegetation: string[];
  weatherStates: string[];
  timeStates: string[];
  damageState: string;
  soundSources: string[];
  characterAccessPoints: string[];
  cameraAccess: string[];
  connectedLocationIds: string[];
  sequences: number[];
  version: number;
}

export interface EnvironmentState {
  id: string;
  locationId: string;
  label: string;
  weather: string;
  atmosphere: string[];
  wind: string;
  visibility: string;
  surfaceConditions: string[];
  vegetationState: string;
  fireState: string;
  waterState: string;
  debris: string[];
  tracks: string[];
  lighting: string;
  timeOfDay: string;
  sound: string[];
  activeFromSequence: number;
  activeThroughSequence: number;
}

export interface SceneGraphNode {
  id: string;
  kind: string;
  label: string;
  state: string;
}

export interface SceneGraphEdge {
  id: string;
  from: string;
  to: string;
  relationship: string;
  sequenceNumber: number;
}

export interface SceneState {
  sequenceId: string;
  locationId: string;
  environmentId: string;
  characterStates: Record<string, string>;
  costumeStates: Record<string, string>;
  creatureStates: Record<string, string>;
  animalStates: Record<string, string>;
  vehicleStates: Record<string, string>;
  propStates: Record<string, string>;
  furnitureStates: Record<string, string>;
  objectPlacements: Record<string, string>;
  lightingState: string;
  weatherState: string;
  effects: string[];
  soundSources: string[];
  cameraDirection: string;
  screenDirection: string;
  spatialRelationships: string[];
  storyState: string;
  previousContinuitySource: string;
  expectedEndingState: string;
}

export interface EndingState {
  characterPositions: Record<string, string>;
  characterDirections: Record<string, string>;
  characterConditions: Record<string, string>;
  wardrobe: Record<string, string>;
  heldObjects: Record<string, string>;
  droppedObjects: string[];
  animalStates: Record<string, string>;
  creatureStates: Record<string, string>;
  vehicleStates: Record<string, string>;
  propStates: Record<string, string>;
  environmentState: string;
  locationDamage: string;
  lighting: string;
  weather: string;
  effects: string[];
  cameraDirection: string;
  screenDirection: string;
  elapsedTimeSeconds: number;
  soundState: string[];
}

export interface AssetStateEvent {
  id: string;
  sequenceNumber: number;
  assetId: string;
  assetNumber: number;
  eventType: string;
  previousState: string;
  nextState: string;
  locationId: string;
  actorId: string;
  notes: string;
  createdAt: string;
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
  assetNumbers: number[];
  assetFiles: string[];
  openingState: string;
  closingState: string;
  continuitySource: string;
  status: SequenceStatus;
  version: number;
  prompt: string;
  assetManifest: {
    characters: string[];
    costumes: string[];
    creatures: string[];
    animals: string[];
    vehicles: string[];
    locations: string[];
    interiors: string[];
    environments: string[];
    props: string[];
    weapons: string[];
    furniture: string[];
    mechanical: string[];
    transformations: string[];
    damageStates: string[];
    lighting: string[];
    sound: string[];
    effects: string[];
  };
  sceneState: SceneState;
  sceneGraph: { nodes: SceneGraphNode[]; edges: SceneGraphEdge[] };
  endingState: EndingState;
  lookAhead: string[];
}

export interface StudioMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  metadata?: {
    kind?: 'story' | 'bible' | 'world' | 'assets' | 'sequence' | 'scene' | 'graph' | 'coverage' | 'lookahead' | 'status' | 'export' | 'flat-assets' | 'attachment' | 'note';
    sequenceNumber?: number;
    assetIds?: string[];
  };
}

export interface ContinuityEvent {
  id: string;
  sequenceNumber: number;
  assetId: string;
  assetNumber: number;
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
  worldBible: WorldBible;
  locations: WorldLocation[];
  environments: EnvironmentState[];
  assets: StudioAsset[];
  flatAssetFolder: {
    rule: 'SINGLE FLAT ASSET FOLDER RULE';
    folderName: string;
    nextUnusedNumber: number;
    namingFormat: 'NNN_NAME_GENERATED.png';
    subfoldersAllowed: false;
  };
  sequences: StudioSequence[];
  continuity: {
    status: string;
    events: ContinuityEvent[];
  };
  knowledgeGraph: { nodes: SceneGraphNode[]; edges: SceneGraphEdge[] };
  stateEvents: AssetStateEvent[];
  stage: 'Story' | 'World Bible' | 'Film Bible' | 'Assets' | 'Sequences' | 'Generation' | 'Assembly';
  currentSequence: number;
  exportStatus: string;
  attachments: Array<{
    id: string;
    name: string;
    role: string;
    contentType: string;
    byteSize: number;
    createdAt: string;
    referenceRoles: string[];
    linkedAssetId?: string;
    linkedAssetNumber?: number;
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

export function formatAssetNumber(value: number) {
  return String(Math.max(0, Math.trunc(value))).padStart(3, '0');
}

function filenamePart(value: string) {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toUpperCase() || 'ASSET';
}

export function numberedAssetFileName(asset: Pick<StudioAsset, 'projectNumber' | 'name'>) {
  return `${formatAssetNumber(asset.projectNumber)}_${filenamePart(asset.name)}_GENERATED.png`;
}

export function assetProductionReference(asset: Pick<StudioAsset, 'projectNumber' | 'name' | 'generatedFileName'>) {
  return `Asset ${formatAssetNumber(asset.projectNumber)} · ${asset.name} · ${asset.generatedFileName}`;
}

export function flatAssetFolderName(title: string) {
  return `${filenamePart(title)}_ASSETS`;
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

function makeAssetIntelligence(
  permanentIdentity: string,
  importance: StudioAsset['importance'],
  category: string,
): Pick<StudioAsset, 'importance' | 'referenceDepth' | 'permanentIdentity' | 'referenceCoverage' | 'currentState'> {
  const comprehensive = importance === 'Story critical' || importance === 'Location anchor';
  return {
    importance,
    referenceDepth: comprehensive ? 'Comprehensive' : importance === 'Recurring' ? 'Standard' : 'Minimal',
    permanentIdentity,
    referenceCoverage: {
      identity: 0,
      face: 0,
      profile: 0,
      body: 0,
      rear: 0,
      costume: 0,
      object: 0,
      location: 0,
      material: 0,
      continuity: category === 'Locations' ? 20 : 10,
    },
    currentState: {
      condition: 'Intact',
      owner: category === 'Props' || category === 'Costumes' ? 'CHARACTER_001' : 'Unassigned',
      holder: 'None',
      currentLocation: 'LOCATION_001',
      previousLocation: 'None',
      damage: 'None',
      transformation: 'Base state',
      visibility: 'Story-defined',
    },
  };
}

function makeAssets(idea: string, sequenceCount: number, setting: string): StudioAsset[] {
  const lower = idea.toLowerCase();
  const allSequences = Array.from({ length: sequenceCount }, (_, i) => i + 1);
  const protagonist = /traveller|traveler/.test(lower) ? 'The Traveller' : 'Protagonist';
  const assets: Array<Omit<StudioAsset, 'projectNumber' | 'generatedFileName'>> = [
    {
      id: 'CHARACTER_001',
      ...makeAssetIntelligence('CHARACTER_001', 'Story critical', 'Characters'),
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
      ...makeAssetIntelligence('LOCATION_001', 'Location anchor', 'Locations'),
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
      ...makeAssetIntelligence('LOCATION_002', 'Location anchor', 'Locations'),
      description: 'An isolated camp whose layout and practical light sources remain spatially consistent.',
      storyPurpose: 'The story’s discovery point and primary source of unease.',
      sequences: allSequences.filter((n) => n > Math.floor(sequenceCount / 3)), approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Lock tent placement, fire state, entrances, and practical lights'],
    });
    assets.push({
      id: 'INTERIOR_001', name: 'Camp Tent Interior', category: 'Interiors',
      ...makeAssetIntelligence('INTERIOR_001', 'Location anchor', 'Interiors'),
      description: 'A structured tent interior with fixed entrances, furniture placement, practical-light positions, and camera access.',
      storyPurpose: 'Connected interior environment within LOCATION_002.',
      sequences: allSequences.filter((n) => n > Math.floor(sequenceCount / 2)), approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Lock entrance, bedroll, table, lantern hook, wall materials, and movement paths'],
    });
    assets.push({
      id: 'FURNITURE_001', name: 'Camp Table', category: 'Furniture',
      ...makeAssetIntelligence('FURNITURE_001', 'Recurring', 'Furniture'),
      description: 'A rough period-appropriate table permanently associated with INTERIOR_001 unless moved by a recorded event.',
      storyPurpose: 'Spatial landmark and object-placement surface.',
      sequences: allSequences.filter((n) => n > Math.floor(sequenceCount / 2)), approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Track placement, orientation, surface objects, and damage'],
    });
  }
  assets.push({
    id: 'ENVIRONMENT_001', name: /desert/.test(lower) ? 'Desert Environment State' : 'Primary Environment State', category: 'Environment States',
    ...makeAssetIntelligence('ENVIRONMENT_001', 'Recurring', 'Environment States'),
    description: 'Weather, atmosphere, visibility, surface condition, tracks, debris, practical light, and environmental sound as one evolving state.',
    storyPurpose: 'Separates changing environmental conditions from permanent location identity.',
    sequences: allSequences, approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
    continuityConstraints: ['Track weather, wind, dust, visibility, surface marks, fire, water, debris, and lighting progression'],
  });
  if (/car|truck|vehicle|motorcycle|aircraft|plane|boat|ship/.test(lower)) {
    assets.push({
      id: 'VEHICLE_001', name: 'Story Vehicle', category: 'Vehicles',
      ...makeAssetIntelligence('VEHICLE_001', 'Recurring', 'Vehicles'),
      description: 'A period-correct recurring vehicle with stable exterior, interior, orientation, operating state, occupants, cargo, dirt, and damage.',
      storyPurpose: 'Transportation and spatial continuity asset.', sequences: allSequences, approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Track driver, passengers, cargo, doors, lights, orientation, dirt, damage, and operating state'],
    });
  }
  if (/weapon|gun|rifle|knife|sword/.test(lower)) {
    assets.push({
      id: 'WEAPON_001', name: 'Story Weapon', category: 'Weapons',
      ...makeAssetIntelligence('WEAPON_001', 'Story critical', 'Weapons'),
      description: 'A permanent weapon asset with period, material, owner, holder, activation, ammunition, damage, and sequence history.',
      storyPurpose: 'Story-critical carried object.', sequences: allSequences.filter((n) => n >= Math.ceil(sequenceCount / 3)), approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Track owner, holder, location, activation, ammunition, visibility, and damage'],
    });
  }
  if (/robot|machine|mechanical|deploy|fold|transform/.test(lower)) {
    assets.push({
      id: 'MECHANICAL_001', name: 'Mechanical System', category: 'Mechanical Systems',
      ...makeAssetIntelligence('MECHANICAL_001', 'Story critical', 'Mechanical Systems'),
      description: 'A component-based mechanical asset with mounting points, movement directions, power, connections, deployment, fold, and damage states.',
      storyPurpose: 'Mechanically consistent transformation or action system.', sequences: allSequences.filter((n) => n >= Math.ceil(sequenceCount / 2)), approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Preserve component relationships, motion restrictions, scale, activation order, and damage'],
    });
  }
  if (/horror|strange|monster|creature|haunted/.test(lower)) {
    assets.push({
      id: 'CREATURE_001', name: 'The Presence', category: 'Creatures',
      ...makeAssetIntelligence('CREATURE_001', 'Story critical', 'Creatures'),
      description: 'An unsettling, partially obscured threat. Its scale, silhouette, and transformation state remain controlled.',
      storyPurpose: 'Antagonistic force.', sequences: allSequences.filter((n) => n >= Math.ceil(sequenceCount / 2)), approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Never duplicate', 'Lock silhouette, scale, damage, and behavior state'],
    });
  }
  if (/camel/.test(lower)) {
    assets.push({
      id: 'ANIMAL_001', name: 'Traveller’s Camel', category: 'Animals',
      ...makeAssetIntelligence('ANIMAL_001', 'Recurring', 'Animals'),
      description: 'One identifiable camel with permanent tack, blanket, rope, and saddle references.',
      storyPurpose: 'Transport and emotional continuity anchor.', sequences: allSequences, approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Exactly one camel', 'Track saddle, blanket, rope, injuries, and position'],
    });
    assets.push({
      id: 'PROP_001', name: 'Camel Saddle', category: 'Props',
      ...makeAssetIntelligence('PROP_001', 'Recurring', 'Props'),
      description: 'Period-appropriate saddle and tack, always mapped to ANIMAL_001.',
      storyPurpose: 'Recurring visual and continuity detail.', sequences: allSequences, approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Must remain attached to ANIMAL_001 unless the script records a change'],
    });
  }
  if (/night|dark|lantern|camp/.test(lower)) {
    const lanternId = `PROP_${String(assets.some((asset) => asset.id === 'PROP_001') ? 2 : 1).padStart(3, '0')}`;
    assets.push({
      id: lanternId,
      ...makeAssetIntelligence(lanternId, 'Story critical', 'Props'),
      name: 'Lantern', category: 'Props',
      description: 'A practical period-appropriate lantern whose owner, hand, flame, position, and damage are tracked.',
      storyPurpose: 'Motivated light source and suspense device.', sequences: allSequences.filter((n) => n > 1), approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
      continuityConstraints: ['Track who holds it, flame state, placement, and damage'],
    });
  }
  assets.push({
    id: 'COSTUME_001', name: `${protagonist} Wardrobe`, category: 'Costumes',
    ...makeAssetIntelligence('COSTUME_001', 'Recurring', 'Costumes'),
    description: `A period-appropriate complete wardrobe for ${protagonist}, including footwear, accessories, and optional head covering.`,
    storyPurpose: 'Locks the protagonist’s silhouette and temporal condition.', sequences: allSequences, approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0, notes: '',
    continuityConstraints: ['Track head covering, dust, tears, wetness, and blood'],
  });
  return assets.map((asset, index) => {
    const projectNumber = index + 1;
    return { ...asset, projectNumber, generatedFileName: numberedAssetFileName({ projectNumber, name: asset.name }) };
  });
}

function makeWorldBible(input: {
  idea: string;
  region: string;
  period: string;
  setting: string;
  genre: string;
  visualStyle: string;
  lightingDirection: string;
}): WorldBible {
  const lower = input.idea.toLowerCase();
  const historical = input.period !== 'Contemporary';
  return {
    version: 1,
    status: 'Draft',
    geography: input.region,
    historicalPeriod: input.period,
    culture: input.region === 'United Arab Emirates' ? 'Regionally grounded Emirati and Gulf material culture appropriate to the stated period' : 'Story-defined local culture with no imported visual assumptions',
    technologyLevel: historical ? `Only technology documented or plausible for ${input.period}` : 'Contemporary technology only when introduced by the story',
    architecture: /camp|tent/.test(lower) ? ['Portable period-appropriate shelters', 'Low-profile structures shaped by climate and terrain'] : ['Architecture must be established by approved location assets'],
    constructionMaterials: /desert/.test(lower) ? ['Canvas', 'Timber', 'Rope', 'Stone', 'Compacted sand'] : ['Materials must match geography, period, and local construction'],
    interiorDesign: ['Interiors preserve layout, entrances, exits, permanent fixtures, and connected-room logic'],
    furnitureStyle: historical ? [`Furniture and set dressing appropriate to ${input.period}`] : ['Furniture follows the approved location design language'],
    terrain: /desert/.test(lower) ? ['Dunes', 'Compacted sand paths', 'Wind-shaped surfaces', 'Trackable footprints'] : [input.setting],
    climate: /desert/.test(lower) ? ['Arid climate', 'Strong day-night temperature shift', 'Wind and dust are continuity events'] : ['Climate follows the approved environment state'],
    vegetation: /desert/.test(lower) ? ['Sparse native arid vegetation only'] : ['Vegetation must match geography and climate'],
    transportation: historical ? [`Only transport plausible in ${input.period} and ${input.region}`] : ['Transportation must be introduced and tracked as an asset'],
    wardrobeRules: [historical ? `All wardrobe, footwear, headwear, jewellery, and accessories must be plausible for ${input.period}` : 'Wardrobe follows character, culture, climate, and story role', 'Costume changes never create a new character identity'],
    objectRules: [
      'SINGLE FLAT ASSET FOLDER RULE: every approved generated visual production asset lives in one project asset folder with no subfolders.',
      'Use one permanent project-wide numeric sequence across all categories. Never restart numbers, renumber replacements, or move another asset number.',
      'Generated filenames begin NNN_NAME_GENERATED.png, and the same NNN is the primary production reference in chat, cards, lists, sequence plans, prompts, references, continuity, downloads, and exports.',
      'Every story-critical or recurring object receives a stable internal ID behind its permanent numeric production reference.',
      'Owner, holder, location, condition, activation, visibility, damage, and transformation persist',
    ],
    weaponRules: ['Weapons never appear unless present in the manifest', 'Weapon owner, holder, activation, ammunition, and damage are explicit states'],
    languageRules: ['Dialogue language and dialect follow the approved Film Bible and character background'],
    visualRules: [input.visualStyle, 'No visual element may conflict with geography, period, culture, technology, or established architecture'],
    lightingRules: [input.lightingDirection, 'Practical and environmental light sources remain spatially and directionally continuous'],
    environmentalRules: ['Location identity remains stable while weather, atmosphere, surfaces, debris, fire, water, tracks, and visibility evolve through recorded events'],
    physicalRules: ['Objects move only through recorded actions', 'Damage persists until repaired', 'Travel time and spatial connections remain plausible', 'Transformations follow an ordered state path'],
    restrictions: ['No anachronistic technology', 'No untracked recurring people, animals, vehicles, props, furniture, weapons, or structures', 'No unexplained repositioning, repair, costume reset, weather reset, or lighting reversal'],
  };
}

function makeLocations(project: Pick<StudioProject, 'assets' | 'period' | 'region' | 'setting' | 'sequenceCount' | 'idea'>): WorldLocation[] {
  const locationAssets = project.assets.filter((asset) => asset.category === 'Locations' || asset.category === 'Interiors');
  return locationAssets.map((asset, index) => {
    const interior = asset.category === 'Interiors';
    const isCamp = /camp|tent/i.test(asset.name);
    const pairedExterior = project.assets.find((item) => item.id === 'LOCATION_002')?.id;
    return {
      id: asset.id,
      name: asset.name,
      type: interior ? 'Interior' : 'Exterior',
      description: asset.description,
      period: project.period,
      geography: project.region,
      terrain: interior ? 'Enclosed movement surface' : project.setting,
      architecture: isCamp ? 'Portable shelter architecture with fixed approved layout' : 'Architecture locked by the approved location reference',
      scale: interior ? 'Human-scale structured room' : 'Wide environment with explicit landmarks',
      dimensions: interior ? 'Relative dimensions stored from entrance, furniture, and camera clearances' : 'Scale inferred from approved landmarks and travel time',
      materials: interior
        ? { ground: 'Period-appropriate floor covering', walls: 'Canvas or approved wall material', floor: 'Approved interior floor', ceiling: 'Approved overhead material' }
        : { ground: /desert/i.test(project.idea) ? 'Sand and compacted tracks' : 'Approved terrain material', walls: 'Not applicable', floor: 'Natural terrain', ceiling: 'Open sky' },
      entrances: interior ? ['Primary entrance'] : ['Story approach path'],
      exits: interior ? ['Primary exit'] : ['Connected travel path'],
      doors: interior ? ['Approved entrance closure'] : [],
      windows: interior ? ['Approved openings only'] : [],
      furniture: project.assets.filter((item) => item.category === 'Furniture' && item.sequences.some((n) => asset.sequences.includes(n))).map((item) => item.id),
      permanentObjects: project.assets.filter((item) => item.currentState.currentLocation === asset.id && item.importance !== 'Incidental').map((item) => item.id),
      temporaryObjects: [],
      lightingSources: /night|dark/i.test(project.idea) ? ['Moonlight', 'Approved practical light assets'] : ['Approved natural and practical sources'],
      environmentalFeatures: /desert/i.test(project.idea) ? ['Dunes', 'Wind-shaped surface', 'Tracks and footprints'] : ['Features defined by approved references'],
      vegetation: /desert/i.test(project.idea) ? ['Sparse native arid vegetation'] : ['World Bible vegetation only'],
      weatherStates: ['ENVIRONMENT_001'],
      timeStates: /night|dark/i.test(project.idea) ? ['Night'] : ['Story timeline progression'],
      damageState: 'Intact',
      soundSources: interior ? ['Room ambience', 'Fabric movement', 'Connected exterior bleed'] : ['Exterior ambience', 'Wind', 'Movement over terrain'],
      characterAccessPoints: interior ? ['Primary entrance', 'Connected exterior'] : ['Approach path', 'Departure path'],
      cameraAccess: interior ? ['Door axis', 'Interior corners', 'Central movement lane'] : ['Wide establishing axis', 'Character travel axis', 'Reverse continuity axis'],
      connectedLocationIds: interior && pairedExterior ? [pairedExterior] : isCamp && project.assets.some((item) => item.id === 'INTERIOR_001') ? ['INTERIOR_001'] : index > 0 ? [locationAssets[index - 1].id] : locationAssets[1] ? [locationAssets[1].id] : [],
      sequences: asset.sequences,
      version: asset.version,
    };
  });
}

function makeEnvironments(project: Pick<StudioProject, 'assets' | 'idea' | 'lightingDirection' | 'sequenceCount'>): EnvironmentState[] {
  const environmentAssets = project.assets.filter((asset) => asset.category === 'Environment States');
  if (environmentAssets.length === 0) return [];
  return environmentAssets.map((asset) => ({
    id: asset.id,
    locationId: 'LOCATION_001',
    label: asset.name,
    weather: /rain/i.test(project.idea) ? 'Rain' : /snow/i.test(project.idea) ? 'Snow' : /desert/i.test(project.idea) ? 'Dry with variable wind' : 'Story-defined weather',
    atmosphere: [/dust|desert/i.test(project.idea) ? 'Dust' : 'Clear atmosphere', /fog/i.test(project.idea) ? 'Fog' : 'Visibility controlled by story'],
    wind: /desert|wind/i.test(project.idea) ? 'Variable wind with trackable direction' : 'Low unless changed by an event',
    visibility: /night|dark/i.test(project.idea) ? 'Night-limited visibility' : 'Normal story visibility',
    surfaceConditions: [/desert/i.test(project.idea) ? 'Dry sand' : 'Location-defined surface', 'Footprints and tracks persist until erased by a recorded event'],
    vegetationState: /desert/i.test(project.idea) ? 'Sparse and dry' : 'World Bible default',
    fireState: /fire|camp/i.test(project.idea) ? 'Potential practical fire; exact state recorded per sequence' : 'None',
    waterState: /rain|water|sea|river/i.test(project.idea) ? 'Tracked water state' : 'None',
    debris: [],
    tracks: [],
    lighting: project.lightingDirection,
    timeOfDay: /night|dark/i.test(project.idea) ? 'Night' : 'Story-defined progression',
    sound: [/desert/i.test(project.idea) ? 'Wind over sand' : 'Location ambience', 'All sound sources must map to a physical or defined non-diegetic source'],
    activeFromSequence: 1,
    activeThroughSequence: project.sequenceCount,
  }));
}

function categorizeAssetManifest(assets: StudioAsset[]): StudioSequence['assetManifest'] {
  const ids = (categories: string[]) => assets.filter((asset) => categories.includes(asset.category)).map((asset) => asset.id);
  return {
    characters: ids(['Characters']), costumes: ids(['Costumes']), creatures: ids(['Creatures']), animals: ids(['Animals']),
    vehicles: ids(['Vehicles']), locations: ids(['Locations']), interiors: ids(['Interiors']), environments: ids(['Environment States']),
    props: ids(['Props', 'Story Critical Objects']), weapons: ids(['Weapons']), furniture: ids(['Furniture']), mechanical: ids(['Mechanical Systems']),
    transformations: assets.filter((asset) => asset.currentState.transformation !== 'Base state').map((asset) => asset.id),
    damageStates: assets.filter((asset) => asset.currentState.damage !== 'None').map((asset) => `${asset.id}: ${asset.currentState.damage}`),
    lighting: ids(['Lighting References']), sound: [], effects: ids(['Effects References']),
  };
}

function assetSnapshotAtSequence(asset: StudioAsset, stateEvents: AssetStateEvent[], sequenceNumber: number, phase: 'opening' | 'ending') {
  const snapshot = structuredClone(asset);
  const shouldRollback = (event: AssetStateEvent) => phase === 'opening' ? event.sequenceNumber >= sequenceNumber : event.sequenceNumber > sequenceNumber;
  const futureEvents = stateEvents
    .filter((event) => event.assetId === asset.id && shouldRollback(event))
    .sort((a, b) => b.sequenceNumber - a.sequenceNumber || b.createdAt.localeCompare(a.createdAt));
  for (const event of futureEvents) {
    if (event.eventType === 'damage') {
      snapshot.currentState.damage = event.previousState;
      snapshot.currentState.condition = event.previousState === 'None' ? 'Intact' : event.previousState;
    } else if (event.eventType === 'transformation') {
      snapshot.currentState.transformation = event.previousState;
    } else {
      const [holder, location, condition, visibility] = event.previousState.split(';').map((value) => value.trim());
      if (holder) snapshot.currentState.holder = holder;
      if (location) snapshot.currentState.currentLocation = location;
      if (condition) snapshot.currentState.condition = condition;
      if (visibility) snapshot.currentState.visibility = visibility;
    }
  }
  return snapshot;
}

function environmentSnapshotAtSequence(environment: EnvironmentState | undefined, stateEvents: AssetStateEvent[], sequenceNumber: number, phase: 'opening' | 'ending') {
  if (!environment) return undefined;
  const snapshot = structuredClone(environment);
  const shouldRollback = (event: AssetStateEvent) => phase === 'opening' ? event.sequenceNumber >= sequenceNumber : event.sequenceNumber > sequenceNumber;
  const futureEvents = stateEvents
    .filter((event) => event.assetId === environment.id && event.eventType === 'environment evolution' && shouldRollback(event))
    .sort((a, b) => b.sequenceNumber - a.sequenceNumber || b.createdAt.localeCompare(a.createdAt));
  for (const event of futureEvents) {
    const [weather, atmosphere, wind, fire] = event.previousState.split(';').map((value) => value.trim());
    if (weather) snapshot.weather = weather;
    if (atmosphere) snapshot.atmosphere = atmosphere.split(',').map((value) => value.trim()).filter(Boolean);
    if (wind) snapshot.wind = wind;
    if (fire) snapshot.fireState = fire;
  }
  return snapshot;
}

function makeSceneIntelligence(
  project: Pick<StudioProject, 'assets' | 'environments' | 'stateEvents' | 'cameraStyle' | 'lightingDirection' | 'soundDirection'>,
  sequence: Omit<StudioSequence, 'prompt' | 'assetManifest' | 'sceneState' | 'sceneGraph' | 'endingState' | 'lookAhead'>,
) {
  const sourceAssets = project.assets.filter((asset) => sequence.assetIds.includes(asset.id));
  const openingAssets = sourceAssets.map((asset) => assetSnapshotAtSequence(asset, project.stateEvents, sequence.number, 'opening'));
  const endingAssets = sourceAssets.map((asset) => assetSnapshotAtSequence(asset, project.stateEvents, sequence.number, 'ending'));
  const manifest = categorizeAssetManifest(openingAssets);
  manifest.lighting = [project.lightingDirection];
  manifest.sound = [project.soundDirection, 'Physical sources listed in Scene State'];
  const locationId = manifest.interiors[0] ?? manifest.locations.at(-1) ?? manifest.locations[0] ?? 'LOCATION_001';
  const environmentId = manifest.environments[0] ?? project.environments[0]?.id ?? 'ENVIRONMENT_DEFAULT';
  const openingEnvironment = environmentSnapshotAtSequence(project.environments.find((environment) => environment.id === environmentId), project.stateEvents, sequence.number, 'opening');
  const endingEnvironment = environmentSnapshotAtSequence(project.environments.find((environment) => environment.id === environmentId), project.stateEvents, sequence.number, 'ending');
  const nodes: SceneGraphNode[] = [
    { id: sequence.id, kind: 'Sequence', label: sequence.id, state: sequence.status },
    ...openingAssets.map((asset) => ({ id: asset.id, kind: asset.category, label: `Asset ${formatAssetNumber(asset.projectNumber)} · ${asset.name}`, state: `${asset.currentState.condition}; ${asset.currentState.currentLocation}` })),
    { id: environmentId, kind: 'Environment', label: environmentId, state: sequence.timeOfDay },
  ];
  const edges: SceneGraphEdge[] = [];
  for (const asset of openingAssets) {
    edges.push({ id: `${sequence.id}:${asset.id}:present`, from: asset.id, to: sequence.id, relationship: 'appears in', sequenceNumber: sequence.number });
    if (asset.category === 'Costumes') edges.push({ id: `${asset.id}:worn`, from: 'CHARACTER_001', to: asset.id, relationship: 'wears', sequenceNumber: sequence.number });
    if (asset.category === 'Props' || asset.category === 'Weapons') edges.push({ id: `${asset.id}:owned`, from: asset.currentState.owner, to: asset.id, relationship: asset.currentState.holder !== 'None' ? 'holds' : 'owns', sequenceNumber: sequence.number });
    if (asset.category === 'Animals') edges.push({ id: `${asset.id}:ridden`, from: 'CHARACTER_001', to: asset.id, relationship: 'rides or travels with', sequenceNumber: sequence.number });
  }
  edges.push({ id: `${sequence.id}:location`, from: sequence.id, to: locationId, relationship: 'occupies', sequenceNumber: sequence.number });
  edges.push({ id: `${environmentId}:affects`, from: environmentId, to: locationId, relationship: 'affects', sequenceNumber: sequence.number });
  const stateMap = (assets: StudioAsset[], category: string) => Object.fromEntries(assets.filter((asset) => asset.category === category).map((asset) => [asset.id, `${asset.currentState.condition}; ${asset.currentState.damage}; ${asset.currentState.transformation}`]));
  const sceneState: SceneState = {
    sequenceId: sequence.id,
    locationId,
    environmentId,
    characterStates: stateMap(openingAssets, 'Characters'),
    costumeStates: stateMap(openingAssets, 'Costumes'),
    creatureStates: stateMap(openingAssets, 'Creatures'),
    animalStates: stateMap(openingAssets, 'Animals'),
    vehicleStates: stateMap(openingAssets, 'Vehicles'),
    propStates: Object.fromEntries(openingAssets.filter((asset) => ['Props', 'Weapons', 'Story Critical Objects'].includes(asset.category)).map((asset) => [asset.id, `${asset.currentState.condition}; owner ${asset.currentState.owner}; holder ${asset.currentState.holder}; location ${asset.currentState.currentLocation}`])),
    furnitureStates: stateMap(openingAssets, 'Furniture'),
    objectPlacements: Object.fromEntries(openingAssets.map((asset) => [asset.id, asset.currentState.currentLocation])),
    lightingState: project.lightingDirection,
    weatherState: openingEnvironment?.weather ?? 'Story-defined weather',
    effects: manifest.effects,
    soundSources: manifest.sound,
    cameraDirection: project.cameraStyle,
    screenDirection: 'Preserve the established travel and eyeline axis',
    spatialRelationships: edges.filter((edge) => ['holds', 'owns', 'wears', 'rides or travels with', 'occupies'].includes(edge.relationship)).map((edge) => `${edge.from} ${edge.relationship} ${edge.to}`),
    storyState: sequence.purpose,
    previousContinuitySource: sequence.continuitySource,
    expectedEndingState: sequence.closingState,
  };
  const endingState: EndingState = {
    characterPositions: Object.fromEntries(manifest.characters.map((id) => [id, `Recorded closing position in ${locationId}`])),
    characterDirections: Object.fromEntries(manifest.characters.map((id) => [id, 'Closing screen direction preserved'])),
    characterConditions: Object.fromEntries(manifest.characters.map((id) => [id, endingAssets.find((asset) => asset.id === id)?.currentState.condition ?? 'Unchanged'])),
    wardrobe: Object.fromEntries(manifest.characters.map((id) => [id, manifest.costumes.join(', ') || 'Story-defined costume'])),
    heldObjects: Object.fromEntries(endingAssets.filter((asset) => asset.currentState.holder !== 'None').map((asset) => [asset.currentState.holder, asset.id])),
    droppedObjects: project.stateEvents.filter((event) => event.sequenceNumber === sequence.number && /drop|put down|throw/.test(event.eventType)).map((event) => event.assetId),
    animalStates: stateMap(endingAssets, 'Animals'), creatureStates: stateMap(endingAssets, 'Creatures'), vehicleStates: stateMap(endingAssets, 'Vehicles'),
    propStates: Object.fromEntries(endingAssets.filter((asset) => ['Props', 'Weapons', 'Story Critical Objects'].includes(asset.category)).map((asset) => [asset.id, `${asset.currentState.condition}; owner ${asset.currentState.owner}; holder ${asset.currentState.holder}; location ${asset.currentState.currentLocation}`])),
    environmentState: environmentId, locationDamage: 'Inherit recorded location damage', lighting: endingEnvironment?.lighting ?? project.lightingDirection,
    weather: endingEnvironment?.weather ?? sceneState.weatherState, effects: manifest.effects, cameraDirection: project.cameraStyle,
    screenDirection: sceneState.screenDirection, elapsedTimeSeconds: sequence.number * sequence.duration, soundState: manifest.sound,
  };
  return { manifest, sceneState, sceneGraph: { nodes, edges }, endingState };
}

function makeKnowledgeGraph(project: Pick<StudioProject, 'assets' | 'locations' | 'environments' | 'sequences'>) {
  const nodes: SceneGraphNode[] = [
    ...project.assets.map((asset) => ({ id: asset.id, kind: asset.category, label: `Asset ${formatAssetNumber(asset.projectNumber)} · ${asset.name}`, state: `${asset.currentState.condition}; V${asset.version}` })),
    ...project.sequences.map((sequence) => ({ id: sequence.id, kind: 'Sequence', label: sequence.title, state: sequence.status })),
  ];
  const edges: SceneGraphEdge[] = project.sequences.flatMap((sequence) => sequence.sceneGraph.edges);
  for (const location of project.locations) {
    for (const connected of location.connectedLocationIds) edges.push({ id: `${location.id}:${connected}:connected`, from: location.id, to: connected, relationship: 'connects to', sequenceNumber: 0 });
  }
  for (const environment of project.environments) edges.push({ id: `${environment.id}:${environment.locationId}:world`, from: environment.id, to: environment.locationId, relationship: 'environment state of', sequenceNumber: environment.activeFromSequence });
  project.sequences.forEach((sequence, index) => {
    if (project.sequences[index - 1]) edges.push({ id: `${project.sequences[index - 1].id}:${sequence.id}:next`, from: project.sequences[index - 1].id, to: sequence.id, relationship: 'next sequence', sequenceNumber: sequence.number });
  });
  return { nodes, edges: Array.from(new Map(edges.map((edge) => [edge.id, edge])).values()) };
}

function buildPrompt(
  project: Pick<StudioProject, 'aspectRatio' | 'resolution' | 'visualStyle' | 'cameraStyle' | 'lensDirection' | 'lightingDirection' | 'colorDirection' | 'soundDirection'>,
  sequence: Omit<StudioSequence, 'prompt' | 'assetManifest' | 'sceneState' | 'sceneGraph' | 'endingState' | 'lookAhead'>,
) {
  return [
    `${sequence.id} — ${sequence.duration} seconds`,
    `Format: ${project.aspectRatio}, ${project.resolution}. Generation mode: reference-led cinematic sequence.`,
    `Continuity source: ${sequence.continuitySource}.`,
    `Reference assets by permanent project number: ${sequence.assetFiles.map((file, index) => `Asset ${formatAssetNumber(sequence.assetNumbers[index])} = ${file}`).join('; ')}. Attach exactly these numbered files and no unplanned recurring elements.`,
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
    const relevantAssetRecords = project.assets.filter((asset) => asset.sequences.includes(number)).sort((a, b) => a.projectNumber - b.projectNumber);
    const relevantAssets = relevantAssetRecords.map((asset) => asset.id);
    const openingState = number === 1 ? `Establish ${project.story.protagonist} and the untouched world.` : `Inherit the approved closing state of SEQUENCE_${String(number - 1).padStart(3, '0')}.`;
    const closingState = number === project.sequenceCount ? `Resolve the immediate conflict and hold the final emotional image.` : `End on a specific physical and emotional change that motivates Sequence ${number + 1}.`;
    const sequenceBase: Omit<StudioSequence, 'prompt' | 'assetManifest' | 'sceneState' | 'sceneGraph' | 'endingState' | 'lookAhead'> = {
      id: `SEQUENCE_${String(number).padStart(3, '0')}`,
      number,
      duration,
      title,
      purpose: number === 1 ? project.story.beginning : number === project.sequenceCount ? project.story.ending : `${title}: advance the central conflict without repeating the previous action.`,
      location: number > Math.floor(project.sequenceCount / 3) && project.assets.some((asset) => asset.id === 'LOCATION_002') ? 'LOCATION_002 — The Strange Camp' : 'LOCATION_001 — Primary story location',
      timeOfDay: /night|dark/i.test(project.idea) ? 'Night' : 'Story-defined progression',
      assetIds: relevantAssets,
      assetNumbers: relevantAssetRecords.map((asset) => asset.projectNumber),
      assetFiles: relevantAssetRecords.map((asset) => asset.generatedFileName),
      openingState,
      closingState,
      continuitySource: number === 1 ? 'Film Bible and approved reference assets' : `Approved ending state of SEQUENCE_${String(number - 1).padStart(3, '0')}`,
      status: 'Planned',
      version: 1,
    };
    const intelligence = makeSceneIntelligence(project, sequenceBase);
    const futureAssets = project.assets
      .filter((asset) => asset.sequences.some((usedIn) => usedIn > number) && !asset.sequences.includes(number))
      .map((asset) => `${assetProductionReference(asset)} first needed in Sequence ${Math.min(...asset.sequences)}`);
    sequences.push({
      ...sequenceBase,
      prompt: `${buildPrompt(project, sequenceBase)}\nScene State: location ${intelligence.sceneState.locationId}; environment ${intelligence.sceneState.environmentId}; weather ${intelligence.sceneState.weatherState}; lighting ${intelligence.sceneState.lightingState}; screen direction ${intelligence.sceneState.screenDirection}.\nSequence Asset Manifest: ${Object.entries(intelligence.manifest).map(([category, values]) => `${category}=[${values.map((value) => { const asset = project.assets.find((item) => item.id === value); return asset ? `Asset ${formatAssetNumber(asset.projectNumber)} (${asset.generatedFileName})` : value; }).join(', ')}]`).join('; ')}.\nScene Graph relationships: ${intelligence.sceneGraph.edges.map((edge) => `${edge.from} ${edge.relationship} ${edge.to}`).join('; ')}.\nStructured Ending State: preserve character positions, directions, conditions, wardrobe, held and dropped objects, animal/creature/vehicle/prop states, environment, damage, lighting, weather, effects, time, and sound for the following sequence.`,
      assetManifest: intelligence.manifest,
      sceneState: intelligence.sceneState,
      sceneGraph: intelligence.sceneGraph,
      endingState: intelligence.endingState,
      lookAhead: futureAssets.slice(0, 8),
    });
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
    continuityRules: ['Every approved closing state becomes the next expected opening state.', 'Every sequence lists exact permanent asset numbers and their matching NNN_NAME_GENERATED.png files. Internal stable IDs remain secondary implementation keys.'],
    negativeRules: ['No duplicate identities.', 'No unplanned people, props, animals, vehicles, creatures, or locations.', 'No unexplained costume, light, weather, or screen-direction changes.'],
  };
  const visualStyle = genre === 'Horror' ? 'Grounded atmospheric realism with controlled shadows and tactile texture' : 'Grounded cinematic realism with coherent production design';
  const lightingDirection = /night|dark/i.test(idea) ? 'Motivated night sources with protected facial identity' : 'Motivated naturalistic light with consistent direction';
  const projectBase: Omit<StudioProject, 'sequences'> = {
    id: uid('project'), title, createdAt, updatedAt: createdAt, pinned: false, archived: false, idea,
    durationSeconds, sequenceDurationSeconds, sequenceCount, genre, subgenre, setting, region, period,
    dialogueLanguage: 'Story-defined', aspectRatio: '16:9', resolution: '4K',
    visualStyle,
    cameraStyle: 'Deliberate, motivated movement with stable screen direction', lensDirection: '35mm and 50mm natural-perspective language',
    lightingDirection,
    colorDirection: genre === 'Horror' ? 'Muted earth tones, deep navy shadows, restrained warm practicals' : 'Natural color with a controlled tonal arc',
    soundDirection: 'Production-led ambience, clear dialogue, and purposeful silence', story, filmBible,
    worldBible: makeWorldBible({ idea, region, period, setting, genre, visualStyle, lightingDirection }),
    locations: [],
    environments: [],
    assets: [] as StudioAsset[], continuity: { status: 'Not started', events: [] as ContinuityEvent[] },
    flatAssetFolder: {
      rule: 'SINGLE FLAT ASSET FOLDER RULE',
      folderName: flatAssetFolderName(title),
      nextUnusedNumber: 1,
      namingFormat: 'NNN_NAME_GENERATED.png',
      subfoldersAllowed: false,
    },
    knowledgeGraph: { nodes: [], edges: [] },
    stateEvents: [],
    stage: 'Story' as const, currentSequence: 1, exportStatus: 'Not exported', attachments: [],
    settings: { automaticMode: true, imageProvider: 'Not connected', videoProvider: 'Seedance prompt adapter', defaultAspectRatio: '16:9', defaultResolution: '4K', privacyMode: true },
  };
  projectBase.assets = makeAssets(idea, sequenceCount, setting);
  projectBase.flatAssetFolder.nextUnusedNumber = projectBase.assets.length + 1;
  projectBase.locations = makeLocations(projectBase);
  projectBase.environments = makeEnvironments(projectBase);
  const project: StudioProject = { ...projectBase, sequences: makeSequences(projectBase) };
  project.knowledgeGraph = makeKnowledgeGraph(project);
  return project;
}

export function normalizeProject(project: StudioProject): StudioProject {
  const next = structuredClone(project) as StudioProject;
  const fallbackVisualStyle = next.visualStyle ?? 'Grounded cinematic realism with coherent production design';
  const fallbackLighting = next.lightingDirection ?? 'Motivated naturalistic light with consistent direction';
  next.worldBible ??= makeWorldBible({
    idea: next.idea,
    region: next.region,
    period: next.period,
    setting: next.setting,
    genre: next.genre,
    visualStyle: fallbackVisualStyle,
    lightingDirection: fallbackLighting,
  });
  const flatRule = 'SINGLE FLAT ASSET FOLDER RULE: every approved generated visual production asset lives in one project asset folder with no subfolders.';
  if (!next.worldBible.objectRules.includes(flatRule)) {
    next.worldBible.objectRules = [
      flatRule,
      'Use one permanent project-wide numeric sequence across all categories. Never restart numbers, renumber replacements, or move another asset number.',
      'Generated filenames begin NNN_NAME_GENERATED.png, and the same NNN is the primary production reference in chat, cards, lists, sequence plans, prompts, references, continuity, downloads, and exports.',
      ...next.worldBible.objectRules,
    ];
  }
  const inferredAssets = makeAssets(next.idea, next.sequenceCount, next.setting);
  const existingAssetIds = new Set((next.assets ?? []).map((asset) => asset.id));
  const combinedAssets = [...(next.assets ?? []), ...inferredAssets.filter((asset) => !existingAssetIds.has(asset.id))];
  const reservedNumbers = new Set((next.assets ?? []).map((asset) => asset.projectNumber).filter((value) => Number.isInteger(value) && value > 0));
  const assignedNumbers = new Set<number>();
  let nextNumber = Math.max(0, ...reservedNumbers) + 1;
  next.assets = combinedAssets.map((asset) => {
    let projectNumber = existingAssetIds.has(asset.id) && Number.isInteger(asset.projectNumber) && asset.projectNumber > 0 && !assignedNumbers.has(asset.projectNumber) ? asset.projectNumber : 0;
    if (!projectNumber) {
      while (reservedNumbers.has(nextNumber) || assignedNumbers.has(nextNumber)) nextNumber += 1;
      projectNumber = nextNumber;
      nextNumber += 1;
    }
    assignedNumbers.add(projectNumber);
    const importance: StudioAsset['importance'] = asset.importance
      ?? (asset.id === 'CHARACTER_001' || asset.category === 'Creatures' || asset.category === 'Weapons' ? 'Story critical'
        : ['Locations', 'Interiors'].includes(asset.category) ? 'Location anchor'
          : asset.sequences.length > 1 ? 'Recurring' : 'Background');
    const defaults = makeAssetIntelligence(asset.id, importance, asset.category);
    const referenceSignal = Math.min(100, (asset.referenceCount ?? 0) * 45);
    return {
      ...defaults,
      ...asset,
      projectNumber,
      generatedFileName: numberedAssetFileName({ projectNumber, name: asset.name }),
      importance,
      referenceDepth: asset.referenceDepth ?? defaults.referenceDepth,
      permanentIdentity: asset.permanentIdentity ?? asset.id,
      referenceCoverage: {
        ...defaults.referenceCoverage,
        ...asset.referenceCoverage,
        identity: Math.max(asset.referenceCoverage?.identity ?? 0, asset.category === 'Characters' ? referenceSignal : 0),
        face: Math.max(asset.referenceCoverage?.face ?? 0, asset.category === 'Characters' ? referenceSignal : 0),
        body: Math.max(asset.referenceCoverage?.body ?? 0, asset.category === 'Characters' ? Math.floor(referenceSignal * 0.65) : 0),
      },
      currentState: { ...defaults.currentState, ...asset.currentState },
    };
  });
  next.assets.sort((a, b) => a.projectNumber - b.projectNumber);
  const highestAssetNumber = Math.max(0, ...next.assets.map((asset) => asset.projectNumber));
  next.flatAssetFolder = {
    rule: 'SINGLE FLAT ASSET FOLDER RULE',
    folderName: flatAssetFolderName(next.title),
    nextUnusedNumber: highestAssetNumber + 1,
    namingFormat: 'NNN_NAME_GENERATED.png',
    subfoldersAllowed: false,
  };
  next.locations = next.locations?.length ? next.locations : makeLocations(next);
  next.environments = next.environments?.length ? next.environments : makeEnvironments(next);
  const assetNumbers = new Map(next.assets.map((asset) => [asset.id, asset.projectNumber]));
  next.stateEvents = (next.stateEvents ?? []).map((event) => ({ ...event, assetNumber: event.assetNumber ?? assetNumbers.get(event.assetId) ?? 0 }));
  next.continuity.events = (next.continuity.events ?? []).map((event) => ({ ...event, assetNumber: event.assetNumber ?? assetNumbers.get(event.assetId) ?? 0 }));
  next.attachments = (next.attachments ?? []).map((attachment) => ({
    ...attachment,
    referenceRoles: attachment.referenceRoles ?? [attachment.role ?? 'Production reference'],
    linkedAssetNumber: attachment.linkedAssetNumber ?? (attachment.linkedAssetId ? assetNumbers.get(attachment.linkedAssetId) : undefined),
  }));
  const previousSequences = new Map((next.sequences ?? []).map((sequence) => [sequence.id, sequence]));
  const regenerated = makeSequences({ ...next, sequences: undefined } as unknown as Omit<StudioProject, 'sequences'>);
  next.sequences = regenerated.map((sequence) => {
    const previous = previousSequences.get(sequence.id);
    if (!previous) return sequence;
    return {
      ...sequence,
      status: previous.status,
      version: previous.version,
      continuitySource: previous.continuitySource,
      openingState: previous.openingState,
      closingState: previous.closingState,
      lookAhead: sequence.lookAhead,
    };
  });
  next.knowledgeGraph = makeKnowledgeGraph(next);
  return next;
}

export function projectProgress(project: StudioProject) {
  const milestones = [
    project.story.status === 'Approved',
    project.worldBible.status === 'Approved',
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
  project.locations = makeLocations(project);
  project.environments = makeEnvironments(project);
  project.sequences = makeSequences(project);
  project.knowledgeGraph = makeKnowledgeGraph(project);
  project.stage = 'Story';
}

function findAsset(project: StudioProject, text: string) {
  const lower = text.toLowerCase();
  const numericReference = lower.match(/\basset\s*0*(\d+)\b/)?.[1] ?? lower.match(/(?:^|\s)0*(\d{3})_[a-z0-9_]+_generated(?:\.png)?\b/)?.[1];
  if (numericReference) {
    const byNumber = project.assets.find((asset) => asset.projectNumber === Number(numericReference));
    if (byNumber) return byNumber;
  }
  const explicitId = lower.match(/(character|creature|animal|location|interior|environment|vehicle|prop|weapon|costume|furniture|mechanical|effect|lighting)[ _-]?(\d+)/)?.slice(1);
  if (explicitId) {
    const stable = `${explicitId[0].toUpperCase()}_${String(Number(explicitId[1])).padStart(3, '0')}`;
    return project.assets.find((asset) => asset.id === stable);
  }
  return project.assets.find((asset) => lower.includes(asset.name.toLowerCase())) ?? project.assets.find((asset) => lower.includes(asset.id.toLowerCase()));
}

function message(content: string, metadata?: StudioMessage['metadata']): StudioMessage {
  return { id: uid('message'), role: 'assistant', content, createdAt: nowIso(), metadata };
}

export function interpretStudioMessage(project: StudioProject, input: string): { project: StudioProject; response: StudioMessage; sideEffect?: 'export' | 'asset-export' } {
  const next = normalizeProject(project);
  const lower = input.trim().toLowerCase();
  next.updatedAt = nowIso();

  const requestedDuration = inferDurationSeconds(input, 0);
  if (requestedDuration > 0 && /(make it|change|duration|movie|minute)/.test(lower)) {
    rebuildSequences(next, requestedDuration);
    next.story.version += 1;
    next.story.status = 'Draft';
    next.filmBible.status = 'Draft';
    next.worldBible.version += 1;
    next.worldBible.status = 'Draft';
    return { project: next, response: message(`The movie is now ${requestedDuration / 60} minutes: ${next.sequenceCount} sequences at 30 seconds${requestedDuration % 30 ? ', with a shorter final sequence' : ''}. I kept the prior version and marked the story, World Bible, Film Bible, look-ahead plan, and scene states for review.`, { kind: 'status' }) };
  }

  if (/approve(?: the)? story|story approved/.test(lower)) {
    next.story.status = 'Approved';
    next.stage = 'World Bible';
    return { project: next, response: message(`Story approved. World Bible v${next.worldBible.version} now defines the geography, period, culture, technology, architecture, materials, climate, physical rules, and prohibited anachronisms for this production.`, { kind: 'world' }) };
  }
  if (/approve(?: the)? world bible|world bible approved|approve world/.test(lower)) {
    next.worldBible.status = 'Approved';
    next.stage = 'Film Bible';
    return { project: next, response: message(`World Bible approved. Its rules now constrain every location, environment, object, costume, light source, sound source, and sequence manifest. Film Bible v${next.filmBible.version} is ready next.`, { kind: 'bible' }) };
  }
  if (/show (?:me )?(?:the )?world bible|\/world/.test(lower)) {
    return { project: next, response: message(`The World Bible is ${next.worldBible.status.toLowerCase()}: ${next.worldBible.geography}, ${next.worldBible.historicalPeriod}, ${next.worldBible.technologyLevel}. It governs ${next.locations.length} structured locations and ${next.environments.length} environment state${next.environments.length === 1 ? '' : 's'}.`, { kind: 'world' }) };
  }
  if (/approve(?: the)? film bible|film bible approved|approve bible/.test(lower)) {
    next.filmBible.status = 'Approved';
    next.stage = 'Assets';
    return { project: next, response: message(`Film Bible approved. The complete production manifest contains ${next.assets.length} tracked assets across identity, location, interior, environment, furniture, object, costume, creature, animal, vehicle, mechanical, lighting, and effects categories as required by this story.`, { kind: 'assets', assetIds: next.assets.map((asset) => asset.id) }) };
  }
  if (/use my (?:photo|picture|image)|main character reference|my likeness/.test(lower)) {
    const mainCharacter = next.assets.find((item) => item.id === 'CHARACTER_001');
    if (!mainCharacter) {
      return { project: next, response: message('The main character asset is not in the current manifest. I kept the instruction and marked the story for review.', { kind: 'note' }) };
    }
    if (mainCharacter.referenceCount === 0) {
      return { project: next, response: message(`Attach one or more clear images here for ${assetProductionReference(mainCharacter)}. I’ll keep every source under that one permanent number and lock the likeness across every sequence.`, { kind: 'assets', assetIds: [mainCharacter.id] }) };
    }
    mainCharacter.approvalState = 'Needs Review';
    mainCharacter.notes = `${mainCharacter.referenceCount} likeness reference${mainCharacter.referenceCount === 1 ? '' : 's'} attached; character sheet approval is pending.`;
    return { project: next, response: message(`${mainCharacter.referenceCount} reference image${mainCharacter.referenceCount === 1 ? ' is' : 's are'} attached to one identity: ${assetProductionReference(mainCharacter)}. Coverage is tracked by face, profile, body, rear, costume, material, and continuity role without creating duplicate people or numbers.`, { kind: 'coverage', assetIds: [mainCharacter.id] }) };
  }
  if (/approve all assets|lock all assets/.test(lower)) {
    next.assets = next.assets.map((asset) => ({ ...asset, approvalState: 'Locked', lockState: 'Locked' }));
    next.stage = 'Sequences';
    return { project: next, response: message(`All ${next.assets.length} assets are approved and locked. The ${next.sequenceCount}-sequence plan is ready for review.`, { kind: 'sequence', sequenceNumber: 1 }) };
  }

  const newAssetMatch = lower.match(/\b(?:add|create|introduce)\s+(?:a|an)?\s*(?:new\s+)?(character|costume|creature|animal|environment|location|interior|prop|vehicle|weapon|transformation|mechanical|damage)(?:\s+asset|\s+sheet)?\b/);
  if (newAssetMatch) {
    const key = newAssetMatch[1];
    const categories: Record<string, { category: string; prefix: string }> = {
      character: { category: 'Characters', prefix: 'CHARACTER' }, costume: { category: 'Costumes', prefix: 'COSTUME' },
      creature: { category: 'Creatures', prefix: 'CREATURE' }, animal: { category: 'Animals', prefix: 'ANIMAL' },
      environment: { category: 'Environment States', prefix: 'ENVIRONMENT' }, location: { category: 'Locations', prefix: 'LOCATION' },
      interior: { category: 'Interiors', prefix: 'INTERIOR' }, prop: { category: 'Props', prefix: 'PROP' },
      vehicle: { category: 'Vehicles', prefix: 'VEHICLE' }, weapon: { category: 'Weapons', prefix: 'WEAPON' },
      transformation: { category: 'Transformation Sheets', prefix: 'TRANSFORMATION' }, mechanical: { category: 'Mechanical Systems', prefix: 'MECHANICAL' },
      damage: { category: 'Damage Sheets', prefix: 'DAMAGE' },
    };
    const descriptor = categories[key];
    const stableIndex = Math.max(0, ...next.assets.filter((item) => item.id.startsWith(`${descriptor.prefix}_`)).map((item) => Number(item.id.split('_').at(-1)) || 0)) + 1;
    const id = `${descriptor.prefix}_${String(stableIndex).padStart(3, '0')}`;
    const requestedName = input.match(/\b(?:called|named)\s+["“]?([^"”.,]+?)(?:\s+(?:for|in)\s+sequence\s+\d+|$)/i)?.[1]?.trim();
    const name = requestedName || `${key[0].toUpperCase()}${key.slice(1)} ${stableIndex}`;
    const mentionedSequence = Number(lower.match(/sequence\s*(\d+)/)?.[1] ?? 0);
    const sequences = mentionedSequence > 0 && mentionedSequence <= next.sequenceCount
      ? [mentionedSequence]
      : Array.from({ length: next.sequenceCount }, (_, index) => index + 1);
    const projectNumber = next.flatAssetFolder.nextUnusedNumber;
    const created: StudioAsset = {
      id,
      projectNumber,
      generatedFileName: numberedAssetFileName({ projectNumber, name }),
      name,
      category: descriptor.category,
      description: `New ${descriptor.category.toLowerCase()} production asset introduced through project chat.`,
      storyPurpose: 'User-directed production requirement.',
      sequences,
      approvalState: 'Pending', lockState: 'Unlocked', version: 1, referenceCount: 0,
      notes: 'Permanent project number assigned at creation. This number is never reused or changed.',
      continuityConstraints: ['Keep this permanent asset number across regeneration, replacement, prompts, continuity, and export'],
      ...makeAssetIntelligence(id, ['Characters', 'Locations', 'Interiors', 'Weapons', 'Transformation Sheets'].includes(descriptor.category) ? 'Story critical' : 'Recurring', descriptor.category),
    };
    next.assets.push(created);
    next.assets.sort((a, b) => a.projectNumber - b.projectNumber);
    next.flatAssetFolder.nextUnusedNumber = projectNumber + 1;
    next.locations = makeLocations(next);
    next.environments = makeEnvironments(next);
    next.sequences = makeSequences(next);
    next.knowledgeGraph = makeKnowledgeGraph(next);
    next.stage = 'Assets';
    return { project: next, response: message(`${assetProductionReference(created)} is now the next permanent production asset. No existing number changed, and every sequence, prompt, continuity record, and export will use Asset ${formatAssetNumber(projectNumber)}.`, { kind: 'assets', assetIds: [created.id] }) };
  }

  const asset = findAsset(next, input);
  if (asset && /approve|lock/.test(lower)) {
    asset.approvalState = 'Locked';
    asset.lockState = 'Locked';
    const remaining = next.assets.filter((item) => item.approvalState !== 'Locked' && item.approvalState !== 'Approved').length;
    if (remaining === 0) next.stage = 'Sequences';
    return { project: next, response: message(`${assetProductionReference(asset)} is approved and identity-locked. ${remaining ? `${remaining} assets still need review.` : 'All required assets are now ready.'}`, { kind: 'assets', assetIds: [asset.id] }) };
  }
  if (asset && /regenerate|new version|try again/.test(lower)) {
    asset.version += 1;
    asset.approvalState = 'Pending';
    asset.lockState = 'Unlocked';
    return { project: next, response: message(`I created version ${asset.version} for ${assetProductionReference(asset)}. Its permanent number and filename stay fixed; no other asset number moves. The previously approved version is preserved.`, { kind: 'assets', assetIds: [asset.id] }) };
  }
  if (asset && /reference coverage|coverage|what references|missing views/.test(lower)) {
    const coverage = asset.referenceCoverage;
    const values = Object.entries(coverage);
    const missing = values.filter(([, value]) => value < 40).map(([key]) => key);
    const significantRisk = asset.importance === 'Story critical' && missing.some((key) => ['identity', 'face', 'body', 'object', 'location', 'material'].includes(key));
    return {
      project: next,
      response: message(
        `${assetProductionReference(asset)} has ${asset.referenceCount} stored reference${asset.referenceCount === 1 ? '' : 's'}. ${significantRisk ? `The highest-risk missing coverage is ${missing.slice(0, 4).join(', ')}.` : 'Current gaps do not automatically block production; I’ll ask only when a gap creates real continuity risk.'}`,
        { kind: 'coverage', assetIds: [asset.id] },
      ),
    };
  }

  if (/show (?:me )?(?:all )?characters|\/characters/.test(lower)) {
    const characters = next.assets.filter((item) => item.category === 'Characters');
    return { project: next, response: message(`${characters.length} character${characters.length === 1 ? '' : 's'} in this movie: ${characters.map(assetProductionReference).join(', ')}.`, { kind: 'assets', assetIds: characters.map((item) => item.id) }) };
  }
  if (/show (?:me )?(?:all )?locations|\/locations/.test(lower)) {
    const locations = next.assets.filter((item) => ['Locations', 'Interiors'].includes(item.category));
    return { project: next, response: message(`${locations.length} location asset${locations.length === 1 ? '' : 's'}: ${locations.map(assetProductionReference).join(', ')}.`, { kind: 'assets', assetIds: locations.map((item) => item.id) }) };
  }
  if (/show (?:me )?(?:all )?environments|environment states|weather states/.test(lower)) {
    return { project: next, response: message(`${next.environments.length} environment state${next.environments.length === 1 ? '' : 's'} are separated from permanent location identity. They track weather, atmosphere, wind, visibility, surfaces, vegetation, fire, water, debris, tracks, lighting, time, and physical sound sources.`, { kind: 'world' }) };
  }
  if (/show (?:me )?(?:all )?assets|how many assets|asset manifest|\/assets/.test(lower)) {
    const counts = Object.entries(next.assets.reduce<Record<string, number>>((acc, item) => { acc[item.category] = (acc[item.category] ?? 0) + 1; return acc; }, {}));
    return { project: next, response: message(`${next.assets.length} permanently numbered assets in ${next.flatAssetFolder.folderName}, from Asset ${formatAssetNumber(next.assets[0]?.projectNumber ?? 0)} through Asset ${formatAssetNumber(next.assets.at(-1)?.projectNumber ?? 0)}: ${counts.map(([category, count]) => `${count} ${category.toLowerCase()}`).join(', ')}. All categories share this one sequence.`, { kind: 'assets', assetIds: next.assets.map((item) => item.id) }) };
  }
  if (/missing asset|production risk|what.*need|look ahead|future asset/.test(lower)) {
    const critical = next.assets.filter((item) => item.importance === 'Story critical' || item.importance === 'Location anchor');
    const unready = critical.filter((item) => item.lockState !== 'Locked');
    const future = next.sequences.flatMap((item) => item.lookAhead).filter((value, index, all) => all.indexOf(value) === index);
    return { project: next, response: message(`${unready.length} critical or location-anchor assets still need approval. Look-ahead has identified ${future.length} future production requirements before their first sequence.`, { kind: 'lookahead', assetIds: unready.map((item) => item.id), sequenceNumber: next.currentSequence }) };
  }

  const sequenceNumber = Number(lower.match(/sequence\s*(\d+)/)?.[1] ?? 0);
  const sequence = next.sequences.find((item) => item.number === sequenceNumber);
  if (sequence && /scene graph|relationships|knowledge graph/.test(lower)) {
    return { project: next, response: message(`${sequence.id} contains ${sequence.sceneGraph.nodes.length} scene nodes and ${sequence.sceneGraph.edges.length} explicit relationships linking identities, costumes, held objects, animals, locations, environments, furniture, lighting, and sequence membership.`, { kind: 'graph', sequenceNumber: sequence.number }) };
  }
  if (sequence && /scene state|opening state intelligence|what is present/.test(lower)) {
    return { project: next, response: message(`${sequence.id} opens in ${sequence.sceneState.locationId} under ${sequence.sceneState.environmentId}. The Scene State contains every character, costume, creature, animal, vehicle, prop, furniture item, object placement, light, weather condition, effect, sound source, camera axis, spatial relationship, and inherited story state.`, { kind: 'scene', sequenceNumber: sequence.number }) };
  }
  if (sequence && /ending state|closing state intelligence/.test(lower)) {
    return { project: next, response: message(`${sequence.id} has a structured Ending State for positions, direction, physical condition, wardrobe, held and dropped objects, animals, creatures, vehicles, props, environment, damage, lighting, weather, effects, camera, screen direction, elapsed time, and sound.`, { kind: 'scene', sequenceNumber: sequence.number }) };
  }
  if (sequence && /sequence asset manifest|exact manifest/.test(lower)) {
    const total = Object.values(sequence.assetManifest).reduce((sum, values) => sum + values.length, 0);
    return { project: next, response: message(`${sequence.id} has ${total} manifest entries across ${Object.entries(sequence.assetManifest).filter(([, values]) => values.length > 0).map(([category]) => category).join(', ')}. The prompt reads this manifest before generation.`, { kind: 'scene', sequenceNumber: sequence.number }) };
  }
  if (sequence && /approve/.test(lower)) {
    sequence.status = 'Approved';
    next.currentSequence = Math.min(next.sequenceCount, sequence.number + 1);
    next.continuity.status = 'Passed';
    const following = next.sequences.find((item) => item.number === sequence.number + 1);
    if (following) {
      following.continuitySource = `Approved structured Ending State of ${sequence.id}`;
      following.sceneState.previousContinuitySource = following.continuitySource;
      following.openingState = `Inherit positions, direction, conditions, wardrobe, held and dropped objects, animals, creatures, vehicles, props, environment, damage, lighting, weather, effects, time, and sound from ${sequence.id}.`;
    }
    const event: ContinuityEvent = {
      id: uid('continuity'), sequenceNumber: sequence.number, assetId: next.assets[0]?.id ?? 'PROJECT', field: 'sequence boundary',
      assetNumber: next.assets[0]?.projectNumber ?? 0,
      previousValue: sequence.openingState, nextValue: sequence.closingState, reason: 'Approved sequence closing state', createdAt: nowIso(),
    };
    next.continuity.events.push(event);
    if (next.sequences.every((item) => item.status === 'Approved')) next.stage = 'Assembly';
    return { project: next, response: message(`${sequence.id} is approved. Its structured Ending State is now the expected opening state for ${following?.id ?? 'final assembly'}, including spatial, physical, environmental, lighting, time, and sound continuity.`, { kind: 'scene', sequenceNumber: sequence.number }) };
  }
  if (sequence && /generate/.test(lower)) {
    const blockers: string[] = [];
    if (next.story.status !== 'Approved') blockers.push('story approval');
    if (next.worldBible.status !== 'Approved') blockers.push('World Bible approval');
    if (next.filmBible.status !== 'Approved') blockers.push('Film Bible approval');
    const pending = sequence.assetIds.filter((id) => next.assets.find((item) => item.id === id)?.approvalState !== 'Locked');
    if (pending.length) blockers.push(`${pending.length} locked reference asset${pending.length === 1 ? '' : 's'}`);
    if (blockers.length) return { project: next, response: message(`${sequence.id} is safe, but generation is blocked by ${blockers.join(', ')}. I kept its prompt and all existing work unchanged.`, { kind: 'sequence', sequenceNumber: sequence.number }) };
    sequence.status = 'Ready';
    next.stage = 'Generation';
    return { project: next, response: message(`${sequence.id} passed its dependency check. World rules, Scene State, Scene Graph, exact sequence manifest, reference coverage, continuity source, and structured Ending State are resolved. Connect a video provider in Settings to start the generation job.`, { kind: 'scene', sequenceNumber: sequence.number }) };
  }
  if (sequence && /(show|prompt|seedance)/.test(lower)) {
    return { project: next, response: message(`${sequence.id} is ${sequence.status.toLowerCase()}. Attach ${sequence.assetFiles.map((file, index) => `Asset ${formatAssetNumber(sequence.assetNumbers[index])} (${file})`).join(', ')}. It inherits continuity from ${sequence.continuitySource}.`, { kind: 'sequence', sequenceNumber: sequence.number }) };
  }
  if (/show (?:me )?(?:all )?sequences|sequence plan|\/sequences/.test(lower)) {
    return { project: next, response: message(`${next.sequenceCount} sequences total. Each planned sequence stores exact permanent asset numbers, matching flat-folder filenames, opening and closing states, a continuity source, and a production-ready Seedance prompt.`, { kind: 'sequence', sequenceNumber: next.currentSequence }) };
  }

  if (asset && sequenceNumber > 0 && /pick(?:ed)? up|put down|carry|carried|pass(?:ed)?|throw|thrown|drop(?:ped)?|lost|found|open(?:ed)?|close(?:d)?|activate(?:d)?|deactivate(?:d)?|hidden|revealed|move(?:d)?/.test(lower)) {
    const eventType = lower.match(/picked up|put down|carried|passed|thrown|dropped|lost|found|opened|closed|activated|deactivated|hidden|revealed|moved/)?.[0]
      ?? (lower.includes('drop') ? 'dropped' : lower.includes('carry') ? 'carried' : lower.includes('move') ? 'moved' : 'state changed');
    const previousState = `${asset.currentState.holder}; ${asset.currentState.currentLocation}; ${asset.currentState.condition}; ${asset.currentState.visibility}`;
    asset.currentState.previousLocation = asset.currentState.currentLocation;
    if (/drop|put down|throw|lost/.test(lower)) asset.currentState.holder = 'None';
    if (/pick|carry|pass/.test(lower)) asset.currentState.holder = 'CHARACTER_001';
    if (/hidden/.test(lower)) asset.currentState.visibility = 'Hidden';
    if (/revealed/.test(lower)) asset.currentState.visibility = 'Visible';
    if (/open/.test(lower)) asset.currentState.condition = 'Open';
    if (/close/.test(lower)) asset.currentState.condition = 'Closed';
    if (/activate/.test(lower) && !/deactivate/.test(lower)) asset.currentState.condition = 'Activated';
    if (/deactivate/.test(lower)) asset.currentState.condition = 'Deactivated';
    const locationId = next.sequences.find((item) => item.number === sequenceNumber)?.sceneState.locationId ?? asset.currentState.currentLocation;
    asset.currentState.currentLocation = locationId;
    const event: AssetStateEvent = {
      id: uid('state'), sequenceNumber, assetId: asset.id, assetNumber: asset.projectNumber, eventType,
      previousState, nextState: `${asset.currentState.holder}; ${asset.currentState.currentLocation}; ${asset.currentState.condition}; ${asset.currentState.visibility}`,
      locationId, actorId: asset.currentState.holder === 'None' ? 'UNASSIGNED' : asset.currentState.holder, notes: input, createdAt: nowIso(),
    };
    next.stateEvents.push(event);
    next.continuity.events.push({ id: uid('continuity'), sequenceNumber, assetId: asset.id, assetNumber: asset.projectNumber, field: 'object state', previousValue: previousState, nextValue: event.nextState, reason: input, createdAt: event.createdAt });
    next.sequences.filter((item) => item.number >= sequenceNumber).forEach((item) => { item.status = 'Needs Review'; item.version += 1; });
    return { project: next, response: message(`Recorded ${assetProductionReference(asset)} as ${eventType} in Sequence ${sequenceNumber}. Owner, holder, current and previous location, condition, visibility, scene relationships, and every later opening state will inherit the change.`, { kind: 'scene', sequenceNumber }) };
  }

  if (asset && sequenceNumber > 0 && /break|broken|damage|damaged|injur|cut|burn|torn|destroy/.test(lower)) {
    const previousDamage = asset.currentState.damage;
    const damage = /destroy/.test(lower) ? 'Destroyed' : /break|broken/.test(lower) ? 'Broken' : /burn/.test(lower) ? 'Burn damage' : /cut/.test(lower) ? 'Cut damage' : /torn/.test(lower) ? 'Torn' : /injur/.test(lower) ? 'Injured' : 'Damaged';
    asset.currentState.damage = damage;
    asset.currentState.condition = damage === 'Destroyed' ? 'Destroyed' : 'Damaged';
    const event: AssetStateEvent = {
      id: uid('state'), sequenceNumber, assetId: asset.id, assetNumber: asset.projectNumber, eventType: 'damage', previousState: previousDamage,
      nextState: damage, locationId: asset.currentState.currentLocation, actorId: 'STORY_EVENT', notes: input, createdAt: nowIso(),
    };
    next.stateEvents.push(event);
    next.continuity.events.push({ id: uid('continuity'), sequenceNumber, assetId: asset.id, assetNumber: asset.projectNumber, field: 'damage', previousValue: previousDamage, nextValue: damage, reason: input, createdAt: event.createdAt });
    next.sequences.filter((item) => item.number >= sequenceNumber).forEach((item) => { item.status = 'Needs Review'; item.version += 1; });
    return { project: next, response: message(`${damage} is now attached to ${assetProductionReference(asset)} from Sequence ${sequenceNumber}. It persists across later scenes until a recorded repair or transformation changes it.`, { kind: 'scene', sequenceNumber }) };
  }

  if (asset && sequenceNumber > 0 && /transform|morph|deploy|fold|unfold|age|variant|special form/.test(lower)) {
    const previous = asset.currentState.transformation;
    const nextState = /deploy|unfold/.test(lower) ? 'Deployed state' : /fold/.test(lower) ? 'Folded state' : /age/.test(lower) ? 'Age variant' : 'Transformed state';
    asset.currentState.transformation = nextState;
    const event: AssetStateEvent = {
      id: uid('state'), sequenceNumber, assetId: asset.id, assetNumber: asset.projectNumber, eventType: 'transformation', previousState: previous, nextState,
      locationId: asset.currentState.currentLocation, actorId: asset.id, notes: input, createdAt: nowIso(),
    };
    next.stateEvents.push(event);
    next.continuity.events.push({ id: uid('continuity'), sequenceNumber, assetId: asset.id, assetNumber: asset.projectNumber, field: 'transformation', previousValue: previous, nextValue: nextState, reason: input, createdAt: event.createdAt });
    next.sequences.filter((item) => item.number >= sequenceNumber).forEach((item) => { item.status = 'Needs Review'; item.version += 1; });
    return { project: next, response: message(`${assetProductionReference(asset)} remains one permanent identity. Its ${nextState.toLowerCase()} begins in Sequence ${sequenceNumber}, with ordered source, intermediate, final, material, body, costume, mechanical, effect, and continuity stages attached to that same asset number.`, { kind: 'scene', sequenceNumber }) };
  }

  if (sequenceNumber > 0 && /rain|snow|fog|smoke|wind|dust|fire|water|weather/.test(lower) && /(start|begin|increase|stop|clear|change|become|turn)/.test(lower)) {
    const environment = next.environments[0];
    if (environment) {
      const environmentAsset = next.assets.find((asset) => asset.id === environment.id);
      const previous = `${environment.weather}; ${environment.atmosphere.join(', ')}; ${environment.wind}; ${environment.fireState}`;
      if (/rain/.test(lower)) environment.weather = /stop|clear/.test(lower) ? 'Rain stopped' : 'Rain';
      if (/snow/.test(lower)) environment.weather = /stop|clear/.test(lower) ? 'Snow stopped' : 'Snow';
      if (/fog/.test(lower)) environment.atmosphere = /clear|stop/.test(lower) ? environment.atmosphere.filter((item) => item !== 'Fog') : [...new Set([...environment.atmosphere, 'Fog'])];
      if (/smoke/.test(lower)) environment.atmosphere = /clear|stop/.test(lower) ? environment.atmosphere.filter((item) => item !== 'Smoke') : [...new Set([...environment.atmosphere, 'Smoke'])];
      if (/wind/.test(lower)) environment.wind = /stop|clear/.test(lower) ? 'Still' : 'Increased wind';
      if (/fire/.test(lower)) environment.fireState = /stop|clear/.test(lower) ? 'Extinguished' : 'Active';
      environment.activeFromSequence = sequenceNumber;
      const current = `${environment.weather}; ${environment.atmosphere.join(', ')}; ${environment.wind}; ${environment.fireState}`;
      next.stateEvents.push({ id: uid('state'), sequenceNumber, assetId: environment.id, assetNumber: environmentAsset?.projectNumber ?? 0, eventType: 'environment evolution', previousState: previous, nextState: current, locationId: environment.locationId, actorId: 'ENVIRONMENT', notes: input, createdAt: nowIso() });
      next.sequences.filter((item) => item.number >= sequenceNumber).forEach((item) => { item.status = 'Needs Review'; item.version += 1; });
      return { project: next, response: message(`Environment evolution is recorded from Sequence ${sequenceNumber}: ${current}. The location identity stays unchanged while weather, atmosphere, surfaces, lighting, sound, and later continuity inherit the new state.`, { kind: 'world', sequenceNumber }) };
    }
  }

  if (/head covering/.test(lower) && sequenceNumber > 0) {
    const protagonistAsset = next.assets.find((item) => item.id === 'CHARACTER_001');
    const remove = /remove|off|without/.test(lower);
    const event: ContinuityEvent = {
      id: uid('continuity'), sequenceNumber, assetId: protagonistAsset?.id ?? 'CHARACTER_001', field: 'head covering',
      assetNumber: protagonistAsset?.projectNumber ?? 0,
      previousValue: remove ? 'ON' : 'OFF', nextValue: remove ? 'OFF' : 'ON', reason: input, createdAt: nowIso(),
    };
    next.continuity.events.push(event);
    next.sequences.filter((item) => item.number >= sequenceNumber).forEach((item) => { item.status = 'Needs Review'; item.version += 1; });
    return { project: next, response: message(`Recorded: Asset ${formatAssetNumber(event.assetNumber)} head covering is ${event.nextValue} from Sequence ${sequenceNumber}. I marked Sequence ${sequenceNumber} and every later sequence for continuity review.`, { kind: 'sequence', sequenceNumber }) };
  }

  if (/make (?:the )?(?:entire )?movie.*night|night only/.test(lower)) {
    next.filmBible.version += 1;
    next.filmBible.status = 'Draft';
    next.worldBible.version += 1;
    next.worldBible.status = 'Draft';
    next.lightingDirection = 'Night-only motivated lighting with stable direction and exposure rules';
    next.filmBible.visualRules.push('Every sequence occurs at night; no daylight or dawn imagery.');
    next.worldBible.lightingRules.push('Night-only production world; moon, fire, lantern, vehicle, or established practical sources only.');
    next.environments.forEach((environment) => { environment.timeOfDay = 'Night'; environment.lighting = next.lightingDirection; });
    next.sequences.forEach((item) => { item.timeOfDay = 'Night'; item.status = 'Needs Review'; item.version += 1; });
    return { project: next, response: message(`World Bible v${next.worldBible.version} and Film Bible v${next.filmBible.version} now lock the movie to night. Environment, light-source, time, visibility, sound, and sequence-state assumptions are marked for review; previous approved versions remain preserved.`, { kind: 'world' }) };
  }

  if (/status|\/status/.test(lower)) {
    const approvedAssets = next.assets.filter((item) => item.approvalState === 'Locked' || item.approvalState === 'Approved').length;
    const approvedSequences = next.sequences.filter((item) => item.status === 'Approved').length;
    return { project: next, response: message(`${next.title}: Story ${next.story.status}. World Bible ${next.worldBible.status}. Film Bible ${next.filmBible.status}. Assets ${approvedAssets}/${next.assets.length} approved. Locations ${next.locations.length}. Environment states ${next.environments.length}. Knowledge relationships ${next.knowledgeGraph.edges.length}. Sequences ${approvedSequences}/${next.sequenceCount} approved. Current Sequence ${next.currentSequence}. Continuity ${next.continuity.status}.`, { kind: 'status' }) };
  }

  if (/download (?:all |movie |project )?assets|export (?:all )?assets|flat asset folder|single flat asset folder/.test(lower)) {
    return {
      project: next,
      response: message(
        `${next.flatAssetFolder.folderName} is ready under the SINGLE FLAT ASSET FOLDER RULE. It contains only approved generated visual assets, sorted by the permanent filenames ${next.assets.slice(0, 4).map((asset) => asset.generatedFileName).join(', ')}${next.assets.length > 4 ? ', …' : ''}. There are no subfolders and numbering never restarts by category.`,
        { kind: 'flat-assets', assetIds: next.assets.map((asset) => asset.id) },
      ),
      sideEffect: 'asset-export',
    };
  }

  if (/export (?:the )?(?:whole|full|entire|everything|project)|\/export/.test(lower)) {
    next.exportStatus = 'Ready';
    return { project: next, response: message(`The complete project package is ready. It includes story, World Bible, Film Bible, locations, interiors, environment evolution, numbered asset identities and states, reference coverage, scene states, scene graphs, numbered sequence manifests, prompts, Ending States, the production knowledge graph, continuity timeline, media references, and export history. Every approved generated visual asset is placed directly inside ${next.flatAssetFolder.folderName} with no subfolders. API keys are never included.`, { kind: 'export' }), sideEffect: 'export' };
  }

  if (/^continue\.?$|what(?:'s| is) next/.test(lower)) {
    if (next.story.status !== 'Approved') return { project: next, response: message('Your story draft is ready. Review it here, then say “Approve the story” when its direction feels right.', { kind: 'story' }) };
    if (next.worldBible.status !== 'Approved') return { project: next, response: message('The next useful step is the World Bible. It locks geography, period, culture, technology, architecture, materials, climate, environment, object, wardrobe, and physical-world rules before production moves forward.', { kind: 'world' }) };
    if (next.filmBible.status !== 'Approved') return { project: next, response: message('The next step is the Film Bible. It locks the world, visual language, sound, and continuity rules before asset approval.', { kind: 'bible' }) };
    const pending = next.assets.filter((item) => item.approvalState !== 'Locked');
    if (pending.length) return { project: next, response: message(`${pending.length} assets need approval. Start with ${pending[0].name} (${pending[0].id}); attach a reference or ask me to prepare an AI generation brief.`, { kind: 'assets', assetIds: [pending[0].id] }) };
    const pendingSequence = next.sequences.find((item) => item.status !== 'Approved');
    if (pendingSequence) return { project: next, response: message(`Next is ${pendingSequence.id}: ${pendingSequence.title}. Its asset mapping and continuity source are ready for review.`, { kind: 'sequence', sequenceNumber: pendingSequence.number }) };
    return { project: next, response: message('Every sequence is approved. The production is ready for final assembly and a complete project export.', { kind: 'export' }) };
  }

  next.story.version += 1;
  next.story.status = 'Draft';
  next.worldBible.version += 1;
  next.worldBible.status = 'Draft';
  next.filmBible.version += 1;
  next.filmBible.status = 'Draft';
  next.sequences.forEach((item) => { if (item.status === 'Approved') item.status = 'Needs Review'; });
  return { project: next, response: message(`I recorded that direction in Story v${next.story.version}. The World Bible, Film Bible, manifest, look-ahead plan, scene graphs, and affected sequence assumptions are marked for review. Existing approved versions and media remain preserved.`, { kind: 'note' }) };
}
