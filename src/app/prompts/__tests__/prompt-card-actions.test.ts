import { test } from "node:test"
import assert from "node:assert/strict"
import { buildPromptCardActionButtons } from "../prompt-card-actions"
import type { I18nKey } from "@/contexts/i18n-context"
import type { A2UIButtonNode } from "@/lib/a2ui"

const t = (key: I18nKey) => key

test("includes delete action button", () => {
  const nodes = buildPromptCardActionButtons(t, "prompt-1")
  const deleteButton = nodes.find(
    (node) => node.type === "button" && node.text === "common.delete"
  ) as A2UIButtonNode | undefined
  assert.ok(deleteButton, "delete button should exist")
  assert.equal(deleteButton?.onClick?.action, "delete")
  assert.equal(deleteButton?.onClick?.stopPropagation, true)
})
