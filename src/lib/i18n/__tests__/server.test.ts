import test from "node:test"
import assert from "node:assert/strict"
import { createServerTranslator } from "../server"
import enMessages from "../../../locales/en.json"


test("createServerTranslator returns localized strings", () => {
  const t = createServerTranslator("en")
  assert.equal(t("tasks.title"), enMessages["tasks.title"])
})
