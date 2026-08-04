import type { OntologyEntityAttribute, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'
import type { TableSemanticsGroupType } from '@/service/api/table-semantics'

type SupportedAttributeType = Exclude<OntologyEntityAttribute['attributeType'], 'field'>
type UnknownRecord = Record<string, unknown>

export interface AttributeGroup {
  groupId: OntologyNetworkId
  groupName: string
  parentId?: OntologyNetworkId | null
  sortOrder?: number
}

export interface AttributeGroupTreeOption {
  children?: AttributeGroupTreeOption[]
  label: string
  title: string
  value: string
}

export const ATTRIBUTE_GROUP_TYPE_BY_ATTRIBUTE: Record<SupportedAttributeType, TableSemanticsGroupType> = {
  dimension: 'ontology-dimension',
  indicator: 'ontology',
  label: 'tag',
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getPathValue(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!isRecord(value)) return undefined
    return value[key]
  }, source)
}

function getGroupRows(response: unknown): unknown[] {
  const paths = [
    'records',
    'list',
    'rows',
    'data',
    'data.records',
    'data.list',
    'data.rows',
    'response.data',
    'response.data.records',
    'response.data.list',
    'response.data.rows',
    'response.data.data',
  ]

  for (const path of paths) {
    const value = getPathValue(response, path)
    if (Array.isArray(value)) return value
  }

  return []
}

function normalizeGroupId(value: unknown): OntologyNetworkId | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value
  return undefined
}

function normalizeSortOrder(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

export function normalizeAttributeGroupRows(response: unknown): AttributeGroup[] {
  return getGroupRows(response)
    .map((item) => {
      if (!isRecord(item)) return null
      const groupId = normalizeGroupId(item.groupId ?? item.id)
      const groupName = typeof item.groupName === 'string' ? item.groupName.trim() : ''
      if (groupId === undefined || !groupName) return null

      return {
        groupId,
        groupName,
        parentId: normalizeGroupId(item.parentId) ?? 0,
        sortOrder: normalizeSortOrder(item.sortOrder),
      }
    })
    .filter((item): item is AttributeGroup => item !== null)
}

function sortGroups(groups: AttributeGroup[]): AttributeGroup[] {
  return [...groups].sort((a, b) => {
    const orderA = a.sortOrder ?? 0
    const orderB = b.sortOrder ?? 0
    if (orderA !== orderB) return orderA - orderB
    return a.groupName.localeCompare(b.groupName, 'zh-Hans-CN')
  })
}

function getParentKey(group: AttributeGroup): string {
  const parentId = group.parentId
  return parentId === undefined || parentId === null || String(parentId) === '' ? '0' : String(parentId)
}

export function buildAttributeGroupTreeOptions(groups: AttributeGroup[]): AttributeGroupTreeOption[] {
  const idSet = new Set(groups.map((group) => String(group.groupId)))
  const groupsByParent = new Map<string, AttributeGroup[]>()

  groups.forEach((group) => {
    const parentKey = getParentKey(group)
    const normalizedParentKey = parentKey === '0' || idSet.has(parentKey) ? parentKey : '0'
    const siblings = groupsByParent.get(normalizedParentKey) ?? []
    siblings.push(group)
    groupsByParent.set(normalizedParentKey, siblings)
  })

  const buildOptions = (parentKey: string, parentPath: string): AttributeGroupTreeOption[] =>
    sortGroups(groupsByParent.get(parentKey) ?? []).map((group) => {
      const groupId = String(group.groupId)
      const path = parentPath ? `${parentPath}/${group.groupName}` : group.groupName
      const children = buildOptions(groupId, path)

      return {
        ...(children.length > 0 ? { children } : {}),
        label: path,
        title: group.groupName,
        value: groupId,
      }
    })

  return buildOptions('0', '')
}

