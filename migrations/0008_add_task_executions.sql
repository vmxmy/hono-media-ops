-- 创建任务执行日志表，记录每次执行的完整信息

CREATE TABLE task_executions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  n8n_execution_id TEXT,

  -- 时间信息
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  duration_ms INTEGER,

  -- 执行状态: running/completed/failed
  status TEXT DEFAULT 'running',
  error_message TEXT,

  -- 输入参数快照 (JSON格式，用于调试和审计)
  input_snapshot TEXT,

  -- 产出物
  cover_url TEXT,
  cover_r2_key TEXT,
  wechat_media_id TEXT,
  wechat_draft_id TEXT,
  article_html TEXT,

  -- 扩展元数据 (JSON格式)
  metadata TEXT,

  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- 索引
CREATE INDEX idx_executions_task_id ON task_executions(task_id);
CREATE INDEX idx_executions_status ON task_executions(status);
CREATE INDEX idx_executions_started_at ON task_executions(started_at);
