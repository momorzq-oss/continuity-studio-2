CREATE TABLE `file_integrity` (
	`reference_id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`fingerprint_sha256` text NOT NULL,
	`preview_media_key` text,
	`preview_kind` text DEFAULT 'none' NOT NULL,
	`integrity_status` text DEFAULT 'Original' NOT NULL,
	`verified_at` text NOT NULL,
	FOREIGN KEY (`reference_id`) REFERENCES `asset_references`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_file_integrity_project_fingerprint` ON `file_integrity` (`project_id`,`fingerprint_sha256`);--> statement-breakpoint
CREATE TABLE `final_sequence_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`sequence_number` integer NOT NULL,
	`result_media_key` text NOT NULL,
	`provenance_json` text NOT NULL,
	`approved_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_final_sources_project_sequence` ON `final_sequence_sources` (`project_id`,`sequence_number`);--> statement-breakpoint
CREATE TABLE `operation_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`scope` text NOT NULL,
	`owner_token` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_operation_locks_project_scope` ON `operation_locks` (`project_id`,`scope`);--> statement-breakpoint
CREATE TABLE `production_change_log` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`revision` integer NOT NULL,
	`scope` text NOT NULL,
	`summary` text NOT NULL,
	`before_snapshot_id` text,
	`after_state_hash` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_change_log_project_revision` ON `production_change_log` (`project_id`,`revision`);--> statement-breakpoint
CREATE TABLE `project_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`import_kind` text NOT NULL,
	`source_name` text NOT NULL,
	`fingerprint_sha256` text,
	`manifest_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_project_imports_project_created` ON `project_imports` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `project_transactions` (
	`project_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`last_transaction_id` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `provider_capability_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`revision` text NOT NULL,
	`capability_json` text NOT NULL,
	`refreshed_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_provider_capability_project_profile_revision` ON `provider_capability_versions` (`project_id`,`profile_id`,`revision`);--> statement-breakpoint
CREATE TABLE `reserved_numbers` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`number` integer NOT NULL,
	`stable_id` text NOT NULL,
	`status` text NOT NULL,
	`reserved_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reserved_numbers_project_kind_number` ON `reserved_numbers` (`project_id`,`kind`,`number`);--> statement-breakpoint
CREATE TABLE `transaction_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`revision_ok` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "transaction_revision_must_match" CHECK("transaction_guards"."revision_ok" = 1)
);
--> statement-breakpoint
CREATE INDEX `idx_transaction_guards_project` ON `transaction_guards` (`project_id`);