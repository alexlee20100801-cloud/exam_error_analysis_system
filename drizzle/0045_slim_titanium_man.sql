ALTER TABLE `ab_test_experiments` ADD `auto_decision_enabled` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ab_test_experiments` ADD `decision_status` enum('pending','ready_for_decision','decided','notified') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `ab_test_experiments` ADD `decision_made_at` timestamp;--> statement-breakpoint
ALTER TABLE `ab_test_experiments` ADD `decision_recommendation` enum('rollout_treatment','keep_control','needs_review','inconclusive');--> statement-breakpoint
ALTER TABLE `ab_test_experiments` ADD `decision_reason` text;--> statement-breakpoint
ALTER TABLE `ab_test_experiments` ADD `decision_confidence` float;--> statement-breakpoint
ALTER TABLE `ab_test_experiments` ADD `notification_sent_at` timestamp;--> statement-breakpoint
ALTER TABLE `ab_test_experiments` ADD `notification_recipients` json;--> statement-breakpoint
ALTER TABLE `ab_test_experiments` ADD `min_sample_size` int DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `ab_test_experiments` ADD `significance_level` float DEFAULT 0.05 NOT NULL;--> statement-breakpoint
ALTER TABLE `ab_test_experiments` ADD `min_effect_size` float DEFAULT 0.05 NOT NULL;--> statement-breakpoint
ALTER TABLE `warmup_tasks` ADD `recommended_by_ai` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `warmup_tasks` ADD `ai_recommendation_score` float;--> statement-breakpoint
ALTER TABLE `warmup_tasks` ADD `ai_recommendation_reason` text;--> statement-breakpoint
ALTER TABLE `warmup_tasks` ADD `before_cache_hit_rate` float;--> statement-breakpoint
ALTER TABLE `warmup_tasks` ADD `after_cache_hit_rate` float;--> statement-breakpoint
ALTER TABLE `warmup_tasks` ADD `hit_rate_improvement` float;--> statement-breakpoint
ALTER TABLE `warmup_tasks` ADD `before_avg_response_time` int;--> statement-breakpoint
ALTER TABLE `warmup_tasks` ADD `after_avg_response_time` int;--> statement-breakpoint
ALTER TABLE `warmup_tasks` ADD `response_time_improvement` float;--> statement-breakpoint
ALTER TABLE `warmup_tasks` ADD `effectiveness_score` float;