import assert from "node:assert/strict"
import { PgDialect } from "drizzle-orm/pg-core/dialect"
import { buildXhsJobStatusCondition } from "../../src/server/services/xhs-image-filters"

const dialect = new PgDialect()
const condition = buildXhsJobStatusCondition(["processing"])

assert.ok(condition)

const query = dialect.sqlToQuery(condition)
assert.ok(query.sql.toLowerCase().includes(" in "))
assert.ok(!query.sql.toLowerCase().includes("any"))
assert.deepEqual(query.params, ["processing"])
