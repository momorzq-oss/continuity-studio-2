CREATE TABLE `continuity_handoffs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sequence_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`candidate_id` text NOT NULL,
	`approved_video_key` text,
	`ending_frames_json` text NOT NULL,
	`continuation_frames_json` text NOT NULL,
	`ending_latent_key` text,
	`audio_context_key` text,
	`handoff_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_continuity_handoffs_project_sequence_candidate` ON `continuity_handoffs` (`project_id`,`sequence_number`,`candidate_id`);--> statement-breakpoint
CREATE TABLE `generation_provenance` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sequence_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`workflow_checksum` text NOT NULL,
	`model_version` text NOT NULL,
	`backend_versions_json` text NOT NULL,
	`provenance_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_generation_provenance_project_candidate` ON `generation_provenance` (`project_id`,`candidate_id`);--> statement-breakpoint
CREATE TABLE `local_runtime_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sequence_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`candidate_id` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`provider` text NOT NULL,
	`model_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`workflow_version` text NOT NULL,
	`workflow_checksum` text NOT NULL,
	`immutable_snapshot_json` text NOT NULL,
	`result_json` text DEFAULT '{}' NOT NULL,
	`failure_message` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_local_runtime_jobs_project_status` ON `local_runtime_jobs` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_local_runtime_jobs_project_sequence` ON `local_runtime_jobs` (`project_id`,`sequence_number`);--> statement-breakpoint
CREATE TABLE `provider_translations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sequence_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`provider` text NOT NULL,
	`mode` text NOT NULL,
	`source_intention_hash` text NOT NULL,
	`compiled_prompt` text NOT NULL,
	`reference_mapping_json` text NOT NULL,
	`warnings_json` text NOT NULL,
	`compiled_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_provider_translations_project_sequence_provider` ON `provider_translations` (`project_id`,`sequence_id`,`provider`);--> statement-breakpoint
CREATE TABLE `reference_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`reference_id` text NOT NULL,
	`active_sequence_numbers_json` text NOT NULL,
	`schedule_source` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reference_id`) REFERENCES `stable_references`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reference_schedules_project_reference` ON `reference_schedules` (`project_id`,`reference_id`);--> statement-breakpoint
CREATE TABLE `sequence_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sequence_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`generation_snapshot_id` text NOT NULL,
	`status` text NOT NULL,
	`media_key` text,
	`poster_key` text,
	`seed` integer NOT NULL,
	`correction_scope` text,
	`validation_report_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sequence_candidates_project_sequence` ON `sequence_candidates` (`project_id`,`sequence_number`,`status`);--> statement-breakpoint
CREATE TABLE `stable_references` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`stable_tag` text NOT NULL,
	`reference_kind` text NOT NULL,
	`reference_role` text NOT NULL,
	`asset_stable_id` text,
	`asset_number` integer,
	`source_identifier` text NOT NULL,
	`approved_version` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_stable_references_project_tag` ON `stable_references` (`project_id`,`stable_tag`);--> statement-breakpoint
CREATE INDEX `idx_stable_references_project_asset` ON `stable_references` (`project_id`,`asset_stable_id`);--> statement-breakpoint
CREATE TABLE `storyboard_panels` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`board_id` text NOT NULL,
	`panel_label` text NOT NULL,
	`sequence_id` text,
	`sequence_number` integer,
	`version` integer NOT NULL,
	`approval_state` text NOT NULL,
	`generated_media_key` text,
	`content_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_storyboard_panels_project_board_label` ON `storyboard_panels` (`project_id`,`board_id`,`panel_label`);--> statement-breakpoint
CREATE INDEX `idx_storyboard_panels_sequence` ON `storyboard_panels` (`project_id`,`sequence_number`);--> statement-breakpoint
CREATE TABLE `workflow_pins` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`workflow_version` text NOT NULL,
	`checksum_sha256` text NOT NULL,
	`source` text NOT NULL,
	`compatibility_status` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workflow_pins_project_workflow` ON `workflow_pins` (`project_id`,`workflow_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`duration_seconds` integer DEFAULT 180 NOT NULL,
	`sequence_duration_seconds` integer DEFAULT 30 NOT NULL,
	`sequence_count` integer DEFAULT 6 NOT NULL,
	`genre` text DEFAULT 'Unspecified' NOT NULL,
	`story_status` text DEFAULT 'Draft' NOT NULL,
	`film_bible_status` text DEFAULT 'Draft' NOT NULL,
	`asset_status` text DEFAULT 'Planning' NOT NULL,
	`sequence_status` text DEFAULT 'Planning' NOT NULL,
	`continuity_status` text DEFAULT 'Not started' NOT NULL,
	`export_status` text DEFAULT 'Not exported' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`data_schema_version` integer DEFAULT 5 NOT NULL,
	`lifecycle_state` text DEFAULT 'Story Draft' NOT NULL,
	`export_identity` text DEFAULT '' NOT NULL,
	`state_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "title", "duration_seconds", "sequence_duration_seconds", "sequence_count", "genre", "story_status", "film_bible_status", "asset_status", "sequence_status", "continuity_status", "export_status", "pinned", "archived", "data_schema_version", "lifecycle_state", "export_identity", "state_json", "created_at", "updated_at") SELECT "id", "title", "duration_seconds", "sequence_duration_seconds", "sequence_count", "genre", "story_status", "film_bible_status", "asset_status", "sequence_status", "continuity_status", "export_status", "pinned", "archived", "data_schema_version", "lifecycle_state", "export_identity", "state_json", "created_at", "updated_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_projects_updated_at` ON `projects` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_projects_archived_updated` ON `projects` (`archived`,`updated_at`);