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
    data_schema_version INTEGER NOT NULL DEFAULT 4,
    lifecycle_state TEXT NOT NULL DEFAULT 'Story Draft',
    export_identity TEXT NOT NULL DEFAULT '',
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
    lifecycle_status TEXT NOT NULL DEFAULT 'Active',
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
    reference_roles_json TEXT NOT NULL DEFAULT '[]',
    role_overrides_json TEXT NOT NULL DEFAULT '[]',
    excluded_traits_json TEXT NOT NULL DEFAULT '[]',
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
    model_version TEXT NOT NULL DEFAULT 'unconfigured',
    capability_revision TEXT NOT NULL DEFAULT 'unverified-1',
    idempotency_key TEXT NOT NULL DEFAULT '',
    queue_position INTEGER NOT NULL DEFAULT 0,
    submission_token TEXT,
    provider_request_id TEXT,
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
  `CREATE TABLE IF NOT EXISTS production_records (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL,
    stable_key TEXT NOT NULL,
    status TEXT NOT NULL,
    sequence_number INTEGER,
    content_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, record_type, stable_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_production_records_project_type_status ON production_records(project_id, record_type, status)`,
  `CREATE INDEX IF NOT EXISTS idx_production_records_project_sequence ON production_records(project_id, sequence_number)`,
  `CREATE TABLE IF NOT EXISTS project_recovery_snapshots (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    state_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_project_recovery_project_created ON project_recovery_snapshots(project_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS project_transactions (
    project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL DEFAULT 0,
    last_transaction_id TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `INSERT OR IGNORE INTO project_transactions (project_id, revision, last_transaction_id, updated_at)
    SELECT id, 0, 'schema-bootstrap', updated_at FROM projects`,
  `CREATE TABLE IF NOT EXISTS transaction_guards (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    revision_ok INTEGER NOT NULL CHECK(revision_ok = 1),
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_transaction_guards_project ON transaction_guards(project_id)`,
  `CREATE TABLE IF NOT EXISTS operation_locks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    owner_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(project_id, scope)
  )`,
  `CREATE TABLE IF NOT EXISTS production_change_log (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL,
    scope TEXT NOT NULL,
    summary TEXT NOT NULL,
    before_snapshot_id TEXT,
    after_state_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_change_log_project_revision ON production_change_log(project_id, revision)`,
  `CREATE TABLE IF NOT EXISTS file_integrity (
    reference_id TEXT PRIMARY KEY REFERENCES asset_references(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    fingerprint_sha256 TEXT NOT NULL,
    preview_media_key TEXT,
    preview_kind TEXT NOT NULL DEFAULT 'none',
    integrity_status TEXT NOT NULL DEFAULT 'Original',
    verified_at TEXT NOT NULL,
    UNIQUE(project_id, fingerprint_sha256)
  )`,
  `CREATE TABLE IF NOT EXISTS project_imports (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    import_kind TEXT NOT NULL,
    source_name TEXT NOT NULL,
    fingerprint_sha256 TEXT,
    manifest_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_project_imports_project_created ON project_imports(project_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS media_checksums (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    media_key TEXT NOT NULL,
    media_kind TEXT NOT NULL,
    fingerprint_sha256 TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    integrity_status TEXT NOT NULL,
    verified_at TEXT NOT NULL,
    UNIQUE(project_id, media_key)
  )`,
  `CREATE TABLE IF NOT EXISTS reserved_numbers (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    number INTEGER NOT NULL,
    stable_id TEXT NOT NULL,
    status TEXT NOT NULL,
    reserved_at TEXT NOT NULL,
    UNIQUE(project_id, kind, number)
  )`,
  `CREATE TABLE IF NOT EXISTS final_sequence_sources (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    result_media_key TEXT NOT NULL,
    provenance_json TEXT NOT NULL,
    approved_at TEXT NOT NULL,
    UNIQUE(project_id, sequence_number)
  )`,
  `CREATE TABLE IF NOT EXISTS provider_capability_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL,
    revision TEXT NOT NULL,
    capability_json TEXT NOT NULL,
    refreshed_at TEXT NOT NULL,
    UNIQUE(project_id, profile_id, revision)
  )`,
  `CREATE TABLE IF NOT EXISTS project_control_state (
    project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    data_schema_version INTEGER NOT NULL,
    lifecycle_state TEXT NOT NULL,
    control_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS generation_idempotency (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL,
    job_id TEXT NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
    provider_request_id TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, idempotency_key)
  )`,
  `CREATE TABLE IF NOT EXISTS decision_pins (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    value_json TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    released_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_decision_pins_project_target ON decision_pins(project_id, target_type, target_id)`,
  `CREATE TABLE IF NOT EXISTS storage_cleanup_log (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    removed_json TEXT NOT NULL,
    protected_original_count INTEGER NOT NULL,
    protected_approved_count INTEGER NOT NULL,
    bytes_before INTEGER NOT NULL,
    bytes_after INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_storage_cleanup_project_created ON storage_cleanup_log(project_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS import_mapping_reviews (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    fingerprint_sha256 TEXT NOT NULL UNIQUE,
    mapping_json TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    approved_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS archive_verifications (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    expected_file_count INTEGER NOT NULL,
    verified_file_count INTEGER NOT NULL,
    status TEXT NOT NULL,
    manifest_hash TEXT NOT NULL,
    verified_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_archive_verifications_project ON archive_verifications(project_id, verified_at)`,
  `PRAGMA optimize`,
] as const;

export async function ensureSchema() {
  if (initialized) return;
  await env.DB.batch(schemaStatements.map((statement) => env.DB.prepare(statement)));
  const ensureColumn = async (table: string, column: string, definition: string) => {
    const columns = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
    if (!columns.results.some((item) => item.name === column)) await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  };
  await ensureColumn('projects', 'data_schema_version', 'INTEGER NOT NULL DEFAULT 4');
  await ensureColumn('projects', 'lifecycle_state', "TEXT NOT NULL DEFAULT 'Story Draft'");
  await ensureColumn('projects', 'export_identity', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn('assets', 'lifecycle_status', "TEXT NOT NULL DEFAULT 'Active'");
  await ensureColumn('asset_references', 'reference_roles_json', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn('asset_references', 'role_overrides_json', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn('asset_references', 'excluded_traits_json', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn('generation_jobs', 'model_version', "TEXT NOT NULL DEFAULT 'unconfigured'");
  await ensureColumn('generation_jobs', 'capability_revision', "TEXT NOT NULL DEFAULT 'unverified-1'");
  await ensureColumn('generation_jobs', 'idempotency_key', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn('generation_jobs', 'queue_position', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('generation_jobs', 'submission_token', 'TEXT');
  await ensureColumn('generation_jobs', 'provider_request_id', 'TEXT');
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_generation_jobs_project_idempotency ON generation_jobs(project_id, idempotency_key)').run();
  await env.DB.prepare('PRAGMA optimize').run();
  initialized = true;
}

export function getRuntimeEnv() {
  return env;
}
