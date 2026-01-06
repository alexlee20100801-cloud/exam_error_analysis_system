CREATE TABLE `payment_callback_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_no` varchar(64) NOT NULL,
	`payment_method` enum('stripe','wechat','alipay') NOT NULL,
	`third_party_order_no` varchar(255),
	`raw_data` text NOT NULL,
	`signature_valid` boolean,
	`process_status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
	`process_message` text,
	`ip_address` varchar(45),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_callback_logs_id` PRIMARY KEY(`id`)
);
