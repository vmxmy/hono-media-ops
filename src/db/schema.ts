import { sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  accessCode: text('access_code').notNull(),
}, (table) => ({
  usernameIdx: uniqueIndex('idx_users_username').on(table.username),
}))

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  topic: text('topic'),
  keywords: text('keywords'),
  templateId: text('template_id'),
  refUrl: text('ref_url'),
  status: text('status').default('pending').notNull(),
  resultTitle: text('result_title'),
  resultContent: text('result_content'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  // 文章配置
  style: text('style'),
  openingExample: text('opening_example'),
  structureGuide: text('structure_guide'),
  outputSchema: text('output_schema'),
  // 封面配置
  coverPrompt: text('cover_prompt'),
  coverRatio: text('cover_ratio').default('16:9'),
  coverResolution: text('cover_resolution').default('2k'),
  coverModel: text('cover_model').default('jimeng-4.5'),
  coverMode: text('cover_mode').default('text2img'),
  coverNegativePrompt: text('cover_negative_prompt').default('模糊, 变形, 低质量, 水印, 文字'),
}, (table) => ({
  userIdIdx: index('idx_tasks_user_id').on(table.userId),
  statusIdx: index('idx_tasks_status').on(table.status),
}))

export const wechatArticles = sqliteTable('wechat_articles', {
  id: text('id').primaryKey(),
  url: text('url').notNull().unique(),
  title: text('title').notNull(),
  author: text('author'),
  nickname: text('nickname'),
  createTime: text('create_time'),
  contentHtml: text('content_html'),
  contentText: text('content_text'),
  images: text('images'),
  articleLink: text('article_link'),
  publicMainLink: text('public_main_link'),
  crawledAt: text('crawled_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  urlIdx: uniqueIndex('idx_wechat_articles_url').on(table.url),
  nicknameIdx: index('idx_wechat_articles_nickname').on(table.nickname),
  createTimeIdx: index('idx_wechat_articles_create_time').on(table.createTime),
}))
