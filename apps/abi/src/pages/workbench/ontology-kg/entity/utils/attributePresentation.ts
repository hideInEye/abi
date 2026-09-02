import type { OntologyEntityAttribute } from '@/pages/workbench/ontology-kg/shared-network-types'

import type { AttributeAsset } from '../types'

export type SupportedAttributeType = Exclude<OntologyEntityAttribute['attributeType'], 'field'>
export type AttributeFilterKey = 'all' | SupportedAttributeType
export type AttributeTone = 'blue' | 'green' | 'neutral' | 'orange'

export interface AttributeFilterItem {
  count: number
  key: AttributeFilterKey
  label: string
  tone: AttributeTone
}

export interface AttributeTypePresentation {
  label: string
  tone: AttributeTone
}

export interface AttributeAssetOption {
  disabled?: boolean
  label: string
  value: string
}

export const SUPPORTED_ATTRIBUTE_TYPES: SupportedAttributeType[] = ['dimension', 'indicator', 'label']

export const ATTRIBUTE_TYPE_PRESENTATION: Record<OntologyEntityAttribute['attributeType'], AttributeTypePresentation> = {
  dimension: { label: '维度属性', tone: 'blue' },
  field: { label: '字段属性', tone: 'neutral' },
  indicator: { label: '指标属性', tone: 'green' },
  label: { label: '标签属性', tone: 'orange' },
}

export function getMappedAttributeDisplayName(value: unknown): string {
  const text = String(value ?? '').trim()
  const match = /_\s*#\s*_?/.exec(text)
  if (!match || match.index === undefined) return text

  const sourceName = text.slice(0, match.index).trim()
  const fieldName = text.slice(match.index + match[0].length).trim()
  return fieldName || sourceName || text
}

export function buildAttributeAssetOptions(assets: AttributeAsset[]): AttributeAssetOption[] {
  return [
    { disabled: assets.length === 0, label: `绑定当前分组（${assets.length} 个资产）`, value: '__group__' },
    ...assets.map((asset) => ({ label: `${getMappedAttributeDisplayName(asset.attributeName)}（${asset.attributeCode}）`, value: String(asset.id) })),
  ]
}

export function buildAttributeFilterItems(attributes: OntologyEntityAttribute[]): AttributeFilterItem[] {
  return [
    { count: attributes.length, key: 'all', label: '全部', tone: 'blue' },
    ...SUPPORTED_ATTRIBUTE_TYPES.map((type) => ({
      count: attributes.filter((attribute) => attribute.attributeType === type).length,
      key: type,
      label: ATTRIBUTE_TYPE_PRESENTATION[type].label,
      tone: ATTRIBUTE_TYPE_PRESENTATION[type].tone,
    })),
  ]
}
