ALTER TABLE `alertConfig` MODIFY COLUMN `soglia` int;--> statement-breakpoint
ALTER TABLE `alertConfig` MODIFY COLUMN `operatore` varchar(10) DEFAULT 'gte';--> statement-breakpoint
ALTER TABLE `alertConfig` ADD `dataAlert` timestamp;--> statement-breakpoint
ALTER TABLE `alertConfig` ADD `giorniPreavviso` int;--> statement-breakpoint
ALTER TABLE `alertConfig` ADD `affluenteId` int;