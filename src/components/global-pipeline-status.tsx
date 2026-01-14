"use client";

import { api } from "@/trpc/react";
import Link from "next/link";

export function GlobalPipelineStatus() {
  // Query for active processing pipelines
  const { data } = api.pipeline.getAll.useQuery(
    { page: 1, pageSize: 1, status: "processing" },
    { refetchInterval: 5000 }
  );

  const activePipeline = data?.items?.[0];

  if (!activePipeline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500 text-white px-4 py-2 flex items-center justify-between">
      <span>
        ⚡ 创作进行中：「{activePipeline.topic}」
        {activePipeline.articleCompletedChapters}/{activePipeline.articleTotalChapters} 章节
      </span>
      <Link
        href="/pipeline"
        className="text-sm underline hover:no-underline"
      >
        查看详情 →
      </Link>
    </div>
  );
}
