import type { KnowledgeIndicatorItem, KnowledgePagination, KnowledgeSearchParams } from '../types/metricModeling.types'
import { getMappedBizNameDisplay, getMappedTechNameDisplay } from '../../../utils/ontologyName'

const INDICATOR_BIZ_NAME_KEYS = ['bizName', 'biz_name', 'indicatorName', 'indicator_name', 'indName', 'ind_name', 'name']
const INDICATOR_TECH_NAME_KEYS = ['techName', 'tech_name', 'indicatorCode', 'indicator_code', 'indCode', 'ind_code']

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
  const rawBizName = pickFirstText(record, INDICATOR_BIZ_NAME_KEYS)
  const rawTechName = pickFirstText(record, INDICATOR_TECH_NAME_KEYS)
  const rawIndicatorCode = pickFirstText(record, ['indicatorCode', 'indicator_code']) || rawTechName

  return {
    ...item,
    bizName: getMappedBizNameDisplay(rawBizName),
    indicatorCode: getMappedTechNameDisplay(rawIndicatorCode),
    rawBizName,
    rawIndicatorCode,
    rawTechName,
    techName: rawTechName
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
