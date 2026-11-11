CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`ownerId` text NOT NULL,
	`linkId` text NOT NULL,
	`action` text NOT NULL,
	`occurredAt` integer NOT NULL,
	FOREIGN KEY (`linkId`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_owner_time` ON `audit` (`ownerId`,`occurredAt`);--> statement-breakpoint
CREATE TABLE `daily_metrics` (
	`linkId` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`linkId`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metrics_link_day` ON `daily_metrics` (`linkId`,`day`);--> statement-breakpoint
CREATE INDEX `metrics_day` ON `daily_metrics` (`day`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` text PRIMARY KEY NOT NULL,
	`ownerId` text NOT NULL,
	`alias` text NOT NULL,
	`targetUrl` text NOT NULL,
	`title` text NOT NULL,
	`createdAt` integer NOT NULL,
	`creationKey` text NOT NULL,
	`requestHash` text NOT NULL,
	CONSTRAINT "links_alias_length" CHECK(length("links"."alias") BETWEEN 4 AND 48)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `links_alias_unique` ON `links` (`alias`);--> statement-breakpoint
CREATE UNIQUE INDEX `links_owner_key` ON `links` (`ownerId`,`creationKey`);--> statement-breakpoint
CREATE INDEX `links_owner_created` ON `links` (`ownerId`,`createdAt`,`id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_window` ON `rate_limits` (`window`);