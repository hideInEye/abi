import type { OntologyEntityAttribute, OntologyEntityAttributeDataType, SaveOntologyEntityAttribute } from '@/pages/workbench/ontology-kg/shared-network-types'

import type { AttributeAsset } from '../types'

export const ENTITY_CODE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{1,49}$/

/** Entity attribute API data type: text / integer / decimal / datetime / bytes / boolean. */
const INTEGER_DATA_TYPES = new Set(['bigint', 'byte', 'int', 'int16', 'int32', 'int64', 'integer', 'long', 'short', 'smallint', 'tinyint', 'uint', 'uint16', 'uint32', 'uint64'])
const DECIMAL_DATA_TYPES = new Set(['amount', 'decimal', 'double', 'float', 'money', 'num', 'number', 'numeric', 'percentage', 'real'])
const TIME_DATA_TYPES = new Set(['date', 'datetime', 'month', 'quarter', 'time', 'timestamp', 'year'])
const BYTE_DATA_TYPES = new Set(['binary', 'blob', 'bytea', 'bytes', 'varbinary'])
const BOOLEAN_DATA_TYPES = new Set(['bool', 'boolean'])

/**
 * Converts source module data types to the integer enum accepted by entity/attribute/save.
 * Unknown source types intentionally become text rather than leaking a source-specific type.
 */
export function toEntityAttributeDataType(value: unknown): OntologyEntityAttributeDataType {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5) return value as OntologyEntityAttributeDataType
  if (typeof value !== 'string') return 0

  const normalized = value.trim().toLowerCase()
  if (!normalized) return 0
  if (/^[0-5]$/.test(normalized)) return Number(normalized) as OntologyEntityAttributeDataType
  if (INTEGER_DATA_TYPES.has(normalized)) return 1
  if (DECIMAL_DATA_TYPES.has(normalized) || /^(decimal|numeric|number|float|double)\s*[<(]/.test(normalized)) return 2
  if (TIME_DATA_TYPES.has(normalized) || /^(date|time|timestamp|datetime)\s*[<(]/.test(normalized)) return 3
  if (BYTE_DATA_TYPES.has(normalized)) return 4
  if (BOOLEAN_DATA_TYPES.has(normalized)) return 5
  return 0
}

export function makeAttributes(assets: AttributeAsset[], attributeType: Exclude<OntologyEntityAttribute['attributeType'], 'field'>, remark?: string): OntologyEntityAttribute[] {
  return assets.map((asset) => ({
    attributeCode: asset.attributeCode,
    attributeName: asset.attributeName,
    attributeType,
    ...(asset.dataType === undefined || asset.dataType === null ? {} : { dataType: String(asset.dataType) }),
    relateDictId: asset.relateDictId,
    remark: remark || asset.remark || undefined,
  }))
}

/**
 * Builds the exact attribute object accepted by entity/attribute/save.
 * Draft data returned by the entity API can contain persistence metadata; none of it is sent back.
 */
export function makeEntityAttributeSaveItems(attributes: OntologyEntityAttribute[]): SaveOntologyEntityAttribute[] {
  return attributes.map((attribute) => {
    const dataType = toEntityAttributeDataType(attribute.dataType)
    const remark = attribute.remark?.trim()
    const item: SaveOntologyEntityAttribute = {
      attributeCode: attribute.attributeCode,
      attributeName: attribute.attributeName,
      attributeType: attribute.attributeType,
      dataType,
    }
    if (attribute.relateDictId !== undefined && attribute.relateDictId !== null) item.relateDictId = attribute.relateDictId
    if (remark) item.remark = remark
    return item
  })
}
