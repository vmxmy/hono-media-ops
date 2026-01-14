import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { styleAnalyses, users } from "@/server/db/schema";
import { styleAnalysisService } from "@/server/services/style-analysis";
import { styleAnalysisSearchService } from "@/server/services/style-analysis/search.service";

const createId = () => crypto.randomUUID();

test.after(async () => {
  const client = (db as unknown as { $client?: { end: (opts?: { timeout: number }) => Promise<void> } }).$client;
  if (client?.end) {
    await client.end({ timeout: 5 });
  }
});

async function cleanup(ids: { styleId: string; userId: string }) {
  await db.delete(styleAnalyses).where(eq(styleAnalyses.id, ids.styleId));
  await db.delete(users).where(eq(users.id, ids.userId));
}

test("styleAnalysisService.create should trigger embedding generation on SUCCESS", async () => {
  const ids = { styleId: "", userId: createId() };
  const original = styleAnalysisSearchService.generateAndStoreEmbedding;
  let calledWith: string | null = null;

  styleAnalysisSearchService.generateAndStoreEmbedding = async (id: string) => {
    calledWith = id;
    return { success: true };
  };

  try {
    await db.insert(users).values({
      id: ids.userId,
      email: `${ids.userId}@example.com`,
    });

    const result = await styleAnalysisService.create({
      userId: ids.userId,
      sourceTitle: "test",
      status: "SUCCESS",
    });

    ids.styleId = result.id;
    assert.equal(calledWith, result.id);
  } finally {
    styleAnalysisSearchService.generateAndStoreEmbedding = original;
    await cleanup(ids);
  }
});

test("styleAnalysisService.upsert should trigger embedding generation on SUCCESS", async () => {
  const ids = { styleId: "", userId: createId() };
  const sourceUrl = `https://example.com/${createId()}`;
  const original = styleAnalysisSearchService.generateAndStoreEmbedding;
  let calledWith: string | null = null;

  styleAnalysisSearchService.generateAndStoreEmbedding = async (id: string) => {
    calledWith = id;
    return { success: true };
  };

  try {
    await db.insert(users).values({
      id: ids.userId,
      email: `${ids.userId}@example.com`,
    });

    const result = await styleAnalysisService.upsert({
      userId: ids.userId,
      sourceUrl,
      sourceTitle: "test",
      status: "SUCCESS",
    });

    ids.styleId = result.id;
    assert.equal(calledWith, result.id);
  } finally {
    styleAnalysisSearchService.generateAndStoreEmbedding = original;
    await cleanup(ids);
  }
});

test("styleAnalysisService.update should trigger embedding generation on SUCCESS", async () => {
  const ids = { styleId: "", userId: createId() };
  const original = styleAnalysisSearchService.generateAndStoreEmbedding;
  let calledWith: string | null = null;

  styleAnalysisSearchService.generateAndStoreEmbedding = async (id: string) => {
    calledWith = id;
    return { success: true };
  };

  try {
    await db.insert(users).values({
      id: ids.userId,
      email: `${ids.userId}@example.com`,
    });

    const created = await styleAnalysisService.create({
      userId: ids.userId,
      sourceTitle: "test",
      status: "SUCCESS",
    });

    ids.styleId = created.id;
    calledWith = null;

    await styleAnalysisService.update({
      id: ids.styleId,
      status: "SUCCESS",
    });

    assert.equal(calledWith, ids.styleId);
  } finally {
    styleAnalysisSearchService.generateAndStoreEmbedding = original;
    await cleanup(ids);
  }
});
