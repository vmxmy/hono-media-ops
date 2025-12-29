"use client"

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react"

export type Locale = "en" | "zh-CN"

export type I18nKey =
    // Common
    | "common.loading"
    | "common.save"
    | "common.cancel"
    | "common.delete"
    | "common.edit"
    | "common.create"
    | "common.update"
    | "common.confirm"
    | "common.selected"
    | "common.expand"
    | "common.collapse"
    | "common.search"
    | "common.noData"
    | "common.date"
    | "common.enabled"
    | "common.disabled"
    // Auth
    | "auth.login"
    | "auth.logout"
    | "auth.username"
    | "auth.accessCode"
    | "auth.loginButton"
    | "auth.loggingIn"
    | "auth.invalidCredentials"
    | "auth.required"
    | "auth.signInWithGoogle"
    | "auth.signInWithGitHub"
    | "auth.signIn"
    | "auth.usernamePlaceholder"
    | "auth.accessCodePlaceholder"
    | "auth.orContinueWith"
    // Navigation
    | "nav.dashboard"
    | "nav.prompts"
    | "nav.tasks"
    | "nav.settings"
    // Tasks
    | "tasks.title"
    | "tasks.newTask"
    | "tasks.noTasks"
    | "tasks.created"
    | "tasks.untitledTask"
    | "tasks.noKeywords"
    | "tasks.polling"
    | "tasks.refMaterial"
    // Task Status
    | "status.pending"
    | "status.processing"
    | "status.completed"
    | "status.failed"
    | "status.cancelled"
    // Task Actions
    | "task.retry"
    | "task.stop"
    | "task.deleteConfirm"
    | "task.retryConfirm"
    | "task.stopConfirm"
    | "task.updateFailed"
    // Task Form
    | "taskForm.title"
    | "taskForm.regenerateTitle"
    | "taskForm.articleTab"
    | "taskForm.coverTab"
    | "taskForm.topic"
    | "taskForm.topicPlaceholder"
    | "taskForm.keywords"
    | "taskForm.keywordsPlaceholder"
    | "taskForm.totalWordCount"
    | "taskForm.style"
    | "taskForm.stylePlaceholder"
    | "taskForm.openingExample"
    | "taskForm.openingExamplePlaceholder"
    | "taskForm.structureGuide"
    | "taskForm.structureGuidePlaceholder"
    | "taskForm.outputSchema"
    | "taskForm.outputSchemaPlaceholder"
    | "taskForm.coverPrompt"
    | "taskForm.coverPromptPlaceholder"
    | "taskForm.coverRatio"
    | "taskForm.coverResolution"
    | "taskForm.coverModel"
    | "taskForm.coverMode"
    | "taskForm.coverNegativePrompt"
    | "taskForm.coverNegativePromptPlaceholder"
    | "taskForm.submit"
    | "taskForm.submitting"
    | "taskForm.ratio16_9"
    | "taskForm.ratio1_1"
    | "taskForm.ratio4_3"
    | "taskForm.ratio3_4"
    | "taskForm.ratio9_16"
    | "taskForm.ratio21_9"
    | "taskForm.resolution1k"
    | "taskForm.resolution2k"
    | "taskForm.resolution4k"
    | "taskForm.modeText2img"
    | "taskForm.modeSingleImg2img"
    | "taskForm.modeMultiImg2img"
    | "taskForm.useSearch"
    // Wizard steps
    | "taskForm.step1Title"
    | "taskForm.step2Title"
    | "taskForm.step2Desc"
    | "taskForm.step3Title"
    | "taskForm.selectCoverPrompt"
    | "taskForm.coverStylePrompt"
    | "taskForm.coverStylePromptPlaceholder"
    | "taskForm.noMaterials"
    | "taskForm.prev"
    | "taskForm.next"
    // Prompts
    | "prompts.title"
    | "prompts.createPrompt"
    | "prompts.editPrompt"
    | "prompts.name"
    | "prompts.content"
    | "prompts.category"
    | "prompts.description"
    | "prompts.noPrompts"
    | "prompts.deleteConfirm"
    // Settings
    | "settings.title"
    | "settings.appearance"
    | "settings.theme"
    | "settings.language"
    | "settings.light"
    | "settings.dark"
    | "settings.auto"
    | "settings.defaultTheme"
    // Insights
    | "nav.insights"
    | "insights.title"
    | "insights.styleProfile"
    | "insights.noProfile"
    | "insights.totalAnalyses"
    | "insights.successRate"
    | "insights.topGenres"
    | "insights.averageMetrics"
    | "insights.metrics"
    | "insights.burstiness"
    | "insights.ttr"
    | "insights.avgSentLen"
    | "insights.avgParaLen"
    | "insights.wordCount"
    | "insights.toneKeywords"
    | "insights.commonVocabulary"
    | "insights.lastAnalysis"
    | "insights.metricsTrend"
    | "insights.days"
    | "insights.genreInsights"
    | "insights.selectGenre"
    | "insights.promptSuggestions"
    | "insights.topPrompts"
    | "insights.qualityScore"
    | "insights.viewPrompt"
    | "insights.statistics"
    | "insights.byStatus"
    | "insights.byGenre"
    | "insights.topCategories"
    | "insights.selectCategory"
    | "insights.categoryInsights"
    | "insights.byCategory"
    | "insights.byStyleName"
    | "insights.byTextType"
    | "insights.ttrDescription"
    | "insights.burstyDescription"
    // Reverse
    | "nav.reverse"
    | "reverse.title"
    | "reverse.description"
    | "reverse.inputType"
    | "reverse.typeUrl"
    | "reverse.typeText"
    | "reverse.urlPlaceholder"
    | "reverse.textPlaceholder"
    | "reverse.contentPlaceholder"
    | "reverse.submit"
    | "reverse.submitting"
    | "reverse.submitSuccess"
    | "reverse.submitError"
    | "reverse.urlRequired"
    | "reverse.textRequired"
    | "reverse.invalidUrl"
    | "reverse.newAnalysis"
    | "reverse.noRecords"
    | "reverse.articleTitle"
    | "reverse.articleUrl"
    | "reverse.readOriginal"
    | "reverse.genre"
    | "reverse.status"
    | "reverse.createdAt"
    | "reverse.viewPrompt"
    | "reverse.statusSuccess"
    | "reverse.statusFailed"
    | "reverse.statusPending"
    | "reverse.untitled"
    | "reverse.detail"
    | "reverse.originalContent"
    | "reverse.reverseResult"
    | "reverse.tone"
    | "reverse.structure"
    | "reverse.vocabulary"
    | "reverse.metrics"
    | "reverse.modelName"
    | "reverse.totalTokens"
    | "reverse.cost"
    | "reverse.executionId"
    | "reverse.noContent"
    | "reverse.deleteConfirm"
    | "reverse.tabStyle"
    | "reverse.tabPrompt"
    | "reverse.tabBlueprint"
    | "reverse.tabMetrics"
    | "reverse.styleName"
    | "reverse.archetype"
    | "reverse.targetAudience"
    | "reverse.toneKeywords"
    | "reverse.clickToViewFull"
    | "reverse.totalWords"
    | "reverse.metaProfile"
    | "reverse.personaDescription"
    | "reverse.voiceTraits"
    | "reverse.voiceFormality"
    | "reverse.voiceEnergy"
    | "reverse.voiceWarmth"
    | "reverse.voiceConfidence"
    | "reverse.sentenceCount"
    | "reverse.paragraphCount"
    | "reverse.analysisConfidence"
    | "reverse.styleStability"
    | "reverse.styleConsistency"
    | "reverse.coreRulesCount"
    | "reverse.topRuleFeature"
    | "reverse.tabVoice"
    | "reverse.tabCoreRules"
    | "reverse.sentenceTemplates"
    | "reverse.antiPatterns"
    | "reverse.secondaryTraits"
    | "reverse.textTypeRationale"
    | "reverse.tabGoldenSamples"
    | "reverse.tabTransferDemo"
    | "reverse.tabLexicalRhetoric"
    | "reverse.tabExecutionPrompt"
    | "reverse.goldenSample"
    | "reverse.sampleText"
    | "reverse.sampleReason"
    | "reverse.transferBefore"
    | "reverse.transferAfter"
    | "reverse.transferExplanation"
    | "reverse.vocabularyTier"
    | "reverse.preferredTerms"
    | "reverse.bannedTerms"
    | "reverse.preferredDevices"
    | "reverse.deviceFrequency"
    | "reverse.executionPrompt"
    | "reverse.analysisVersion"
    | "reverse.noSamples"
    | "reverse.noTransferDemo"
    | "reverse.tabRules"
    | "reverse.tabSamples"
    | "reverse.coreRulesSection"
    | "reverse.lexicalSection"
    | "reverse.rhetoricSection"
    | "reverse.antiPatternsSection"
    | "reverse.goldenSamplesSection"
    | "reverse.transferDemoSection"
    | "reverse.executionPromptLabel"
    | "reverse.deleteSuccess"
    | "reverse.deleteFailed"
    | "reverse.copySuccess"
    | "reverse.copyFailed"
    | "reverse.noPromptToCopy"
    | "reverse.cloneToTask"
    | "reverse.colTitle"
    | "reverse.colType"
    | "reverse.colArchetype"
    | "reverse.colWordCount"
    | "reverse.colTtr"
    | "reverse.colUpdated"
    | "reverse.colActions"
    | "reverse.noLogs"
    // App
    | "app.title"
    | "app.description"
    // Article viewer
    | "article.preview"
    | "article.source"
    | "article.copyMarkdown"
    | "article.copied"
    | "article.viewArticle"
    | "common.close"

interface I18nContextValue {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: I18nKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = "media-ops-locale"

const MESSAGES: Record<Locale, Record<I18nKey, string>> = {
    en: {
        // Common
        "common.loading": "Loading...",
        "common.save": "Save",
        "common.cancel": "Cancel",
        "common.delete": "Delete",
        "common.edit": "Edit",
        "common.create": "Create",
        "common.update": "Update",
        "common.confirm": "Confirm",
        "common.selected": "Selected",
        "common.expand": "Expand",
        "common.collapse": "Collapse",
        "common.search": "Search",
        "common.noData": "No data",
        "common.date": "Date",
        "common.enabled": "Enabled",
        "common.disabled": "Disabled",
        // Auth
        "auth.login": "Login",
        "auth.logout": "Logout",
        "auth.username": "Username",
        "auth.accessCode": "Access Code",
        "auth.loginButton": "Login",
        "auth.loggingIn": "Logging in...",
        "auth.invalidCredentials": "Invalid username or access code",
        "auth.required": "Username and access code are required",
        "auth.signInWithGoogle": "Sign in with Google",
        "auth.signInWithGitHub": "Sign in with GitHub",
        "auth.signIn": "Sign In",
        "auth.usernamePlaceholder": "Enter username",
        "auth.accessCodePlaceholder": "Enter access code",
        "auth.orContinueWith": "Or continue with",
        // Navigation
        "nav.dashboard": "Dashboard",
        "nav.prompts": "Prompts",
        "nav.tasks": "Write",
        "nav.settings": "Settings",
        // Tasks
        "tasks.title": "Write Something",
        "tasks.newTask": "New Task",
        "tasks.noTasks": "No tasks yet",
        "tasks.created": "Created",
        "tasks.untitledTask": "Untitled Task",
        "tasks.noKeywords": "No keywords",
        "tasks.polling": "{count} task(s) processing, auto-refreshing...",
        "tasks.refMaterial": "Reference material",
        // Task Status
        "status.pending": "Pending",
        "status.processing": "Processing",
        "status.completed": "Completed",
        "status.failed": "Failed",
        "status.cancelled": "Cancelled",
        // Task Actions
        "task.retry": "Retry",
        "task.stop": "Stop",
        "task.deleteConfirm": "Are you sure you want to delete this task?",
        "task.retryConfirm": "Are you sure you want to retry this task?",
        "task.stopConfirm": "Are you sure you want to stop this task?",
        "task.updateFailed": "Failed to update task",
        // Task Form
        "taskForm.title": "New Task",
        "taskForm.regenerateTitle": "Regenerate Task",
        "taskForm.articleTab": "Article Config",
        "taskForm.coverTab": "Cover Config",
        "taskForm.topic": "Topic",
        "taskForm.topicPlaceholder": "Enter article topic",
        "taskForm.keywords": "Keywords",
        "taskForm.keywordsPlaceholder": "Separate keywords with commas",
        "taskForm.totalWordCount": "Total Word Count",
        "taskForm.style": "Writing Style",
        "taskForm.stylePlaceholder": "Leave empty to use default style template",
        "taskForm.openingExample": "Opening Example",
        "taskForm.openingExamplePlaceholder": "Leave empty to use default opening",
        "taskForm.structureGuide": "Structure Guide",
        "taskForm.structureGuidePlaceholder": "Leave empty to use default structure",
        "taskForm.outputSchema": "Output Schema",
        "taskForm.outputSchemaPlaceholder": "Leave empty to use default schema",
        "taskForm.coverPrompt": "Cover Prompt",
        "taskForm.coverPromptPlaceholder": "Describe cover style: tech, flat illustration, 3D render, etc.",
        "taskForm.coverRatio": "Aspect Ratio",
        "taskForm.coverResolution": "Resolution",
        "taskForm.coverModel": "Model",
        "taskForm.coverMode": "Generation Mode",
        "taskForm.coverNegativePrompt": "Negative Prompt",
        "taskForm.coverNegativePromptPlaceholder": "blur, deformed, low quality, watermark, text",
        "taskForm.submit": "Submit Task",
        "taskForm.submitting": "Submitting...",
        "taskForm.ratio16_9": "16:9 (Landscape)",
        "taskForm.ratio1_1": "1:1 (Square)",
        "taskForm.ratio4_3": "4:3",
        "taskForm.ratio3_4": "3:4",
        "taskForm.ratio9_16": "9:16 (Portrait)",
        "taskForm.ratio21_9": "21:9 (Ultra Wide)",
        "taskForm.resolution1k": "1K (Recommended)",
        "taskForm.resolution2k": "2K",
        "taskForm.resolution4k": "4K",
        "taskForm.modeText2img": "Text to Image",
        "taskForm.modeSingleImg2img": "Single Image to Image",
        "taskForm.modeMultiImg2img": "Multi Image to Image",
        "taskForm.useSearch": "Use search engine to find references",
        // Wizard steps
        "taskForm.step1Title": "What do you want to write?",
        "taskForm.step2Title": "Choose a style reference",
        "taskForm.step2Desc": "Select a material to use its writing style (optional)",
        "taskForm.step3Title": "Cover image style",
        "taskForm.selectCoverPrompt": "Select a cover image style prompt (optional)",
        "taskForm.coverStylePrompt": "Style prompt",
        "taskForm.coverStylePromptPlaceholder": "Describe the visual style for the cover image...",
        "taskForm.noMaterials": "No materials available. Add some in the Material Library first.",
        "taskForm.prev": "Previous",
        "taskForm.next": "Next",
        // Prompts
        "prompts.title": "Prompt Management",
        "prompts.createPrompt": "Create Prompt",
        "prompts.editPrompt": "Edit Prompt",
        "prompts.name": "Name",
        "prompts.content": "Content",
        "prompts.category": "Category",
        "prompts.description": "Description",
        "prompts.noPrompts": "No prompts yet",
        "prompts.deleteConfirm": "Are you sure you want to delete this prompt?",
        // Settings
        "settings.title": "Settings",
        "settings.appearance": "Appearance",
        "settings.theme": "Theme",
        "settings.language": "Language",
        "settings.light": "Light",
        "settings.dark": "Dark",
        "settings.auto": "Auto",
        "settings.defaultTheme": "Default",
        // Insights
        "nav.insights": "Insights",
        "insights.title": "Writing Style Insights",
        "insights.styleProfile": "Style Profile",
        "insights.noProfile": "No analysis data yet. Submit an article for reverse engineering to get started.",
        "insights.totalAnalyses": "Total Analyses",
        "insights.successRate": "Success Rate",
        "insights.topGenres": "Top Genres",
        "insights.averageMetrics": "Average Metrics",
        "insights.metrics": "Metrics",
        "insights.burstiness": "Burstiness",
        "insights.ttr": "TTR (Type-Token Ratio)",
        "insights.avgSentLen": "Avg Sentence Length",
        "insights.avgParaLen": "Avg Paragraph Length",
        "insights.wordCount": "Word Count",
        "insights.toneKeywords": "Tone Keywords",
        "insights.commonVocabulary": "Common Vocabulary",
        "insights.lastAnalysis": "Last Analysis",
        "insights.metricsTrend": "Metrics Trend",
        "insights.days": "{count} Days",
        "insights.genreInsights": "Genre Insights",
        "insights.selectGenre": "Select a genre",
        "insights.promptSuggestions": "Prompt Suggestions",
        "insights.topPrompts": "Top Quality Prompts",
        "insights.qualityScore": "Quality Score",
        "insights.viewPrompt": "View Prompt",
        "insights.statistics": "Statistics",
        "insights.byStatus": "By Status",
        "insights.byGenre": "By Genre",
        "insights.topCategories": "Top Categories",
        "insights.selectCategory": "Select a category",
        "insights.categoryInsights": "Category Insights",
        "insights.byCategory": "By Category",
        "insights.byStyleName": "By Style Name",
        "insights.byTextType": "By Text Type",
        "insights.ttrDescription": "Vocabulary Richness",
        "insights.burstyDescription": "Rhythm Variation",
        // Materials (formerly Reverse)
        "nav.reverse": "Materials",
        "reverse.title": "Material Library",
        "reverse.description": "Submit article URL or text to analyze writing style and extract reusable prompts.",
        "reverse.inputType": "Input Type",
        "reverse.typeUrl": "URL",
        "reverse.typeText": "Text Content",
        "reverse.urlPlaceholder": "Enter article URL (e.g., WeChat article link)",
        "reverse.textPlaceholder": "Paste article text content here...",
        "reverse.contentPlaceholder": "Article content or link...",
        "reverse.submit": "Submit for Analysis",
        "reverse.submitting": "Submitting...",
        "reverse.submitSuccess": "Submitted successfully! You can view results in the Insights page.",
        "reverse.submitError": "Submission failed. Please try again.",
        "reverse.urlRequired": "Please enter a URL",
        "reverse.textRequired": "Please enter text content",
        "reverse.invalidUrl": "Please enter a valid URL",
        "reverse.newAnalysis": "Add Material",
        "reverse.noRecords": "No analysis records yet",
        "reverse.articleTitle": "Article Title",
        "reverse.articleUrl": "Article URL",
        "reverse.readOriginal": "Read Original",
        "reverse.genre": "Genre",
        "reverse.status": "Status",
        "reverse.createdAt": "Created",
        "reverse.viewPrompt": "View Prompt",
        "reverse.statusSuccess": "Success",
        "reverse.statusFailed": "Failed",
        "reverse.statusPending": "Pending",
        "reverse.untitled": "Untitled",
        "reverse.detail": "Analysis Detail",
        "reverse.originalContent": "Original Content",
        "reverse.reverseResult": "Analysis Result",
        "reverse.tone": "Tone",
        "reverse.structure": "Structure",
        "reverse.vocabulary": "Vocabulary",
        "reverse.metrics": "Metrics",
        "reverse.modelName": "Model",
        "reverse.totalTokens": "Total Tokens",
        "reverse.cost": "Estimated Cost",
        "reverse.executionId": "Execution ID",
        "reverse.noContent": "No content",
        "reverse.deleteConfirm": "Are you sure you want to delete this record?",
        "reverse.tabStyle": "Style",
        "reverse.tabPrompt": "Prompt",
        "reverse.tabBlueprint": "Blueprint",
        "reverse.tabMetrics": "Metrics",
        "reverse.styleName": "Style Name",
        "reverse.archetype": "Archetype",
        "reverse.targetAudience": "Target Audience",
        "reverse.toneKeywords": "Tone Keywords",
        "reverse.clickToViewFull": "Click title to view full details",
        "reverse.totalWords": "Total Words",
        "reverse.metaProfile": "Meta Profile",
        "reverse.personaDescription": "Persona Description",
        "reverse.voiceTraits": "Voice Traits",
        "reverse.voiceFormality": "Formality",
        "reverse.voiceEnergy": "Energy",
        "reverse.voiceWarmth": "Warmth",
        "reverse.voiceConfidence": "Confidence",
        "reverse.sentenceCount": "Sentences",
        "reverse.paragraphCount": "Paragraphs",
        "reverse.analysisConfidence": "Analysis Confidence",
        "reverse.styleStability": "Style Stability",
        "reverse.styleConsistency": "Consistency",
        "reverse.coreRulesCount": "Core Rules",
        "reverse.topRuleFeature": "Top Feature",
        "reverse.tabVoice": "Voice",
        "reverse.tabCoreRules": "Core Rules",
        "reverse.sentenceTemplates": "Sentence Templates",
        "reverse.antiPatterns": "Anti-Patterns",
        "reverse.secondaryTraits": "Secondary Traits",
        "reverse.textTypeRationale": "Type Rationale",
        "reverse.tabGoldenSamples": "Golden Samples",
        "reverse.tabTransferDemo": "Transfer Demo",
        "reverse.tabLexicalRhetoric": "Lexical & Rhetoric",
        "reverse.tabExecutionPrompt": "Execution Prompt",
        "reverse.goldenSample": "Golden Sample",
        "reverse.sampleText": "Sample Text",
        "reverse.sampleReason": "Why It's Good",
        "reverse.transferBefore": "Before",
        "reverse.transferAfter": "After",
        "reverse.transferExplanation": "Explanation",
        "reverse.vocabularyTier": "Vocabulary Level",
        "reverse.preferredTerms": "Preferred Terms",
        "reverse.bannedTerms": "Banned Terms",
        "reverse.preferredDevices": "Preferred Devices",
        "reverse.deviceFrequency": "Device Frequency",
        "reverse.executionPrompt": "Execution Prompt",
        "reverse.analysisVersion": "Version",
        "reverse.noSamples": "No golden samples available",
        "reverse.noTransferDemo": "No transfer demo available",
        "reverse.tabRules": "Rules",
        "reverse.tabSamples": "Samples",
        "reverse.coreRulesSection": "Core Rules",
        "reverse.lexicalSection": "Lexical Constraints",
        "reverse.rhetoricSection": "Rhetoric Patterns",
        "reverse.antiPatternsSection": "Anti-Patterns",
        "reverse.goldenSamplesSection": "Golden Samples",
        "reverse.transferDemoSection": "Style Transfer",
        "reverse.executionPromptLabel": "Execution Prompt",
        "reverse.deleteSuccess": "Deleted successfully",
        "reverse.deleteFailed": "Delete failed",
        "reverse.copySuccess": "Copied to clipboard",
        "reverse.copyFailed": "Copy failed",
        "reverse.noPromptToCopy": "No prompt to copy",
        "reverse.cloneToTask": "Clone to Task",
        "reverse.colTitle": "Title",
        "reverse.colType": "Type",
        "reverse.colArchetype": "Archetype",
        "reverse.colWordCount": "Words",
        "reverse.colTtr": "Vocab Richness",
        "reverse.colUpdated": "Updated",
        "reverse.colActions": "Actions",
        "reverse.noLogs": "No materials yet",
        // App
        "app.title": "Ghostwriter",
        "app.description": "AI-powered article generation platform",
        // Article viewer
        "article.preview": "Preview",
        "article.source": "Source",
        "article.copyMarkdown": "Copy Markdown",
        "article.copied": "Copied!",
        "article.viewArticle": "View Article",
        "common.close": "Close",
    },
    "zh-CN": {
        // Common
        "common.loading": "加载中...",
        "common.save": "保存",
        "common.cancel": "取消",
        "common.delete": "删除",
        "common.edit": "编辑",
        "common.create": "创建",
        "common.update": "更新",
        "common.confirm": "确认",
        "common.selected": "已选择",
        "common.expand": "展开",
        "common.collapse": "收起",
        "common.search": "搜索",
        "common.noData": "暂无数据",
        "common.date": "日期",
        "common.enabled": "已开启",
        "common.disabled": "已关闭",
        // Auth
        "auth.login": "登录",
        "auth.logout": "退出登录",
        "auth.username": "用户名",
        "auth.accessCode": "访问码",
        "auth.loginButton": "登录",
        "auth.loggingIn": "登录中...",
        "auth.invalidCredentials": "用户名或访问码无效",
        "auth.required": "请输入用户名和访问码",
        "auth.signInWithGoogle": "使用 Google 登录",
        "auth.signInWithGitHub": "使用 GitHub 登录",
        "auth.signIn": "登录",
        "auth.usernamePlaceholder": "请输入用户名",
        "auth.accessCodePlaceholder": "请输入访问码",
        "auth.orContinueWith": "或使用以下方式登录",
        // Navigation
        "nav.dashboard": "仪表盘",
        "nav.prompts": "提示词",
        "nav.tasks": "写点东西",
        "nav.settings": "设置",
        // Tasks
        "tasks.title": "写点东西",
        "tasks.newTask": "新建任务",
        "tasks.noTasks": "暂无任务",
        "tasks.created": "创建时间",
        "tasks.untitledTask": "未命名任务",
        "tasks.noKeywords": "无关键词",
        "tasks.polling": "{count} 个任务处理中，自动刷新中...",
        "tasks.refMaterial": "参考素材",
        // Task Status
        "status.pending": "等待中",
        "status.processing": "处理中",
        "status.completed": "已完成",
        "status.failed": "失败",
        "status.cancelled": "已取消",
        // Task Actions
        "task.retry": "重新发起",
        "task.stop": "停止",
        "task.deleteConfirm": "确定要删除这个任务吗？",
        "task.retryConfirm": "确定要重新发起这个任务吗？",
        "task.stopConfirm": "确定要停止这个任务吗？",
        "task.updateFailed": "更新任务失败",
        // Task Form
        "taskForm.title": "新建生成任务",
        "taskForm.regenerateTitle": "重新生成任务",
        "taskForm.articleTab": "文章配置",
        "taskForm.coverTab": "封面配置",
        "taskForm.topic": "主题",
        "taskForm.topicPlaceholder": "请输入文章主题",
        "taskForm.keywords": "关键字",
        "taskForm.keywordsPlaceholder": "多个关键词用逗号分隔",
        "taskForm.totalWordCount": "总字数",
        "taskForm.style": "写作风格",
        "taskForm.stylePlaceholder": "可留空则使用环境变量 WRITING_STYLE_TEMPLATE",
        "taskForm.openingExample": "开场范例",
        "taskForm.openingExamplePlaceholder": "可留空则使用环境变量 OPENING_EXAMPLE",
        "taskForm.structureGuide": "结构骨架",
        "taskForm.structureGuidePlaceholder": "可留空则使用环境变量 STRUCTURE_GUIDE",
        "taskForm.outputSchema": "输出结构",
        "taskForm.outputSchemaPlaceholder": "可留空则使用环境变量 OUTPUT_SCHEMA",
        "taskForm.coverPrompt": "封面提示词",
        "taskForm.coverPromptPlaceholder": "描述封面图片风格，如：科技感、扁平插画、3D渲染等",
        "taskForm.coverRatio": "图片比例",
        "taskForm.coverResolution": "分辨率",
        "taskForm.coverModel": "模型",
        "taskForm.coverMode": "生图模式",
        "taskForm.coverNegativePrompt": "负面提示词",
        "taskForm.coverNegativePromptPlaceholder": "模糊, 变形, 低质量, 水印, 文字",
        "taskForm.submit": "提交任务",
        "taskForm.submitting": "提交中...",
        "taskForm.ratio16_9": "16:9 (横屏)",
        "taskForm.ratio1_1": "1:1 (方形)",
        "taskForm.ratio4_3": "4:3",
        "taskForm.ratio3_4": "3:4",
        "taskForm.ratio9_16": "9:16 (竖屏)",
        "taskForm.ratio21_9": "21:9 (超宽)",
        "taskForm.resolution1k": "1K (推荐)",
        "taskForm.resolution2k": "2K",
        "taskForm.resolution4k": "4K",
        "taskForm.modeText2img": "文生图",
        "taskForm.modeSingleImg2img": "单图生图",
        "taskForm.modeMultiImg2img": "多图生图",
        "taskForm.useSearch": "使用搜索引擎查找参考资料",
        // Wizard steps
        "taskForm.step1Title": "想写点什么?",
        "taskForm.step2Title": "选择风格参考",
        "taskForm.step2Desc": "选择一个素材作为写作风格参考 (可选)",
        "taskForm.step3Title": "封面图风格",
        "taskForm.selectCoverPrompt": "选择封面图风格提示词 (可选)",
        "taskForm.coverStylePrompt": "风格提示词",
        "taskForm.coverStylePromptPlaceholder": "描述封面图片的视觉风格...",
        "taskForm.noMaterials": "暂无素材。请先在素材仓库中添加一些素材。",
        "taskForm.prev": "上一步",
        "taskForm.next": "下一步",
        // Prompts
        "prompts.title": "提示词管理",
        "prompts.createPrompt": "创建提示词",
        "prompts.editPrompt": "编辑提示词",
        "prompts.name": "名称",
        "prompts.content": "内容",
        "prompts.category": "分类",
        "prompts.description": "描述",
        "prompts.noPrompts": "暂无提示词",
        "prompts.deleteConfirm": "确定要删除这个提示词吗？",
        // Settings
        "settings.title": "设置",
        "settings.appearance": "外观",
        "settings.theme": "主题",
        "settings.language": "语言",
        "settings.light": "浅色",
        "settings.dark": "深色",
        "settings.auto": "自动",
        "settings.defaultTheme": "默认",
        // Insights
        "nav.insights": "风格洞察",
        "insights.title": "写作风格分析",
        "insights.styleProfile": "风格画像",
        "insights.noProfile": "暂无分析数据。提交文章进行逆向工程以开始分析。",
        "insights.totalAnalyses": "分析总数",
        "insights.successRate": "成功率",
        "insights.topGenres": "常用文体",
        "insights.averageMetrics": "平均指标",
        "insights.metrics": "指标",
        "insights.burstiness": "节奏变化度",
        "insights.ttr": "词汇丰富度 (TTR)",
        "insights.avgSentLen": "平均句长",
        "insights.avgParaLen": "平均段落长度",
        "insights.wordCount": "字数",
        "insights.toneKeywords": "语调关键词",
        "insights.commonVocabulary": "常用词汇",
        "insights.lastAnalysis": "最近分析",
        "insights.metricsTrend": "指标趋势",
        "insights.days": "{count} 天",
        "insights.genreInsights": "文体洞察",
        "insights.selectGenre": "选择文体",
        "insights.promptSuggestions": "Prompt 建议",
        "insights.topPrompts": "高质量 Prompt 排行",
        "insights.qualityScore": "质量分数",
        "insights.viewPrompt": "查看 Prompt",
        "insights.statistics": "统计概览",
        "insights.byStatus": "按状态",
        "insights.byGenre": "按文体",
        "insights.topCategories": "常用分类",
        "insights.selectCategory": "选择分类",
        "insights.categoryInsights": "分类洞察",
        "insights.byCategory": "按分类",
        "insights.byStyleName": "按风格名称",
        "insights.byTextType": "按文本类型",
        "insights.ttrDescription": "词汇丰富度",
        "insights.burstyDescription": "节奏变化度",
        // 素材仓库 (formerly 逆向分析)
        "nav.reverse": "素材仓库",
        "reverse.title": "素材仓库",
        "reverse.description": "提交文章链接或文本，分析写作风格并提取可复用的提示词。",
        "reverse.inputType": "输入类型",
        "reverse.typeUrl": "网址",
        "reverse.typeText": "文本内容",
        "reverse.urlPlaceholder": "输入文章链接（如微信公众号文章链接）",
        "reverse.textPlaceholder": "在此粘贴文章文本内容...",
        "reverse.contentPlaceholder": "文章内容或链接...",
        "reverse.submit": "提交分析",
        "reverse.submitting": "提交中...",
        "reverse.submitSuccess": "提交成功！您可以在风格洞察页面查看分析结果。",
        "reverse.submitError": "提交失败，请重试。",
        "reverse.urlRequired": "请输入网址",
        "reverse.textRequired": "请输入文本内容",
        "reverse.invalidUrl": "请输入有效的网址",
        "reverse.newAnalysis": "添加素材",
        "reverse.noRecords": "暂无分析记录",
        "reverse.articleTitle": "文章标题",
        "reverse.articleUrl": "文章链接",
        "reverse.readOriginal": "阅读原文",
        "reverse.genre": "文体",
        "reverse.status": "状态",
        "reverse.createdAt": "创建时间",
        "reverse.viewPrompt": "查看 Prompt",
        "reverse.statusSuccess": "成功",
        "reverse.statusFailed": "失败",
        "reverse.statusPending": "处理中",
        "reverse.untitled": "未命名",
        "reverse.detail": "分析详情",
        "reverse.originalContent": "原文内容",
        "reverse.reverseResult": "分析结果",
        "reverse.tone": "语气",
        "reverse.structure": "结构",
        "reverse.vocabulary": "词汇",
        "reverse.metrics": "指标",
        "reverse.modelName": "模型",
        "reverse.totalTokens": "Token 数",
        "reverse.cost": "预估成本",
        "reverse.executionId": "执行 ID",
        "reverse.noContent": "无内容",
        "reverse.deleteConfirm": "确定要删除这条记录吗？",
        "reverse.tabStyle": "风格画像",
        "reverse.tabPrompt": "提示词",
        "reverse.tabBlueprint": "结构蓝图",
        "reverse.tabMetrics": "量化指标",
        "reverse.styleName": "风格名称",
        "reverse.archetype": "写作人设",
        "reverse.targetAudience": "目标受众",
        "reverse.toneKeywords": "语调关键词",
        "reverse.clickToViewFull": "点击标题查看完整详情",
        "reverse.totalWords": "总字数",
        "reverse.metaProfile": "元数据画像",
        "reverse.personaDescription": "人设描述",
        "reverse.voiceTraits": "声音特征",
        "reverse.voiceFormality": "正式度",
        "reverse.voiceEnergy": "能量感",
        "reverse.voiceWarmth": "温暖度",
        "reverse.voiceConfidence": "自信度",
        "reverse.sentenceCount": "句子数",
        "reverse.paragraphCount": "段落数",
        "reverse.analysisConfidence": "分析置信度",
        "reverse.styleStability": "风格稳定性",
        "reverse.styleConsistency": "一致性",
        "reverse.coreRulesCount": "核心规则数",
        "reverse.topRuleFeature": "主要特征",
        "reverse.tabVoice": "声音",
        "reverse.tabCoreRules": "核心规则",
        "reverse.sentenceTemplates": "句式模板",
        "reverse.antiPatterns": "反模式",
        "reverse.secondaryTraits": "次要特征",
        "reverse.textTypeRationale": "类型分析",
        "reverse.tabGoldenSamples": "黄金样本",
        "reverse.tabTransferDemo": "风格迁移",
        "reverse.tabLexicalRhetoric": "词汇修辞",
        "reverse.tabExecutionPrompt": "执行提示词",
        "reverse.goldenSample": "黄金样本",
        "reverse.sampleText": "样本文本",
        "reverse.sampleReason": "入选理由",
        "reverse.transferBefore": "改写前",
        "reverse.transferAfter": "改写后",
        "reverse.transferExplanation": "改写说明",
        "reverse.vocabularyTier": "词汇层级",
        "reverse.preferredTerms": "推荐用词",
        "reverse.bannedTerms": "禁用词汇",
        "reverse.preferredDevices": "偏好修辞",
        "reverse.deviceFrequency": "修辞频率",
        "reverse.executionPrompt": "执行提示词",
        "reverse.analysisVersion": "版本",
        "reverse.noSamples": "暂无黄金样本",
        "reverse.noTransferDemo": "暂无风格迁移示例",
        "reverse.tabRules": "规则",
        "reverse.tabSamples": "样本",
        "reverse.coreRulesSection": "核心规则",
        "reverse.lexicalSection": "词汇约束",
        "reverse.rhetoricSection": "修辞模式",
        "reverse.antiPatternsSection": "反面模式",
        "reverse.goldenSamplesSection": "黄金样本",
        "reverse.transferDemoSection": "风格迁移",
        "reverse.executionPromptLabel": "执行提示词",
        "reverse.deleteSuccess": "删除成功",
        "reverse.deleteFailed": "删除失败",
        "reverse.copySuccess": "已复制到剪贴板",
        "reverse.copyFailed": "复制失败",
        "reverse.noPromptToCopy": "没有可复制的提示词",
        "reverse.cloneToTask": "复刻任务",
        "reverse.colTitle": "标题",
        "reverse.colType": "类型",
        "reverse.colArchetype": "原型",
        "reverse.colWordCount": "字数",
        "reverse.colTtr": "词汇丰富度",
        "reverse.colUpdated": "更新时间",
        "reverse.colActions": "操作",
        "reverse.noLogs": "暂无素材",
        // App
        "app.title": "抄手",
        "app.description": "AI 驱动的文章生成平台",
        // Article viewer
        "article.preview": "预览",
        "article.source": "源码",
        "article.copyMarkdown": "复制 Markdown",
        "article.copied": "已复制！",
        "article.viewArticle": "查看文章",
        "common.close": "关闭",
    },
}

function formatMessage(
    template: string,
    vars?: Record<string, string | number>
): string {
    if (!vars) return template
    return template.replace(/\{(\w+)\}/g, (_, key) => {
        return vars[key]?.toString() ?? `{${key}}`
    })
}

function detectLocale(): Locale {
    if (typeof window === "undefined") return "zh-CN"

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "en" || stored === "zh-CN") return stored

    const browserLang = navigator.language
    if (browserLang.startsWith("zh")) return "zh-CN"
    return "en"
}

interface I18nProviderProps {
    children: React.ReactNode
    defaultLocale?: Locale
}

export function I18nProvider({
    children,
    defaultLocale = "zh-CN",
}: I18nProviderProps) {
    const [locale, setLocaleState] = useState<Locale>(defaultLocale)

    useEffect(() => {
        const detected = detectLocale()
        setLocaleState(detected)
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return
        document.documentElement.lang = locale
    }, [locale])

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale)
        try {
            localStorage.setItem(STORAGE_KEY, newLocale)
        } catch (error) {
            console.warn("[I18nProvider] Failed to persist locale", error)
        }
    }, [])

    const t = useCallback(
        (key: I18nKey, vars?: Record<string, string | number>): string => {
            const messages = MESSAGES[locale]
            const template = messages[key] ?? MESSAGES.en[key] ?? key
            return formatMessage(template, vars)
        },
        [locale]
    )

    const value = useMemo<I18nContextValue>(
        () => ({ locale, setLocale, t }),
        [locale, setLocale, t]
    )

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
    const context = useContext(I18nContext)
    if (!context) {
        throw new Error("useI18n must be used within an I18nProvider")
    }
    return context
}
