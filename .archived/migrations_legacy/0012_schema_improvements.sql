-- Migration: Schema Improvements
-- This migration adds PostgreSQL best practices:
-- 1. Enum types for status fields
-- 2. JSONB columns for structured data
-- 3. Foreign key constraints
-- 4. Composite indexes
-- 5. Soft delete support (deleted_at)
-- 6. Updated_at timestamps

-- =============================================
-- 1. Create Enum Types
-- =============================================

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE execution_status AS ENUM ('running', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reverse_log_status AS ENUM ('SUCCESS', 'FAILED', 'PENDING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 2. Users Table Updates
-- =============================================

-- Add updated_at and deleted_at columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create index on username if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- =============================================
-- 3. Tasks Table Updates
-- =============================================

-- Add new JSONB columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS article_config JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cover_config JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Migrate existing data to JSONB (if old columns exist)
UPDATE tasks SET
    article_config = jsonb_build_object(
        'style', style,
        'openingExample', opening_example,
        'structureGuide', structure_guide,
        'outputSchema', output_schema
    )
WHERE article_config IS NULL
  AND (style IS NOT NULL OR opening_example IS NOT NULL OR structure_guide IS NOT NULL OR output_schema IS NOT NULL);

UPDATE tasks SET
    cover_config = jsonb_build_object(
        'prompt', cover_prompt,
        'ratio', COALESCE(cover_ratio, '16:9'),
        'resolution', COALESCE(cover_resolution, '1k'),
        'model', COALESCE(cover_model, 'jimeng-4.5'),
        'mode', COALESCE(cover_mode, 'text2img'),
        'negativePrompt', COALESCE(cover_negative_prompt, '模糊, 变形, 低质量, 水印, 文字')
    )
WHERE cover_config IS NULL;

-- Set default for cover_config on NULL rows
UPDATE tasks SET cover_config = '{"ratio": "16:9", "resolution": "1k", "model": "jimeng-4.5", "mode": "text2img", "negativePrompt": "模糊, 变形, 低质量, 水印, 文字"}'::jsonb
WHERE cover_config IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);

-- =============================================
-- 4. Task Executions Table Updates
-- =============================================

-- Add input_snapshot and result JSONB columns
ALTER TABLE task_executions ADD COLUMN IF NOT EXISTS input_snapshot JSONB;
ALTER TABLE task_executions ADD COLUMN IF NOT EXISTS result JSONB;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_executions_task_id ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON task_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON task_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_executions_task_started ON task_executions(task_id, started_at);

-- =============================================
-- 5. Prompts Table Updates
-- =============================================

-- Add metadata JSONB column and deleted_at
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);
CREATE INDEX IF NOT EXISTS idx_prompts_category_name ON prompts(category, name);

-- =============================================
-- 6. Wechat Articles Table Updates
-- =============================================

-- Add images JSONB column
ALTER TABLE wechat_articles ADD COLUMN IF NOT EXISTS images JSONB;
ALTER TABLE wechat_articles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_articles_url ON wechat_articles(url);
CREATE INDEX IF NOT EXISTS idx_wechat_articles_nickname ON wechat_articles(nickname);
CREATE INDEX IF NOT EXISTS idx_wechat_articles_create_time ON wechat_articles(create_time);
CREATE INDEX IF NOT EXISTS idx_wechat_articles_nickname_time ON wechat_articles(nickname, create_time);

-- =============================================
-- 7. Reverse Engineering Logs Table Updates
-- =============================================

-- Add new JSONB columns
ALTER TABLE reverse_engineering_logs ADD COLUMN IF NOT EXISTS reverse_result JSONB;
ALTER TABLE reverse_engineering_logs ADD COLUMN IF NOT EXISTS metrics JSONB;
ALTER TABLE reverse_engineering_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE reverse_engineering_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Migrate existing data to JSONB
UPDATE reverse_engineering_logs SET
    reverse_result = reverse_result_json::jsonb
WHERE reverse_result IS NULL
  AND reverse_result_json IS NOT NULL
  AND reverse_result_json != '';

UPDATE reverse_engineering_logs SET
    metrics = jsonb_build_object(
        'burstiness', metric_burstiness,
        'ttr', metric_ttr,
        'avgSentLen', metric_avg_sent_len
    )
WHERE metrics IS NULL
  AND (metric_burstiness IS NOT NULL OR metric_ttr IS NOT NULL OR metric_avg_sent_len IS NOT NULL);

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_re_logs_article_url ON reverse_engineering_logs(article_url);
CREATE INDEX IF NOT EXISTS idx_re_logs_user_created ON reverse_engineering_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_re_logs_user_genre ON reverse_engineering_logs(user_id, genre_category);

-- =============================================
-- 8. Add Foreign Key Constraints (if not exist)
-- =============================================

-- Note: Adding foreign keys may fail if orphaned data exists
-- These are wrapped in DO blocks to handle errors gracefully

DO $$ BEGIN
    ALTER TABLE tasks
        ADD CONSTRAINT fk_tasks_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE task_executions
        ADD CONSTRAINT fk_executions_task_id
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE reverse_engineering_logs
        ADD CONSTRAINT fk_re_logs_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN others THEN null;
END $$;
