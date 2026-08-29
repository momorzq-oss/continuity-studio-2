import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zipSync } from 'fflate';

const base = process.env.CONTINUITY_STUDIO_URL ?? 'http://localhost:3000';

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

test('production controls, concurrency, dialogue, provenance, rollback, files, import, and export', async () => {
  const created = await jsonRequest('/api/studio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `A two minute mystery film about a traveler in a desert observatory at night ${Date.now()}` }),
  });
  assert.equal(created.response.status, 200);
  let project = created.data.project;
  assert.equal(project.storageRevision, 1);
  assert.equal(project.production.schemaVersion, 3);
  assert.equal(project.production.audioPolicy.separateAudioAssetsAllowed, false);
  assert.ok(project.production.control.reservedNumbers.length >= project.assets.length + project.sequences.length);
  assert.ok(project.production.control.sequenceDependencies.some((item) => item.dependsOnType === 'asset-version'));

  const stale = await jsonRequest('/api/studio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: project.id, expectedRevision: 0, message: 'Approve the story' }),
  });
  assert.equal(stale.response.status, 409);
  assert.equal(stale.data.conflict, true);

  project = await command(project, 'Approve the story');
  project = await command(project, 'Approve the World Bible');
  project = await command(project, 'Approve the Film Bible');
  project = await command(project, 'Approve all assets');
  project = await command(project, 'Set provider reference limit to 12');
  assert.equal(project.story.status, 'Approved');
  assert.ok(project.production.control.changeLog.length >= 5);

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

  project = await command(project, 'Asset 001 is non-speaking in Sequence 2');
  assert.ok(project.production.sequencePlans.SEQUENCE_002.scenario.nonSpeakingCharacterAssetIds.includes('CHARACTER_001'));
  assert.match(project.production.sequencePlans.SEQUENCE_002.compiledPrompt, /NON-SPEAKING CHARACTERS/);

  project = await command(project, 'Generate Sequence 1');
  let job = project.production.renderQueue.at(-1);
  assert.equal(job.status, 'Awaiting Confirmation');
  assert.equal(job.generationCount, 0);
  assert.equal(job.estimatedCredits, 0);
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

  const revisionBeforeChange = project.storageRevision;
  project = await command(project, 'Remember correction: keep the lantern flame steady');
  assert.equal(project.storageRevision, revisionBeforeChange + 1);
  assert.ok(project.production.correctionMemory.some((item) => /lantern flame/i.test(item.instruction)));
  project = await command(project, 'Undo last change');
  assert.ok(!project.production.correctionMemory.some((item) => /lantern flame/i.test(item.instruction)));

  project = await command(project, 'What is missing?');
  assert.ok(project.production.control.integrityAudit.checks.length >= 5);

  const exported = await fetch(`${base}/api/export?projectId=${encodeURIComponent(project.id)}`);
  assert.equal(exported.status, 200);
  assert.equal(exported.headers.get('content-type'), 'application/zip');
  const archive = await exported.blob();
  const importForm = new FormData();
  importForm.append('file', new File([archive], 'restored-project.zip', { type: 'application/zip' }));
  const imported = await jsonRequest('/api/import', { method: 'POST', body: importForm });
  assert.equal(imported.response.status, 200, imported.data.error);
  assert.equal(imported.data.project.production.control.importHistory.at(-1).kind, 'archive');
  assert.deepEqual(imported.data.project.assets.map((asset) => asset.projectNumber), project.assets.map((asset) => asset.projectNumber));
  assert.equal(imported.data.project.production.control.resultProvenance.length, project.production.control.resultProvenance.length);

  const screenplayForm = new FormData();
  const importNonce = Date.now();
  screenplayForm.append('file', new File([`INT. OBSERVATORY - NIGHT\nA traveler enters.\n# ${importNonce}`], `screenplay-${importNonce}.fountain`, { type: 'text/plain' }));
  const screenplay = await jsonRequest('/api/import', { method: 'POST', body: screenplayForm });
  assert.equal(screenplay.response.status, 200, screenplay.data.error);
  assert.equal(screenplay.data.kind, 'screenplay');
  assert.equal(screenplay.data.project.production.audioPolicy.separateAudioAssetsAllowed, false);

  const flatZip = zipSync({
    'old-folder/001_CAPTAIN_GENERATED.png': imageBytes,
    'old-folder/007_SIGNAL_LANTERN_GENERATED.png': new Uint8Array([...imageBytes, 9, importNonce % 251]),
  });
  const assetFolderForm = new FormData();
  assetFolderForm.append('file', new File([flatZip], `asset-folder-${Date.now()}.zip`, { type: 'application/zip' }));
  const assetFolder = await jsonRequest('/api/import', { method: 'POST', body: assetFolderForm });
  assert.equal(assetFolder.response.status, 200, assetFolder.data.error);
  assert.equal(assetFolder.data.kind, 'asset-folder');
  assert.ok(assetFolder.data.project.assets.some((asset) => asset.projectNumber === 7));
  assert.equal(assetFolder.data.project.flatAssetFolder.subfoldersAllowed, false);
});
