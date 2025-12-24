-- Add index on article_url for query optimization (no unique constraint)
CREATE INDEX IF NOT EXISTS idx_re_logs_article_url ON reverse_engineering_logs(article_url);
