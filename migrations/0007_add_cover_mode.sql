-- 添加封面生图模式字段

ALTER TABLE tasks ADD COLUMN cover_mode TEXT DEFAULT 'text2img';
