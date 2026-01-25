-- ============================================================
-- 小红书图片任务表字段扩展 - 手动迁移脚本
-- 迁移版本: 0012_magical_saracen
-- 创建时间: 2026-01-25
-- 用途: 支持任务重试功能，将关键信息从 metadata 提升为独立字段
-- ============================================================

-- 注意: 此迁移已通过 drizzle-kit push 自动应用
--       此脚本仅用于其他环境的手动迁移或参考

BEGIN;

-- 1. 新增字段
ALTER TABLE "xhs_image_jobs"
ADD COLUMN IF NOT EXISTS "image_prompt_id" uuid,
ADD COLUMN IF NOT EXISTS "input_content" text,
ADD COLUMN IF NOT EXISTS "style_prompt" text,
ADD COLUMN IF NOT EXISTS "generated_config" jsonb;

-- 2. 添加外键约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'xhs_image_jobs_image_prompt_id_image_prompts_id_fk'
    ) THEN
        ALTER TABLE "xhs_image_jobs"
        ADD CONSTRAINT "xhs_image_jobs_image_prompt_id_image_prompts_id_fk"
        FOREIGN KEY ("image_prompt_id")
        REFERENCES "public"."image_prompts"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
    END IF;
END $$;

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS "idx_xhs_image_jobs_image_prompt_id"
ON "xhs_image_jobs"
USING btree ("image_prompt_id");

-- 4. 添加字段注释（可选，便于理解）
COMMENT ON COLUMN "xhs_image_jobs"."image_prompt_id" IS '图片提示词 ID (外键到 image_prompts, 重试必需)';
COMMENT ON COLUMN "xhs_image_jobs"."input_content" IS '用户原始输入内容 (重试必需)';
COMMENT ON COLUMN "xhs_image_jobs"."style_prompt" IS 'AI 生成的风格提示词';
COMMENT ON COLUMN "xhs_image_jobs"."generated_config" IS 'AI 生成的图片配置 JSON';

COMMIT;

-- ============================================================
-- 验证 SQL
-- ============================================================

-- 检查字段是否创建成功
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'xhs_image_jobs'
  AND column_name IN ('image_prompt_id', 'input_content', 'style_prompt', 'generated_config')
ORDER BY column_name;

-- 检查外键约束
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'xhs_image_jobs'::regclass
  AND conname LIKE '%image_prompt%';

-- 检查索引
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'xhs_image_jobs'
  AND indexname LIKE '%image_prompt%';

-- 检查表结构
\d xhs_image_jobs

-- ============================================================
-- 数据统计 SQL
-- ============================================================

-- 统计字段填充情况
SELECT
    COUNT(*) AS total_jobs,
    COUNT(image_prompt_id) AS with_prompt_id,
    COUNT(input_content) AS with_input_content,
    COUNT(style_prompt) AS with_style_prompt,
    COUNT(generated_config) AS with_config,
    ROUND(100.0 * COUNT(image_prompt_id) / NULLIF(COUNT(*), 0), 2) AS prompt_id_percentage
FROM xhs_image_jobs
WHERE deleted_at IS NULL;

-- 查看最近创建的任务
SELECT
    id,
    status,
    image_prompt_id,
    input_content IS NOT NULL AS has_input,
    style_prompt IS NOT NULL AS has_style,
    generated_config IS NOT NULL AS has_config,
    created_at
FROM xhs_image_jobs
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- 回滚 SQL (谨慎使用!)
-- ============================================================

/*
-- 警告: 执行回滚会删除新字段及其数据，且不可恢复!
-- 仅在确认需要回滚时执行

BEGIN;

-- 删除索引
DROP INDEX IF EXISTS "idx_xhs_image_jobs_image_prompt_id";

-- 删除外键约束
ALTER TABLE "xhs_image_jobs"
DROP CONSTRAINT IF EXISTS "xhs_image_jobs_image_prompt_id_image_prompts_id_fk";

-- 删除字段
ALTER TABLE "xhs_image_jobs"
DROP COLUMN IF EXISTS "image_prompt_id",
DROP COLUMN IF EXISTS "input_content",
DROP COLUMN IF EXISTS "style_prompt",
DROP COLUMN IF EXISTS "generated_config";

COMMIT;
*/
