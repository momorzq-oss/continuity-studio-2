CREATE TABLE `archive_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`expected_file_count` integer NOT NULL,
	`verified_file_count` integer NOT NULL,
	`status` text NOT NULL,
	`manifest_hash` text NOT NULL,
	`verified_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_archive_verifications_project` ON `archive_verifications` (`project_id`,`verified_at`);--> statement-breakpoint
CREATE TABLE `decision_pins` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`field_name` text NOT NULL,
	`value_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`released_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_decision_pins_project_target` ON `decision_pins` (`project_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `generation_idempotency` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`job_id` text NOT NULL,
	`provider_request_id` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `generation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_generation_idempotency_project_key` ON `generation_idempotency` (`project_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `import_mapping_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`source_name` text NOT NULL,
	`fingerprint_sha256` text NOT NULL,
	`mapping_json` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`approved_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_import_mapping_fingerprint` ON `import_mapping_reviews` (`fingerprint_sha256`);--> statement-breakpoint
CREATE TABLE `project_control_state` (
	`project_id` text PRIMARY KEY NOT NULL,
	`data_schema_version` integer NOT NULL,
	`lifecycle_state` text NOT NULL,
	`control_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `storage_cleanup_log` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`removed_json` text NOT NULL,
	`protected_original_count` integer NOT NULL,
	`protected_approved_count` integer NOT NULL,
	`bytes_before` integer NOT NULL,
	`bytes_after` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_storage_cleanup_project_created` ON `storage_cleanup_log` (`project_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `asset_references` ADD `reference_roles_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `asset_references` ADD `role_overrides_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `asset_references` ADD `excluded_traits_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `lifecycle_status` text DEFAULT 'Active' NOT NULL;--> statement-breakpoint
ALTER TABLE `generation_jobs` ADD `model_version` text DEFAULT 'unconfigured' NOT NULL;--> statement-breakpoint
ALTER TABLE `generation_jobs` ADD `capability_revision` text DEFAULT 'unverified-1' NOT NULL;--> statement-breakpoint
ALTER TABLE `generation_jobs` ADD `idempotency_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `generation_jobs` ADD `queue_position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `generation_jobs` ADD `submission_token` text;--> statement-breakpoint
ALTER TABLE `generation_jobs` ADD `provider_request_id` text;--> statement-breakpoint
CREATE INDEX `idx_generation_jobs_project_idempotency` ON `generation_jobs` (`project_id`,`idempotency_key`);--> statement-breakpoint
ALTER TABLE `projects` ADD `data_schema_version` integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `lifecycle_state` text DEFAULT 'Story Draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `export_identity` text DEFAULT '' NOT NULL;