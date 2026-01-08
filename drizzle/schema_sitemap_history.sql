-- Sitemap更新历史记录表
CREATE TABLE IF NOT EXISTS sitemap_update_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN NOT NULL,
  total_urls INT,
  sitemap_url TEXT,
  error_message TEXT,
  execution_time_ms INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引
CREATE INDEX idx_sitemap_history_updated_at ON sitemap_update_history(updated_at);
CREATE INDEX idx_sitemap_history_success ON sitemap_update_history(success);
