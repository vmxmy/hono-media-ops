# 质量评分系统 - 评分函数实现

## 一、内容质量评分函数

### 1.1 字数得分 (10分)
```typescript
function calculateWordCountScore(wordCount: number | null): number {
  if (!wordCount) return 0;

  // 最佳区间：2000-5000字
  if (wordCount >= 2000 && wordCount <= 5000) {
    return 10;
  }

  // 次优区间：1000-2000 或 5000-8000
  if ((wordCount >= 1000 && wordCount < 2000) ||
      (wordCount > 5000 && wordCount <= 8000)) {
    return 7;
  }

  // 可接受区间：500-1000 或 8000-10000
  if ((wordCount >= 500 && wordCount < 1000) ||
      (wordCount > 8000 && wordCount <= 10000)) {
    return 4;
  }

  // 过短或过长
  return 2;
}
```

### 1.2 段落数得分 (10分)
```typescript
function calculateParaCountScore(paraCount: number | null): number {
  if (!paraCount) return 0;

  // 最佳区间：5-20段
  if (paraCount >= 5 && paraCount <= 20) {
    return 10;
  }

  // 次优区间：3-5 或 20-30
  if ((paraCount >= 3 && paraCount < 5) ||
      (paraCount > 20 && paraCount <= 30)) {
    return 7;
  }

  // 可接受区间：1-3 或 30-50
  if ((paraCount >= 1 && paraCount < 3) ||
      (paraCount > 30 && paraCount <= 50)) {
    return 4;
  }

  // 过少或过多
  return 2;
}
```

### 1.3 完整性得分 (5分)
```typescript
function calculateCompletenessScore(material: StyleAnalysis): number {
  let score = 0;

  if (material.sourceTitle) score += 1;
  if (material.styleName) score += 1;
  if (material.primaryType) score += 1;
  if (material.executionPrompt) score += 1;
  if (material.analysisVersion) score += 1;

  return score;
}
```

---

## 二、结构质量评分函数

### 2.1 段落密度得分 (10分)
```typescript
function calculateParaDensityScore(material: StyleAnalysis): number {
  if (!material.wordCount || !material.paraCount || material.paraCount === 0) {
    return 0;
  }

  const avgWordPerPara = material.wordCount / material.paraCount;

  // 最佳区间：200-500字/段
  if (avgWordPerPara >= 200 && avgWordPerPara <= 500) {
    return 10;
  }

  // 次优区间：100-200 或 500-800
  if ((avgWordPerPara >= 100 && avgWordPerPara < 200) ||
      (avgWordPerPara > 500 && avgWordPerPara <= 800)) {
    return 7;
  }

  // 可接受区间：50-100 或 800-1000
  if ((avgWordPerPara >= 50 && avgWordPerPara < 100) ||
      (avgWordPerPara > 800 && avgWordPerPara <= 1000)) {
    return 4;
  }

  // 过密或过疏
  return 2;
}
```

### 2.2 句长得分 (10分)
```typescript
function calculateSentLenScore(avgSentLen: number | null): number {
  if (!avgSentLen) return 0;

  // 最佳区间：30-60字
  if (avgSentLen >= 30 && avgSentLen <= 60) {
    return 10;
  }

  // 次优区间：20-30 或 60-80
  if ((avgSentLen >= 20 && avgSentLen < 30) ||
      (avgSentLen > 60 && avgSentLen <= 80)) {
    return 7;
  }

  // 可接受区间：10-20 或 80-100
  if ((avgSentLen >= 10 && avgSentLen < 20) ||
      (avgSentLen > 80 && avgSentLen <= 100)) {
    return 4;
  }

  // 过短或过长
  return 2;
}
```

### 2.3 结构数据得分 (5分)
```typescript
function calculateStructureDataScore(material: StyleAnalysis): number {
  let score = 0;

  if (material.blueprint && Array.isArray(material.blueprint) && material.blueprint.length > 0) {
    score += 2;
  }
  if (material.coreRules && Array.isArray(material.coreRules) && material.coreRules.length > 0) {
    score += 2;
  }
  if (material.styleIdentity) {
    score += 1;
  }

  return score;
}
```

---

这是前两个维度的具体评分函数。接下来还有：
- 指标质量评分函数
- 使用价值评分函数

继续输出吗？
