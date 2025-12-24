ALTER TABLE users ADD COLUMN uuid TEXT;

UPDATE users
SET uuid = lower(hex(randomblob(16)))
WHERE uuid IS NULL OR uuid = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_uuid ON users (uuid);

ALTER TABLE tasks ADD COLUMN user_uuid TEXT;

UPDATE tasks
SET user_uuid = (
  SELECT uuid
  FROM users
  WHERE users.id = tasks.user_id
)
WHERE user_uuid IS NULL OR user_uuid = '';

CREATE INDEX IF NOT EXISTS idx_tasks_user_uuid ON tasks (user_uuid);
