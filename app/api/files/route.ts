import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
import { assetProductionReference, normalizeProject, nowIso, type StudioMessage, type StudioProject } from '@/lib/studio';

export const runtime = 'edge';

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function cleanName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 120) || 'reference';
}

function inferReferenceRoles(file: File, role: string) {
  const signal = `${file.name} ${role}`.toLowerCase();
  const roles = new Set<string>();
  if (/main character|likeness|identity|my photo/.test(signal)) roles.add('Identity');
  if (/face|portrait|head|identity/.test(signal) || (file.type.startsWith('image/') && roles.has('Identity'))) roles.add('Face');
  if (/profile|side/.test(signal)) roles.add('Profile');
  if (/body|full.?length|standing/.test(signal)) roles.add('Body');
  if (/rear|back view/.test(signal)) roles.add('Rear');
  if (/costume|wardrobe|clothing|shoe|footwear|accessor/.test(signal)) roles.add('Costume');
  if (/location|exterior|building|architecture/.test(signal)) roles.add('Location');
  if (/interior|room/.test(signal)) roles.add('Interior');
  if (/weather|environment|fog|rain|snow|dust|smoke|lighting/.test(signal)) roles.add(/lighting/.test(signal) ? 'Lighting' : 'Environment');
  if (/prop|object|weapon|vehicle|animal|creature|mechanical|transform|damage|pose|style/.test(signal)) {
    for (const candidate of ['Prop', 'Weapon', 'Vehicle', 'Animal', 'Creature', 'Mechanical', 'Transformation', 'Damage', 'Pose', 'Style']) {
      if (signal.includes(candidate.toLowerCase())) roles.add(candidate);
    }
  }
  if (file.type.startsWith('video/')) roles.add('Continuity');
  if (roles.size === 0) roles.add('Production reference');
  return [...roles];
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const form = await request.formData();
    const projectIdValue = form.get('projectId');
    const roleValue = form.get('role');
    const projectId = typeof projectIdValue === 'string' ? projectIdValue : '';
    const role = (typeof roleValue === 'string' ? roleValue : 'Unassigned reference').slice(0, 100);
    const file = form.get('file');
    if (!projectId || !(file instanceof File)) {
      return Response.json({ error: 'Choose a file and an active project first.' }, { status: 400 });
    }
    if (file.type.startsWith('audio/')) {
      return Response.json({ error: 'Continuity Studio does not store separate sound assets. Write dialogue, ambience, effects, music, or silence as scenario instructions; Seedance generates them inside the video.' }, { status: 415 });
    }
    if (file.size > 95 * 1024 * 1024) {
      return Response.json({ error: 'That file is over the 95 MB reference limit.' }, { status: 413 });
    }
    const { DB, FILES } = getRuntimeEnv();
    const row = await DB.prepare(`SELECT p.state_json, COALESCE(t.revision, 0) AS revision
      FROM projects p LEFT JOIN project_transactions t ON t.project_id = p.id
      WHERE p.id = ? AND p.archived = 0`)
      .bind(projectId)
      .first<{ state_json: string; revision: number }>();
    if (!row) return Response.json({ error: 'Open a project before adding references.' }, { status: 404 });

    const project = normalizeProject(JSON.parse(row.state_json) as StudioProject);
    project.storageRevision = row.revision;
    const expectedRevisionValue = form.get('expectedRevision');
    const expectedRevision = typeof expectedRevisionValue === 'string' ? Number(expectedRevisionValue) : row.revision;
    if (expectedRevision !== row.revision) return Response.json({ error: 'This project changed before the upload was saved. Reload and retry; no project state changed.', conflict: true, project }, { status: 409 });
    const bytes = await file.arrayBuffer();
    const fingerprintSha256 = toHex(await crypto.subtle.digest('SHA-256', bytes));
    const duplicate = await DB.prepare(`SELECT fi.reference_id FROM file_integrity fi
      WHERE fi.project_id = ? AND fi.fingerprint_sha256 = ? LIMIT 1`).bind(projectId, fingerprintSha256).first<{ reference_id: string }>();
    if (duplicate) {
      const attachment = project.attachments.find((item) => item.id === duplicate.reference_id);
      const assistant: StudioMessage = {
        id: `message_${crypto.randomUUID()}`, role: 'assistant', createdAt: nowIso(),
        content: `“${file.name}” is byte-for-byte identical to the existing original “${attachment?.name ?? duplicate.reference_id}”. The existing reference was reused; no duplicate file or asset number was created.`,
        metadata: { kind: 'attachment', assetIds: attachment?.linkedAssetId ? [attachment.linkedAssetId] : undefined, attachmentId: attachment?.id },
      };
      await DB.prepare('INSERT INTO chat_messages (id, project_id, role, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(assistant.id, projectId, assistant.role, assistant.content, JSON.stringify(assistant.metadata), assistant.createdAt).run();
      return Response.json({ project, attachment, message: assistant, duplicate: true });
    }
    const id = `reference_${crypto.randomUUID()}`;
    const mediaKey = `projects/${projectId}/references/${id}-${cleanName(file.name)}`;
    await FILES.put(mediaKey, bytes, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
      customMetadata: { projectId, originalName: file.name, role, fingerprintSha256 },
    });

    const createdAt = nowIso();
    const referenceRoles = inferReferenceRoles(file, role);
    const attachment: StudioProject['attachments'][number] = {
      id,
      name: file.name,
      role,
      contentType: file.type || 'application/octet-stream',
      byteSize: file.size,
      createdAt,
      referenceRoles,
      fingerprintSha256,
      previewKind: file.type.startsWith('image/') ? 'image-adaptive' : file.type.startsWith('video/') ? 'video-native' : 'document',
      integrityStatus: 'Verified',
    };
    project.attachments.push(attachment);
    project.updatedAt = createdAt;
    project.storageRevision = row.revision + 1;

    let assetId: string | null = null;
    let coverageAsset: StudioProject['assets'][number] | null = null;
    if (/main character|likeness|my photo/i.test(role)) {
      const character = project.assets.find((asset) => asset.id === 'CHARACTER_001');
      if (character) {
        character.referenceCount += 1;
        character.approvalState = 'Needs Review';
        character.notes = `${character.referenceCount} likeness reference${character.referenceCount === 1 ? '' : 's'} attached. Original files preserved.`;
        character.referenceCoverage.identity = Math.min(100, character.referenceCoverage.identity + 40);
        if (referenceRoles.includes('Face')) character.referenceCoverage.face = Math.min(100, character.referenceCoverage.face + 40);
        if (referenceRoles.includes('Profile')) character.referenceCoverage.profile = Math.min(100, character.referenceCoverage.profile + 45);
        if (referenceRoles.includes('Body')) character.referenceCoverage.body = Math.min(100, character.referenceCoverage.body + 40);
        if (referenceRoles.includes('Rear')) character.referenceCoverage.rear = Math.min(100, character.referenceCoverage.rear + 45);
        if (referenceRoles.includes('Costume')) character.referenceCoverage.costume = Math.min(100, character.referenceCoverage.costume + 35);
        character.referenceCoverage.continuity = Math.min(100, character.referenceCoverage.continuity + 20);
        attachment.linkedAssetId = character.id;
        attachment.linkedAssetNumber = character.projectNumber;
        assetId = `${project.id}:${character.id}`;
        coverageAsset = character;
      }
    }

    const assistant: StudioMessage = {
      id: `message_${crypto.randomUUID()}`,
      role: 'assistant',
      content: `Stored “${file.name}” as ${referenceRoles.join(', ')} reference${referenceRoles.length === 1 ? '' : 's'}. The original file is preserved${coverageAsset ? ` and contributes to the single ${assetProductionReference(coverageAsset)} identity profile` : ''}.`,
      createdAt,
      metadata: { kind: 'attachment', assetIds: assetId ? ['CHARACTER_001'] : undefined, attachmentId: id },
    };

    const transactionId = crypto.randomUUID();
    const snapshotId = crypto.randomUUID();
    const changeId = `change_${crypto.randomUUID()}`;
    const summary = `Uploaded verified original ${file.name} (${fingerprintSha256.slice(0, 12)}).`;
    project.production.control.changeLog.push({ id: changeId, revision: project.storageRevision, scope: 'file', summary, createdAt });
    project.production.autosave.recoverySnapshotCount += 1;
    project.production.autosave.lastRecoveryReason = summary;
    const statements = [
      DB.prepare(`INSERT INTO transaction_guards (id, project_id, revision_ok, created_at)
        SELECT ?, ?, CASE WHEN revision = ? THEN 1 ELSE 0 END, ? FROM project_transactions WHERE project_id = ?`)
        .bind(transactionId, projectId, expectedRevision, createdAt, projectId),
      DB.prepare('INSERT INTO project_recovery_snapshots (id, project_id, reason, state_json, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(snapshotId, projectId, summary, row.state_json, createdAt),
      DB.prepare(`INSERT INTO asset_references (
        id, project_id, asset_id, original_name, media_key, content_type, byte_size, role, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        id, projectId, assetId, file.name, mediaKey, attachment.contentType, file.size, role, createdAt,
      ),
      DB.prepare(`INSERT INTO file_integrity
        (reference_id, project_id, fingerprint_sha256, preview_media_key, preview_kind, integrity_status, verified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, projectId, fingerprintSha256, mediaKey, attachment.previewKind, 'Original', createdAt),
      DB.prepare('UPDATE projects SET state_json = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(project), createdAt, projectId),
      DB.prepare('UPDATE project_transactions SET revision = ?, last_transaction_id = ?, updated_at = ? WHERE project_id = ?')
        .bind(project.storageRevision, transactionId, createdAt, projectId),
      DB.prepare(`INSERT INTO production_change_log
        (id, project_id, revision, scope, summary, before_snapshot_id, after_state_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(changeId, projectId, project.storageRevision, 'file', summary, snapshotId, `${JSON.stringify(project).length.toString(16)}-${createdAt}`, createdAt),
      DB.prepare('INSERT INTO chat_messages (id, project_id, role, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(assistant.id, projectId, assistant.role, assistant.content, JSON.stringify(assistant.metadata), assistant.createdAt),
    ];
    if (coverageAsset) {
      const values = Object.values(coverageAsset.referenceCoverage);
      const average = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
      const risk = average < 40 ? 'High' : average < 55 ? 'Medium' : 'Low';
      statements.push(DB.prepare(`INSERT INTO reference_coverage (
        id, project_id, asset_stable_id, coverage_json, reference_count, risk_level, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, asset_stable_id) DO UPDATE SET coverage_json = excluded.coverage_json,
        reference_count = excluded.reference_count, risk_level = excluded.risk_level, updated_at = excluded.updated_at`)
        .bind(`${project.id}:${coverageAsset.id}:coverage`, project.id, coverageAsset.id, JSON.stringify(coverageAsset.referenceCoverage), coverageAsset.referenceCount, risk, createdAt));
    }
    await DB.batch(statements);
    return Response.json({ project, attachment, message: assistant });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && /CHECK constraint failed|transaction_revision_must_match/i.test(error.message)) {
      return Response.json({ error: 'This project changed while the upload was being saved. The project transaction rolled back; reload and retry.', conflict: true }, { status: 409 });
    }
    return Response.json({ error: 'The reference could not be stored. Your project is unchanged.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const referenceId = url.searchParams.get('referenceId');
    if (!projectId || !referenceId) return Response.json({ error: 'Project and reference are required.' }, { status: 400 });
    const { DB, FILES } = getRuntimeEnv();
    const row = await DB.prepare('SELECT media_key, content_type, original_name FROM asset_references WHERE id = ? AND project_id = ?')
      .bind(referenceId, projectId).first<{ media_key: string; content_type: string; original_name: string }>();
    if (!row) return Response.json({ error: 'Reference not found.' }, { status: 404 });
    const object = await FILES.get(row.media_key);
    if (!object) {
      await DB.prepare("UPDATE file_integrity SET integrity_status = 'Missing', verified_at = ? WHERE reference_id = ?").bind(nowIso(), referenceId).run();
      return Response.json({ error: 'The original reference file is missing from project storage.' }, { status: 404 });
    }
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || row.content_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${cleanName(row.original_name)}"`,
        'Cache-Control': 'private, max-age=300',
        ETag: object.httpEtag,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'The reference preview could not be loaded.' }, { status: 500 });
  }
}
