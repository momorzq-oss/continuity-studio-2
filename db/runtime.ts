import { env } from 'cloudflare:workers';

let initialized = false;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 180,
    sequence_duration_seconds INTEGER NOT NULL DEFAULT 30,
    sequence_count INTEGER NOT NULL DEFAULT 6,
    genre TEXT NOT NULL DEFAULT 'Unspecified',
    story_status TEXT NOT NULL DEFAULT 'Draft',
    film_bible_status TEXT NOT NULL DEFAULT 'Draft',
    asset_status TEXT NOT NULL DEFAULT 'Planning',
    sequence_status TEXT NOT NULL DEFAULT 'Planning',
    continuity_status TEXT NOT NULL DEFAULT 'Not started',
    export_status TEXT NOT NULL DEFAULT 'Not exported',
    pinned INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    state_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_archived_updated ON projects(archived, updated_at)`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_project_created ON chat_messages(project_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS story_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content_json TEXT NOT NULL,
    approval_status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(project_id, version)
  )`,
  `CREATE TABLE IF NOT EXISTS film_bible_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content_json TEXT NOT NULL,
    approval_status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(project_id, version)
  )`,
  `CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stable_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    sequences_json TEXT NOT NULL,
    approval_state TEXT NOT NULL DEFAULT 'Pending',
    lock_state TEXT NOT NULL DEFAULT 'Unlocked',
    current_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, stable_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_assets_project_category ON assets(project_id, category)`,
  `CREATE TABLE IF NOT EXISTS asset_versions (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    description TEXT NOT NULL,
    media_key TEXT,
    approval_state TEXT NOT NULL DEFAULT 'Pending',
    notes TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(asset_id, version)
  )`,
  `CREATE TABLE IF NOT EXISTS asset_references (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
    original_name TEXT NOT NULL,
    media_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'Unassigned reference',
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_asset_references_project ON asset_references(project_id)`,
  `CREATE TABLE IF NOT EXISTS sequences (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stable_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    title TEXT NOT NULL,
    purpose TEXT NOT NULL,
    opening_state TEXT NOT NULL,
    closing_state TEXT NOT NULL,
    continuity_source TEXT,
    status TEXT NOT NULL DEFAULT 'Planned',
    current_version INTEGER NOT NULL DEFAULT 1,
    prompt_text TEXT NOT NULL,
    asset_ids_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, stable_id),
    UNIQUE(project_id, sequence_number)
  )`,
  `CREATE TABLE IF NOT EXISTS sequence_versions (
    id TEXT PRIMARY KEY,
    sequence_id TEXT NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content_json TEXT NOT NULL,
    approval_status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(sequence_id, version)
  )`,
  `CREATE TABLE IF NOT EXISTS sequence_assets (
    sequence_id TEXT NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    UNIQUE(sequence_id, asset_id)
  )`,
  `CREATE TABLE IF NOT EXISTS continuity_states (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    state_json TEXT NOT NULL,
    validation_status TEXT NOT NULL DEFAULT 'Not checked',
    created_at TEXT NOT NULL,
    UNIQUE(project_id, sequence_number)
  )`,
  `CREATE TABLE IF NOT EXISTS continuity_events (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    asset_stable_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    previous_value TEXT,
    next_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_continuity_events_project_sequence ON continuity_events(project_id, sequence_number)`,
  `CREATE TABLE IF NOT EXISTS generation_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version INTEGER NOT NULL,
    reference_files_json TEXT NOT NULL,
    status TEXT NOT NULL,
    failure_message TEXT,
    retry_history_json TEXT NOT NULL DEFAULT '[]',
    started_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_generation_jobs_project_status ON generation_jobs(project_id, status)`,
  `CREATE TABLE IF NOT EXISTS generation_results (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
    media_key TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    display_name TEXT NOT NULL,
    adapter_key TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 0,
    settings_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS export_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    media_key TEXT,
    failure_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_export_jobs_project_created ON export_jobs(project_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS project_settings (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, setting_key)
  )`,
  `CREATE TABLE IF NOT EXISTS world_bible_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content_json TEXT NOT NULL,
    approval_status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(project_id, version)
  )`,
  `CREATE TABLE IF NOT EXISTS world_locations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stable_id TEXT NOT NULL,
    location_type TEXT NOT NULL,
    content_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, stable_id)
  )`,
  `CREATE TABLE IF NOT EXISTS environment_states (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stable_id TEXT NOT NULL,
    location_stable_id TEXT NOT NULL,
    active_from_sequence INTEGER NOT NULL,
    active_through_sequence INTEGER NOT NULL,
    content_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, stable_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_environment_states_project_location ON environment_states(project_id, location_stable_id)`,
  `CREATE TABLE IF NOT EXISTS scene_states (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    scene_state_json TEXT NOT NULL,
    scene_graph_json TEXT NOT NULL,
    asset_manifest_json TEXT NOT NULL,
    ending_state_json TEXT NOT NULL,
    look_ahead_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, sequence_number)
  )`,
  `CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    edge_id TEXT NOT NULL,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    relationship TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, edge_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_knowledge_graph_project_from ON knowledge_graph_edges(project_id, from_id)`,
  `CREATE INDEX IF NOT EXISTS idx_knowledge_graph_project_to ON knowledge_graph_edges(project_id, to_id)`,
  `CREATE TABLE IF NOT EXISTS asset_state_events (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    asset_stable_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    previous_state TEXT NOT NULL,
    next_state TEXT NOT NULL,
    location_stable_id TEXT NOT NULL,
    actor_stable_id TEXT NOT NULL,
    notes TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_asset_state_events_project_asset_sequence ON asset_state_events(project_id, asset_stable_id, sequence_number)`,
  `CREATE TABLE IF NOT EXISTS reference_coverage (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    asset_stable_id TEXT NOT NULL,
    coverage_json TEXT NOT NULL,
    reference_count INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'Low',
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, asset_stable_id)
  )`,
  `PRAGMA optimize`,
] as const;

export async function ensureSchema() {
  if (initialized) return;
  await env.DB.batch(schemaStatements.map((statement) => env.DB.prepare(statement)));
  initialized = true;
}

export function getRuntimeEnv() {
  return env;
}
