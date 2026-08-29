import { ensureSchema, getRuntimeEnv } from '@/db/runtime';
import {
  createProjectFromIdea,
  interpretStudioMessage,
  nowIso,
  summarizeProject,
  type ProjectSummary,
  type StudioMessage,
  type StudioProject,
} from '@/lib/studio';

export const runtime = 'edge';

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) },
  });
}

async function loadProject(projectId: string) {
  const { DB } = getRuntimeEnv();
  const row = await DB.prepare('SELECT state_json FROM projects WHERE id = ? AND archived = 0')
    .bind(projectId)
    .first<{ state_json: string }>();
  return row ? (JSON.parse(row.state_json) as StudioProject) : null;
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
  return rows.results.map((row) => summarizeProject(JSON.parse(row.state_json) as StudioProject));
}

function messageInsert(projectId: string, item: StudioMessage) {
  const { DB } = getRuntimeEnv();
  return DB.prepare(
    'INSERT INTO chat_messages (id, project_id, role, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(item.id, projectId, item.role, item.content, item.metadata ? JSON.stringify(item.metadata) : null, item.createdAt);
}

async function createProjectGraph(project: StudioProject, messages: StudioMessage[]) {
  const { DB } = getRuntimeEnv();
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
    DB.prepare('INSERT INTO story_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), project.id, project.story.version, JSON.stringify(project.story), project.story.status, project.createdAt),
    DB.prepare('INSERT INTO film_bible_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), project.id, project.filmBible.version, JSON.stringify(project.filmBible), project.filmBible.status, project.createdAt),
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
  await DB.batch(statements);
}

async function persistProject(project: StudioProject, messages: StudioMessage[]) {
  const { DB } = getRuntimeEnv();
  const statements: D1PreparedStatement[] = [
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
    DB.prepare('INSERT OR IGNORE INTO story_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), project.id, project.story.version, JSON.stringify(project.story), project.story.status, project.updatedAt),
    DB.prepare('INSERT OR IGNORE INTO film_bible_versions (id, project_id, version, content_json, approval_status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), project.id, project.filmBible.version, JSON.stringify(project.filmBible), project.filmBible.status, project.updatedAt),
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

  await DB.batch(statements);
}

function initialAssistantMessage(project: StudioProject): StudioMessage {
  return {
    id: `message_${crypto.randomUUID()}`,
    role: 'assistant',
    createdAt: nowIso(),
    content: `I created “${project.title}” as a real ${project.durationSeconds / 60}-minute project with ${project.sequenceCount} sequences. The story draft and ${project.assets.length}-asset manifest are ready. Review the story first; nothing has been generated or approved yet.`,
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

    if (body.action === 'pin' || body.action === 'archive' || body.action === 'settings') {
      if (body.action === 'pin') project.pinned = !project.pinned;
      if (body.action === 'archive') project.archived = true;
      if (body.action === 'settings' && body.settings) project.settings = { ...project.settings, ...body.settings };
      project.updatedAt = nowIso();
      await persistProject(project, []);
      return json({ project, projects: await listProjects() });
    }

    const content = body.message?.trim();
    if (!content) return json({ error: 'Write an instruction for the studio.' }, { status: 400 });
    const userMessage: StudioMessage = { id: `message_${crypto.randomUUID()}`, role: 'user', content, createdAt: nowIso() };
    const result = interpretStudioMessage(project, content);
    await persistProject(result.project, [userMessage, result.response]);
    return json({ project: result.project, messages: [userMessage, result.response], projects: await listProjects(), sideEffect: result.sideEffect });
  } catch (error) {
    console.error(error);
    return json({ error: 'I could not apply that change. Your existing project is unchanged.' }, { status: 500 });
  }
}
