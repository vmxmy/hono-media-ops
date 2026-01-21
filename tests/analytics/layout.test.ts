import assert from "node:assert/strict"
import { analyticsHeader, analyticsGrid, ANALYTICS_LAYOUT } from "../../src/lib/analytics/layout"

const header = analyticsHeader("标题", "描述")
assert.equal(header.type, "column")
assert.equal(ANALYTICS_LAYOUT.cardMinWidth, "280px")

const grid = analyticsGrid([{ type: "card" }])
assert.equal(grid.type, "container")
