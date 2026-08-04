import type { KnowledgeIndicatorItem, KnowledgePagination, KnowledgeSearchParams } from '../types/metricModeling.types'

const INDICATOR_BIZ_NAME_KEYS = ['bizName', 'biz_name', 'indicatorName', 'indicator_name', 'indName', 'ind_name', 'name']

interface KnowledgeIndicatorListQueryInput {
  readonly groupId: string
  readonly pagination: Pick<KnowledgePagination, 'pageNum' | 'pageSize'>
  readonly searchParams: KnowledgeSearchParams
  readonly spaceId: number
}

function pickFirstText(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key]
    if (value === null || value === undefined) {
      continue
    }
    const text = String(value).trim()
    if (text) {
      return text
    }
  }
  return undefined
}

export function normalizeKnowledgeIndicatorListItem(item: KnowledgeIndicatorItem): KnowledgeIndicatorItem {
  const record = item as KnowledgeIndicatorItem & Record<string, unknown>

  return {
    ...item,
    bizName: pickFirstText(record, INDICATOR_BIZ_NAME_KEYS)
  }
}

export function buildKnowledgeIndicatorListQuery(input: KnowledgeIndicatorListQueryInput) {
  const { groupId, pagination, searchParams, spaceId } = input

  return {
    bizName: searchParams.bizName || undefined,
    groupId,
    indicatorClass: searchParams.type || undefined,
    pageNum: pagination.pageNum,
    pageSize: pagination.pageSize,
    spaceId,
    status: searchParams.status
  }
}
