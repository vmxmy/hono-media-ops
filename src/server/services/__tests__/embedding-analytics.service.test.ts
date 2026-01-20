import test from "node:test";
import assert from "node:assert/strict";
import { embeddingAnalyticsService } from "@/server/services/embedding-analytics.service";

const createId = () => crypto.randomUUID();

test("getEmbeddingAge should not throw when dates are used in filters", async () => {
  const userId = createId();

  const result = await embeddingAnalyticsService.getEmbeddingAge(userId);

  assert.equal(typeof result.avgAgeInDays, "number");
  assert.equal(result.embeddingsOlderThan30Days, 0);
  assert.equal(result.embeddingsOlderThan90Days, 0);
});

test("getGrowthRate should not throw when dates are used in filters", async () => {
  const userId = createId();

  const result = await embeddingAnalyticsService.getGrowthRate(userId);

  assert.equal(typeof result.last7Days, "number");
  assert.equal(result.last30Days, 0);
  assert.equal(result.last90Days, 0);
});
