CREATE TABLE `reinvestimenti` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fiumeSorgenteId` int NOT NULL,
	`fiumeDestinazioneId` int,
	`anno` int NOT NULL,
	`importoFisso` int,
	`percentuale` int,
	`nuovoFiumeNome` text,
	`nuovoFiumeRendimento` int,
	`descrizione` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reinvestimenti_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reinvestimenti` ADD CONSTRAINT `reinvestimenti_fiumeSorgenteId_fiumi_id_fk` FOREIGN KEY (`fiumeSorgenteId`) REFERENCES `fiumi`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reinvestimenti` ADD CONSTRAINT `reinvestimenti_fiumeDestinazioneId_fiumi_id_fk` FOREIGN KEY (`fiumeDestinazioneId`) REFERENCES `fiumi`(`id`) ON DELETE set null ON UPDATE no action;