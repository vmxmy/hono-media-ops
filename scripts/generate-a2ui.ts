/**
 * A2UI Code Generator
 *
 * Generates TypeScript types and Catalog definitions from schema JSON.
 * Single Source of Truth for A2UI component definitions.
 *
 * Usage: npx tsx scripts/generate-a2ui.ts
 */

import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Types for schema parsing
interface PropertyDefinition {
  type: "string" | "number" | "boolean" | "array" | "object" | "action" | "node"
  required?: boolean
  description?: string
  enum?: string[]
  default?: unknown
  items?: {
    type: string
    properties?: Record<string, { type: string }>
  }
}

interface ComponentDefinition {
  description: string
  category: "layout" | "content" | "interactive" | "feedback" | "custom"
  supportsChildren?: boolean
  properties: Record<string, PropertyDefinition>
}

interface CatalogSchema {
  $schema?: string
  id: string
  name: string
  version: string
  description: string
  components: Record<string, ComponentDefinition>
}

// Paths
const SCHEMA_PATH = path.join(__dirname, "../src/lib/a2ui/schema/standard-catalog.json")
const TYPES_OUTPUT = path.join(__dirname, "../src/lib/a2ui/generated/types.ts")
const CATALOG_OUTPUT = path.join(__dirname, "../src/lib/a2ui/generated/catalog.ts")

// Helpers
function pascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
}

function generatePropertyType(prop: PropertyDefinition): string {
  if (prop.enum) {
    return prop.enum.map((v) => `"${v}"`).join(" | ")
  }

  switch (prop.type) {
    case "string":
      return "string"
    case "number":
      return "number"
    case "boolean":
      return "boolean"
    case "action":
      return "A2UIAction"
    case "node":
      return "A2UINode"
    case "array":
      if (prop.items?.type === "object") {
        const itemProps = prop.items.properties
        if (itemProps) {
          const fields = Object.entries(itemProps)
            .map(([k, v]) => {
              // Map property types correctly
              const fieldType = v.type === "node" ? "A2UINode" : v.type
              return `${k}: ${fieldType}`
            })
            .join("; ")
          return `Array<{ ${fields} }>`
        }
      }
      return "unknown[]"
    case "object":
      return "Record<string, unknown>"
    default:
      return "unknown"
  }
}

function generateTypes(schema: CatalogSchema): string {
  const lines: string[] = []

  // Header
  lines.push("// AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY")
  lines.push("// Generated from: src/lib/a2ui/schema/standard-catalog.json")
  lines.push(`// Generated at: ${new Date().toISOString()}`)
  lines.push("")
  lines.push('import type { CSSProperties } from "react"')
  lines.push("")

  // Base node interface
  lines.push("// Base node interface")
  lines.push("export interface A2UIBaseNode {")
  lines.push("  id?: string")
  lines.push("  style?: CSSProperties")
  lines.push("}")
  lines.push("")

  // Action type
  lines.push("// Action definition")
  lines.push("export interface A2UIAction {")
  lines.push("  action: string")
  lines.push("  args?: unknown[]")
  lines.push("  stopPropagation?: boolean")
  lines.push("}")
  lines.push("")

  // Forward declare A2UINode for recursive types
  lines.push("// Forward declaration for recursive types")
  lines.push("export type A2UINode =")
  const nodeTypes = Object.keys(schema.components).map(
    (type) => `  | A2UI${pascalCase(type)}Node`
  )
  lines.push(nodeTypes.join("\n"))
  lines.push("")

  // Generate each component interface
  for (const [type, component] of Object.entries(schema.components)) {
    const interfaceName = `A2UI${pascalCase(type)}Node`

    lines.push(`// ${component.description}`)
    lines.push(`export interface ${interfaceName} extends A2UIBaseNode {`)
    lines.push(`  type: "${type}"`)

    // Add children if supported
    if (component.supportsChildren) {
      lines.push("  children?: A2UINode[]")
    }

    // Add properties
    for (const [propName, prop] of Object.entries(component.properties)) {
      const propType = generatePropertyType(prop)
      const optional = prop.required ? "" : "?"
      const comment = prop.description ? ` // ${prop.description}` : ""
      lines.push(`  ${propName}${optional}: ${propType}${comment}`)
    }

    lines.push("}")
    lines.push("")
  }

  // Response type
  lines.push("// A2UI Response format (from server)")
  lines.push("export interface A2UIResponse {")
  lines.push("  nodes: A2UINode | A2UINode[]")
  lines.push("  metadata?: Record<string, unknown>")
  lines.push("}")
  lines.push("")

  // Action handler type
  lines.push("// Action handler type")
  lines.push("export type A2UIActionHandler = (action: string, args?: unknown[]) => void")
  lines.push("")

  return lines.join("\n")
}

function generateCatalog(schema: CatalogSchema): string {
  const lines: string[] = []

  // Header
  lines.push("// AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY")
  lines.push("// Generated from: src/lib/a2ui/schema/standard-catalog.json")
  lines.push(`// Generated at: ${new Date().toISOString()}`)
  lines.push("")
  lines.push('import type { A2UIComponentDefinition, A2UICatalog } from "../catalog"')
  lines.push("")

  // Schema metadata
  lines.push("// Catalog metadata")
  lines.push(`export const CATALOG_ID = "${schema.id}"`)
  lines.push(`export const CATALOG_NAME = "${schema.name}"`)
  lines.push(`export const CATALOG_VERSION = "${schema.version}"`)
  lines.push("")

  // Component definitions
  lines.push("// Component definitions")
  lines.push("export const COMPONENT_DEFINITIONS: A2UIComponentDefinition[] = [")

  for (const [type, component] of Object.entries(schema.components)) {
    lines.push("  {")
    lines.push(`    type: "${type}",`)
    lines.push(`    description: "${component.description}",`)
    lines.push(`    category: "${component.category}",`)

    if (component.supportsChildren) {
      lines.push("    supportsChildren: true,")
    }

    lines.push("    properties: {")
    for (const [propName, prop] of Object.entries(component.properties)) {
      lines.push(`      ${propName}: {`)
      lines.push(`        type: "${prop.type}",`)
      if (prop.required) lines.push("        required: true,")
      if (prop.description) lines.push(`        description: "${prop.description}",`)
      if (prop.enum) lines.push(`        enum: ${JSON.stringify(prop.enum)},`)
      if (prop.default !== undefined) {
        const defaultVal =
          typeof prop.default === "string" ? `"${prop.default}"` : prop.default
        lines.push(`        default: ${defaultVal},`)
      }
      lines.push("      },")
    }
    lines.push("    },")
    lines.push("  },")
  }

  lines.push("]")
  lines.push("")

  // Create catalog function
  lines.push("// Create the standard catalog")
  lines.push("export function createGeneratedCatalog(): A2UICatalog {")
  lines.push("  const catalog: A2UICatalog = {")
  lines.push(`    id: CATALOG_ID,`)
  lines.push(`    name: CATALOG_NAME,`)
  lines.push(`    version: CATALOG_VERSION,`)
  lines.push(`    description: "${schema.description}",`)
  lines.push("    components: new Map(),")
  lines.push("  }")
  lines.push("")
  lines.push("  for (const definition of COMPONENT_DEFINITIONS) {")
  lines.push("    catalog.components.set(definition.type, definition)")
  lines.push("  }")
  lines.push("")
  lines.push("  return catalog")
  lines.push("}")
  lines.push("")

  // Component type list
  lines.push("// All component types")
  const types = Object.keys(schema.components)
  lines.push(`export const COMPONENT_TYPES = ${JSON.stringify(types)} as const`)
  lines.push("export type ComponentType = typeof COMPONENT_TYPES[number]")
  lines.push("")

  return lines.join("\n")
}

// Main
function main() {
  console.log("🔧 A2UI Code Generator")
  console.log("─".repeat(40))

  // Read schema
  console.log("📖 Reading schema...")
  const schemaContent = fs.readFileSync(SCHEMA_PATH, "utf-8")
  const schema: CatalogSchema = JSON.parse(schemaContent)

  console.log(`   Catalog: ${schema.name} v${schema.version}`)
  console.log(`   Components: ${Object.keys(schema.components).length}`)

  // Ensure output directory exists
  const outputDir = path.dirname(TYPES_OUTPUT)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Generate types
  console.log("📝 Generating TypeScript types...")
  const typesContent = generateTypes(schema)
  fs.writeFileSync(TYPES_OUTPUT, typesContent)
  console.log(`   → ${TYPES_OUTPUT}`)

  // Generate catalog
  console.log("📝 Generating Catalog definitions...")
  const catalogContent = generateCatalog(schema)
  fs.writeFileSync(CATALOG_OUTPUT, catalogContent)
  console.log(`   → ${CATALOG_OUTPUT}`)

  console.log("─".repeat(40))
  console.log("✅ Generation complete!")
}

main()
