CREATE TABLE `production_records` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`record_type` text NOT NULL,
	`stable_key` text NOT NULL,
	`status` text NOT NULL,
	`sequence_number` integer,
	`content_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_production_records_project_type_key` ON `production_records` (`project_id`,`record_type`,`stable_key`);--> statement-breakpoint
CREATE INDEX `idx_production_records_project_type_status` ON `production_records` (`project_id`,`record_type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_production_records_project_sequence` ON `production_records` (`project_id`,`sequence_number`);--> statement-breakpoint
CREATE TABLE `project_recovery_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`reason` text NOT NULL,
	`state_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_project_recovery_project_created` ON `project_recovery_snapshots` (`project_id`,`created_at`);