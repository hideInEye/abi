export interface SchemaField {
  alias?: string
  bizName?: string
  description?: string
  name: string
  semantic: 'date' | 'dim' | 'metric' | 'pk'
  semLabel: string
  tableDesc?: string
  tableName?: string
  type: string
}

export interface SchemaTable {
  bizName: string
  description?: string
  fields: SchemaField[]
  loading?: boolean
  schemaId: number | string
  techName?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function asRecordList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord).filter((item) => item !== null) : []
}

function firstText(item: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' || typeof value === 'number') return String(value)
  }
  return ''
}

/** Parse the API model detail without loading the schema drawer implementation. */
export function parseSchemaFieldsFromModelDetail(modelDetailStr: string): SchemaField[] {
  try {
    const detail = asRecord(JSON.parse(modelDetailStr))
    if (!detail) return []

    const fields: SchemaField[] = []
    const addFields = (items: unknown, semantic: SchemaField['semantic'], semLabel: string) => {
      asRecordList(items).forEach((item) => {
        fields.push({
          alias: firstText(item, ['alias']),
          bizName: firstText(item, ['bizName']),
          description: firstText(item, ['fieldDesc']),
          name: firstText(item, ['originName', 'fieldName', 'techName']),
          semantic,
          semLabel,
          tableDesc: firstText(item, ['tdesc', 'rtableName']),
          tableName: firstText(item, ['tableName']),
          type: firstText(item, ['fieldType']),
        })
      })
    }
    addFields(detail.identifiers, 'pk', '主键')
    const dimensions = asRecordList(detail.dimensions)
    addFields(
      dimensions.filter((item) => item.type === 'datetime'),
      'date',
      '日期',
    )
    addFields(
      dimensions.filter((item) => item.type !== 'datetime'),
      'dim',
      '维度',
    )
    addFields(detail.measures, 'metric', '指标')
    return fields
  } catch {
    return []
  }
}
