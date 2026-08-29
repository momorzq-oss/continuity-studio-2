import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
};

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    durationSeconds: integer('duration_seconds').notNull().default(180),
    sequenceDurationSeconds: integer('sequence_duration_seconds').notNull().default(30),
    sequenceCount: integer('sequence_count').notNull().default(6),
    genre: text('genre').notNull().default('Unspecified'),
    storyStatus: text('story_status').notNull().default('Draft'),
    filmBibleStatus: text('film_bible_status').notNull().default('Draft'),
    assetStatus: text('asset_status').notNull().default('Planning'),
    sequenceStatus: text('sequence_status').notNull().default('Planning'),
    continuityStatus: text('continuity_status').notNull().default('Not started'),
    exportStatus: text('export_status').notNull().default('Not exported'),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    stateJson: text('state_json').notNull(),
    ...timestamps,
  },
  (table) => [
    index('idx_projects_updated_at').on(table.updatedAt),
    index('idx_projects_archived_updated').on(table.archived, table.updatedAt),
  ],
);

export const chatMessages = sqliteTable(
  'chat_messages',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_chat_messages_project_created').on(table.projectId, table.createdAt)],
);

export const storyVersions = sqliteTable(
  'story_versions',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    contentJson: text('content_json').notNull(),
    approvalStatus: text('approval_status').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_story_versions_project_version').on(table.projectId, table.version)],
);

export const filmBibleVersions = sqliteTable(
  'film_bible_versions',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    contentJson: text('content_json').notNull(),
    approvalStatus: text('approval_status').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_film_bible_versions_project_version').on(table.projectId, table.version)],
);

export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    stableId: text('stable_id').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    description: text('description').notNull(),
    sequencesJson: text('sequences_json').notNull(),
    approvalState: text('approval_state').notNull().default('Pending'),
    lockState: text('lock_state').notNull().default('Unlocked'),
    currentVersion: integer('current_version').notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('idx_assets_project_stable_id').on(table.projectId, table.stableId),
    index('idx_assets_project_category').on(table.projectId, table.category),
  ],
);

export const assetVersions = sqliteTable(
  'asset_versions',
  {
    id: text('id').primaryKey(),
    assetId: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    description: text('description').notNull(),
    mediaKey: text('media_key'),
    approvalState: text('approval_state').notNull().default('Pending'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_asset_versions_asset_version').on(table.assetId, table.version)],
);

export const assetReferences = sqliteTable(
  'asset_references',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    assetId: text('asset_id').references(() => assets.id, { onDelete: 'set null' }),
    originalName: text('original_name').notNull(),
    mediaKey: text('media_key').notNull(),
    contentType: text('content_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    role: text('role').notNull().default('Unassigned reference'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_asset_references_project').on(table.projectId)],
);

export const sequences = sqliteTable(
  'sequences',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    stableId: text('stable_id').notNull(),
    sequenceNumber: integer('sequence_number').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    title: text('title').notNull(),
    purpose: text('purpose').notNull(),
    openingState: text('opening_state').notNull(),
    closingState: text('closing_state').notNull(),
    continuitySource: text('continuity_source'),
    status: text('status').notNull().default('Planned'),
    currentVersion: integer('current_version').notNull().default(1),
    promptText: text('prompt_text').notNull(),
    assetIdsJson: text('asset_ids_json').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('idx_sequences_project_stable_id').on(table.projectId, table.stableId),
    uniqueIndex('idx_sequences_project_number').on(table.projectId, table.sequenceNumber),
  ],
);

export const sequenceVersions = sqliteTable(
  'sequence_versions',
  {
    id: text('id').primaryKey(),
    sequenceId: text('sequence_id').notNull().references(() => sequences.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    contentJson: text('content_json').notNull(),
    approvalStatus: text('approval_status').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_sequence_versions_sequence_version').on(table.sequenceId, table.version)],
);

export const sequenceAssets = sqliteTable(
  'sequence_assets',
  {
    sequenceId: text('sequence_id').notNull().references(() => sequences.id, { onDelete: 'cascade' }),
    assetId: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('idx_sequence_assets_pair').on(table.sequenceId, table.assetId)],
);

export const continuityStates = sqliteTable(
  'continuity_states',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    sequenceNumber: integer('sequence_number').notNull(),
    stateJson: text('state_json').notNull(),
    validationStatus: text('validation_status').notNull().default('Not checked'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_continuity_states_project_sequence').on(table.projectId, table.sequenceNumber)],
);

export const continuityEvents = sqliteTable(
  'continuity_events',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    sequenceNumber: integer('sequence_number').notNull(),
    assetStableId: text('asset_stable_id').notNull(),
    fieldName: text('field_name').notNull(),
    previousValue: text('previous_value'),
    nextValue: text('next_value').notNull(),
    reason: text('reason').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_continuity_events_project_sequence').on(table.projectId, table.sequenceNumber)],
);

export const generationJobs = sqliteTable(
  'generation_jobs',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    targetId: text('target_id').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    promptVersion: integer('prompt_version').notNull(),
    referenceFilesJson: text('reference_files_json').notNull(),
    status: text('status').notNull(),
    failureMessage: text('failure_message'),
    retryHistoryJson: text('retry_history_json').notNull().default('[]'),
    startedAt: text('started_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_generation_jobs_project_status').on(table.projectId, table.status)],
);

export const generationResults = sqliteTable('generation_results', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => generationJobs.id, { onDelete: 'cascade' }),
  mediaKey: text('media_key').notNull(),
  metadataJson: text('metadata_json').notNull(),
  createdAt: text('created_at').notNull(),
});

export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  displayName: text('display_name').notNull(),
  adapterKey: text('adapter_key').notNull().unique(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  settingsJson: text('settings_json').notNull().default('{}'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const exportJobs = sqliteTable(
  'export_jobs',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    mediaKey: text('media_key'),
    failureMessage: text('failure_message'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_export_jobs_project_created').on(table.projectId, table.createdAt)],
);

export const projectSettings = sqliteTable(
  'project_settings',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    settingKey: text('setting_key').notNull(),
    valueJson: text('value_json').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('idx_project_settings_project_key').on(table.projectId, table.settingKey)],
);

export const worldBibleVersions = sqliteTable(
  'world_bible_versions',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    contentJson: text('content_json').notNull(),
    approvalStatus: text('approval_status').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_world_bible_project_version').on(table.projectId, table.version)],
);

export const worldLocations = sqliteTable(
  'world_locations',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    stableId: text('stable_id').notNull(),
    locationType: text('location_type').notNull(),
    contentJson: text('content_json').notNull(),
    version: integer('version').notNull().default(1),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('idx_world_locations_project_stable').on(table.projectId, table.stableId)],
);

export const environmentStates = sqliteTable(
  'environment_states',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    stableId: text('stable_id').notNull(),
    locationStableId: text('location_stable_id').notNull(),
    activeFromSequence: integer('active_from_sequence').notNull(),
    activeThroughSequence: integer('active_through_sequence').notNull(),
    contentJson: text('content_json').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_environment_states_project_stable').on(table.projectId, table.stableId),
    index('idx_environment_states_project_location').on(table.projectId, table.locationStableId),
  ],
);

export const sceneStates = sqliteTable(
  'scene_states',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    sequenceNumber: integer('sequence_number').notNull(),
    sceneStateJson: text('scene_state_json').notNull(),
    sceneGraphJson: text('scene_graph_json').notNull(),
    assetManifestJson: text('asset_manifest_json').notNull(),
    endingStateJson: text('ending_state_json').notNull(),
    lookAheadJson: text('look_ahead_json').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('idx_scene_states_project_sequence').on(table.projectId, table.sequenceNumber)],
);

export const knowledgeGraphEdges = sqliteTable(
  'knowledge_graph_edges',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    edgeId: text('edge_id').notNull(),
    fromId: text('from_id').notNull(),
    toId: text('to_id').notNull(),
    relationship: text('relationship').notNull(),
    sequenceNumber: integer('sequence_number').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_knowledge_graph_project_edge').on(table.projectId, table.edgeId),
    index('idx_knowledge_graph_project_from').on(table.projectId, table.fromId),
    index('idx_knowledge_graph_project_to').on(table.projectId, table.toId),
  ],
);

export const assetStateEvents = sqliteTable(
  'asset_state_events',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    sequenceNumber: integer('sequence_number').notNull(),
    assetStableId: text('asset_stable_id').notNull(),
    eventType: text('event_type').notNull(),
    previousState: text('previous_state').notNull(),
    nextState: text('next_state').notNull(),
    locationStableId: text('location_stable_id').notNull(),
    actorStableId: text('actor_stable_id').notNull(),
    notes: text('notes').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_asset_state_events_project_asset_sequence').on(table.projectId, table.assetStableId, table.sequenceNumber),
  ],
);

export const referenceCoverage = sqliteTable(
  'reference_coverage',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    assetStableId: text('asset_stable_id').notNull(),
    coverageJson: text('coverage_json').notNull(),
    referenceCount: integer('reference_count').notNull().default(0),
    riskLevel: text('risk_level').notNull().default('Low'),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('idx_reference_coverage_project_asset').on(table.projectId, table.assetStableId)],
);
