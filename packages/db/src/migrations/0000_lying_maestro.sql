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