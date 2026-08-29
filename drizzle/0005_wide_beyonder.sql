CREATE TABLE `media_checksums` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`media_key` text NOT NULL,
	`media_kind` text NOT NULL,
	`fingerprint_sha256` text NOT NULL,
	`byte_size` integer NOT NULL,
	`integrity_status` text NOT NULL,
	`verified_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_checksums_project_key` ON `media_checksums` (`project_id`,`media_key`);