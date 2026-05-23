CREATE TABLE `completions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`child_id` text NOT NULL,
	`occurrence_date` text,
	`completed_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`duration_minutes` integer,
	`score` integer,
	`attempts` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`meta` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `completions_task_id_idx` ON `completions` (`task_id`);--> statement-breakpoint
CREATE INDEX `completions_child_id_idx` ON `completions` (`child_id`);--> statement-breakpoint
CREATE INDEX `completions_occurrence_idx` ON `completions` (`task_id`,`occurrence_date`);--> statement-breakpoint
CREATE TABLE `recurrence_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`occurrence_date` text NOT NULL,
	`action` text NOT NULL,
	`overrides` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recurrence_exceptions_task_date_idx` ON `recurrence_exceptions` (`task_id`,`occurrence_date`);--> statement-breakpoint
CREATE TABLE `subtasks` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`is_done` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subtasks_task_id_idx` ON `subtasks` (`task_id`);--> statement-breakpoint
CREATE TABLE `task_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_collections_parent_id_idx` ON `task_collections` (`parent_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text NOT NULL,
	`child_id` text NOT NULL,
	`collection_id` text,
	`title` text NOT NULL,
	`description` text,
	`kind` text DEFAULT 'generic' NOT NULL,
	`settings` text,
	`scheduled_date` text,
	`duration_minutes` integer,
	`is_recurring` integer DEFAULT false NOT NULL,
	`recurrence_rule` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_id`) REFERENCES `task_collections`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_parent_child_idx` ON `tasks` (`parent_id`,`child_id`);--> statement-breakpoint
CREATE INDEX `tasks_child_scheduled_idx` ON `tasks` (`child_id`,`scheduled_date`);--> statement-breakpoint
CREATE INDEX `tasks_is_recurring_idx` ON `tasks` (`is_recurring`);--> statement-breakpoint
CREATE INDEX `tasks_collection_idx` ON `tasks` (`collection_id`);