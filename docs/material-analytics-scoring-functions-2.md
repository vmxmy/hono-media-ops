# 质量评分系统 - 评分函数实现（续）

## 三、指标质量评分函数

### 3.1 TTR得分 (10分)
```typescript
function calculateTtrScore(ttr: number | null): number {
  if (!ttr) return 0;

  // 最佳区间：0.5-0.7
  if (ttr >= 0.5 && ttr <= 0.7) {
    return 10;
  }

  // 次优区间：0.4-0.5 或 0.7-0.8
  if ((ttr >= 0.4 && ttr < 0.5) ||
      (ttr > 0.7 && ttr <= 0.8)) {
    return 7;
  }

  // 可接受区间：0.3-0.4 或 0.8-0.9
  if ((ttr >= 0.3 && ttr < 0.4) ||
      (ttr > 0.8 && ttr <= 0.9)) {
    return 4;
  }

  // 过低或过高
  return 2;
}
```

### 3.2 Burstiness得分 (10分)
```typescript
function calculateBurstinessScore(burstiness: number | null): number {
  if (!burstiness) return 0;

  // 最佳区间：10-20
  if (burstiness >= 10 && burstiness <= 20) {
    return 10;
  }

  // 次优区间：5-10 或 20-25
  if ((burstiness >= 5 && burstiness < 10) ||
      (burstiness > 20 && burstiness <= 25)) {
    return 7;
  }

  // 可接受区间：2-5 或 25-30
  if ((burstiness >= 2 && burstiness < 5) ||
      (burstiness > 25 && burstiness <= 30)) {
    return 4;
  }

  // 过低或过高
  return 2;
}
```

### 3.3 指标完整性得分 (5分)
```typescript
function calculateMetricsCompletenessScore(material: StyleAnalysis): number {
  let score = 0;

  if (material.metricsTtr !== null) score += 2;
  if (material.metricsBurstiness !== null) score += 2;
  if (material.metricsAvgSentLen !== null) score += 1;

  return score;
}
```

---

## 四、使用价值评分函数

### 4.1 使用频率得分 (15分)
```typescript
function calculateUsageFrequencyScore(useCount: number): number {
  // 使用对数函数，避免高使用次数过度影响得分
  if (useCount === 0) return 0;
  if (useCount === 1) return 5;
  if (useCount <= 3) return 8;
  if (useCount <= 5) return 10;
  if (useCount <= 10) return 12;
  if (useCount <= 20) return 14;
  return 15;
}
```

### 4.2 时效性得分 (10分)
```typescript
function calculateRecencyScore(lastUsedAt: Date | null): number {
  if (!lastUsedAt) return 0;

  const daysSinceLastUse = Math.floor(
    (Date.now() - lastUsedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 最近7天使用过
  if (daysSinceLastUse <= 7) return 10;

  // 最近30天使用过
  if (daysSinceLastUse <= 30) return 7;

  // 最近90天使用过
  if (daysSinceLastUse <= 90) return 4;

  // 超过90天未使用
  return 2;
}
```

---

这是所有评分函数的实现。接下来还需要输出：
- 评级标准（S/A/B/C/D）
- 问题检测规则
- 展示方式

继续吗？
