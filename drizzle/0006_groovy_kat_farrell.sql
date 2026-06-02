CREATE TABLE `affluenti` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fiumeId` int NOT NULL,
	`importo` int NOT NULL,
	`mese` int NOT NULL,
	`descrizione` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affluenti_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `apporti`;--> statement-breakpoint
ALTER TABLE `impostazioni` MODIFY COLUMN `orizzonteTemporale` int NOT NULL DEFAULT 60;--> statement-breakpoint
ALTER TABLE `fiumi` ADD `sorgente` int NOT NULL;--> statement-breakpoint
ALTER TABLE `fiumi` ADD `meseCreazione` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reinvestimenti` ADD `mese` int NOT NULL;--> statement-breakpoint
ALTER TABLE `scenarioSnapshots` ADD `affluentiData` text NOT NULL;--> statement-breakpoint
ALTER TABLE `affluenti` ADD CONSTRAINT `affluenti_fiumeId_fiumi_id_fk` FOREIGN KEY (`fiumeId`) REFERENCES `fiumi`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fiumi` DROP COLUMN `iniziale`;--> statement-breakpoint
ALTER TABLE `fiumi` DROP COLUMN `annoCreazione`;--> statement-breakpoint
ALTER TABLE `reinvestimenti` DROP COLUMN `anno`;--> statement-breakpoint
ALTER TABLE `scenarioSnapshots` DROP COLUMN `apportiData`;