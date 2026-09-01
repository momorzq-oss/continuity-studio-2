import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zipSync } from 'fflate';

import { getProductionDocument } from '../lib/chat-documents.ts';
import { decodeProjectState, encodeProjectState, isCompressedProjectState } from '../lib/project-state-codec.ts';

const base = process.env.CONTINUITY_STUDIO_URL ?? 'http://localhost:3000';

test('large canonical and recovery states remain database-resident and losslessly compressed', async () => {
  const state = {
    id: 'project_scale_fixture',
    prompts: Array.from({ length: 24 }, (_, index) => ({ sequence: index + 1, prompt: `SEQUENCE_${index + 1} ${'continuity '.repeat(12_000)}` })),
    immutable: true,
  };
  const encoded = await encodeProjectState(state);
  assert.equal(isCompressedProjectState(encoded), true);
  assert.ok(encoded.length < JSON.stringify(state).length / 10);
  assert.deepEqual(await decodeProjectState(encoded), state);
  assert.deepEqual(await decodeProjectState(JSON.stringify({ legacy: true })), { legacy: true });
});

async function jsonRequest(path, init) {
  const response = await fetch(`${base}${path}`, init);
  const data = await response.json();
  return { response, data };
}

async function command(project, message) {
  const { response, data } = await jsonRequest('/api/studio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: project.id, expectedRevision: project.storageRevision, message }),
  });
  assert.equal(response.status, 200, `${message}: ${data.error ?? response.status}`);
  return data.project;
}

async function commandWithAttachment(project, message, attachmentId) {
  const { response, data } = await jsonRequest('/api/studio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: project.id, expectedRevision: project.storageRevision, message, attachmentId }),
  });
  assert.equal(response.status, 200, `${message}: ${data.error ?? response.status}`);
  return data.project;
}

test('chat-first blank production preserves one identity, one composite sheet, documents, and explicit generation gates', async () => {
  const created = await jsonRequest('/api/studio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `A three minute desert fable about a cartographer who discovers a city that moves at dawn ${Date.now()}` }),
  });
  assert.equal(created.response.status, 200, created.data.error);
  let project = created.data.project;
  assert.equal(project.settings.pipelineApprovalGranted, false);
  assert.equal(project.settings.automaticPaidGeneration, false);
  assert.equal(project.production.renderQueue.length, 0);
  assert.equal(project.attachments.length, 0);
  assert.ok(project.assets.length > 0, 'idea analysis should discover the complete numbered manifest');
  assert.ok(project.assets.every((asset) => !asset.generatedAttachmentId), 'discovery must not create fake media');
  assert.equal(project.flatAssetFolder.subfoldersAllowed, false);
  assert.equal(created.data.messages.at(-1).metadata.kind, 'story');

  const story = getProductionDocument(project, 'story');
  const world = getProductionDocument(project, 'world-bible');
  const film = getProductionDocument(project, 'film-bible');
  const sequence = getProductionDocument(project, 'sequence', 1);
  const scenario = getProductionDocument(project, 'scenario', 1);
  const script = getProductionDocument(project, 'script', 1);
  const prompt = getProductionDocument(project, 'seedance-prompt', 1);
  for (const document of [story, world, film, sequence, scenario, script, prompt]) {
    assert.ok(document?.content.length > 100);
    assert.match(document.filename, /\.(md|txt)$/);
  }
  assert.match(prompt.content, /\[SCENARIO\]/);

  project = await command(project, 'Automatic Production');
  assert.equal(project.settings.approvalMode, 'automatic');
  assert.equal(project.settings.pipelineApprovalGranted, true);
  assert.equal(project.story.status, 'Approved');
  assert.equal(project.worldBible.status, 'Approved');
  assert.equal(project.filmBible.status, 'Approved');
  assert.equal(project.production.renderQueue.length, 0);
  project = await command(project, 'Continue');
  assert.equal(project.production.renderQueue.length, 0, 'Continue must never queue paid video');

  const startingAssetCount = project.assets.length;
  const referenceIds = [];
  for (let index = 0; index < 4; index += 1) {
    const form = new FormData();
    form.append('projectId', project.id);
    form.append('expectedRevision', String(project.storageRevision));
    form.append('role', 'Main character likeness reference');
    form.append('file', new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, index + 1])], `main-character-angle-${index + 1}.png`, { type: 'image/png' }));
    const uploaded = await jsonRequest('/api/files', { method: 'POST', body: form });
    assert.equal(uploaded.response.status, 200, uploaded.data.error);
    project = uploaded.data.project;
    referenceIds.push(uploaded.data.attachment.id);
  }
  assert.equal(project.assets.length, startingAssetCount, 'source references must not become numbered assets');
  const identityReferences = project.attachments.filter((attachment) => referenceIds.includes(attachment.id));
  assert.equal(identityReferences.length, 4);
  assert.ok(identityReferences.every((attachment) => attachment.linkedAssetId === 'CHARACTER_001'));
  assert.ok(identityReferences.every((attachment) => attachment.identityGroupId === 'CHARACTER_IDENTITY_001'));
  assert.equal(new Set(identityReferences.map((attachment) => attachment.identityGroupId)).size, 1);

  project = await command(project, 'Create the master character sheet');
  const mainCharacter = project.assets.find((asset) => asset.id === 'CHARACTER_001');
  assert.equal(project.assets.length, startingAssetCount);
  assert.equal(mainCharacter.projectNumber, 1);
  assert.equal(mainCharacter.sheet.kind, 'Master Character Sheet');
  assert.equal(mainCharacter.sheet.composite, true);
  assert.equal(mainCharacter.sheet.panelCount, 6);
  assert.deepEqual(mainCharacter.sheet.sourceReferenceIds, referenceIds);
  assert.equal(mainCharacter.sheet.generationStatus, 'Prepared');
  assert.equal(mainCharacter.generatedAttachmentId, undefined);
  assert.equal(project.production.renderQueue.length, 0);

  const environmentAsset = project.assets.find((asset) => asset.category === 'Environment States');
  project = await command(project, 'Create the environment sheet');
  assert.equal(project.assets.length, startingAssetCount, 'panels inside another composed production sheet must not inflate the asset count');
  assert.equal(project.assets.find((asset) => asset.id === environmentAsset.id).sheet.composite, true);
  assert.equal(project.assets.find((asset) => asset.id === environmentAsset.id).sheet.panelCount, 4);
  assert.equal(project.production.renderQueue.length, 0);

  const revisionBefore = project.production.sequencePlans.SEQUENCE_001.revision;
  project = await command(project, 'Regenerate Sequence 1');
  assert.equal(project.production.sequencePlans.SEQUENCE_001.revision, revisionBefore + 1);
  assert.equal(project.production.renderQueue.length, 0, 'regenerate must not be parsed as generate');
  project = await command(project, 'Regenerate the Seedance prompt for Sequence 1');
  project = await command(project, 'Regenerate the script for Sequence 1');
  project = await command(project, 'Regenerate the scenario for Sequence 1');
  assert.equal(project.production.renderQueue.length, 0);

  const restored = await jsonRequest(`/api/studio?projectId=${encodeURIComponent(project.id)}`);
  assert.equal(restored.response.status, 200, restored.data.error);
  assert.equal(restored.data.project.id, project.id);
  assert.equal(restored.data.project.attachments.length, 4);
  assert.equal(restored.data.project.assets.find((asset) => asset.id === 'CHARACTER_001').sheet.sourceReferenceIds.length, 4);
});

test('production controls, concurrency, dialogue, provenance, rollback, files, import, and export', async () => {
  const created = await jsonRequest('/api/studio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `A two minute mystery film about a traveler in a desert observatory at night ${Date.now()}` }),
  });
  assert.equal(created.response.status, 200);
  let project = created.data.project;
  assert.equal(project.storageRevision, 1);
  assert.equal(project.production.schemaVersion, 5);
  assert.equal(project.production.control.dataSchema.currentVersion, 5);
  assert.equal(project.production.control.stateMachine.current, 'Story Draft');
  assert.equal(project.production.control.authorityPolicy.sourceOfTruth, 'database-structured-state');
  assert.equal(project.production.audioPolicy.separateAudioAssetsAllowed, false);
  assert.ok(project.production.control.reservedNumbers.length >= project.assets.length + project.sequences.length);
  assert.ok(project.production.control.sequenceDependencies.some((item) => item.dependsOnType === 'asset-version'));

  const stale = await jsonRequest('/api/studio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: project.id, expectedRevision: 0, message: 'Approve the story' }),
  });
  assert.equal(stale.response.status, 409);
  assert.equal(stale.data.conflict, true);

  project = await command(project, 'Approve the Film Bible');
  assert.equal(project.filmBible.status, 'Draft', 'the state machine must prevent an impossible jump');
  assert.equal(project.production.control.stateMachine.current, 'Story Draft');

  project = await command(project, 'Approve the story');
  project = await command(project, 'Approve the World Bible');
  project = await command(project, 'Approve the Film Bible');
  project = await command(project, 'Approve all assets');
  project = await command(project, 'Set provider reference limit to 12');
  assert.equal(project.story.status, 'Approved');
  assert.ok(['Assets Approved', 'Sequences Ready'].includes(project.production.control.stateMachine.current));
  assert.ok(project.production.control.changeLog.length >= 5);

  project = await command(project, 'Lock character identity Asset 001');
  assert.equal(project.production.control.decisionPins.filter((pin) => pin.status === 'Active').length, 1);
  const pinnedVersion = project.assets.find((asset) => asset.projectNumber === 1).version;
  project = await command(project, 'Regenerate Asset 001');
  assert.equal(project.assets.find((asset) => asset.projectNumber === 1).version, pinnedVersion, 'a pinned identity must not change');
  project = await command(project, 'Unlock character identity Asset 001');
  assert.equal(project.production.control.decisionPins.filter((pin) => pin.status === 'Active').length, 0);

  const retirementTarget = project.assets.find((asset) => asset.projectNumber === 5);
  project = await command(project, 'Retire Asset 005 because it is no longer needed');
  assert.equal(project.assets.find((asset) => asset.projectNumber === 5).lifecycleStatus, 'Retired');
  assert.equal(project.production.control.reservedNumbers.find((item) => item.kind === 'asset' && item.number === 5).status, 'retired');
  assert.deepEqual(project.assets.find((asset) => asset.projectNumber === 5).sequences, retirementTarget.sequences, 'retirement keeps historical sequence links');

  const beforeDuplicateCount = project.assets.length;
  project = await command(project, 'Add a new prop called Lantern');
  assert.equal(project.assets.length, beforeDuplicateCount, 'semantic duplicate should not reserve a number');

  project = await command(project, 'Asset 001 says "Meet me at Nadir" in Sequence 1');
  project = await command(project, 'Pronounce "Nadir" as "NAH-deer" in Sequence 1');
  project = await command(project, 'Lock project dialogue language to Arabic with Gulf dialect');
  project = await command(project, 'Asset 001 speaks Arabic with Emirati dialect');
  const line = project.production.sequencePlans.SEQUENCE_001.dialogue[0];
  assert.equal(line.exactDialogue, 'Meet me at Nadir');
  assert.equal(line.pronunciations[0].pronunciation, 'NAH-deer');
  assert.equal(line.languageLock, 'Arabic');
  assert.equal(line.dialectLock, 'Emirati');
  assert.equal(project.production.control.languageLocks.projectLanguage, 'Arabic');
  assert.equal(project.production.control.languageLocks.projectDialect, 'Gulf');
  assert.equal(project.production.control.dialogueTimingAudits.SEQUENCE_001.fits, true);
  assert.match(project.production.sequencePlans.SEQUENCE_001.compiledPrompt, /\[DIALOGUE BINDINGS\]/);
  assert.match(project.production.sequencePlans.SEQUENCE_001.compiledPrompt, /Asset 001/);
  assert.match(project.production.sequencePlans.SEQUENCE_001.compiledPrompt, /\[CONTINUITY\]/);
  assert.match(project.production.sequencePlans.SEQUENCE_001.compiledPrompt, /\[RESTRICTIONS\]/);

  project = await command(project, 'Asset 001 is non-speaking in Sequence 2');
  assert.ok(project.production.sequencePlans.SEQUENCE_002.scenario.nonSpeakingCharacterAssetIds.includes('CHARACTER_001'));
  assert.match(project.production.sequencePlans.SEQUENCE_002.compiledPrompt, /NON-SPEAKING CHARACTERS/);

  project = await command(project, 'Generate Sequence 1');
  let job = project.production.renderQueue.at(-1);
  assert.equal(job.status, 'Awaiting Confirmation');
  assert.equal(job.generationCount, 0);
  assert.equal(job.estimatedCredits, 0);
  assert.match(job.idempotencyKey, new RegExp(`^${project.id}:SEQUENCE_001:v`));
  assert.equal(project.production.generationSnapshots.at(-1).modelVersion, 'unconfigured');
  assert.ok(project.production.generationSnapshots.at(-1).exactReferenceOrder.length > 0);
  const jobCount = project.production.renderQueue.length;
  project = await command(project, 'Generate Sequence 1');
  assert.equal(project.production.renderQueue.length, jobCount, 'the same structured request must reuse its idempotent job');
  project = await command(project, 'Confirm generation Sequence 1');
  job = project.production.renderQueue.at(-1);
  assert.equal(job.status, 'Waiting');
  assert.equal(job.generationCount, 0, 'an unavailable provider must not consume a paid attempt');
  assert.equal(project.production.control.freezeSnapshots.length, 1);
  project = await command(project, 'Prepare external Seedance package for Sequence 1');
  job = project.production.renderQueue.at(-1);
  assert.equal(job.status, 'External');
  assert.match(project.production.control.providerTranslations.SEQUENCE_001.translatedPrompt, /UPLOAD IN THIS EXACT ORDER/);

  const audioForm = new FormData();
  audioForm.append('projectId', project.id);
  audioForm.append('expectedRevision', String(project.storageRevision));
  audioForm.append('file', new File([new Uint8Array([1, 2, 3])], 'forbidden.wav', { type: 'audio/wav' }));
  const audioResponse = await fetch(`${base}/api/files`, { method: 'POST', body: audioForm });
  assert.equal(audioResponse.status, 415);

  const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
  const imageForm = new FormData();
  imageForm.append('projectId', project.id);
  imageForm.append('expectedRevision', String(project.storageRevision));
  imageForm.append('role', 'Main character likeness reference');
  imageForm.append('file', new File([imageBytes], 'identity.png', { type: 'image/png' }));
  const image = await jsonRequest('/api/files', { method: 'POST', body: imageForm });
  assert.equal(image.response.status, 200, image.data.error);
  project = image.data.project;
  assert.match(image.data.attachment.fingerprintSha256, /^[a-f0-9]{64}$/);
  assert.equal(image.data.attachment.previewKind, 'image-adaptive');
  const preview = await fetch(`${base}/api/files?projectId=${encodeURIComponent(project.id)}&referenceId=${encodeURIComponent(image.data.attachment.id)}`);
  assert.equal(preview.status, 200);
  assert.deepEqual(new Uint8Array(await preview.arrayBuffer()), imageBytes);
  project = await command(project, 'Use latest attachment only for face identity');
  assert.deepEqual(project.attachments.at(-1).roleOverrides, ['Face identity']);
  assert.match(project.production.sequencePlans.SEQUENCE_001.compiledPrompt, /\[REFERENCE ROLE OVERRIDES\]/);
  assert.match(project.production.sequencePlans.SEQUENCE_001.compiledPrompt, /identity\.png: use only for Face identity/);

  const duplicateForm = new FormData();
  duplicateForm.append('projectId', project.id);
  duplicateForm.append('expectedRevision', String(project.storageRevision));
  duplicateForm.append('file', new File([imageBytes], 'same-bytes-different-name.png', { type: 'image/png' }));
  const duplicate = await jsonRequest('/api/files', { method: 'POST', body: duplicateForm });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.data.duplicate, true);
  assert.equal(duplicate.data.project.attachments.length, project.attachments.length);

  const sameNameForm = new FormData();
  sameNameForm.append('projectId', project.id);
  sameNameForm.append('expectedRevision', String(project.storageRevision));
  sameNameForm.append('file', new File([new Uint8Array([...imageBytes, 99])], 'identity.png', { type: 'image/png' }));
  const sameName = await jsonRequest('/api/files', { method: 'POST', body: sameNameForm });
  assert.equal(sameName.response.status, 200, sameName.data.error);
  assert.notEqual(sameName.data.attachment.fingerprintSha256, image.data.attachment.fingerprintSha256);
  project = sameName.data.project;

  const videoForm = new FormData();
  videoForm.append('projectId', project.id);
  videoForm.append('expectedRevision', String(project.storageRevision));
  videoForm.append('role', 'Finished external Seedance sequence');
  videoForm.append('file', new File([new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112])], 'sequence-001.mp4', { type: 'video/mp4' }));
  const video = await jsonRequest('/api/files', { method: 'POST', body: videoForm });
  assert.equal(video.response.status, 200, video.data.error);
  project = video.data.project;
  project = await command(project, 'Use latest attachment as Sequence 1 result');
  assert.equal(project.production.control.resultProvenance.length, 1);
  assert.equal(project.production.control.resultProvenance[0].assetVersions[0].assetNumber, 1);
  assert.equal(project.production.control.resultProvenance[0].modelVersion, 'unconfigured');
  assert.ok(project.production.control.modelVersionPins.some((pin) => pin.targetType === 'sequence-generation'));
  project = await command(project, 'Validate Sequence 1');
  project = await command(project, 'Approve validation Sequence 1');
  project = await command(project, 'Approve Sequence 1');
  assert.equal(project.production.control.finalSourceMap[0].sequenceNumber, 1);
  project = await command(project, 'Approve Asset 001');
  project = await command(project, 'Asset 001 holds Asset 004 with right hand in Sequence 2');
  project = await command(project, 'Generate Sequence 2');
  assert.equal(project.production.renderQueue.at(-1).status, 'Awaiting Confirmation');
  project = await command(project, 'Cancel generation Sequence 2');
  assert.equal(project.production.renderQueue.at(-1).status, 'Cancelled');
  project = await command(project, 'Resume generation Sequence 2');
  assert.equal(project.production.renderQueue.at(-1).status, 'Awaiting Confirmation');
  project = await command(project, 'Mark generation failed for Sequence 2');
  assert.equal(project.production.renderQueue.at(-1).status, 'Failed');
  project = await command(project, 'Retry Sequence 2');
  assert.equal(project.production.renderQueue.at(-1).status, 'Awaiting Confirmation');

  project = await command(project, 'Add a new prop called Brass Key as a separate distinct production element');
  assert.ok(project.assets.some((asset) => asset.projectNumber === 6));
  project = await command(project, 'Approve Asset 006');
  project = await command(project, 'Remove Asset 006 from the active story');
  assert.ok(project.production.control.orphanAssets.some((finding) => finding.assetNumber === 6 && finding.status === 'Orphaned'));

  const revisionBeforeChange = project.storageRevision;
  project = await command(project, 'Remember correction: keep the lantern flame steady');
  assert.equal(project.storageRevision, revisionBeforeChange + 1);
  assert.ok(project.production.correctionMemory.some((item) => /lantern flame/i.test(item.instruction)));
  project = await command(project, 'Undo last change');
  assert.ok(!project.production.correctionMemory.some((item) => /lantern flame/i.test(item.instruction)));

  project = await command(project, 'What is missing?');
  assert.ok(project.production.control.integrityAudit.checks.length >= 10);
  project = await command(project, 'repair this project');
  assert.ok(project.production.control.repairReports.length >= 1);

  const storage = await jsonRequest(`/api/storage?projectId=${encodeURIComponent(project.id)}`);
  assert.equal(storage.response.status, 200);
  assert.ok(storage.data.report.totalBytes >= imageBytes.byteLength);
  const cleanup = await jsonRequest('/api/storage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, expectedRevision: project.storageRevision }) });
  assert.equal(cleanup.response.status, 200, cleanup.data.error);
  assert.equal(cleanup.data.removedCount, 0, 'approved and original media must be protected from cleanup');
  project = cleanup.data.project;
  const protectedPreview = await fetch(`${base}/api/files?projectId=${encodeURIComponent(project.id)}&referenceId=${encodeURIComponent(image.data.attachment.id)}`);
  assert.equal(protectedPreview.status, 200);

  const exported = await fetch(`${base}/api/export?projectId=${encodeURIComponent(project.id)}`);
  assert.equal(exported.status, 200);
  assert.equal(exported.headers.get('content-type'), 'application/zip');
  assert.equal(exported.headers.get('x-archive-verification'), 'Passed');
  assert.match(exported.headers.get('x-archive-manifest-sha256'), /^[a-f0-9]{64}$/);
  const archive = await exported.blob();
  const importForm = new FormData();
  importForm.append('file', new File([archive], 'restored-project.zip', { type: 'application/zip' }));
  const imported = await jsonRequest('/api/import', { method: 'POST', body: importForm });
  assert.equal(imported.response.status, 200, imported.data.error);
  assert.equal(imported.data.project.production.control.importHistory.at(-1).kind, 'archive');
  assert.deepEqual(imported.data.project.assets.map((asset) => asset.projectNumber), project.assets.map((asset) => asset.projectNumber));
  assert.equal(imported.data.project.production.control.resultProvenance.length, project.production.control.resultProvenance.length);
  assert.equal(imported.data.project.production.control.dataSchema.currentVersion, 5);

  const screenplayForm = new FormData();
  const importNonce = Date.now();
  screenplayForm.append('file', new File([`INT. OBSERVATORY - NIGHT\nA traveler enters.\n# ${importNonce}`], `screenplay-${importNonce}.fountain`, { type: 'text/plain' }));
  const screenplay = await jsonRequest('/api/import', { method: 'POST', body: screenplayForm });
  assert.equal(screenplay.response.status, 200, screenplay.data.error);
  assert.equal(screenplay.data.kind, 'screenplay');
  assert.equal(screenplay.data.project.production.audioPolicy.separateAudioAssetsAllowed, false);

  const legacy = structuredClone(project);
  legacy.id = `legacy_${Date.now()}`;
  legacy.production.schemaVersion = 3;
  delete legacy.production.control.dataSchema;
  const legacyForm = new FormData();
  legacyForm.append('file', new File([JSON.stringify(legacy)], `legacy-v3-${Date.now()}.json`, { type: 'application/json' }));
  const legacyImport = await jsonRequest('/api/import', { method: 'POST', body: legacyForm });
  assert.equal(legacyImport.response.status, 200, legacyImport.data.error);
  assert.equal(legacyImport.data.project.production.schemaVersion, 5);
  assert.ok(legacyImport.data.project.production.control.dataSchema.migratedFromVersions.includes(3));

  const flatZip = zipSync({
    'old-folder/001_CAPTAIN_GENERATED.png': imageBytes,
    'old-folder/007_SIGNAL_LANTERN_GENERATED.png': new Uint8Array([...imageBytes, 9, importNonce % 251]),
  });
  const assetFolderForm = new FormData();
  assetFolderForm.append('file', new File([flatZip], `asset-folder-${Date.now()}.zip`, { type: 'application/zip' }));
  const mapping = await jsonRequest('/api/import', { method: 'POST', body: assetFolderForm });
  assert.equal(mapping.response.status, 202, mapping.data.error);
  assert.equal(mapping.data.requiresApproval, true);
  assert.equal(mapping.data.mappingPreview.summary.assets, 2);
  const approvedAssetFolderForm = new FormData();
  approvedAssetFolderForm.append('file', new File([flatZip], `asset-folder-${Date.now()}.zip`, { type: 'application/zip' }));
  approvedAssetFolderForm.append('confirmMapping', 'true');
  const assetFolder = await jsonRequest('/api/import', { method: 'POST', body: approvedAssetFolderForm });
  assert.equal(assetFolder.response.status, 200, assetFolder.data.error);
  assert.equal(assetFolder.data.kind, 'asset-folder');
  assert.ok(assetFolder.data.project.assets.some((asset) => asset.projectNumber === 7));
  assert.equal(assetFolder.data.project.flatAssetFolder.subfoldersAllowed, false);
  assert.equal(assetFolder.data.project.production.control.importHistory.at(-1).mappingApproved, true);
});

test('single-sequence production reaches completed state and preserves prompt contract', async () => {
  const created = await jsonRequest('/api/studio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `A 0.5 minute mystery film about a courier entering an empty station ${Date.now()}` }),
  });
  let project = created.data.project;
  project = await command(project, 'Approve the story');
  project = await command(project, 'Approve the World Bible');
  project = await command(project, 'Approve the Film Bible');
  project = await command(project, 'Approve all assets');
  project = await command(project, 'Set provider reference limit to 30');
  project = await command(project, 'Asset 001 says "The platform is clear" in Sequence 1');
  project = await command(project, 'Generate Sequence 1');
  assert.equal(project.production.renderQueue.at(-1).status, 'Awaiting Confirmation');
  const originalJobId = project.production.renderQueue.at(-1).id;
  project = await command(project, 'Asset 001 says "Proceed to the gate" in Sequence 1');
  project = await command(project, 'Generate Sequence 1');
  assert.equal(project.production.renderQueue.length, 2);
  assert.equal(project.production.renderQueue.find((job) => job.id === originalJobId).status, 'Cancelled');
  assert.match(project.production.renderQueue.at(-1).prompt, /Proceed to the gate/);
  const prompt = project.production.renderQueue.at(-1).prompt;
  for (const required of ['[SCENARIO]', '[REFERENCE BINDINGS', '[DIALOGUE BINDINGS]', 'Asset 001', '[CONTINUITY]', '[SEEDANCE SOUND INSTRUCTIONS', '[RESTRICTIONS]']) assert.match(prompt, new RegExp(required.replaceAll('[', '\\[').replaceAll(']', '\\]')));
  project = await command(project, 'Prepare external Seedance package for Sequence 1');
  const videoForm = new FormData();
  videoForm.append('projectId', project.id);
  videoForm.append('expectedRevision', String(project.storageRevision));
  videoForm.append('role', 'Finished external Seedance sequence');
  videoForm.append('file', new File([new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112, 1])], `one-sequence-${Date.now()}.mp4`, { type: 'video/mp4' }));
  const video = await jsonRequest('/api/files', { method: 'POST', body: videoForm });
  project = video.data.project;
  project = await command(project, 'Use latest attachment as Sequence 1 result');
  project = await command(project, 'Validate Sequence 1');
  project = await command(project, 'Approve validation Sequence 1');
  project = await command(project, 'Approve Sequence 1');
  assert.equal(project.production.control.stateMachine.current, 'Final Review');
  project = await command(project, 'Approve final assembly');
  assert.equal(project.production.finalAssembly.status, 'Approved');
  assert.equal(project.production.control.stateMachine.current, 'Completed');
});

test('filmmaker regressions preserve exact attachments, sequence IDs, dialect, costume ranges, and immutable asset versions', async () => {
  const idea = `A one minute atmospheric mystery about a signal keeper who hears tomorrow's warning ${Date.now()}`;
  const created = await jsonRequest('/api/studio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: idea }),
  });
  assert.equal(created.response.status, 200);
  let project = created.data.project;
  assert.equal(project.durationSeconds, 60);
  assert.equal(project.sequenceCount, 2);
  assert.match(project.story.logline, /signal keeper who hears tomorrow's warning/i);
  assert.equal(project.story.protagonist, 'The Signal Keeper');
  assert.notEqual(project.title, 'The Voice Beyond the Door');

  project = await command(project, 'Approve the story');
  const firstBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 41]);
  const secondBytes = new Uint8Array([...firstBytes, 99]);
  async function upload(bytes, name) {
    const form = new FormData();
    form.append('projectId', project.id);
    form.append('expectedRevision', String(project.storageRevision));
    form.append('file', new File([bytes], name, { type: 'image/png' }));
    const result = await jsonRequest('/api/files', { method: 'POST', body: form });
    assert.equal(result.response.status, 200, result.data.error);
    project = result.data.project;
    return result.data.attachment;
  }
  const first = await upload(firstBytes, 'identity.png');
  const second = await upload(secondBytes, 'identity.png');
  project = await commandWithAttachment(project, 'Use latest attachment only for face identity', first.id);
  assert.deepEqual(project.attachments.find((item) => item.id === first.id).roleOverrides, ['Face identity']);
  assert.equal(project.attachments.find((item) => item.id === second.id).roleOverrides.length, 0);
  assert.equal(project.story.status, 'Approved', 'reference instructions must not invalidate an approved story');
  project = await commandWithAttachment(project, 'Use latest attachment as generated master for Asset 001', first.id);
  assert.equal(project.assets.find((item) => item.projectNumber === 1).generatedAttachmentId, first.id);

  project = await command(project, 'Approve the World Bible');
  project = await command(project, 'Approve the Film Bible');
  const originalCostume = project.assets.find((item) => item.category === 'Costumes');
  assert.ok(originalCostume);
  project = await command(project, 'Add a new costume called Storm Coat for Sequences 2 through 2');
  const replacementCostume = project.assets.find((item) => item.category === 'Costumes' && item.id !== originalCostume.id);
  assert.ok(replacementCostume);
  project = await command(project, `From Sequence 2 onward, replace costume Asset ${String(originalCostume.projectNumber).padStart(3, '0')} with Asset ${String(replacementCostume.projectNumber).padStart(3, '0')}`);
  assert.ok(originalCostume.projectNumber > 0);
  assert.ok(project.assets.find((item) => item.id === originalCostume.id).sequences.every((number) => number < 2));
  assert.deepEqual(project.assets.find((item) => item.id === replacementCostume.id).sequences, [2]);
  assert.deepEqual(project.production.sequencePlans.SEQUENCE_002.scenario.characterContinuity[0].currentAppearance.costumeAssetNumbers, [replacementCostume.projectNumber]);

  project = await command(project, 'Lock project dialogue language to Arabic with Gulf dialect');
  project = await command(project, 'Approve all assets');
  project = await command(project, 'Set provider reference limit to 30');
  project = await command(project, 'Asset 001 is non-speaking in Sequence 1');
  project = await command(project, 'Asset 001 says "The warning arrives tomorrow" in Sequence 1');
  const line = project.production.sequencePlans.SEQUENCE_001.dialogue.at(-1);
  assert.equal(line.languageLock, 'Arabic');
  assert.equal(line.dialectLock, 'Gulf');
  assert.ok(!project.production.sequencePlans.SEQUENCE_001.scenario.nonSpeakingCharacterAssetIds.includes('CHARACTER_001'));

  project = await command(project, 'Generate SEQUENCE_001');
  assert.equal(project.production.renderQueue.at(-1).status, 'Awaiting Confirmation');
  const firstSnapshot = project.production.generationSnapshots.at(-1);
  assert.equal(firstSnapshot.assetVersions.find((item) => item.assetNumber === 1).generatedAttachmentId, first.id);
  project = await commandWithAttachment(project, 'Use latest attachment as generated master for Asset 001', second.id);
  assert.equal(project.assets.find((item) => item.projectNumber === 1).version, 2);
  project = await command(project, 'Approve Asset 001');
  project = await command(project, 'Generate SEQUENCE_001');
  const secondSnapshot = project.production.generationSnapshots.at(-1);
  assert.notEqual(secondSnapshot.structuredStateHash, firstSnapshot.structuredStateHash);
  assert.equal(secondSnapshot.assetVersions.find((item) => item.assetNumber === 1).generatedAttachmentId, second.id);
  assert.equal(project.production.renderQueue.length, 2);

  project = await command(project, 'Change the movie duration to 90 seconds');
  assert.equal(project.production.control.stateMachine.current, 'Story Draft');
  assert.ok(project.production.renderQueue.length > 0, 'render history must survive an upstream revision');
  project = await command(project, 'Approve the story');
  assert.equal(project.production.control.stateMachine.current, 'Story Approved', 'render history must not prevent legal prerequisite reapproval');
});
