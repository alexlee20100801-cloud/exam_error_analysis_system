-- 性能优化：添加必要的数据库索引
-- 这些索引将显著提高查询性能

-- 错题表索引
-- 1. userId索引 - 用于按用户查询错题
ALTER TABLE `error_questions` ADD INDEX `idx_error_questions_userId` (`userId`);

-- 2. 学科和年级组合索引 - 用于按学科和年级筛选
ALTER TABLE `error_questions` ADD INDEX `idx_error_questions_subject_grade` (`subject`, `grade`);

-- 3. 学校级别索引 - 用于按学校级别筛选
ALTER TABLE `error_questions` ADD INDEX `idx_error_questions_schoolLevel` (`schoolLevel`);

-- 4. 是否分析索引 - 用于查找未分析的错题
ALTER TABLE `error_questions` ADD INDEX `idx_error_questions_isAnalyzed` (`isAnalyzed`);

-- 5. 是否掌握索引 - 用于查找未掌握的错题
ALTER TABLE `error_questions` ADD INDEX `idx_error_questions_isMastered` (`isMastered`);

-- 6. 创建时间索引 - 用于按时间排序
ALTER TABLE `error_questions` ADD INDEX `idx_error_questions_createdAt` (`createdAt`);

-- 7. 复合索引 - userId + isAnalyzed（常见查询组合）
ALTER TABLE `error_questions` ADD INDEX `idx_error_questions_userId_isAnalyzed` (`userId`, `isAnalyzed`);

-- 8. 复合索引 - userId + subject + grade（常见查询组合）
ALTER TABLE `error_questions` ADD INDEX `idx_error_questions_userId_subject_grade` (`userId`, `subject`, `grade`);

-- 错题复习记录表索引
-- 1. userId索引 - 用于查询用户的复习记录
ALTER TABLE `error_review_records` ADD INDEX `idx_error_review_records_userId` (`userId`);

-- 2. errorQuestionId索引 - 用于查询特定错题的复习记录
ALTER TABLE `error_review_records` ADD INDEX `idx_error_review_records_errorQuestionId` (`errorQuestionId`);

-- 3. 复合索引 - userId + nextReviewAt（用于查询待复习的错题）
ALTER TABLE `error_review_records` ADD INDEX `idx_error_review_records_userId_nextReviewAt` (`userId`, `nextReviewAt`);

-- 4. 复合索引 - userId + isCompleted（用于查询已完成/未完成的复习）
ALTER TABLE `error_review_records` ADD INDEX `idx_error_review_records_userId_isCompleted` (`userId`, `isCompleted`);

-- 知识点表索引
-- 1. subject索引 - 用于按学科查询知识点
ALTER TABLE `knowledge_points` ADD INDEX `idx_knowledge_points_subject` (`subject`);

-- 2. grade索引 - 用于按年级查询知识点
ALTER TABLE `knowledge_points` ADD INDEX `idx_knowledge_points_grade` (`grade`);

-- 3. 复合索引 - subject + grade（常见查询组合）
ALTER TABLE `knowledge_points` ADD INDEX `idx_knowledge_points_subject_grade` (`subject`, `grade`);

-- 学习进度表索引
-- 1. userId索引 - 用于查询用户的学习进度
ALTER TABLE `learning_progress` ADD INDEX `idx_learning_progress_userId` (`userId`);

-- 2. knowledgePointId索引 - 用于查询特定知识点的学习进度
ALTER TABLE `learning_progress` ADD INDEX `idx_learning_progress_knowledgePointId` (`knowledgePointId`);

-- 3. 复合索引 - userId + knowledgePointId（用于查询特定用户的特定知识点进度）
ALTER TABLE `learning_progress` ADD INDEX `idx_learning_progress_userId_knowledgePointId` (`userId`, `knowledgePointId`);

-- 4. masteryLevel索引 - 用于查询特定掌握度的知识点
ALTER TABLE `learning_progress` ADD INDEX `idx_learning_progress_masteryLevel` (`masteryLevel`);

-- 练习记录表索引
-- 1. userId索引 - 用于查询用户的练习记录
ALTER TABLE `practice_records` ADD INDEX `idx_practice_records_userId` (`userId`);

-- 2. knowledgePointId索引 - 用于查询特定知识点的练习记录
ALTER TABLE `practice_records` ADD INDEX `idx_practice_records_knowledgePointId` (`knowledgePointId`);

-- 3. 复合索引 - userId + createdAt（用于查询用户的练习历史）
ALTER TABLE `practice_records` ADD INDEX `idx_practice_records_userId_createdAt` (`userId`, `createdAt`);

-- 4. isCorrect索引 - 用于统计正确/错误的练习
ALTER TABLE `practice_records` ADD INDEX `idx_practice_records_isCorrect` (`isCorrect`);

-- 用户表索引
-- 1. openId索引 - 用于快速查找用户（OAuth登录）
ALTER TABLE `users` ADD INDEX `idx_users_openId` (`openId`);

-- 2. email索引 - 用于快速查找用户（邮箱登录）
ALTER TABLE `users` ADD INDEX `idx_users_email` (`email`);

-- 3. role索引 - 用于查询特定角色的用户（如管理员）
ALTER TABLE `users` ADD INDEX `idx_users_role` (`role`);

-- 标签关系表索引
-- 1. errorQuestionId索引 - 用于查询错题的所有标签
ALTER TABLE `error_question_tag_relations` ADD INDEX `idx_error_question_tag_relations_errorQuestionId` (`errorQuestionId`);

-- 2. tagId索引 - 用于查询具有特定标签的所有错题
ALTER TABLE `error_question_tag_relations` ADD INDEX `idx_error_question_tag_relations_tagId` (`tagId`);

-- 3. 复合索引 - errorQuestionId + tagId（用于快速查找特定关系）
ALTER TABLE `error_question_tag_relations` ADD INDEX `idx_error_question_tag_relations_errorQuestionId_tagId` (`errorQuestionId`, `tagId`);
