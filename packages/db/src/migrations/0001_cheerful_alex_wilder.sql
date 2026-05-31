CREATE TABLE `llm_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`child_id` text NOT NULL,
	`instance_id` text,
	`feature` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`completion_tokens` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	`latency_ms` integer,
	`finish_reason` text,
	`error` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `llm_logs_child_at_idx` ON `llm_logs` (`child_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `llm_logs_family_idx` ON `llm_logs` (`family_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `ai_features_enabled` integer DEFAULT false NOT NULL;