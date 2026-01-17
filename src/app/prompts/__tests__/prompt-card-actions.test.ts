import { test } from "node:test"
import assert from "node:assert/strict"
import { buildPromptCardActionButtons } from "../prompt-card-actions"

const t = (key: string) => key

test("includes delete action button", () => {
  const nodes = buildPromptCardActionButtons(t, "prompt-1")
  const deleteButton = nodes.find(
    (node) => node.type === "button" && node.text === "common.delete"
  )
  assert.ok(deleteButton, "delete button should exist")
  assert.equal(deleteButton?.onClick?.action, "delete")
  assert.equal(deleteButton?.onClick?.stopPropagation, true)
})
