import type { StudioProject, StudioSequence } from './studio';

export type ProductionDocumentKind =
  | 'story'
  | 'script'
  | 'scenario'
  | 'world-bible'
  | 'film-bible'
  | 'sequence'
  | 'seedance-prompt';

export interface ProductionDocument {
  kind: ProductionDocumentKind;
  title: string;
  filename: string;
  content: string;
  version: number;
  status: string;
}

function safeFilePart(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 64) || 'MOVIE';
}

function list(title: string, values: string[]) {
  return values.length ? `## ${title}\n\n${values.map((value) => `- ${value}`).join('\n')}` : '';
}

function sequenceFor(project: StudioProject, sequenceNumber?: number) {
  return project.sequences.find((sequence) => sequence.number === (sequenceNumber ?? project.currentSequence)) ?? project.sequences[0];
}

function storyDocument(project: StudioProject): ProductionDocument {
  const story = project.story;
  const content = `# ${project.title}\n\n## Logline\n\n${story.logline}\n\n## Protagonist\n\n${story.protagonist}\n\n## Central conflict\n\n${story.conflict}\n\n## Beginning\n\n${story.beginning}\n\n## Escalation\n\n${story.escalation}\n\n## Midpoint\n\n${story.midpoint}\n\n## Climax\n\n${story.climax}\n\n## Ending\n\n${story.ending}`;
  return { kind: 'story', title: `Story · v${story.version}`, filename: `${safeFilePart(project.title)}_STORY_V${story.version}.md`, content, version: story.version, status: story.status };
}

function worldBibleDocument(project: StudioProject): ProductionDocument {
  const bible = project.worldBible;
  const sections = [
    `# ${project.title} — World Bible`,
    `## Foundation\n\n- Geography: ${bible.geography}\n- Historical period: ${bible.historicalPeriod}\n- Culture: ${bible.culture}\n- Technology: ${bible.technologyLevel}`,
    list('Architecture', bible.architecture),
    list('Construction materials', bible.constructionMaterials),
    list('Interior design', bible.interiorDesign),
    list('Furniture style', bible.furnitureStyle),
    list('Terrain', bible.terrain),
    list('Climate', bible.climate),
    list('Vegetation', bible.vegetation),
    list('Transportation', bible.transportation),
    list('Wardrobe rules', bible.wardrobeRules),
    list('Object rules', bible.objectRules),
    list('Weapon rules', bible.weaponRules),
    list('Language rules', bible.languageRules),
    list('Visual rules', bible.visualRules),
    list('Lighting rules', bible.lightingRules),
    list('Environmental rules', bible.environmentalRules),
    list('Physical rules', bible.physicalRules),
    list('Restrictions', bible.restrictions),
  ].filter(Boolean).join('\n\n');
  return { kind: 'world-bible', title: `World Bible · v${bible.version}`, filename: `${safeFilePart(project.title)}_WORLD_BIBLE_V${bible.version}.md`, content: sections, version: bible.version, status: bible.status };
}

function filmBibleDocument(project: StudioProject): ProductionDocument {
  const bible = project.filmBible;
  const content = [
    `# ${project.title} — Film Bible`,
    `## Visual direction\n\n- Style: ${project.visualStyle}\n- Camera: ${project.cameraStyle}\n- Lenses: ${project.lensDirection}\n- Lighting: ${project.lightingDirection}\n- Color: ${project.colorDirection}\n- Aspect ratio: ${project.aspectRatio}\n- Resolution: ${project.resolution}`,
    list('World rules', bible.worldRules),
    list('Character rules', bible.characterRules),
    list('Visual rules', bible.visualRules),
    list('Seedance sound instructions', bible.soundRules),
    list('Continuity rules', bible.continuityRules),
    list('Negative rules', bible.negativeRules),
  ].filter(Boolean).join('\n\n');
  return { kind: 'film-bible', title: `Film Bible · v${bible.version}`, filename: `${safeFilePart(project.title)}_FILM_BIBLE_V${bible.version}.md`, content, version: bible.version, status: bible.status };
}

function dialogueBlock(sequence: StudioSequence, project: StudioProject) {
  const plan = project.production.sequencePlans[sequence.id];
  if (!plan?.dialogue.length) return 'No spoken dialogue. Non-speaking characters remain explicitly non-speaking where ambiguity exists.';
  return plan.dialogue.map((line) => {
    const costume = line.currentCostumeAssetNumbers.length ? line.currentCostumeAssetNumbers.map((number) => `Asset ${String(number).padStart(3, '0')}`).join(', ') : 'base appearance';
    const listener = line.addresseeAssetNumber ? `Asset ${String(line.addresseeAssetNumber).padStart(3, '0')}` : 'no named listener';
    return `### ${line.startSecond}–${line.endSecond}s · Asset ${String(line.speakerAssetNumber).padStart(3, '0')} · ${line.speakerName}\n\n“${line.exactDialogue}”\n\n- Variant: ${line.speakerVariant}\n- Costume/state: ${costume}\n- Language/dialect: ${line.languageLock || line.language} / ${line.dialectLock || line.dialect}\n- Emotion/expression: ${line.emotion} / ${line.expression}\n- Action: ${line.physicalAction}\n- Listener: ${listener}\n- Required visual references: ${line.requiredVisualReferences.map((reference) => reference.assetNumber ? `Asset ${String(reference.assetNumber).padStart(3, '0')}` : reference.fileName).join(', ')}`;
  }).join('\n\n');
}

function scenarioDocument(project: StudioProject, sequence: StudioSequence): ProductionDocument {
  const plan = project.production.sequencePlans[sequence.id];
  const scenario = plan.scenario;
  const actions = scenario.actions.map((action) => `- ${action.startSecond}–${action.endSecond}s: Asset ${String(action.actorAssetNumber).padStart(3, '0')} ${action.verb}${action.targetAssetNumber ? ` Asset ${String(action.targetAssetNumber).padStart(3, '0')}` : ''}. Result: ${action.resultingState}`).join('\n');
  const content = `# ${sequence.id} — ${sequence.title}\n\n## Purpose\n\n${scenario.purpose}\n\n## Opening situation\n\n${scenario.openingSituation}\n\n## Active story objective\n\n${scenario.activeStoryObjective}\n\n## Actions and interactions\n\n${actions || '- No authored physical action.'}\n\n${scenario.interactions.map((item) => `- ${item}`).join('\n')}\n\n## Exact dialogue and speaker bindings\n\n${dialogueBlock(sequence, project)}\n\n## Reactions\n\n${scenario.reactions.map((item) => `- ${item}`).join('\n')}\n\n## Camera progression\n\n${scenario.cameraProgression.map((item) => `- ${item}`).join('\n')}\n\n## Environment behaviour\n\n- Wind: ${scenario.environmentalActivity.wind}\n- Fabric: ${scenario.environmentalActivity.fabric}\n- Traffic: ${scenario.environmentalActivity.traffic}\n- Crowd: ${scenario.environmentalActivity.crowd}\n- Water: ${scenario.environmentalActivity.water}\n- Fire: ${scenario.environmentalActivity.fire}\n- Smoke: ${scenario.environmentalActivity.smoke}\n- Dust: ${scenario.environmentalActivity.dust}\n- Vegetation: ${scenario.environmentalActivity.vegetation}\n- Mechanical: ${scenario.environmentalActivity.mechanical}\n\n## Story development\n\n${scenario.storyDevelopment}\n\n## Ending situation\n\n${scenario.endingSituation}\n\n## Connection to next sequence\n\n${scenario.connectionToNext}\n\n## State delta\n\n- Opening: ${scenario.sceneStateDelta.opening}\n${scenario.sceneStateDelta.changes.map((item) => `- Change: ${item}`).join('\n')}\n- Ending: ${scenario.sceneStateDelta.ending}`;
  return { kind: 'scenario', title: `${sequence.id} Scenario`, filename: `${sequence.id}_SCENARIO_V${plan.revision}.md`, content, version: plan.revision, status: plan.freshness };
}

function scriptDocument(project: StudioProject, sequence: StudioSequence): ProductionDocument {
  const plan = project.production.sequencePlans[sequence.id];
  const dialogue = plan.dialogue.length ? plan.dialogue.map((line) => `${line.speakerName.toUpperCase()} [Asset ${String(line.speakerAssetNumber).padStart(3, '0')}] (${line.emotion}; ${line.physicalAction}; ${line.startSecond}–${line.endSecond}s)\n${line.exactDialogue}`).join('\n\n') : '[No spoken dialogue]';
  const actions = plan.scenario.actions.map((action) => `At ${action.startSecond}s, ${action.actorName} ${action.verb}. ${action.resultingState}`).join('\n');
  const content = `# ${sequence.id} — ${sequence.title}\n\n${sequence.location.toUpperCase()} — ${sequence.timeOfDay.toUpperCase()}\n\n${plan.scenario.openingSituation}\n\n${actions}\n\n${dialogue}\n\n${plan.scenario.endingSituation}`;
  return { kind: 'script', title: `${sequence.id} Script`, filename: `${sequence.id}_SCRIPT_V${plan.revision}.md`, content, version: plan.revision, status: plan.freshness };
}

function sequenceDocument(project: StudioProject, sequence: StudioSequence): ProductionDocument {
  const plan = project.production.sequencePlans[sequence.id];
  const references = plan.referencePackage.rankedReferences.filter((reference) => reference.included).map((reference) => `- ${reference.uploadOrder}. ${reference.assetNumber ? `Asset ${String(reference.assetNumber).padStart(3, '0')} · ` : ''}${reference.fileName} — ${reference.role}`).join('\n');
  const content = `# ${sequence.id} — ${sequence.title}\n\n## Purpose\n\n${sequence.purpose}\n\n## Duration and location\n\n- Duration: ${sequence.duration}s\n- Location: ${sequence.location}\n- Time: ${sequence.timeOfDay}\n\n## Opening state\n\n${sequence.openingState}\n\n## Closing state\n\n${sequence.closingState}\n\n## Required numbered references\n\n${references}\n\n## Timing plan\n\n${plan.timing.map((beat) => `- ${beat.startSecond}–${beat.endSecond}s: ${beat.label}`).join('\n')}\n\n## Continuity\n\n- Source: ${sequence.continuitySource}\n- Expected opening frame: ${plan.expectedOpeningFrame}\n- Next connection: ${plan.scenario.connectionToNext}`;
  return { kind: 'sequence', title: `${sequence.id} Plan`, filename: `${sequence.id}_PLAN_V${plan.revision}.md`, content, version: plan.revision, status: sequence.status };
}

function seedancePromptDocument(project: StudioProject, sequence: StudioSequence): ProductionDocument {
  const plan = project.production.sequencePlans[sequence.id];
  return { kind: 'seedance-prompt', title: `${sequence.id} Seedance Prompt`, filename: `${sequence.id}_SEEDANCE_PROMPT_V${plan.revision}.txt`, content: plan.compiledPrompt || sequence.prompt, version: plan.revision, status: plan.freshness };
}

export function getProductionDocument(project: StudioProject, kind: ProductionDocumentKind, sequenceNumber?: number): ProductionDocument | null {
  if (kind === 'story') return storyDocument(project);
  if (kind === 'world-bible') return worldBibleDocument(project);
  if (kind === 'film-bible') return filmBibleDocument(project);
  const sequence = sequenceFor(project, sequenceNumber);
  if (!sequence) return null;
  if (kind === 'scenario') return scenarioDocument(project, sequence);
  if (kind === 'script') return scriptDocument(project, sequence);
  if (kind === 'sequence') return sequenceDocument(project, sequence);
  return seedancePromptDocument(project, sequence);
}
