import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
import {
  createProjectFromIdea,
  interpretStudioMessage,
  normalizeProject,
  nowIso,
  summarizeProject,
  type StudioMessage,
  type StudioProject,
} from '@/lib/studio';

export const runtime = 'edge';

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return Response.json(data, {
    ...init,
    headers,
  });
}

async function loadProject(projectId: string) {
  const { DB } = getRuntimeEnv();
  const row = await DB.prepare(`SELECT p.state_json, COALESCE(t.revision, 0) AS revision
    FROM projects p LEFT JOIN project_transactions t ON t.project_id = p.id
    WHERE p.id = ? AND p.archived = 0`)
    .bind(projectId)
    .first<{ state_json: string; revision: number }>();
  if (!row) return null;
  const project = normalizeProject(JSON.parse(row.state_json) as StudioProject);
  project.storageRevision = row.revision;
  return project;
}

async function loadMessages(projectId: string) {
  const { DB } = getRuntimeEnv();
  const rows = await DB.prepare(
    'SELECT id, role, content, metadata_json, created_at FROM chat_messages WHERE project_id = ? ORDER BY created_at ASC LIMIT 500',
  )
    .bind(projectId)
    .all<{ id: string; role: 'user' | 'assistant'; content: string; metadata_json: string | null; created_at: string }>();
  return rows.results.map<StudioMessage>((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
  }));
}

async function listProjects() {
  const { DB } = getRuntimeEnv();
  const rows = await DB.prepare(
    'SELECT state_json FROM projects WHERE archived = 0 ORDER BY pinned DESC, updated_at DESC LIMIT 100',
  ).all<{ state_json: string }>();
  return rows.results.map((row) => summarizeProject(normalizeProject(JSON.parse(row.state_json) as StudioProject)));
}

function messageInsert(projectId: string, item: StudioMessage) {
  const { DB } = getRuntimeEnv();
  return DB.prepare(
    'INSERT INTO chat_messages (id, project_id, role, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(item.id, projectId, item.role, item.content, item.metadata ? JSON.stringify(item.metadata) : null, item.createdAt);
}

async function runBatches(statements: D1PreparedStatement[]) {
  const { DB } = getRuntimeEnv();
  if (statements.length) await DB.batch(statements);
}

function intelligenceStatements(project: StudioProject) {
  const { DB } = getRuntimeEnv();
  const statements: D1PreparedStatement[] = [
    DB.prepare('INSERT OR IGNORE INTO world_bible_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), project.id, project.worldBible.version, JSON.stringify(project.worldBible), project.worldBible.status, project.updatedAt),
  ];
  for (const location of project.locations) {
    statements.push(
      DB.prepare(`INSERT INTO world_locations (id, project_id, stable_id, location_type, content_json, version, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_id, stable_id) DO UPDATE SET location_type = excluded.location_type,
        content_json = excluded.content_json, version = excluded.version, updated_at = excluded.updated_at`)
        .bind(`${project.id}:${location.id}:world`, project.id, location.id, location.type, JSON.stringify(location), location.version, project.updatedAt),
    );
  }
  for (const environment of project.environments) {
    statements.push(
      DB.prepare(`INSERT INTO environment_states (
        id, project_id, stable_id, location_stable_id, active_from_sequence, active_through_sequence, content_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, stable_id) DO UPDATE SET location_stable_id = excluded.location_stable_id,
        active_from_sequence = excluded.active_from_sequence, active_through_sequence = excluded.active_through_sequence,
        content_json = excluded.content_json, updated_at = excluded.updated_at`)
        .bind(`${project.id}:${environment.id}:environment`, project.id, environment.id, environment.locationId,
          environment.activeFromSequence, environment.activeThroughSequence, JSON.stringify(environment), project.updatedAt),
    );
  }
  for (const sequence of project.sequences) {
    statements.push(
      DB.prepare(`INSERT INTO scene_states (
        id, project_id, sequence_number, scene_state_json, scene_graph_json, asset_manifest_json, ending_state_json, look_ahead_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, sequence_number) DO UPDATE SET scene_state_json = excluded.scene_state_json,
        scene_graph_json = excluded.scene_graph_json, asset_manifest_json = excluded.asset_manifest_json,
        ending_state_json = excluded.ending_state_json, look_ahead_json = excluded.look_ahead_json, updated_at = excluded.updated_at`)
        .bind(`${project.id}:${sequence.id}:scene`, project.id, sequence.number, JSON.stringify(sequence.sceneState),
          JSON.stringify(sequence.sceneGraph), JSON.stringify(sequence.assetManifest), JSON.stringify(sequence.endingState),
          JSON.stringify(sequence.lookAhead), project.updatedAt),
    );
  }
  for (const edge of project.knowledgeGraph.edges) {
    statements.push(
      DB.prepare(`INSERT INTO knowledge_graph_edges (
        id, project_id, edge_id, from_id, to_id, relationship, sequence_number, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, edge_id) DO UPDATE SET from_id = excluded.from_id, to_id = excluded.to_id,
        relationship = excluded.relationship, sequence_number = excluded.sequence_number, updated_at = excluded.updated_at`)
        .bind(`${project.id}:${edge.id}:edge`, project.id, edge.id, edge.from, edge.to, edge.relationship, edge.sequenceNumber, project.updatedAt),
    );
  }
  for (const asset of project.assets) {
    const coverageValues = Object.values(asset.referenceCoverage);
    const average = coverageValues.reduce((sum, value) => sum + value, 0) / Math.max(1, coverageValues.length);
    const risk = ['Story critical', 'Location anchor'].includes(asset.importance) && average < 40 ? 'High' : average < 55 ? 'Medium' : 'Low';
    statements.push(
      DB.prepare(`INSERT INTO reference_coverage (
        id, project_id, asset_stable_id, coverage_json, reference_count, risk_level, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, asset_stable_id) DO UPDATE SET coverage_json = excluded.coverage_json,
        reference_count = excluded.reference_count, risk_level = excluded.risk_level, updated_at = excluded.updated_at`)
        .bind(`${project.id}:${asset.id}:coverage`, project.id, asset.id, JSON.stringify(asset.referenceCoverage), asset.referenceCount, risk, project.updatedAt),
    );
  }
  for (const event of project.stateEvents) {
    statements.push(
      DB.prepare(`INSERT OR IGNORE INTO asset_state_events (
        id, project_id, sequence_number, asset_stable_id, event_type, previous_state, next_state,
        location_stable_id, actor_stable_id, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        event.id, project.id, event.sequenceNumber, event.assetId, event.eventType, event.previousState,
        event.nextState, event.locationId, event.actorId, event.notes, event.createdAt,
      ),
    );
  }
  const productionRecord = (recordType: string, stableKey: string, status: string, sequenceNumber: number | null, content: unknown) =>
    DB.prepare(`INSERT INTO production_records (id, project_id, record_type, stable_key, status, sequence_number, content_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, record_type, stable_key) DO UPDATE SET status = excluded.status,
      sequence_number = excluded.sequence_number, content_json = excluded.content_json, updated_at = excluded.updated_at`)
      .bind(`${project.id}:${recordType}:${stableKey}`, project.id, recordType, stableKey, status, sequenceNumber, JSON.stringify(content), project.updatedAt);
  for (const dependency of project.production.dependencies) {
    statements.push(productionRecord('dependency', dependency.id, dependency.freshness, null, dependency));
  }
  for (const plan of Object.values(project.production.sequencePlans)) {
    statements.push(productionRecord('sequence-plan', plan.sequenceId, plan.readiness, plan.sequenceNumber, plan));
  }
  for (const character of Object.values(project.production.characterStates)) statements.push(productionRecord('character-production-state', character.assetId, 'Tracked', null, character));
  for (const thread of project.production.storyThreads) statements.push(productionRecord('story-thread', thread.id, thread.status, thread.introducedSequence, thread));
  for (const finding of project.production.repetitionFindings) statements.push(productionRecord('repetition-finding', finding.id, finding.severity, finding.sequenceNumbers[0] ?? null, finding));
  for (const rule of project.production.correctionMemory) statements.push(productionRecord('correction-memory', rule.id, rule.active ? 'Active' : 'Inactive', rule.sequenceNumber, rule));
  for (const snapshot of project.production.generationSnapshots) statements.push(productionRecord('generation-snapshot', snapshot.id, 'Immutable', snapshot.sequenceNumber, snapshot));
  for (const lineage of Object.values(project.production.assetLineage)) {
    statements.push(productionRecord('asset-lineage', lineage.assetId, lineage.approvedVersion ? 'Approved' : 'Draft', null, lineage));
  }
  for (const job of project.production.renderQueue) {
    const plan = project.production.sequencePlans[job.targetId];
    statements.push(
      productionRecord('render-job', job.id, job.status, job.sequenceNumber, job),
      DB.prepare(`INSERT INTO generation_jobs (
        id, project_id, target_id, provider, model, prompt_version, reference_files_json, status,
        failure_message, retry_history_json, started_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET provider = excluded.provider, model = excluded.model,
        prompt_version = excluded.prompt_version, reference_files_json = excluded.reference_files_json,
        status = excluded.status, failure_message = excluded.failure_message,
        retry_history_json = excluded.retry_history_json, updated_at = excluded.updated_at`)
        .bind(job.id, project.id, job.targetId, job.provider, job.model, plan?.revision ?? 1,
          JSON.stringify(plan?.referencePackage ?? {}), job.status, job.failureMessage,
          JSON.stringify(job.retryHistory), job.createdAt, job.updatedAt),
    );
    if (job.resultMediaKey) {
      const provenance = project.production.control.resultProvenance.findLast((item) => item.sequenceNumber === job.sequenceNumber && item.resultMediaKey === job.resultMediaKey);
      statements.push(DB.prepare(`INSERT INTO generation_results (id, job_id, media_key, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET media_key = excluded.media_key, metadata_json = excluded.metadata_json`)
        .bind(`${job.id}:result`, job.id, job.resultMediaKey, JSON.stringify(provenance ?? { generationSnapshotId: job.generationSnapshotId }), job.updatedAt));
    }
  }
  for (const report of project.production.validations) statements.push(productionRecord('validation', report.id, report.status, report.sequenceNumber, report));
  for (const correction of project.production.corrections) statements.push(productionRecord('correction', correction.id, correction.status, correction.sequenceNumber, correction));
  for (const checkpoint of project.production.checkpoints) statements.push(productionRecord('continuity-checkpoint', checkpoint.id, 'Approved', checkpoint.sequenceNumber, checkpoint));
  for (const capability of project.production.modelCapabilities) statements.push(productionRecord('model-capability', capability.id, capability.connectionStatus, null, capability));
  for (const dependency of project.production.control.sequenceDependencies) statements.push(productionRecord('explicit-sequence-dependency', dependency.id, dependency.status, dependency.sequenceNumber, dependency));
  for (const finding of project.production.control.referenceBindingFindings) statements.push(productionRecord('reference-binding-audit', finding.id, finding.severity, finding.sequenceNumber, finding));
  for (const timing of Object.values(project.production.control.dialogueTimingAudits)) statements.push(productionRecord('dialogue-timing-audit', `sequence-${timing.sequenceNumber}`, timing.fits ? 'Passed' : 'Failed', timing.sequenceNumber, timing));
  for (const translation of Object.values(project.production.control.providerTranslations)) statements.push(productionRecord('provider-translation', `sequence-${translation.sequenceNumber}`, translation.status, translation.sequenceNumber, translation));
  for (const freeze of project.production.control.freezeSnapshots) statements.push(productionRecord('production-freeze', freeze.id, 'Immutable', null, freeze));
  for (const provenance of project.production.control.resultProvenance) statements.push(productionRecord('result-provenance', provenance.id, 'Recorded', provenance.sequenceNumber, provenance));
  statements.push(productionRecord('project-integrity-audit', project.production.control.integrityAudit.id, project.production.control.integrityAudit.status, null, project.production.control.integrityAudit));
  for (const reservation of project.production.control.reservedNumbers) {
    statements.push(DB.prepare(`INSERT INTO reserved_numbers (id, project_id, kind, number, stable_id, status, reserved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, kind, number) DO UPDATE SET status = excluded.status`)
      .bind(`${project.id}:${reservation.kind}:${reservation.number}`, project.id, reservation.kind, reservation.number, reservation.stableId, reservation.status, reservation.reservedAt));
  }
  for (const source of project.production.control.finalSourceMap) {
    const provenance = project.production.control.resultProvenance.find((item) => item.id === source.provenanceId);
    statements.push(DB.prepare(`INSERT INTO final_sequence_sources (id, project_id, sequence_number, result_media_key, provenance_json, approved_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, sequence_number) DO UPDATE SET result_media_key = excluded.result_media_key,
      provenance_json = excluded.provenance_json, approved_at = excluded.approved_at`)
      .bind(`${project.id}:source:${source.sequenceNumber}`, project.id, source.sequenceNumber, source.resultMediaKey, JSON.stringify(provenance ?? source), source.approvedAt));
  }
  for (const capability of project.production.modelCapabilities) {
    statements.push(DB.prepare(`INSERT OR IGNORE INTO provider_capability_versions
      (id, project_id, profile_id, revision, capability_json, refreshed_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(`${project.id}:${capability.id}:${capability.capabilityRevision}`, project.id, capability.id, capability.capabilityRevision, JSON.stringify(capability), capability.refreshedAt));
  }
  statements.push(
    productionRecord('cost-ledger', 'current', 'Tracked', null, project.production.costLedger),
    productionRecord('final-assembly', project.production.finalAssembly.id, project.production.finalAssembly.status, null, project.production.finalAssembly),
    productionRecord('final-quality', project.production.finalQuality.id, project.production.finalQuality.status, null, project.production.finalQuality),
    productionRecord('movie-completion-audit', project.production.completionAudit.id, project.production.completionAudit.status, null, project.production.completionAudit),
    productionRecord('audio-policy', 'single-policy', 'Enforced', null, project.production.audioPolicy),
    productionRecord('autosave', 'current', 'Enabled', null, project.production.autosave),
  );
  return statements;
}

async function resolveRollback(project: StudioProject, content: string) {
  const { DB } = getRuntimeEnv();
  if (/undo (?:the )?last change/i.test(content)) {
    const row = await DB.prepare('SELECT state_json, reason FROM project_recovery_snapshots WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(project.id).first<{ state_json: string; reason: string }>();
    if (!row) return null;
    const restored = normalizeProject(JSON.parse(row.state_json) as StudioProject);
    restored.storageRevision = project.storageRevision;
    restored.updatedAt = nowIso();
    return { project: restored, text: `Undid the last persisted project change using the recovery snapshot “${row.reason}”. Permanent asset and sequence numbers remain reserved.` };
  }
  const sequenceVersion = content.match(/(?:go back to|restore)\s+sequence\s*0*(\d+)\s+(?:version|v)\s*0*(\d+)/i);
  if (sequenceVersion) {
    const number = Number(sequenceVersion[1]);
    const version = Number(sequenceVersion[2]);
    const row = await DB.prepare(`SELECT sv.content_json FROM sequence_versions sv
      JOIN sequences s ON s.id = sv.sequence_id WHERE s.project_id = ? AND s.sequence_number = ? AND sv.version = ? LIMIT 1`)
      .bind(project.id, number, version).first<{ content_json: string }>();
    if (!row) return { project, text: `Sequence ${number} version ${version} was not found; nothing changed.` };
    const restoredSequence = JSON.parse(row.content_json) as StudioProject['sequences'][number];
    project.sequences = project.sequences.map((sequence) => sequence.number === number ? restoredSequence : sequence);
    project.updatedAt = nowIso();
    return { project: normalizeProject(project), text: `Restored Sequence ${number} to version ${version}. Other sequences, permanent numbers, assets, and approved media remain unchanged; downstream dependencies were recalculated.` };
  }
  if (/restore (?:the )?previous costume/i.test(content)) {
    const rows = await DB.prepare('SELECT state_json FROM project_recovery_snapshots WHERE project_id = ? ORDER BY created_at DESC LIMIT 25')
      .bind(project.id).all<{ state_json: string }>();
    const current = JSON.stringify(project.assets.filter((asset) => asset.category === 'Costumes'));
    const prior = rows.results.map((row) => JSON.parse(row.state_json) as StudioProject).find((snapshot) => JSON.stringify(snapshot.assets.filter((asset) => asset.category === 'Costumes')) !== current);
    if (!prior) return { project, text: 'No earlier costume state was found; nothing changed.' };
    const priorCostumes = new Map(prior.assets.filter((asset) => asset.category === 'Costumes').map((asset) => [asset.id, asset]));
    project.assets = project.assets.map((asset) => priorCostumes.get(asset.id) ?? asset);
    project.updatedAt = nowIso();
    return { project: normalizeProject(project), text: 'Restored the previous costume state only. Permanent numbers and unrelated story, assets, sequences, and media remain unchanged; impacted dependencies were recalculated.' };
  }
  return null;
}

async function createProjectGraph(project: StudioProject, messages: StudioMessage[]) {
  const { DB } = getRuntimeEnv();
  project.storageRevision = 1;
  const transactionId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [
    DB.prepare(`INSERT INTO projects (
      id, title, duration_seconds, sequence_duration_seconds, sequence_count, genre,
      story_status, film_bible_status, asset_status, sequence_status, continuity_status,
      export_status, pinned, archived, state_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      project.id, project.title, project.durationSeconds, project.sequenceDurationSeconds, project.sequenceCount,
      project.genre, project.story.status, project.filmBible.status, 'Planned', 'Planned', project.continuity.status,
      project.exportStatus, project.pinned ? 1 : 0, project.archived ? 1 : 0, JSON.stringify(project), project.createdAt, project.updatedAt,
    ),
    DB.prepare('INSERT INTO project_transactions (project_id, revision, last_transaction_id, updated_at) VALUES (?, ?, ?, ?)')
      .bind(project.id, project.storageRevision, transactionId, project.updatedAt),
    DB.prepare('INSERT INTO story_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), project.id, project.story.version, JSON.stringify(project.story), project.story.status, project.createdAt),
    DB.prepare('INSERT INTO film_bible_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), project.id, project.filmBible.version, JSON.stringify(project.filmBible), project.filmBible.status, project.createdAt),
    ...intelligenceStatements(project),
    ...messages.map((item) => messageInsert(project.id, item)),
  ];

  for (const asset of project.assets) {
    const assetRowId = `${project.id}:${asset.id}`;
    statements.push(
      DB.prepare(`INSERT INTO assets (
        id, project_id, stable_id, name, category, description, sequences_json, approval_state,
        lock_state, current_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        assetRowId, project.id, asset.id, asset.name, asset.category, asset.description, JSON.stringify(asset.sequences),
        asset.approvalState, asset.lockState, asset.version, project.createdAt, project.updatedAt,
      ),
      DB.prepare('INSERT INTO asset_versions (id, asset_id, version, description, approval_state, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), assetRowId, asset.version, asset.description, asset.approvalState, asset.notes, project.createdAt),
    );
  }

  for (const sequence of project.sequences) {
    const sequenceRowId = `${project.id}:${sequence.id}`;
    statements.push(
      DB.prepare(`INSERT INTO sequences (
        id, project_id, stable_id, sequence_number, duration_seconds, title, purpose, opening_state,
        closing_state, continuity_source, status, current_version, prompt_text, asset_ids_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        sequenceRowId, project.id, sequence.id, sequence.number, sequence.duration, sequence.title, sequence.purpose,
        sequence.openingState, sequence.closingState, sequence.continuitySource, sequence.status, sequence.version,
        sequence.prompt, JSON.stringify(sequence.assetIds), project.createdAt, project.updatedAt,
      ),
      DB.prepare('INSERT INTO sequence_versions (id, sequence_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), sequenceRowId, sequence.version, JSON.stringify(sequence), sequence.status, project.createdAt),
    );
    for (const assetId of sequence.assetIds) {
      statements.push(
        DB.prepare('INSERT INTO sequence_assets (sequence_id, asset_id) VALUES (?, ?)')
          .bind(sequenceRowId, `${project.id}:${assetId}`),
      );
    }
  }
  await runBatches(statements);
}

async function persistProject(project: StudioProject, messages: StudioMessage[], expectedRevision: number, scope: string, summary: string, beforeProject: StudioProject) {
  const { DB } = getRuntimeEnv();
  const transactionId = crypto.randomUUID();
  const snapshotId = crypto.randomUUID();
  const nextRevision = expectedRevision + 1;
  project.storageRevision = nextRevision;
  project.production.autosave.recoverySnapshotCount += 1;
  project.production.autosave.lastRecoveryReason = summary;
  const change = { id: `change_${crypto.randomUUID()}`, revision: nextRevision, scope, summary, createdAt: project.updatedAt };
  project.production.control.changeLog.push(change);
  const afterStateHash = `${JSON.stringify(project).length.toString(16)}-${project.updatedAt}`;
  const statements: D1PreparedStatement[] = [
    DB.prepare(`INSERT INTO transaction_guards (id, project_id, revision_ok, created_at)
      SELECT ?, ?, CASE WHEN revision = ? THEN 1 ELSE 0 END, ? FROM project_transactions WHERE project_id = ?`)
      .bind(transactionId, project.id, expectedRevision, project.updatedAt, project.id),
    DB.prepare('INSERT INTO project_recovery_snapshots (id, project_id, reason, state_json, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(snapshotId, project.id, summary, JSON.stringify(beforeProject), project.updatedAt),
    DB.prepare(`UPDATE projects SET
      title = ?, duration_seconds = ?, sequence_duration_seconds = ?, sequence_count = ?, genre = ?,
      story_status = ?, film_bible_status = ?, asset_status = ?, sequence_status = ?, continuity_status = ?,
      export_status = ?, pinned = ?, archived = ?, state_json = ?, updated_at = ? WHERE id = ?`).bind(
      project.title, project.durationSeconds, project.sequenceDurationSeconds, project.sequenceCount, project.genre,
      project.story.status, project.filmBible.status,
      project.assets.every((asset) => ['Approved', 'Locked'].includes(asset.approvalState)) ? 'Approved' : 'Pending',
      project.sequences.every((sequence) => sequence.status === 'Approved') ? 'Approved' : 'In progress',
      project.continuity.status, project.exportStatus, project.pinned ? 1 : 0, project.archived ? 1 : 0,
      JSON.stringify(project), project.updatedAt, project.id,
    ),
    DB.prepare('UPDATE project_transactions SET revision = ?, last_transaction_id = ?, updated_at = ? WHERE project_id = ?')
      .bind(nextRevision, transactionId, project.updatedAt, project.id),
    DB.prepare(`INSERT INTO production_change_log
      (id, project_id, revision, scope, summary, before_snapshot_id, after_state_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(change.id, project.id, change.revision, change.scope, change.summary, snapshotId, afterStateHash, change.createdAt),
    DB.prepare('INSERT OR IGNORE INTO story_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), project.id, project.story.version, JSON.stringify(project.story), project.story.status, project.updatedAt),
    DB.prepare('INSERT OR IGNORE INTO film_bible_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), project.id, project.filmBible.version, JSON.stringify(project.filmBible), project.filmBible.status, project.updatedAt),
    ...intelligenceStatements(project),
    ...messages.map((item) => messageInsert(project.id, item)),
  ];

  for (const asset of project.assets) {
    const rowId = `${project.id}:${asset.id}`;
    statements.push(
      DB.prepare(`INSERT INTO assets (
        id, project_id, stable_id, name, category, description, sequences_json, approval_state, lock_state,
        current_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, stable_id) DO UPDATE SET
        name = excluded.name, category = excluded.category, description = excluded.description,
        sequences_json = excluded.sequences_json, approval_state = excluded.approval_state,
        lock_state = excluded.lock_state, current_version = excluded.current_version, updated_at = excluded.updated_at`).bind(
        rowId, project.id, asset.id, asset.name, asset.category, asset.description, JSON.stringify(asset.sequences),
        asset.approvalState, asset.lockState, asset.version, project.createdAt, project.updatedAt,
      ),
      DB.prepare('INSERT OR IGNORE INTO asset_versions (id, asset_id, version, description, approval_state, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), rowId, asset.version, asset.description, asset.approvalState, asset.notes, project.updatedAt),
    );
  }

  for (const sequence of project.sequences) {
    const rowId = `${project.id}:${sequence.id}`;
    statements.push(
      DB.prepare(`INSERT INTO sequences (
        id, project_id, stable_id, sequence_number, duration_seconds, title, purpose, opening_state, closing_state,
        continuity_source, status, current_version, prompt_text, asset_ids_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, stable_id) DO UPDATE SET
        sequence_number = excluded.sequence_number, duration_seconds = excluded.duration_seconds, title = excluded.title,
        purpose = excluded.purpose, opening_state = excluded.opening_state, closing_state = excluded.closing_state,
        continuity_source = excluded.continuity_source, status = excluded.status, current_version = excluded.current_version,
        prompt_text = excluded.prompt_text, asset_ids_json = excluded.asset_ids_json, updated_at = excluded.updated_at`).bind(
        rowId, project.id, sequence.id, sequence.number, sequence.duration, sequence.title, sequence.purpose,
        sequence.openingState, sequence.closingState, sequence.continuitySource, sequence.status, sequence.version,
        sequence.prompt, JSON.stringify(sequence.assetIds), project.createdAt, project.updatedAt,
      ),
      DB.prepare('INSERT OR IGNORE INTO sequence_versions (id, sequence_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), rowId, sequence.version, JSON.stringify(sequence), sequence.status, project.updatedAt),
    );
  }

  for (const event of project.continuity.events) {
    statements.push(
      DB.prepare(`INSERT OR IGNORE INTO continuity_events (
        id, project_id, sequence_number, asset_stable_id, field_name, previous_value, next_value, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        event.id, project.id, event.sequenceNumber, event.assetId, event.field, event.previousValue, event.nextValue, event.reason, event.createdAt,
      ),
    );
  }

  await runBatches(statements);
}

function initialAssistantMessage(project: StudioProject): StudioMessage {
  return {
    id: `message_${crypto.randomUUID()}`,
    role: 'assistant',
    createdAt: nowIso(),
    content: `I created “${project.title}” as one connected ${project.durationSeconds / 60}-minute production world with ${project.sequenceCount} timed sequences, ${project.assets.length} permanently numbered assets, ${project.locations.length} structured locations, ${project.environments.length} environment state${project.environments.length === 1 ? '' : 's'}, and ${project.production.dependencies.length} tracked production dependencies. Every visual asset uses one project-wide number and will export directly inside ${project.flatAssetFolder.folderName} with no subfolders. Dependency freshness, revisions, reference priority, render recovery, validation, checkpoints, and final assembly are active. Review the story first; nothing has been generated or approved yet.`,
    metadata: { kind: 'story' },
  };
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const summaries = await listProjects();
    if (!projectId) return json({ projects: summaries });
    const project = await loadProject(projectId);
    if (!project) return json({ error: 'Project not found.' }, { status: 404 });
    return json({ projects: summaries, project, messages: await loadMessages(projectId) });
  } catch (error) {
    console.error(error);
    return json({ error: 'The studio could not open project memory. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = (await request.json()) as {
      projectId?: string;
      message?: string;
      action?: 'pin' | 'archive' | 'settings';
      settings?: Partial<StudioProject['settings']>;
      expectedRevision?: number;
    };

    if (!body.projectId) {
      const idea = body.message?.trim();
      if (!idea) return json({ error: 'Describe the movie you want to create.' }, { status: 400 });
      const project = createProjectFromIdea(idea);
      const userMessage: StudioMessage = { id: `message_${crypto.randomUUID()}`, role: 'user', content: idea, createdAt: project.createdAt };
      const assistantMessage = initialAssistantMessage(project);
      await createProjectGraph(project, [userMessage, assistantMessage]);
      return json({ project, messages: [userMessage, assistantMessage], projects: await listProjects() });
    }

    const project = await loadProject(body.projectId);
    if (!project) return json({ error: 'That project is no longer available.' }, { status: 404 });
    const expectedRevision = body.expectedRevision ?? project.storageRevision;
    if (expectedRevision !== project.storageRevision) {
      return json({ error: `This project changed in another session. Reloaded revision is ${project.storageRevision}; your request expected revision ${expectedRevision}. No changes were applied.`, conflict: true, project }, { status: 409 });
    }

    if (body.action === 'pin' || body.action === 'archive' || body.action === 'settings') {
      const beforeProject = structuredClone(project);
      if (body.action === 'pin') project.pinned = !project.pinned;
      if (body.action === 'archive') project.archived = true;
      if (body.action === 'settings' && body.settings) project.settings = { ...project.settings, ...body.settings };
      project.updatedAt = nowIso();
      await persistProject(project, [], expectedRevision, body.action, `${body.action} project setting`, beforeProject);
      return json({ project, projects: await listProjects() });
    }

    const content = body.message?.trim();
    if (!content) return json({ error: 'Write an instruction for the studio.' }, { status: 400 });
    const beforeProject = structuredClone(project);
    const userMessage: StudioMessage = { id: `message_${crypto.randomUUID()}`, role: 'user', content, createdAt: nowIso() };
    const rollback = await resolveRollback(project, content);
    const result = rollback
      ? { project: rollback.project, response: { id: `message_${crypto.randomUUID()}`, role: 'assistant' as const, content: rollback.text, createdAt: nowIso(), metadata: { kind: 'control' as const } } }
      : interpretStudioMessage(project, content);
    const normalized = normalizeProject(result.project);
    await persistProject(normalized, [userMessage, result.response], expectedRevision, rollback ? 'rollback' : 'chat', content.slice(0, 240), beforeProject);
    return json({ project: normalized, messages: [userMessage, result.response], projects: await listProjects(), sideEffect: 'sideEffect' in result ? result.sideEffect : undefined });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && /CHECK constraint failed|transaction_revision_must_match/i.test(error.message)) {
      return json({ error: 'This project changed while the operation was being saved. Nothing was partially written; reload and retry.', conflict: true }, { status: 409 });
    }
    return json({ error: 'I could not apply that change. Your existing project is unchanged.' }, { status: 500 });
  }
}
