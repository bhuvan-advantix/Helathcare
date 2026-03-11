CREATE TABLE `deleted_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`original_user_id` text,
	`name` text,
	`email` text,
	`role` text,
	`custom_id` text,
	`reason` text,
	`deleted_at` integer,
	`profile_snapshot` text
);
--> statement-breakpoint
CREATE TABLE `doctor_patient_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`doctor_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`added_at` integer,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doctor_patient_unique` ON `doctor_patient_relations` (`doctor_id`,`patient_id`);--> statement-breakpoint
CREATE TABLE `doctor_private_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`doctor_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`note_content` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `health_parameters` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`lab_report_id` text,
	`parameter_name` text NOT NULL,
	`value` text NOT NULL,
	`unit` text,
	`reference_range` text,
	`status` text,
	`test_date` text,
	`created_at` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lab_report_id`) REFERENCES `lab_reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lab_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`lab_name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`city` text,
	`phone` text,
	`is_active` integer DEFAULT true,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lab_accounts_email_unique` ON `lab_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `lab_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`doctor_id` text,
	`doctor_name` text,
	`name` text NOT NULL,
	`type` text DEFAULT 'lab' NOT NULL,
	`notes` text,
	`is_paid` integer DEFAULT false,
	`paid_at` integer,
	`paid_by` text,
	`ordered_at` integer,
	`ordered_date` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `lab_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`file_name` text NOT NULL,
	`report_date` text,
	`lab_name` text,
	`patient_name` text,
	`doctor_name` text,
	`extracted_data` text NOT NULL,
	`raw_text` text,
	`analysis` text,
	`file_size` integer,
	`page_count` integer,
	`file_data` text,
	`cloudinary_url` text,
	`uploaded_at` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `medications` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`name` text NOT NULL,
	`dosage` text,
	`purpose` text,
	`start_date` text,
	`frequency` text,
	`duration_days` integer,
	`status` text DEFAULT 'Active',
	`added_by` text DEFAULT 'Self',
	`created_at` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `patient_allergies` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`allergen` text NOT NULL,
	`severity` text,
	`reaction` text,
	`status` text DEFAULT 'active',
	`added_by` text DEFAULT 'patient',
	`doctor_id` text,
	`created_at` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `patient_conditions` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`condition_name` text NOT NULL,
	`diagnosed_date` text,
	`status` text DEFAULT 'active',
	`added_by` text DEFAULT 'patient',
	`doctor_id` text,
	`created_at` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `patient_diagnostics` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`doctor_id` text,
	`condition_name` text NOT NULL,
	`condition_status` text DEFAULT 'stable',
	`nodes` text DEFAULT '[]' NOT NULL,
	`clinical_notes` text,
	`treatment_plan` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `patient_vitals` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`blood_pressure` text,
	`temperature` text,
	`weight` text,
	`height` text,
	`pulse_rate` text,
	`spo2` text,
	`recorded_by` text,
	`notes` text,
	`recorded_at` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `staff_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`hospital_name` text,
	`phone` text,
	`is_active` integer DEFAULT true,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_accounts_email_unique` ON `staff_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_number` text NOT NULL,
	`user_name` text NOT NULL,
	`user_email` text NOT NULL,
	`selected_page` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'medium',
	`created_at` integer,
	`updated_at` integer,
	`resolved_at` integer,
	`user_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `support_tickets_ticket_number_unique` ON `support_tickets` (`ticket_number`);--> statement-breakpoint
CREATE TABLE `timeline_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`event_date` text NOT NULL,
	`event_type` text NOT NULL,
	`status` text DEFAULT 'pending',
	`report_id` text,
	`doctor_id` text,
	`created_by` text DEFAULT 'patient',
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`report_id`) REFERENCES `lab_reports`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_accounts`("userId", "type", "provider", "providerAccountId", "refresh_token", "access_token", "expires_at", "token_type", "scope", "id_token", "session_state") SELECT "userId", "type", "provider", "providerAccountId", "refresh_token", "access_token", "expires_at", "token_type", "scope", "id_token", "session_state" FROM `accounts`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
INSERT INTO `__new_verificationToken`("identifier", "token", "expires") SELECT "identifier", "token", "expires" FROM `verificationToken`;--> statement-breakpoint
DROP TABLE `verificationToken`;--> statement-breakpoint
ALTER TABLE `__new_verificationToken` RENAME TO `verificationToken`;--> statement-breakpoint
ALTER TABLE `doctors` ADD `dob` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `age` integer;--> statement-breakpoint
ALTER TABLE `doctors` ADD `gender` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `address` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `city` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `marital_status` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `emergency_contact_name` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `emergency_contact_phone` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `guardian_name` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `guardian_relation` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `clinic_name` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `degree` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `hospital_timing` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `working_days` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `approval_status` text DEFAULT 'approved';--> statement-breakpoint
ALTER TABLE `doctors` DROP COLUMN `consultation_fee`;--> statement-breakpoint
ALTER TABLE `patients` ADD `age` integer;--> statement-breakpoint
ALTER TABLE `patients` ADD `city` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `marital_status` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `emergency_contact_name` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `emergency_contact_phone` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `guardian_name` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `guardian_relation` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `height` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `weight` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `allergies` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `current_medications` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `past_surgeries` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `chronic_conditions` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `lifestyle` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password` text;--> statement-breakpoint
ALTER TABLE `users` ADD `is_banned` integer DEFAULT false;