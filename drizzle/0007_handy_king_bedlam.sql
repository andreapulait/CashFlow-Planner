ALTER TABLE `affluenti` ADD `dataInserimento` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `fiumi` ADD `dataCreazione` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `reinvestimenti` ADD `dataEsecuzione` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `affluenti` DROP COLUMN `mese`;--> statement-breakpoint
ALTER TABLE `fiumi` DROP COLUMN `meseCreazione`;--> statement-breakpoint
ALTER TABLE `reinvestimenti` DROP COLUMN `mese`;