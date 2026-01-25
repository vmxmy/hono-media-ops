/**
 * Backfill XHS Categories Script
 *
 * 批量为历史记录补充 category 和 track 字段
 *
 * Usage:
 *   npm run ts-node scripts/backfill-xhs-categories.ts
 *   npm run ts-node scripts/backfill-xhs-categories.ts --dry-run  # 测试模式
 *   npm run ts-node scripts/backfill-xhs-categories.ts --limit 10 # 限制处理数量
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, isNull, and } from 'drizzle-orm'
import {
  classifyXhsJob,
  calculateStats,
  printStats,
  type ClassificationResult
} from '../src/server/services/xhs-category-classifier.service'

// ==================== 配置 ====================

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('错误: DATABASE_URL 环境变量未设置')
  process.exit(1)
}

// 命令行参数
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitArg = args.find(arg => arg.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

console.log('=== XHS Category Backfill Script ===')
console.log(`模式: ${isDryRun ? 'DRY RUN (测试模式)' : 'LIVE (实际更新)'}`)
if (limit) {
  console.log(`限制: 仅处理 ${limit} 条记录`)
}
console.log('')

// ==================== 数据库连接 ====================

const client = postgres(DATABASE_URL)
const db = drizzle(client)

// 定义 schema (简化版本，仅包含需要的字段)
const xhsImageJobs = {
  name: 'xhs_image_jobs' as const,
  columns: {
    id: { name: 'id' },
    source_title: { name: 'source_title' },
    category: { name: 'category' },
    track: { name: 'track' },
    generated_config: { name: 'generated_config' },
    meta_attributes: { name: 'meta_attributes' },
    deleted_at: { name: 'deleted_at' },
    updated_at: { name: 'updated_at' }
  }
}

// ==================== 主函数 ====================

async function backfillCategories() {
  try {
    console.log('🔍 正在查询需要分类的记录...')

    // 查询所有缺少 category 的记录
    const query = `
      SELECT
        id,
        source_title,
        category,
        track,
        generated_config,
        meta_attributes
      FROM xhs_image_jobs
      WHERE deleted_at IS NULL
        AND category IS NULL
      ORDER BY created_at DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `

    const jobs = await client.unsafe(query)

    if (jobs.length === 0) {
      console.log('✅ 没有需要分类的记录')
      return
    }

    console.log(`📊 找到 ${jobs.length} 条需要分类的记录\n`)

    // ==================== 分类处理 ====================

    const results: ClassificationResult[] = []
    const updates: Array<{
      id: string
      title: string
      category: string
      track: string | null
      confidence: number
      reasoning: string
    }> = []

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]
      const progress = `[${i + 1}/${jobs.length}]`

      try {
        const classification = await classifyXhsJob({
          source_title: job.source_title || '',
          generated_config: job.generated_config,
          meta_attributes: job.meta_attributes
        })

        results.push(classification)

        if (classification.category) {
          updates.push({
            id: job.id,
            title: job.source_title,
            category: classification.category,
            track: classification.track,
            confidence: classification.confidence,
            reasoning: classification.reasoning
          })

          // 打印分类结果
          const confidenceIcon = classification.confidence >= 0.8 ? '🟢' :
                                 classification.confidence >= 0.5 ? '🟡' : '🟠'

          console.log(`${progress} ${confidenceIcon} ${job.source_title}`)
          console.log(`  ├─ category: ${classification.category}`)
          console.log(`  ├─ track: ${classification.track || '(null)'}`)
          console.log(`  ├─ confidence: ${classification.confidence.toFixed(2)}`)
          console.log(`  └─ reasoning: ${classification.reasoning}`)
        } else {
          console.log(`${progress} ❌ ${job.source_title}`)
          console.log(`  └─ 无法分类: ${classification.reasoning}`)
        }

      } catch (error) {
        console.error(`${progress} ⚠️  处理失败: ${job.source_title}`, error)
      }
    }

    // ==================== 统计结果 ====================

    const stats = calculateStats(results)
    printStats(stats)

    // ==================== 数据库更新 ====================

    if (!isDryRun && updates.length > 0) {
      console.log(`\n🔄 开始更新数据库 (${updates.length} 条记录)...`)

      let successCount = 0
      let failCount = 0

      for (const update of updates) {
        try {
          await client.unsafe(`
            UPDATE xhs_image_jobs
            SET
              category = $1,
              track = $2,
              updated_at = NOW()
            WHERE id = $3
          `, [update.category, update.track, update.id])

          successCount++
        } catch (error) {
          console.error(`更新失败 [${update.id}]:`, error)
          failCount++
        }
      }

      console.log(`\n✅ 更新完成:`)
      console.log(`  成功: ${successCount}`)
      console.log(`  失败: ${failCount}`)

      // ==================== 验证更新 ====================

      console.log('\n🔍 验证更新结果...')

      const verification = await client.unsafe(`
        SELECT
          category,
          track,
          COUNT(*) as count
        FROM xhs_image_jobs
        WHERE deleted_at IS NULL
          AND category IS NOT NULL
        GROUP BY category, track
        ORDER BY count DESC
      `)

      console.log('\n当前数据库分类分布:')
      verification.forEach((row: any) => {
        console.log(`  ${row.category} + ${row.track || '(null)'}: ${row.count}`)
      })

    } else if (isDryRun) {
      console.log('\n⚠️  DRY RUN 模式 - 未执��数据库更新')
      console.log(`如需实际更新，请移除 --dry-run 参数`)
    } else {
      console.log('\n⚠️  没有需要更新的记录')
    }

  } catch (error) {
    console.error('\n❌ 脚本执行失败:', error)
    throw error
  } finally {
    await client.end()
  }
}

// ==================== 执行 ====================

backfillCategories()
  .then(() => {
    console.log('\n🎉 脚本执行完成')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 脚本执行失败:', error)
    process.exit(1)
  })
