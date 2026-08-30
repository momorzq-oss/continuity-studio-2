import type { StudioProject } from './studio';

export const STUDIO_BRAIN_VERSION = 1 as const;

export const studioAssetCategories = [
  'Characters', 'Locations', 'Interiors', 'Environment States', 'Furniture', 'Props', 'Story Critical Objects',
  'Costumes', 'Creatures', 'Animals', 'Vehicles', 'Weapons', 'Mechanical Systems', 'Transformation Sheets',
  'Damage Sheets', 'Lighting', 'Effects',
] as const;

export type StudioBrainAssetCategory = (typeof studioAssetCategories)[number];

export interface StudioBrainAsset {
  name: string;
  category: StudioBrainAssetCategory;
  description: string;
  storyPurpose: string;
  sequences: number[];
  importance: 'Story critical' | 'Recurring' | 'Location anchor' | 'Background' | 'Incidental';
  continuityConstraints: string[];
}

export interface StudioBrainSequence {
  title: string;
  purpose: string;
  locationName: string;
  timeOfDay: string;
  assetNames: string[];
  openingState: string;
  closingState: string;
}

export interface StudioMovieBlueprint {
  title: string;
  durationSeconds: number;
  genre: string;
  subgenre: string;
  setting: string;
  region: string;
  period: string;
  dialogueLanguage: string;
  visualStyle: string;
  cameraStyle: string;
  lensDirection: string;
  lightingDirection: string;
  colorDirection: string;
  story: {
    logline: string;
    protagonist: string;
    conflict: string;
    beginning: string;
    escalation: string;
    midpoint: string;
    climax: string;
    ending: string;
  };
  worldBible: Omit<StudioProject['worldBible'], 'version' | 'status'>;
  filmBible: Omit<StudioProject['filmBible'], 'version' | 'status'>;
  assets: StudioBrainAsset[];
  sequences: StudioBrainSequence[];
}

export interface StudioBrainResult {
  version: 1;
  mode: 'project-blueprint' | 'command';
  reasoningSummary: string;
  canonicalCommand: string | null;
  responseGuidance: string;
  blueprint: StudioMovieBlueprint | null;
}

const text = (value: unknown, maximum = 1600) => typeof value === 'string' ? value.trim().slice(0, maximum) : '';
const stringList = (value: unknown, maximum = 30) => Array.isArray(value)
  ? value.map((item) => text(item, 500)).filter(Boolean).slice(0, maximum)
  : [];
const integerList = (value: unknown, maximum = 60) => Array.isArray(value)
  ? [...new Set(value.map(Number).filter((item) => Number.isInteger(item) && item >= 1 && item <= 60))].slice(0, maximum)
  : [];
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

function sanitizeBlueprint(value: unknown): StudioMovieBlueprint | null {
  const input = record(value);
  const story = record(input?.story);
  const world = record(input?.worldBible);
  const film = record(input?.filmBible);
  if (!input || !story || !world || !film) return null;
  const categories = new Set<string>(studioAssetCategories);
  const assets = Array.isArray(input.assets) ? input.assets.flatMap((value) => {
    const item = record(value);
    const category = text(item?.category, 80);
    const name = text(item?.name, 180);
    if (!item || !name || !categories.has(category)) return [];
    const importance = text(item.importance, 40) as StudioBrainAsset['importance'];
    return [{
      name,
      category: category as StudioBrainAssetCategory,
      description: text(item.description),
      storyPurpose: text(item.storyPurpose, 800),
      sequences: integerList(item.sequences),
      importance: ['Story critical', 'Recurring', 'Location anchor', 'Background', 'Incidental'].includes(importance) ? importance : 'Recurring',
      continuityConstraints: stringList(item.continuityConstraints),
    }];
  }).slice(0, 80) : [];
  const sequences = Array.isArray(input.sequences) ? input.sequences.flatMap((value) => {
    const item = record(value);
    if (!item || !text(item.title)) return [];
    return [{
      title: text(item.title, 180),
      purpose: text(item.purpose),
      locationName: text(item.locationName, 300),
      timeOfDay: text(item.timeOfDay, 200),
      assetNames: stringList(item.assetNames, 40).map((item) => item.slice(0, 180)),
      openingState: text(item.openingState, 1400),
      closingState: text(item.closingState, 1400),
    }];
  }).slice(0, 60) : [];
  if (assets.length < 2 || sequences.length < 1) return null;

  const storyFields = ['logline', 'protagonist', 'conflict', 'beginning', 'escalation', 'midpoint', 'climax', 'ending'] as const;
  if (storyFields.some((key) => !text(story[key]))) return null;
  const list = (source: Record<string, unknown>, key: string) => stringList(source[key]);
  const durationSeconds = Math.min(1800, Math.max(30, Math.round(Number(input.durationSeconds) || sequences.length * 30)));
  return {
    title: text(input.title, 180) || 'Untitled Movie', durationSeconds,
    genre: text(input.genre, 120) || 'Drama', subgenre: text(input.subgenre, 160) || 'Cinematic short',
    setting: text(input.setting, 1000) || 'Story-defined setting', region: text(input.region, 300) || 'Story-defined region',
    period: text(input.period, 300) || 'Story-defined period', dialogueLanguage: text(input.dialogueLanguage, 180) || 'Story-defined',
    visualStyle: text(input.visualStyle, 800), cameraStyle: text(input.cameraStyle, 800), lensDirection: text(input.lensDirection, 800),
    lightingDirection: text(input.lightingDirection, 800), colorDirection: text(input.colorDirection, 800),
    story: Object.fromEntries(storyFields.map((key) => [key, text(story[key])])) as StudioMovieBlueprint['story'],
    worldBible: {
      geography: text(world.geography, 800), historicalPeriod: text(world.historicalPeriod, 300), culture: text(world.culture, 800), technologyLevel: text(world.technologyLevel, 800),
      architecture: list(world, 'architecture'), constructionMaterials: list(world, 'constructionMaterials'), interiorDesign: list(world, 'interiorDesign'), furnitureStyle: list(world, 'furnitureStyle'),
      terrain: list(world, 'terrain'), climate: list(world, 'climate'), vegetation: list(world, 'vegetation'), transportation: list(world, 'transportation'), wardrobeRules: list(world, 'wardrobeRules'),
      objectRules: list(world, 'objectRules'), weaponRules: list(world, 'weaponRules'), languageRules: list(world, 'languageRules'), visualRules: list(world, 'visualRules'), lightingRules: list(world, 'lightingRules'),
      environmentalRules: list(world, 'environmentalRules'), physicalRules: list(world, 'physicalRules'), restrictions: list(world, 'restrictions'),
    },
    filmBible: {
      worldRules: list(film, 'worldRules'), characterRules: list(film, 'characterRules'), visualRules: list(film, 'visualRules'), soundRules: list(film, 'soundRules'),
      continuityRules: list(film, 'continuityRules'), negativeRules: list(film, 'negativeRules'),
    },
    assets, sequences,
  };
}

export function parseStudioBrainResult(value: unknown): StudioBrainResult | null {
  const input = record(value);
  if (!input || Number(input.version) !== STUDIO_BRAIN_VERSION) return null;
  const mode = input.mode === 'project-blueprint' ? 'project-blueprint' : input.mode === 'command' ? 'command' : null;
  if (!mode) return null;
  const blueprint = sanitizeBlueprint(input.blueprint);
  const canonicalCommand = input.canonicalCommand === null ? null : text(input.canonicalCommand, 500) || null;
  if (mode === 'project-blueprint' && !blueprint) return null;
  if (mode === 'command' && !canonicalCommand) return null;
  return {
    version: STUDIO_BRAIN_VERSION,
    mode,
    reasoningSummary: text(input.reasoningSummary, 1200) || 'Codex returned a validated structured result.',
    canonicalCommand,
    responseGuidance: text(input.responseGuidance, 1200),
    blueprint,
  };
}

export function compactProjectForBrain(project: StudioProject) {
  return {
    id: project.id,
    title: project.title,
    idea: project.idea,
    stage: project.stage,
    durationSeconds: project.durationSeconds,
    genre: project.genre,
    story: project.story,
    worldBible: project.worldBible,
    filmBible: project.filmBible,
    assets: project.assets.filter((asset) => asset.lifecycleStatus === 'Active').map((asset) => ({
      id: asset.id, number: asset.projectNumber, name: asset.name, category: asset.category, sequences: asset.sequences,
      version: asset.version, approvalState: asset.approvalState, generated: Boolean(asset.generatedAttachmentId),
    })),
    sequences: project.sequences.map((sequence) => ({
      id: sequence.id, number: sequence.number, title: sequence.title, status: sequence.status,
      assetNumbers: sequence.assetNumbers, version: sequence.version,
    })),
    currentSequence: project.currentSequence,
    openBlockers: project.production.control.warnings.filter((warning) => warning.severity === 'Blocker').slice(0, 20).map((warning) => warning.message),
  };
}
