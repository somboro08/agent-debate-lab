ALTER TABLE `projects` ADD `sessionStatus` enum('draft','running','paused','interrupted','completed') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `activeObjective` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `agents` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `transcript` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `finale` text;