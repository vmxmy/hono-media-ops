-- 迁移 users 和 tasks 表主键为 UUID

-- 1. 重建 users 表
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  access_code TEXT NOT NULL
);

INSERT INTO users_new (id, username, access_code)
SELECT uuid, username, access_code FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE UNIQUE INDEX idx_users_username ON users (username);

-- 2. 重建 tasks 表
CREATE TABLE tasks_new (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  topic TEXT,
  keywords TEXT,
  template_id TEXT,
  ref_url TEXT,
  status TEXT DEFAULT 'pending',
  result_title TEXT,
  result_content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tasks_new (id, user_id, topic, keywords, template_id, ref_url, status, result_title, result_content, created_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),
  user_uuid,
  topic,
  keywords,
  template_id,
  ref_url,
  status,
  result_title,
  result_content,
  created_at
FROM tasks;

DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;

CREATE INDEX idx_tasks_user_id ON tasks (user_id);
CREATE INDEX idx_tasks_status ON tasks (status);
