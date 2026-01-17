import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";

export const wechatArticles = pgTable(
  "wechat_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aid: text("aid").notNull().unique(),
    fakeid: text("fakeid").notNull(),
    accountName: text("account_name").notNull(),
    title: text("title").notNull(),
    link: text("link").notNull(),
    cover: text("cover"),
    digest: text("digest"),
    authorName: text("author_name"),
    isAd: boolean("is_ad").default(false).notNull(),
    updateTime: integer("update_time"),
    createTime: integer("create_time"),
    appmsgid: text("appmsgid"),
    itemidx: integer("itemidx"),
    albumId: text("album_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    aidIdx: index("idx_wechat_articles_aid").on(table.aid),
    fakeidIdx: index("idx_wechat_articles_fakeid").on(table.fakeid),
    accountNameIdx: index("idx_wechat_articles_account").on(table.accountName),
    linkIdx: index("idx_wechat_articles_link").on(table.link),
    authorIdx: index("idx_wechat_articles_author").on(table.authorName),
    createTimeIdx: index("idx_wechat_articles_create_time").on(table.createTime),
  })
);

export type WechatArticle = typeof wechatArticles.$inferSelect;
export type NewWechatArticle = typeof wechatArticles.$inferInsert;
