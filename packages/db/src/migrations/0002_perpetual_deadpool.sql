CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`completion_id` text,
	`uploader_user_id` text,
	`uploader_child_id` text,
	`kind` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size_bytes` integer NOT NULL,
	`original_filename` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`completion_id`) REFERENCES `completions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `attachments_task_id_idx` ON `attachments` (`task_id`);--> statement-breakpoint
CREATE INDEX `attachments_completion_idx` ON `attachments` (`completion_id`);--> statement-breakpoint
CREATE TABLE `task_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`child_id` text NOT NULL,
	`occurrence_date` text,
	`state` text DEFAULT 'active' NOT NULL,
	`payload` text,
	`started_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`ended_at` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_sessions_task_child_idx` ON `task_sessions` (`task_id`,`child_id`);--> statement-breakpoint
CREATE INDEX `task_sessions_active_idx` ON `task_sessions` (`state`);