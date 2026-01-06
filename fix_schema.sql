-- 批量添加缺失的schema字段

-- review_plans表添加status字段
ALTER TABLE review_plans ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- practice_questions表添加questionType字段
ALTER TABLE practice_questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(50);

-- practice_questions表添加questionId字段
ALTER TABLE practice_questions ADD COLUMN IF NOT EXISTS question_id INT;

-- smart_review_tasks表添加taskName字段
ALTER TABLE smart_review_tasks ADD COLUMN IF NOT EXISTS task_name VARCHAR(255);

-- review_plans表添加nextReviewDate字段
ALTER TABLE review_plans ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMP;

-- practice_questions表添加practiceQuestionId字段（可能是重复的id）
-- 跳过，因为应该使用id字段

-- smart_review_tasks表添加planDate字段
ALTER TABLE smart_review_tasks ADD COLUMN IF NOT EXISTS plan_date TIMESTAMP;

-- users表添加email字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- practice_pools表添加status字段
ALTER TABLE practice_pools ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- email_verification_tokens表添加status字段
ALTER TABLE email_verification_tokens ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- smart_review_tasks表添加priority字段
ALTER TABLE smart_review_tasks ADD COLUMN IF NOT EXISTS priority INT DEFAULT 50;

-- smart_review_tasks表添加taskType字段
ALTER TABLE smart_review_tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50);

-- review_plans表添加nextReviewAt字段
ALTER TABLE review_plans ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP;
