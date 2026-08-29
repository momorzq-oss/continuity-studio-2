CREATE TABLE `asset_references` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`asset_id` text,
	`original_name` text NOT NULL,
	`media_key` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`role` text DEFAULT 'Unassigned reference' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_asset_references_project` ON `asset_references` (`project_id`);--> statement-breakpoint
CREATE TABLE `asset_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`version` integer NOT NULL,
	`description` text NOT NULL,
	`media_key` text,
	`approval_state` text DEFAULT 'Pending' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_asset_versions_asset_version` ON `asset_versions` (`asset_id`,`version`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`stable_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`sequences_json` text NOT NULL,
	`approval_state` text DEFAULT 'Pending' NOT NULL,
	`lock_state` text DEFAULT 'Unlocked' NOT NULL,
	`current_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assets_project_stable_id` ON `assets` (`project_id`,`stable_id`);--> statement-breakpoint
CREATE INDEX `idx_assets_project_category` ON `assets` (`project_id`,`category`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`metadata_json` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chat_messages_project_created` ON `chat_messages` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `continuity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`asset_stable_id` text NOT NULL,
	`field_name` text NOT NULL,
	`previous_value` text,
	`next_value` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_continuity_events_project_sequence` ON `continuity_events` (`project_id`,`sequence_number`);--> statement-breakpoint
CREATE TABLE `continuity_states` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`state_json` text NOT NULL,
	`validation_status` text DEFAULT 'Not checked' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_continuity_states_project_sequence` ON `continuity_states` (`project_id`,`sequence_number`);--> statement-breakpoint
CREATE TABLE `export_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`status` text NOT NULL,
	`media_key` text,
	`failure_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_export_jobs_project_created` ON `export_jobs` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `film_bible_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`content_json` text NOT NULL,
	`approval_status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_film_bible_versions_project_version` ON `film_bible_versions` (`project_id`,`version`);--> statement-breakpoint
CREATE TABLE `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`target_id` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` integer NOT NULL,
	`reference_files_json` text NOT NULL,
	`status` text NOT NULL,
	`failure_message` text,
	`retry_history_json` text DEFAULT '[]' NOT NULL,
	`started_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_generation_jobs_project_status` ON `generation_jobs` (`project_id`,`status`);--> statement-breakpoint
CREATE TABLE `generation_results` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`media_key` text NOT NULL,
	`metadata_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `generation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`setting_key` text NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_project_settings_project_key` ON `project_settings` (`project_id`,`setting_key`);--> statement-breakpoint
CREATE TABLE `projects` (
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
	`state_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_projects_updated_at` ON `projects` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_projects_archived_updated` ON `projects` (`archived`,`updated_at`);--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`display_name` text NOT NULL,
	`adapter_key` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`settings_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `providers_adapter_key_unique` ON `providers` (`adapter_key`);--> statement-breakpoint
CREATE TABLE `sequence_assets` (
	`sequence_id` text NOT NULL,
	`asset_id` text NOT NULL,
	FOREIGN KEY (`sequence_id`) REFERENCES `sequences`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sequence_assets_pair` ON `sequence_assets` (`sequence_id`,`asset_id`);--> statement-breakpoint
CREATE TABLE `sequence_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`sequence_id` text NOT NULL,
	`version` integer NOT NULL,
	`content_json` text NOT NULL,
	`approval_status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`sequence_id`) REFERENCES `sequences`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sequence_versions_sequence_version` ON `sequence_versions` (`sequence_id`,`version`);--> statement-breakpoint
CREATE TABLE `sequences` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`stable_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`title` text NOT NULL,
	`purpose` text NOT NULL,
	`opening_state` text NOT NULL,
	`closing_state` text NOT NULL,
	`continuity_source` text,
	`status` text DEFAULT 'Planned' NOT NULL,
	`current_version` integer DEFAULT 1 NOT NULL,
	`prompt_text` text NOT NULL,
	`asset_ids_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sequences_project_stable_id` ON `sequences` (`project_id`,`stable_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sequences_project_number` ON `sequences` (`project_id`,`sequence_number`);--> statement-breakpoint
CREATE TABLE `story_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`content_json` text NOT NULL,
	`approval_status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_story_versions_project_version` ON `story_versions` (`project_id`,`version`);