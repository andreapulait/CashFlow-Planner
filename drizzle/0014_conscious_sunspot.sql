ALTER TABLE `affluenti` ADD `ricorrente` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `affluenti` ADD `periodicita` int;--> statement-breakpoint
ALTER TABLE `affluenti` ADD `durataMesi` int;--> statement-breakpoint
ALTER TABLE `affluenti` ADD `groupId` varchar(36);