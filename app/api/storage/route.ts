import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
import { normalizeProject, nowIso, type StudioProject } from '@/lib/studio';

export const runtime = 'edge';

interface StoredObjectRow {
  id: string;
  media_key: string;
  byte_size?: number;
  status?: string;
  preview_media_key?: string | null;
}

async function storageReport(projectId: string) {
  const { DB, FILES } = getRuntimeEnv();
  const originals = await DB.prepare('SELECT id, media_key, byte_size FROM asset_references WHERE project_id = ?').bind(projectId).all<StoredObjectRow>();
  const generated = await DB.prepare(`SELECT gr.id, gr.media_key, gj.status FROM generation_results gr
    JOIN generation_jobs gj ON gj.id = gr.job_id WHERE gj.project_id = ?`).bind(projectId).all<StoredObjectRow>();
  const previews = await DB.prepare(`SELECT fi.reference_id AS id, fi.preview_media_key FROM file_integrity fi
    JOIN asset_references ar ON ar.id = fi.reference_id WHERE fi.project_id = ? AND fi.preview_media_key IS NOT NULL AND fi.preview_media_key != ar.media_key`).bind(projectId).all<StoredObjectRow>();
  let generatedBytes = 0;
  for (const row of generated.results) {
    if (row.media_key.startsWith('reference:')) continue;
    generatedBytes += (await FILES.head(row.media_key))?.size ?? 0;
  }
  let previewBytes = 0;
  for (const row of previews.results) previewBytes += row.preview_media_key ? (await FILES.head(row.preview_media_key))?.size ?? 0 : 0;
  const originalBytes = originals.results.reduce((sum, row) => sum + (row.byte_size ?? 0), 0);
  const approvedKeys = new Set((await DB.prepare('SELECT result_media_key FROM final_sequence_sources WHERE project_id = ?').bind(projectId).all<{ result_media_key: string }>()).results.map((row) => row.result_media_key));
  const cleanupCandidates = [
    ...previews.results.map((row) => ({ id: row.id, kind: 'preview', mediaKey: row.preview_media_key! })),
    ...generated.results.filter((row) => ['Failed', 'Cancelled'].includes(row.status ?? '') && !approvedKeys.has(row.media_key)).map((row) => ({ id: row.id, kind: 'failed-generation', mediaKey: row.media_key })),
  ];
  return { originalBytes, generatedBytes, previewBytes, totalBytes: originalBytes + generatedBytes + previewBytes, protectedOriginalCount: originals.results.length, protectedApprovedCount: approvedKeys.size, cleanupCandidates };
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!projectId) return Response.json({ error: 'Choose a project first.' }, { status: 400 });
    return Response.json({ report: await storageReport(projectId) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Project storage could not be measured.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json() as { projectId?: string; expectedRevision?: number };
    if (!body.projectId) return Response.json({ error: 'Choose a project first.' }, { status: 400 });
    const { DB, FILES } = getRuntimeEnv();
    const row = await DB.prepare(`SELECT p.state_json, COALESCE(t.revision, 0) AS revision FROM projects p
      LEFT JOIN project_transactions t ON t.project_id = p.id WHERE p.id = ? AND p.archived = 0`).bind(body.projectId).first<{ state_json: string; revision: number }>();
    if (!row) return Response.json({ error: 'Project not found.' }, { status: 404 });
    if ((body.expectedRevision ?? row.revision) !== row.revision) return Response.json({ error: 'The project changed before cleanup. Reload and review the cleanup candidates again.', conflict: true }, { status: 409 });
    const before = normalizeProject(JSON.parse(row.state_json) as StudioProject);
    const report = await storageReport(body.projectId);
    const removed: string[] = [];
    for (const candidate of report.cleanupCandidates) {
      if (!candidate.mediaKey || candidate.mediaKey.startsWith('reference:')) continue;
      await FILES.delete(candidate.mediaKey);
      removed.push(candidate.id);
    }
    const project = structuredClone(before);
    for (const job of project.production.renderQueue) {
      if (!job.resultMediaKey) continue;
      const candidate = report.cleanupCandidates.find((item) => item.kind === 'failed-generation' && item.mediaKey === job.resultMediaKey);
      if (candidate) { job.resultMediaKey = null; job.continuityFrameKey = null; job.failureMessage = `${job.failureMessage ?? 'Failed generation.'} Unapproved failed media was removed by safe storage cleanup.`; }
    }
    const createdAt = nowIso();
    const nextRevision = row.revision + 1;
    project.storageRevision = nextRevision;
    project.updatedAt = createdAt;
    const after = await storageReport(body.projectId);
    after.cleanupCandidates = [];
    project.production.control.storage = { originalBytes: after.originalBytes, previewBytes: after.previewBytes, generatedBytes: after.generatedBytes, totalBytes: after.totalBytes, protectedReferenceIds: project.attachments.map((attachment) => attachment.id), cleanupCandidateIds: after.cleanupCandidates.map((candidate) => candidate.id), lastCalculatedAt: createdAt, cleanupPolicy: project.production.control.storage.cleanupPolicy };
    const transactionId = crypto.randomUUID();
    const snapshotId = `recovery_${crypto.randomUUID()}`;
    const changeId = `change_${crypto.randomUUID()}`;
    const summary = `Safe storage cleanup removed ${removed.length} unused preview or failed-generation object(s); originals and approved media were protected.`;
    project.production.control.changeLog.push({ id: changeId, revision: nextRevision, scope: 'storage-cleanup', summary, createdAt });
    const statements: D1PreparedStatement[] = [
      DB.prepare(`INSERT INTO transaction_guards (id, project_id, revision_ok, created_at)
        SELECT ?, ?, CASE WHEN revision = ? THEN 1 ELSE 0 END, ? FROM project_transactions WHERE project_id = ?`).bind(transactionId, project.id, row.revision, createdAt, project.id),
      DB.prepare('INSERT INTO project_recovery_snapshots (id, project_id, reason, state_json, created_at) VALUES (?, ?, ?, ?, ?)').bind(snapshotId, project.id, summary, JSON.stringify(before), createdAt),
      DB.prepare('UPDATE projects SET state_json = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(project), createdAt, project.id),
      DB.prepare('UPDATE project_transactions SET revision = ?, last_transaction_id = ?, updated_at = ? WHERE project_id = ?').bind(nextRevision, transactionId, createdAt, project.id),
      DB.prepare('INSERT INTO production_change_log (id, project_id, revision, scope, summary, before_snapshot_id, after_state_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(changeId, project.id, nextRevision, 'storage-cleanup', summary, snapshotId, `${JSON.stringify(project).length.toString(16)}-${createdAt}`, createdAt),
      DB.prepare('INSERT INTO storage_cleanup_log (id, project_id, removed_json, protected_original_count, protected_approved_count, bytes_before, bytes_after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(`cleanup_${crypto.randomUUID()}`, project.id, JSON.stringify(removed), report.protectedOriginalCount, report.protectedApprovedCount, report.totalBytes, after.totalBytes, createdAt),
    ];
    for (const candidate of report.cleanupCandidates) {
      if (candidate.kind === 'preview') statements.push(DB.prepare('UPDATE file_integrity SET preview_media_key = NULL, preview_kind = ?, verified_at = ? WHERE reference_id = ?').bind('none', createdAt, candidate.id));
      else statements.push(DB.prepare('DELETE FROM generation_results WHERE id = ?').bind(candidate.id));
      statements.push(DB.prepare('DELETE FROM media_checksums WHERE project_id = ? AND media_key = ?').bind(project.id, candidate.mediaKey));
    }
    await DB.batch(statements);
    return Response.json({ project, report: after, removedCount: removed.length });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && /CHECK constraint failed|transaction_revision_must_match/i.test(error.message)) return Response.json({ error: 'The project changed during cleanup. The database transaction rolled back.', conflict: true }, { status: 409 });
    return Response.json({ error: 'Safe storage cleanup could not be completed. Originals and approved media were not touched.' }, { status: 500 });
  }
}
