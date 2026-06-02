CREATE TABLE `apporti` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fiumeId` int NOT NULL,
	`importo` int NOT NULL,
	`anno` int NOT NULL,
	`descrizione` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apporti_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `apporti` ADD CONSTRAINT `apporti_fiumeId_fiumi_id_fk` FOREIGN KEY (`fiumeId`) REFERENCES `fiumi`(`id`) ON DELETE cascade ON UPDATE no action;