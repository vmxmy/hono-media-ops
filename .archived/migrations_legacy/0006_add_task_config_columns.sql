-- 添加任务配置字段，用于保存完整的生成配置

-- 文章配置
ALTER TABLE tasks ADD COLUMN style TEXT;
ALTER TABLE tasks ADD COLUMN opening_example TEXT;
ALTER TABLE tasks ADD COLUMN structure_guide TEXT;
ALTER TABLE tasks ADD COLUMN output_schema TEXT;

-- 封面配置
ALTER TABLE tasks ADD COLUMN cover_prompt TEXT;
ALTER TABLE tasks ADD COLUMN cover_ratio TEXT DEFAULT '16:9';
ALTER TABLE tasks ADD COLUMN cover_resolution TEXT DEFAULT '2k';
ALTER TABLE tasks ADD COLUMN cover_model TEXT DEFAULT 'jimeng-4.5';
ALTER TABLE tasks ADD COLUMN cover_negative_prompt TEXT DEFAULT '模糊, 变形, 低质量, 水印, 文字';
