-- 重建 wechat_articles 表，使用 UUID 作为主键
DROP TABLE IF EXISTS wechat_articles;

CREATE TABLE wechat_articles (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT,
  nickname TEXT,
  create_time TEXT,
  content_html TEXT,
  content_text TEXT,
  images TEXT,
  article_link TEXT,
  public_main_link TEXT,
  crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wechat_articles_url ON wechat_articles (url);
CREATE INDEX idx_wechat_articles_nickname ON wechat_articles (nickname);
CREATE INDEX idx_wechat_articles_create_time ON wechat_articles (create_time);
