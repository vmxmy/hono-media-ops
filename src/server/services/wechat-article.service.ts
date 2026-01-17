import { eq, desc, and, ilike, sql, count } from "drizzle-orm";
import { db } from "@/server/db";
import { wechatArticles } from "@/server/db/schema";

export interface GetWechatArticlesInput {
  page: number;
  pageSize: number;
  search?: string;
}

export const wechatArticleService = {
  async getAll(input: GetWechatArticlesInput) {
    const { page, pageSize, search } = input;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${wechatArticles.title} ILIKE ${`%${search}%`} OR ${wechatArticles.authorName} ILIKE ${`%${search}%`} OR ${wechatArticles.digest} ILIKE ${`%${search}%`})`
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const itemsQuery = db
      .select()
      .from(wechatArticles)
      .where(where)
      .orderBy(desc(wechatArticles.createTime))
      .limit(pageSize)
      .offset(offset);

    const countQuery = db
      .select({ value: count() })
      .from(wechatArticles)
      .where(where);

    const [items, countResult] = await Promise.all([itemsQuery, countQuery]);

    return {
      items,
      total: countResult[0]?.value ?? 0,
    };
  },

  async getById(id: string) {
    const [item] = await db
      .select()
      .from(wechatArticles)
      .where(eq(wechatArticles.id, id))
      .limit(1);
    return item ?? null;
  },
};

export type WechatArticleService = typeof wechatArticleService;
