ALTER TABLE `links` ADD `expiresAt` integer;--> statement-breakpoint
ALTER TABLE `links` ADD `revokedAt` integer;--> statement-breakpoint
ALTER TABLE `links` ADD `version` integer DEFAULT 1 NOT NULL;