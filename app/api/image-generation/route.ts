import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
import { generateProductionImage, type ImageProviderReference } from '@/lib/image-provider';
import { decodeProjectState, encodeProjectState } from '@/lib/project-state-codec';
import { refreshProductionSystem } from '@/lib/production-system';
import { assetProductionReference, normalizeProject, nowIso, type StudioMessage, type StudioProject } from '@/lib/studio';

export const runtime = 'edge';

const supportedReferenceTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function cleanName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 140) || 'generated.png';
}

function imagePrompt(project: StudioProject, asset: StudioProject['assets'][number]) {
  return `${asset.sheet?.brief ?? asset.description}

Create exactly one polished landscape production reference board for the single stable asset “${asset.name}”. It must contain approximately ${asset.sheet?.panelCount ?? 4} clearly separated, compositionally useful views or detail panels inside one unified image. Preserve one coherent identity, construction, materials, scale, proportions, age, condition, and production design across every panel. ${asset.category === 'Characters' ? 'Use all input photographs as identity evidence for the same person. Preserve recognizable facial geometry, skin, hair, age appearance, body proportions, and permanent traits. Include front, three-quarter, profile, full-body, rear, and face detail only where useful.' : ''}

Movie visual direction: ${project.visualStyle}. Camera and lens language: ${project.cameraStyle}; ${project.lensDirection}. Lighting: ${project.lightingDirection}. Color: ${project.colorDirection}. World: ${project.worldBible.geography}; ${project.worldBible.historicalPeriod}; ${project.worldBible.technologyLevel}.

This is a clean production reference board, not a poster and not a sequence frame. Do not add logos, captions, asset numbers, watermarks, decorative typography, extra people, duplicate identities, unrelated props, or unrequested story events.`;
}

export async function GET() {
  const { OPENAI_API_KEY, OPENAI_IMAGE_MODEL } = getRuntimeEnv();
  return Response.json({ available: Boolean(OPENAI_API_KEY), provider: OPENAI_API_KEY ? 'OpenAI GPT Image' : null, model: OPENAI_API_KEY ? OPENAI_IMAGE_MODEL || 'gpt-image-2' : null });
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const { DB, FILES, OPENAI_API_KEY, OPENAI_IMAGE_MODEL } = getRuntimeEnv();
    if (!OPENAI_API_KEY) return Response.json({ error: 'No server-side OpenAI image provider key is configured. The prepared sheet and source references remain unchanged.' }, { status: 503 });
    const body = await request.json() as { projectId?: string; expectedRevision?: number; assetId?: string };
    if (!body.projectId || !body.assetId) return Response.json({ error: 'An active project and prepared asset sheet are required.' }, { status: 400 });
    const row = await DB.prepare(`SELECT p.state_json, COALESCE(t.revision, 0) AS revision
      FROM projects p LEFT JOIN project_transactions t ON t.project_id = p.id
      WHERE p.id = ? AND p.archived = 0`).bind(body.projectId).first<{ state_json: string; revision: number }>();
    if (!row) return Response.json({ error: 'That project is no longer available.' }, { status: 404 });
    const project = normalizeProject(await decodeProjectState<StudioProject>(row.state_json));
    project.storageRevision = row.revision;
    if ((body.expectedRevision ?? row.revision) !== row.revision) return Response.json({ error: 'The project changed before image generation could begin. No provider request was sent.', conflict: true, project }, { status: 409 });
    const asset = project.assets.find((candidate) => candidate.id === body.assetId && candidate.lifecycleStatus === 'Active');
    if (!asset?.sheet) return Response.json({ error: 'Prepare one composite production sheet in chat before requesting image generation.' }, { status: 409 });

    const references: ImageProviderReference[] = [];
    for (const referenceId of asset.sheet.sourceReferenceIds) {
      const referenceRow = await DB.prepare('SELECT original_name, media_key, content_type FROM asset_references WHERE id = ? AND project_id = ?')
        .bind(referenceId, project.id).first<{ original_name: string; media_key: string; content_type: string }>();
      if (!referenceRow) return Response.json({ error: `Source reference ${referenceId} is missing from project metadata. The provider was not called.` }, { status: 409 });
      if (!supportedReferenceTypes.has(referenceRow.content_type)) return Response.json({ error: `“${referenceRow.original_name}” uses ${referenceRow.content_type}. GPT Image reference inputs must be PNG, JPEG, or WebP; the provider was not called.` }, { status: 415 });
      const object = await FILES.get(referenceRow.media_key);
      if (!object) return Response.json({ error: `“${referenceRow.original_name}” is missing from project storage. Repair the project before generation.` }, { status: 409 });
      references.push({ name: cleanName(referenceRow.original_name), contentType: referenceRow.content_type, bytes: await object.arrayBuffer() });
    }

    const generated = await generateProductionImage({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_IMAGE_MODEL || 'gpt-image-2',
      prompt: imagePrompt(project, asset),
      references,
    });
    const createdAt = nowIso();
    if (asset.generatedAttachmentId) asset.version += 1;
    const attachmentId = `generated_${crypto.randomUUID()}`;
    const mediaKey = `projects/${project.id}/generated/${asset.id}/v${asset.version}-${crypto.randomUUID()}-${cleanName(asset.generatedFileName)}`;
    const bytes = generated.bytes.slice().buffer as ArrayBuffer;
    const fingerprintSha256 = toHex(await crypto.subtle.digest('SHA-256', bytes.slice(0)));
    await FILES.put(mediaKey, bytes, {
      httpMetadata: { contentType: generated.contentType },
      customMetadata: { projectId: project.id, assetId: asset.id, assetNumber: String(asset.projectNumber), model: generated.model, fingerprintSha256 },
    });

    const attachment: StudioProject['attachments'][number] = {
      id: attachmentId,
      name: asset.generatedFileName,
      role: 'Generated visual production asset',
      contentType: generated.contentType,
      byteSize: generated.bytes.byteLength,
      createdAt,
      referenceRoles: ['Generated', asset.sheet.kind],
      fingerprintSha256,
      previewKind: 'image-adaptive',
      integrityStatus: 'Verified',
      linkedAssetId: asset.id,
      linkedAssetNumber: asset.projectNumber,
      identityGroupId: asset.id === 'CHARACTER_001' ? 'CHARACTER_IDENTITY_001' : undefined,
    };
    project.attachments.push(attachment);
    asset.generatedAttachmentId = attachmentId;
    asset.sheet.generationStatus = 'Generated';
    asset.approvalState = 'Needs Review';
    asset.notes = `${asset.sheet.brief} Generated with ${generated.model}; provider request ${generated.requestId ?? 'not supplied'}. Version ${asset.version} awaits approval.`;
    project.settings.imageProvider = 'OpenAI GPT Image';
    project.updatedAt = createdAt;
    project.storageRevision = row.revision + 1;
    refreshProductionSystem(project);

    const message: StudioMessage = {
      id: `message_${crypto.randomUUID()}`,
      role: 'assistant',
      createdAt,
      content: `Generated one composite ${asset.sheet.kind} for ${assetProductionReference(asset)}. It is stored as ${asset.generatedFileName}, keeps permanent number ${String(asset.projectNumber).padStart(3, '0')}, and is ready for visual review. Its internal panels did not create extra assets or folders.`,
      metadata: { kind: 'asset-generation', assetIds: [asset.id], attachmentId },
    };
    const transactionId = crypto.randomUUID();
    const snapshotId = crypto.randomUUID();
    const changeId = `change_${crypto.randomUUID()}`;
    const jobId = `image_job_${crypto.randomUUID()}`;
    const resultId = `image_result_${crypto.randomUUID()}`;
    const summary = `Generated ${asset.generatedFileName} V${asset.version} with ${generated.model}.`;
    project.production.control.changeLog.push({ id: changeId, revision: project.storageRevision, scope: 'image-generation', summary, createdAt });
    project.production.autosave.recoverySnapshotCount += 1;
    project.production.autosave.lastRecoveryReason = summary;
    const encodedProject = await encodeProjectState(project);
    await DB.batch([
      DB.prepare(`INSERT INTO transaction_guards (id, project_id, revision_ok, created_at)
        SELECT ?, ?, CASE WHEN revision = ? THEN 1 ELSE 0 END, ? FROM project_transactions WHERE project_id = ?`)
        .bind(transactionId, project.id, row.revision, createdAt, project.id),
      DB.prepare('INSERT INTO project_recovery_snapshots (id, project_id, reason, state_json, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(snapshotId, project.id, summary, row.state_json, createdAt),
      DB.prepare(`INSERT INTO asset_references (id, project_id, asset_id, original_name, media_key, content_type, byte_size, role, reference_roles_json, role_overrides_json, excluded_traits_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?)`).bind(
        attachmentId, project.id, `${project.id}:${asset.id}`, asset.generatedFileName, mediaKey, generated.contentType, attachment.byteSize,
        attachment.role, JSON.stringify(attachment.referenceRoles), createdAt,
      ),
      DB.prepare(`INSERT INTO file_integrity (reference_id, project_id, fingerprint_sha256, preview_media_key, preview_kind, integrity_status, verified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(attachmentId, project.id, fingerprintSha256, mediaKey, 'image-adaptive', 'Original', createdAt),
      DB.prepare(`INSERT INTO media_checksums (id, project_id, media_key, media_kind, fingerprint_sha256, byte_size, integrity_status, verified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(`checksum_${crypto.randomUUID()}`, project.id, mediaKey, 'generated-asset', fingerprintSha256, attachment.byteSize, 'Verified', createdAt),
      DB.prepare(`UPDATE assets SET approval_state = ?, current_version = ?, updated_at = ? WHERE project_id = ? AND stable_id = ?`)
        .bind(asset.approvalState, asset.version, createdAt, project.id, asset.id),
      DB.prepare(`INSERT INTO asset_versions (id, asset_id, version, description, media_key, approval_state, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(asset_id, version) DO UPDATE SET media_key = excluded.media_key, approval_state = excluded.approval_state, notes = excluded.notes`)
        .bind(crypto.randomUUID(), `${project.id}:${asset.id}`, asset.version, asset.description, mediaKey, asset.approvalState, asset.notes, createdAt),
      DB.prepare(`INSERT INTO generation_jobs (id, project_id, target_id, provider, model, model_version, capability_revision, idempotency_key, queue_position, submission_token, provider_request_id, prompt_version, reference_files_json, status, failure_message, retry_history_json, started_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, '[]', ?, ?)`).bind(
        jobId, project.id, asset.id, 'OpenAI', generated.model, generated.model, 'openai-images-v1', `${project.id}:${asset.id}:v${asset.version}:${fingerprintSha256}`,
        0, transactionId, generated.requestId, asset.version, JSON.stringify(asset.sheet.sourceReferenceIds), 'Completed', createdAt, createdAt,
      ),
      DB.prepare('INSERT INTO generation_results (id, job_id, media_key, metadata_json, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(resultId, jobId, mediaKey, JSON.stringify({ assetId: asset.id, assetNumber: asset.projectNumber, filename: asset.generatedFileName, fingerprintSha256, requestId: generated.requestId }), createdAt),
      DB.prepare('UPDATE projects SET state_json = ?, updated_at = ? WHERE id = ?').bind(encodedProject, createdAt, project.id),
      DB.prepare('UPDATE project_transactions SET revision = ?, last_transaction_id = ?, updated_at = ? WHERE project_id = ?').bind(project.storageRevision, transactionId, createdAt, project.id),
      DB.prepare(`INSERT INTO production_change_log (id, project_id, revision, scope, summary, before_snapshot_id, after_state_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(changeId, project.id, project.storageRevision, 'image-generation', summary, snapshotId, `${JSON.stringify(project).length.toString(16)}-${createdAt}`, createdAt),
      DB.prepare('INSERT INTO chat_messages (id, project_id, role, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(message.id, project.id, message.role, message.content, JSON.stringify(message.metadata), message.createdAt),
    ]);
    return Response.json({ project, message, provider: { name: 'OpenAI GPT Image', model: generated.model, requestId: generated.requestId } });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && /CHECK constraint failed|transaction_revision_must_match/i.test(error.message)) {
      return Response.json({ error: 'The project changed while the generated image was being recorded. Reload before retrying.' }, { status: 409 });
    }
    return Response.json({ error: error instanceof Error ? `The image provider did not complete this sheet: ${error.message}` : 'The image provider did not complete this sheet.' }, { status: 502 });
  }
}
