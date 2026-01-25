/**
 * XHS Content Category Classifier
 *
 * 基于规则的小红书内容分类器
 * 根据标题、元数据等信息自动判断 category 和 track
 */

export interface ClassificationResult {
  category: string | null
  track: string | null
  confidence: number  // 0-1, 置信度
  reasoning: string   // 分类理由
}

export interface XhsJobInput {
  source_title: string
  generated_config?: any[]
  meta_attributes?: {
    location_summary?: {
      total_shops?: number
      city?: string
    }
    shop_types?: string[]
    featured_items?: string[]
  }
}

/**
 * 分类小红书任务
 */
export async function classifyXhsJob(job: XhsJobInput): Promise<ClassificationResult> {
  const title = job.source_title || ''
  let category: string | null = null
  let track: string | null = null
  let confidence = 0
  let reasoning = ''

  // ==================== Category 分类 ====================

  // 规则1: 基于 meta_attributes (最高优先级)
  if (job.meta_attributes?.location_summary?.total_shops) {
    const shopCount = job.meta_attributes.location_summary.total_shops
    if (shopCount >= 5) {
      category = 'explore'
      confidence = 0.95
      reasoning = `meta_attributes 显示 ${shopCount} 家店铺，判定为探店合集`

      // 探店合集通常是 lifestyle
      track = 'lifestyle'

      return { category, track, confidence, reasoning }
    }
  }

  // 规则2: 探店合集 - "N家店铺"
  const explorePattern = /(\d+)\s*[家间]\s*.*(店|咖啡|cafe|甜品|餐厅|restaurant|tea|茶)/i
  const exploreMatch = title.match(explorePattern)
  if (exploreMatch) {
    const count = parseInt(exploreMatch[1])
    if (count >= 3) {
      category = 'explore'
      confidence = 0.9
      reasoning = `标题包含"${count}家"店铺推荐，判定为探店合集`
    }
  }

  // 规则3: 探店合集 - 宝藏/私藏/合集关键词
  if (!category && /(私藏|宝藏|合集|推荐清单|必去|打卡).*(店|咖啡|cafe|甜品|餐厅)/i.test(title)) {
    category = 'explore'
    confidence = 0.85
    reasoning = '标题包含"私藏/宝藏/合集"等探店关键词'
  }

  // 规则4: 教程 - 明确的教程关��词
  if (!category && /(教程|做法|步骤|recipe)/i.test(title)) {
    category = 'tutorial'
    confidence = 0.85
    reasoning = '标题包含"教程/做法/步骤"等教学关键词'
  }

  // 规则5: 教程 - "如何"疑问句
  if (!category && /如何.+\?|怎么(做|冲|制作)/i.test(title)) {
    category = 'tutorial'
    confidence = 0.8
    reasoning = '标题为"如何/怎么做"疑问句，判定为教程'
  }

  // 规则6: 知识科普 - "为什么"疑问句 (包含无问号的情况)
  if (!category && /(为什么|why)/i.test(title)) {
    category = 'knowledge'
    confidence = 0.85
    reasoning = '标题包含"为什么"疑问，判定为知识科普'
  }

  // 规则7: 知识科普 - 原理/知识关键词
  if (!category && /(原理|知识|科普|你知道吗|最佳|应该|标准)/i.test(title)) {
    category = 'knowledge'
    confidence = 0.8
    reasoning = '标题包含"原理/知识/科普/最佳"等知识类关键词'
  }

  // 规则8: 技巧/避坑类 -> 归为 tutorial
  if (!category && /(注意|避坑|技巧|改善|解决.*(问题|办法)|常见.*故障)/i.test(title)) {
    category = 'tutorial'
    confidence = 0.75
    reasoning = '标题包含"技巧/避坑/解决问题"等实用指导关键词'
  }

  // 规则9: 测评对比
  if (!category && /(测评|评测|横评|对比|\d+款)/i.test(title)) {
    category = 'review'
    confidence = 0.8
    reasoning = '标题包含"测评/对比"等评测关键词'
  }

  // 规则10: 推荐种草
  if (!category && /(推荐|种草|必买|好物|值得|适合|好喝)/i.test(title)) {
    category = 'recommendation'
    confidence = 0.7
    reasoning = '标题包含"推荐/种草/适合"等推荐关键词'
  }

  // 规则11: 疑问句 - 如果仍未分类，且包含问号，归为 knowledge
  if (!category && /\?/.test(title)) {
    category = 'knowledge'
    confidence = 0.65
    reasoning = '标题为疑问句格式，默认归类为知识类'
  }

  // 如果仍未分类，置信度为 0
  if (!category) {
    confidence = 0
    reasoning = '无法匹配任何分类规则'
  }

  // ==================== Track 分类 ====================

  // Track 规则1: 咖啡相关 -> lifestyle
  if (/(咖啡|coffee|cafe|拿铁|美式|手冲|意式|espresso|latte|cappuccino)/i.test(title)) {
    track = 'lifestyle'
  }

  // Track 规则2: 茶相关 -> lifestyle
  else if (/(茶|tea|奶茶|茶饮)/i.test(title)) {
    track = 'lifestyle'
  }

  // Track 规则3: 探店/打卡 -> lifestyle
  else if (/(探店|打卡|拍照)/i.test(title)) {
    track = 'lifestyle'
  }

  // Track 规则4: 甜品美食 -> food
  else if (/(甜品|蛋糕|冰淇淋|ice cream|dessert|美食|餐厅|料理)/i.test(title)) {
    track = 'food'
  }

  // Track 规则5: 从 meta_attributes 推断
  if (!track && job.meta_attributes?.shop_types) {
    const shopTypes = job.meta_attributes.shop_types.join(' ')
    if (/(咖啡|cafe|茶)/i.test(shopTypes)) {
      track = 'lifestyle'
    } else if (/(甜品|餐厅|美食)/i.test(shopTypes)) {
      track = 'food'
    }
  }

  return { category, track, confidence, reasoning }
}

/**
 * 批量分类（用于脚本）
 */
export async function classifyBatch(jobs: XhsJobInput[]): Promise<ClassificationResult[]> {
  return Promise.all(jobs.map(job => classifyXhsJob(job)))
}

/**
 * 分类统计（用于验证）
 */
export interface ClassificationStats {
  total: number
  classified: number
  high_confidence: number  // >= 0.8
  medium_confidence: number  // 0.5-0.8
  low_confidence: number  // < 0.5
  unclassified: number
  categories: Record<string, number>
  tracks: Record<string, number>
}

export function calculateStats(results: ClassificationResult[]): ClassificationStats {
  const stats: ClassificationStats = {
    total: results.length,
    classified: 0,
    high_confidence: 0,
    medium_confidence: 0,
    low_confidence: 0,
    unclassified: 0,
    categories: {},
    tracks: {}
  }

  for (const result of results) {
    if (result.category) {
      stats.classified++

      // 置信度统计
      if (result.confidence >= 0.8) {
        stats.high_confidence++
      } else if (result.confidence >= 0.5) {
        stats.medium_confidence++
      } else {
        stats.low_confidence++
      }

      // Category 统计
      stats.categories[result.category] = (stats.categories[result.category] || 0) + 1

      // Track 统计
      if (result.track) {
        stats.tracks[result.track] = (stats.tracks[result.track] || 0) + 1
      }
    } else {
      stats.unclassified++
    }
  }

  return stats
}

/**
 * 打印统计结果
 */
export function printStats(stats: ClassificationStats): void {
  console.log('\n=== 分类统计结果 ===')
  console.log(`总记录数: ${stats.total}`)
  console.log(`已分类: ${stats.classified} (${((stats.classified / stats.total) * 100).toFixed(2)}%)`)
  console.log(`  高置信度 (≥0.8): ${stats.high_confidence}`)
  console.log(`  中置信度 (0.5-0.8): ${stats.medium_confidence}`)
  console.log(`  低置信度 (<0.5): ${stats.low_confidence}`)
  console.log(`未分类: ${stats.unclassified}`)

  console.log('\nCategory 分布:')
  Object.entries(stats.categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`)
    })

  console.log('\nTrack 分布:')
  Object.entries(stats.tracks)
    .sort((a, b) => b[1] - a[1])
    .forEach(([track, count]) => {
      console.log(`  ${track}: ${count}`)
    })
}
