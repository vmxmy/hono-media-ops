export interface A2UIPropertyDefinition {
  type: string
  description?: string
  required?: boolean
  enum?: string[]
  default?: unknown
}

export interface A2UIComponentDefinition {
  type: string
  description?: string
  category?: string
  supportsChildren?: boolean
  properties: Record<string, A2UIPropertyDefinition>
}

export interface A2UICatalog {
  id?: string
  name: string
  version?: string
  description?: string
  components: Map<string, A2UIComponentDefinition>
}
