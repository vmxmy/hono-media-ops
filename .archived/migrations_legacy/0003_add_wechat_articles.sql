-- 微信公众号文章爬虫数据表
CREATE TABLE IF NOT EXISTS wechat_articles (
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

CREATE INDEX IF NOT EXISTS idx_wechat_articles_url ON wechat_articles (url);
CREATE INDEX IF NOT EXISTS idx_wechat_articles_nickname ON wechat_articles (nickname);
CREATE INDEX IF NOT EXISTS idx_wechat_articles_create_time ON wechat_articles (create_time);
