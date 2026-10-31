CREATE TABLE `community_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`session_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_profiles_name_key_unique` ON `community_profiles` (`name_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `community_profiles_session_hash_unique` ON `community_profiles` (`session_hash`);--> statement-breakpoint
CREATE TABLE `community_rate_buckets` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `community_rate_expiry` ON `community_rate_buckets` (`expires_at`);--> statement-breakpoint
CREATE TABLE `community_scores` (
	`profile_id` text NOT NULL,
	`level_key` text NOT NULL,
	`chapter_id` text,
	`daily_key` text,
	`revision` integer NOT NULL,
	`stars` integer NOT NULL,
	`best_moves` integer,
	`hints` integer,
	`best_unassisted_moves` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`profile_id`, `level_key`),
	FOREIGN KEY (`profile_id`) REFERENCES `community_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
