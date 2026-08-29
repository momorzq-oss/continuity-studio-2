CREATE TABLE `asset_state_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`asset_stable_id` text NOT NULL,
	`event_type` text NOT NULL,
	`previous_state` text NOT NULL,
	`next_state` text NOT NULL,
	`location_stable_id` text NOT NULL,
	`actor_stable_id` text NOT NULL,
	`notes` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_asset_state_events_project_asset_sequence` ON `asset_state_events` (`project_id`,`asset_stable_id`,`sequence_number`);--> statement-breakpoint
CREATE TABLE `environment_states` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`stable_id` text NOT NULL,
	`location_stable_id` text NOT NULL,
	`active_from_sequence` integer NOT NULL,
	`active_through_sequence` integer NOT NULL,
	`content_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_environment_states_project_stable` ON `environment_states` (`project_id`,`stable_id`);--> statement-breakpoint
CREATE INDEX `idx_environment_states_project_location` ON `environment_states` (`project_id`,`location_stable_id`);--> statement-breakpoint
CREATE TABLE `knowledge_graph_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`edge_id` text NOT NULL,
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`relationship` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_knowledge_graph_project_edge` ON `knowledge_graph_edges` (`project_id`,`edge_id`);--> statement-breakpoint
CREATE INDEX `idx_knowledge_graph_project_from` ON `knowledge_graph_edges` (`project_id`,`from_id`);--> statement-breakpoint
CREATE INDEX `idx_knowledge_graph_project_to` ON `knowledge_graph_edges` (`project_id`,`to_id`);--> statement-breakpoint
CREATE TABLE `reference_coverage` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`asset_stable_id` text NOT NULL,
	`coverage_json` text NOT NULL,
	`reference_count` integer DEFAULT 0 NOT NULL,
	`risk_level` text DEFAULT 'Low' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reference_coverage_project_asset` ON `reference_coverage` (`project_id`,`asset_stable_id`);--> statement-breakpoint
CREATE TABLE `scene_states` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`scene_state_json` text NOT NULL,
	`scene_graph_json` text NOT NULL,
	`asset_manifest_json` text NOT NULL,
	`ending_state_json` text NOT NULL,
	`look_ahead_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_scene_states_project_sequence` ON `scene_states` (`project_id`,`sequence_number`);--> statement-breakpoint
CREATE TABLE `world_bible_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`content_json` text NOT NULL,
	`approval_status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_world_bible_project_version` ON `world_bible_versions` (`project_id`,`version`);--> statement-breakpoint
CREATE TABLE `world_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`stable_id` text NOT NULL,
	`location_type` text NOT NULL,
	`content_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_world_locations_project_stable` ON `world_locations` (`project_id`,`stable_id`);