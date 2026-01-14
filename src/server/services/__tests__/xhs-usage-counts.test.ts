import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { xhsImageJobs, imagePrompts } from "@/server/db/schema";
import { xhsImageService } from "@/server/services/xhs-image.service";

const createId = () => crypto.randomUUID();

async function cleanup(ids: { jobId: string; promptId: string }) {
  await db.delete(xhsImageJobs).where(eq(xhsImageJobs.id, ids.jobId));
  await db.delete(imagePrompts).where(eq(imagePrompts.id, ids.promptId));
}

test("xhs job completion should increment prompt usage once", async () => {
  const ids = { jobId: createId(), promptId: createId() };

  try {
    await db.insert(imagePrompts).values({
      id: ids.promptId,
      title: "xhs prompt",
      prompt: "xhs prompt content",
    });

    await db.insert(xhsImageJobs).values({
      id: ids.jobId,
      sourceUrl: "https://example.com",
      totalImages: 3,
      completedImages: 0,
      status: "processing",
      ratio: "3:4",
      resolution: "2k",
      metadata: { image_prompt_id: ids.promptId },
    });

    await xhsImageService.updateJobStatus(ids.jobId, "completed");
    await xhsImageService.updateJobStatus(ids.jobId, "completed");

    const [promptRow] = await db
      .select({ useCount: imagePrompts.useCount })
      .from(imagePrompts)
      .where(eq(imagePrompts.id, ids.promptId))
      .limit(1);

    assert.equal(promptRow?.useCount ?? 0, 1);
  } finally {
    await cleanup(ids);
  }
});
