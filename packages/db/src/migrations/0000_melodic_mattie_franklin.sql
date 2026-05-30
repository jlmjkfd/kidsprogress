CREATE TABLE `auth_events` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`family_id` text,
	`actor` text,
	`kind` text NOT NULL,
	`outcome` text NOT NULL,
	`reason` text,
	`ip` text,
	`user_agent` text
);
--> statement-breakpoint
CREATE INDEX `auth_events_at_idx` ON `auth_events` (`at`);--> statement-breakpoint
CREATE INDEX `auth_events_family_idx` ON `auth_events` (`family_id`);--> statement-breakpoint
CREATE INDEX `auth_events_kind_idx` ON `auth_events` (`kind`);--> statement-breakpoint
CREATE TABLE `children` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_key` text DEFAULT 'avatar-01' NOT NULL,
	`birth_year` integer,
	`pin_required` integer DEFAULT false NOT NULL,
	`pin_hash` text,
	`failed_pin_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`pin_reset_code_hash` text,
	`pin_reset_code_expires_at` text,
	`daily_ai_token_cap` integer DEFAULT 5000 NOT NULL,
	`streak_opt_in` integer DEFAULT false NOT NULL,
	`archived_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `children_family_idx` ON `children` (`family_id`);--> statement-breakpoint
CREATE TABLE `device_children` (
	`device_id` text NOT NULL,
	`child_id` text NOT NULL,
	`attached_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	PRIMARY KEY(`device_id`, `child_id`),
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `device_children_child_idx` ON `device_children` (`child_id`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`label` text NOT NULL,
	`registered_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`last_used_at` text,
	`revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_token_hash_unique` ON `devices` (`token_hash`);--> statement-breakpoint
CREATE INDEX `devices_family_idx` ON `devices` (`family_id`);--> statement-breakpoint
CREATE TABLE `recurrence_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`occurrence_date` text NOT NULL,
	`action` text NOT NULL,
	`rescheduled_to` text,
	`override_patch` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `task_assignments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recurrence_exceptions_unique` ON `recurrence_exceptions` (`assignment_id`,`occurrence_date`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_kind` text NOT NULL,
	`subject_id` text NOT NULL,
	`device_id` text,
	`token_hash` text NOT NULL,
	`issued_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`revoked_reason` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_hash_unique` ON `refresh_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_subject_idx` ON `refresh_tokens` (`subject_kind`,`subject_id`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_device_idx` ON `refresh_tokens` (`device_id`);--> statement-breakpoint
CREATE TABLE `task_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`child_id` text NOT NULL,
	`parent_id` text NOT NULL,
	`rrule` text,
	`timezone` text NOT NULL,
	`effective_from` text NOT NULL,
	`effective_until` text,
	`replaces_assignment_id` text,
	`replaced_by_assignment_id` text,
	`scheduling_type` text DEFAULT 'flexible' NOT NULL,
	`preferred_start_time` text,
	`preferred_end_time` text,
	`obligation` text DEFAULT 'required' NOT NULL,
	`duration_minutes` integer,
	`required_attempts` integer,
	`max_attempts_per_occurrence` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `task_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_assignments_template_idx` ON `task_assignments` (`template_id`);--> statement-breakpoint
CREATE INDEX `task_assignments_child_idx` ON `task_assignments` (`child_id`);--> statement-breakpoint
CREATE INDEX `task_assignments_parent_idx` ON `task_assignments` (`parent_id`);--> statement-breakpoint
CREATE INDEX `task_assignments_history_idx` ON `task_assignments` (`replaces_assignment_id`);--> statement-breakpoint
CREATE TABLE `task_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`template_id` text NOT NULL,
	`child_id` text NOT NULL,
	`occurrence_date` text NOT NULL,
	`original_date` text NOT NULL,
	`effective_title` text NOT NULL,
	`effective_description` text,
	`effective_preferred_time` text,
	`effective_duration_minutes` integer,
	`effective_scheduling_type` text NOT NULL,
	`effective_obligation` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attached_tool_ids` text DEFAULT (json('[]')) NOT NULL,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `task_assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `task_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_instances_occurrence_unique` ON `task_instances` (`assignment_id`,`original_date`);--> statement-breakpoint
CREATE INDEX `task_instances_child_date_idx` ON `task_instances` (`child_id`,`occurrence_date`);--> statement-breakpoint
CREATE INDEX `task_instances_status_idx` ON `task_instances` (`status`);--> statement-breakpoint
CREATE TABLE `task_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`instance_id` text NOT NULL,
	`child_id` text NOT NULL,
	`plugin_version` integer NOT NULL,
	`progress_state` text NOT NULL,
	`last_saved_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`instance_id`) REFERENCES `task_instances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_sessions_instance_idx` ON `task_sessions` (`instance_id`);--> statement-breakpoint
CREATE INDEX `task_sessions_child_idx` ON `task_sessions` (`child_id`);--> statement-breakpoint
CREATE TABLE `task_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text NOT NULL,
	`handler_id` text NOT NULL,
	`schema_version` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category_path` text,
	`tags` text DEFAULT (json('[]')) NOT NULL,
	`config` text NOT NULL,
	`ai_assist_enabled` integer DEFAULT false NOT NULL,
	`plugin_version` integer DEFAULT 1 NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`default_duration_minutes` integer,
	`default_required_attempts` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_templates_parent_idx` ON `task_templates` (`parent_id`);--> statement-breakpoint
CREATE INDEX `task_templates_handler_idx` ON `task_templates` (`handler_id`,`schema_version`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`parent_portal_pin_hash` text,
	`locale` text DEFAULT 'en' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_family_idx` ON `users` (`family_id`);