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
    | "common.search"
    | "common.noData"
    // Auth
    | "auth.login"
    | "auth.logout"
    | "auth.username"
    | "auth.accessCode"
    | "auth.loginButton"
    | "auth.loggingIn"
    | "auth.invalidCredentials"
    | "auth.required"
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
    // Task Form
    | "taskForm.title"
    | "taskForm.regenerateTitle"
    | "taskForm.articleTab"
    | "taskForm.coverTab"
    | "taskForm.topic"
    | "taskForm.topicPlaceholder"
    | "taskForm.keywords"
    | "taskForm.keywordsPlaceholder"
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
    | "insights.burstiness"
    | "insights.ttr"
    | "insights.avgSentLen"
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
    // App
    | "app.title"
    | "app.description"

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
        "common.search": "Search",
        "common.noData": "No data",
        // Auth
        "auth.login": "Login",
        "auth.logout": "Logout",
        "auth.username": "Username",
        "auth.accessCode": "Access Code",
        "auth.loginButton": "Login",
        "auth.loggingIn": "Logging in...",
        "auth.invalidCredentials": "Invalid username or access code",
        "auth.required": "Username and access code are required",
        // Navigation
        "nav.dashboard": "Dashboard",
        "nav.prompts": "Prompts",
        "nav.tasks": "Writing Tasks",
        "nav.settings": "Settings",
        // Tasks
        "tasks.title": "Writing Tasks",
        "tasks.newTask": "New Task",
        "tasks.noTasks": "No tasks yet",
        "tasks.created": "Created",
        "tasks.untitledTask": "Untitled Task",
        "tasks.noKeywords": "No keywords",
        "tasks.polling": "{count} task(s) processing, auto-refreshing...",
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
        // Task Form
        "taskForm.title": "New Task",
        "taskForm.regenerateTitle": "Regenerate Task",
        "taskForm.articleTab": "Article Config",
        "taskForm.coverTab": "Cover Config",
        "taskForm.topic": "Topic",
        "taskForm.topicPlaceholder": "Enter article topic",
        "taskForm.keywords": "Keywords",
        "taskForm.keywordsPlaceholder": "Separate keywords with commas",
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
        "insights.burstiness": "Burstiness",
        "insights.ttr": "TTR (Type-Token Ratio)",
        "insights.avgSentLen": "Avg Sentence Length",
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
        // Reverse
        "nav.reverse": "Reverse",
        "reverse.title": "Article Reverse Engineering",
        "reverse.description": "Submit an article URL or text content to analyze its writing style and extract a reusable system prompt.",
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
        "reverse.newAnalysis": "New Analysis",
        "reverse.noRecords": "No analysis records yet",
        "reverse.articleTitle": "Article Title",
        "reverse.articleUrl": "Article URL",
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
        // App
        "app.title": "Media Ops",
        "app.description": "AI-powered article generation platform",
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
        "common.search": "搜索",
        "common.noData": "暂无数据",
        // Auth
        "auth.login": "登录",
        "auth.logout": "退出登录",
        "auth.username": "用户名",
        "auth.accessCode": "访问码",
        "auth.loginButton": "登录",
        "auth.loggingIn": "登录中...",
        "auth.invalidCredentials": "用户名或访问码无效",
        "auth.required": "请输入用户名和访问码",
        // Navigation
        "nav.dashboard": "仪表盘",
        "nav.prompts": "提示词",
        "nav.tasks": "写作任务",
        "nav.settings": "设置",
        // Tasks
        "tasks.title": "写作任务",
        "tasks.newTask": "新建任务",
        "tasks.noTasks": "暂无任务",
        "tasks.created": "创建时间",
        "tasks.untitledTask": "未命名任务",
        "tasks.noKeywords": "无关键词",
        "tasks.polling": "{count} 个任务处理中，自动刷新中...",
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
        // Task Form
        "taskForm.title": "新建生成任务",
        "taskForm.regenerateTitle": "重新生成任务",
        "taskForm.articleTab": "文章配置",
        "taskForm.coverTab": "封面配置",
        "taskForm.topic": "主题",
        "taskForm.topicPlaceholder": "请输入文章主题",
        "taskForm.keywords": "关键字",
        "taskForm.keywordsPlaceholder": "多个关键词用逗号分隔",
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
        "insights.burstiness": "节奏变化度",
        "insights.ttr": "词汇丰富度 (TTR)",
        "insights.avgSentLen": "平均句长",
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
        // Reverse
        "nav.reverse": "逆向分析",
        "reverse.title": "文章逆向工程",
        "reverse.description": "提交文章链接或文本内容，分析其写作风格并提取可复用的系统提示词。",
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
        "reverse.newAnalysis": "发起分析",
        "reverse.noRecords": "暂无分析记录",
        "reverse.articleTitle": "文章标题",
        "reverse.articleUrl": "文章链接",
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
        // App
        "app.title": "Media Ops",
        "app.description": "AI 驱动的文章生成平台",
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
