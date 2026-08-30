import { expect, test, type Page } from '@playwright/test';

const idea = 'A three-minute mystery about Ilyas, a clock repairer who discovers a brass gear that remembers tomorrow inside a flooded bell tower during a solar eclipse.';

const worldList = (value: string) => [value];
const blueprint = {
  title: 'The Clock Remembers', durationSeconds: 180, genre: 'Mystery', subgenre: 'Contained temporal mystery',
  setting: 'A flooded municipal bell tower during a solar eclipse', region: 'A fictional coastal municipality', period: 'Contemporary', dialogueLanguage: 'English',
  visualStyle: 'Grounded tactile realism with oxidized brass, flood reflections, and restrained eclipse contrast',
  cameraStyle: 'Motivated slow movement that preserves the tower geography and screen direction', lensDirection: '35mm spatial coverage with 50mm performance details',
  lightingDirection: 'Cool eclipse daylight through tower openings against warm clockwork practicals', colorDirection: 'Slate water, aged stone, oxidized brass, and narrow amber highlights',
  story: {
    logline: 'During a solar eclipse, clock repairer Ilyas must decode a brass gear that remembers tomorrow before floodwater destroys the bell tower and the warning it contains.',
    protagonist: 'Ilyas', conflict: 'Ilyas must choose whether to trust a mechanism that predicts his own next mistake while rising water makes every delay irreversible.',
    beginning: 'Ilyas enters the flooded tower to stop the municipal clock and finds one dry brass gear turning backward.',
    escalation: 'The gear reveals precise future water marks and the consequences of Ilyas’s attempted repairs.', midpoint: 'Ilyas realizes the remembered future is caused by the repair he is about to make.',
    climax: 'At totality, Ilyas removes the gear and uses its final remembered motion to redirect the clock mechanism and open the flood gate.', ending: 'The tower survives; the stopped gear makes one last movement toward a tomorrow Ilyas has changed.',
  },
  worldBible: {
    geography: 'A fictional coastal municipality', historicalPeriod: 'Contemporary', culture: 'A civic craft tradition centered on the old bell tower', technologyLevel: 'Modern hand tools around a preserved mechanical clock',
    architecture: worldList('A connected stone bell tower, stair, clock chamber, and belfry'), constructionMaterials: worldList('Wet limestone, iron, aged timber, glass, and brass'),
    interiorDesign: worldList('Functional civic maintenance spaces with fixed access routes'), furnitureStyle: worldList('Weathered municipal workbench and storage'), terrain: worldList('Flooded stone floors and narrow stairs'),
    climate: worldList('Coastal storm flooding during an eclipse'), vegetation: worldList('No interior vegetation'), transportation: worldList('Access on foot only'), wardrobeRules: worldList('Ilyas remains in one tracked maintenance uniform'),
    objectRules: worldList('Every moved tool, gear, key, and rope keeps its recorded state'), weaponRules: worldList('No weapons'), languageRules: worldList('Exact authored dialogue belongs to its numbered speaker'),
    visualRules: worldList('Reflections and eclipse progression remain continuous'), lightingRules: worldList('Eclipse direction and practical sources remain spatially fixed'),
    environmentalRules: worldList('Water level changes only through recorded sequence events'), physicalRules: worldList('Clockwork motion, flood flow, and gravity remain causal'), restrictions: worldList('No untracked people, objects, repairs, or dry resets'),
  },
  filmBible: {
    worldRules: worldList('The tower is one connected physical space'), characterRules: worldList('Ilyas keeps one identity, uniform, injuries, wetness, and held-object state'),
    visualRules: worldList('Tactile realism and legible mechanical cause and effect'), soundRules: worldList('Seedance creates exact dialogue, bells, water, gears, and silence inside the generated video'),
    continuityRules: worldList('Every ending water level and object position becomes the next opening state'), negativeRules: worldList('No duplicate Ilyas, extra workers, floating tools, or unexplained resets'),
  },
  assets: [
    { name: 'Ilyas', category: 'Characters', description: 'The municipal clock repairer and sole on-screen character.', storyPurpose: 'Carries the mystery and physical repair.', sequences: [1,2,3,4,5,6], importance: 'Story critical', continuityConstraints: ['Preserve identity, wetness, injuries, and hand state'] },
    { name: 'Ilyas Maintenance Uniform', category: 'Costumes', description: 'A complete tracked maintenance uniform with boots and tool belt.', storyPurpose: 'Tracks water, grime, and damage.', sequences: [1,2,3,4,5,6], importance: 'Recurring', continuityConstraints: ['Wetness and tears persist'] },
    { name: 'Flooded Bell Tower', category: 'Locations', description: 'The complete exterior and connected vertical tower.', storyPurpose: 'Primary world anchor.', sequences: [1,2,3,4,5,6], importance: 'Location anchor', continuityConstraints: ['Lock architecture and water access'] },
    { name: 'Clock Chamber', category: 'Interiors', description: 'The fixed chamber containing the clockwork and workbench.', storyPurpose: 'Primary dramatic interior.', sequences: [1,2,3,4,5,6], importance: 'Location anchor', continuityConstraints: ['Lock doors, stairs, windows, workbench, and mechanism'] },
    { name: 'Tomorrow Gear', category: 'Story Critical Objects', description: 'One distinctive brass gear whose motion records the next day.', storyPurpose: 'Central mystery device.', sequences: [1,2,3,4,5,6], importance: 'Story critical', continuityConstraints: ['Exactly one gear; track position, direction, damage, and holder'] },
    { name: 'Tower Clock Mechanism', category: 'Mechanical Systems', description: 'The complete interconnected clock, escapement, bell linkage, and flood gate drive.', storyPurpose: 'Creates the physical climax.', sequences: [1,2,3,4,5,6], importance: 'Story critical', continuityConstraints: ['Track power, gear engagement, direction, and damage'] },
    { name: 'Eclipse Flood State', category: 'Environment States', description: 'The rising interior flood and progressing solar eclipse.', storyPurpose: 'Controls time pressure, reflection, and visibility.', sequences: [1,2,3,4,5,6], importance: 'Recurring', continuityConstraints: ['Water level and eclipse phase advance monotonically'] },
    { name: 'Repair Tool Roll', category: 'Props', description: 'Ilyas’s identifiable set of hand tools in one roll.', storyPurpose: 'Enables the repair actions.', sequences: [1,2,3,4,5,6], importance: 'Recurring', continuityConstraints: ['Track each removed tool and its placement'] },
  ],
  sequences: Array.from({ length: 6 }, (_, index) => ({
    title: ['The Dry Gear','Water Mark','Tomorrow Repeats','The Caused Future','Totality','A Different Tomorrow'][index],
    purpose: `Sequence ${index + 1} advances the gear mystery and records a distinct mechanical and emotional change without repeating an earlier action.`,
    locationName: index === 0 ? 'Flooded Bell Tower' : 'Clock Chamber', timeOfDay: `Eclipse phase ${index + 1} of 6`,
    assetNames: ['Ilyas','Ilyas Maintenance Uniform','Flooded Bell Tower','Clock Chamber','Tomorrow Gear','Tower Clock Mechanism','Eclipse Flood State','Repair Tool Roll'],
    openingState: index === 0 ? 'Ilyas enters the untouched flooded tower.' : `Inherit the exact approved ending of Sequence ${index}.`,
    closingState: index === 5 ? 'The safe tower and changed gear hold in one final image.' : `A concrete gear, water, and performance change motivates Sequence ${index + 2}.`,
  })),
};

async function installCodexBridgeStub(page: Page) {
  await page.route('http://127.0.0.1:4317/**', async (route) => {
    const headers = { 'Access-Control-Allow-Origin': 'http://localhost:3000', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Content-Type': 'application/json' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers, body: '' });
    if (route.request().url().endsWith('/healthz')) return route.fulfill({ status: 200, headers, body: JSON.stringify({ available: true, source: 'Codex app-server' }) });
    const request = route.request().postDataJSON() as { mode: string; message: string };
    const lower = request.message.toLowerCase();
    const canonicalCommand = /automatic/.test(lower) ? 'Automatic Production'
      : /master character sheet/.test(lower) ? 'Create the master character sheet'
        : /main character|likeness|use these/.test(lower) ? 'Use my photos as main character references'
          : request.message;
    const result = request.mode === 'project-blueprint'
      ? { version: 1, mode: 'project-blueprint', reasoningSummary: 'Codex analyzed the complete story, world, assets, and six sequence dependencies.', canonicalCommand: null, responseGuidance: 'Show the editable story first.', blueprint }
      : { version: 1, mode: 'command', reasoningSummary: 'Codex translated the natural-language instruction into the engine command.', canonicalCommand, responseGuidance: 'Apply only the validated command.', blueprint: null };
    return route.fulfill({ status: 200, headers, body: JSON.stringify({ result }) });
  });
}

test('blank chat completes the visible Codex planning, reference, composite-sheet, advanced-control, and restore path', async ({ page }) => {
  await installCodexBridgeStub(page);
  await page.goto('/');
  await expect(page.getByText('Opening project memory…')).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button', { name: 'New Movie', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What movie do you want to create?' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Describe your movie' }).fill(idea);
  await page.getByRole('button', { name: 'Send instruction' }).click();

  await expect(page.getByText('Codex analyzed the complete idea', { exact: false })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('The Clock Remembers', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: /Automatic Production/ }).click();
  await expect(page.getByText(/Automatic Production is active/).first()).toBeVisible();

  const fileInput = page.locator('input[type="file"][multiple]').last();
  const pixels = [
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WlS8AAAAASUVORK5CYII=',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8zwAAAgEBAScY42YAAAAASUVORK5CYII=',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP4DwQACfsD/QjKp2QAAAAASUVORK5CYII=',
  ];
  await fileInput.setInputFiles(pixels.map((base64, index) => ({ name: `ilyas-${index + 1}.png`, mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') })));
  await page.getByRole('textbox', { name: 'Tell the studio what to do' }).fill('Use these as my main character likeness references.');
  await page.getByRole('button', { name: 'Send instruction' }).click();
  await expect(page.getByText(/4 reference images are attached|4 likeness references attached|4 reference image/).last()).toBeVisible({ timeout: 60_000 });

  await page.getByRole('textbox', { name: 'Tell the studio what to do' }).fill('Please create the master character sheet now.');
  await page.getByRole('button', { name: 'Send instruction' }).click();
  await expect(page.getByText(/one composite Master Character Sheet/i).last()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('One composite image · 6 panels inside it')).toBeVisible();
  await expect(page.getByText('4 unnumbered references')).toBeVisible();

  await page.getByRole('button', { name: 'Asset Library' }).click();
  const assetNumbers = await page.locator('article').locator('p').filter({ hasText: /^Asset \d{3}/ }).allTextContents();
  expect(assetNumbers.length).toBeGreaterThanOrEqual(8);
  await expect(page.getByText('001_ILYAS_GENERATED.png').first()).toBeVisible();

  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await expect(page.getByText('Codex connected')).toBeVisible();
  await page.getByText('Advanced', { exact: true }).click();
  await page.getByRole('button', { name: 'Open Advanced Control' }).click();
  await expect(page.getByRole('heading', { name: 'Advanced Control' })).toBeVisible();
  await expect(page.getByText('Strict state machine')).toBeVisible();

  await page.reload();
  await expect(page.getByText('The Clock Remembers', { exact: true }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Codex analyzed the complete idea/)).toBeVisible();
});
