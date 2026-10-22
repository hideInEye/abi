import { queryLineageRelationList } from '@/service/api/data-preparation'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import { normalizeRelations } from './adapter'
import type { AnalysisMode, MetadataAnalysisContext } from './types'

export function buildLineageQuery(context: MetadataAnalysisContext, mode: AnalysisMode, cachedSpaceId?: string | null) {
  const spaceId = Number(context.spaceId || cachedSpaceId)
  if (!Number.isFinite(spaceId) || spaceId <= 0) throw new Error('未获取到空间ID')

  // 数据源沿用既有接口大小写，其余节点类型原样传递（包括后端的 LABLE）。
  const nodeType = context.nodeType === 'DATA_SOURCE' ? 'Data_Source' : context.nodeType
  const nodeId = context.nodeId === undefined || context.nodeId === null || `${context.nodeId}` === '' ? undefined : String(context.nodeId)
  return mode === 'lineage'
    ? { spaceId, targetNodeType: nodeType, ...(nodeId === undefined ? {} : { targetNodeId: nodeId }) }
    : { spaceId, sourceNodeType: nodeType, ...(nodeId === undefined ? {} : { sourceNodeId: nodeId }) }
}

export async function queryMetadataRelations(context: MetadataAnalysisContext, mode: AnalysisMode, cachedSpaceId?: string | null) {
  const response = await queryLineageRelationList(buildLineageQuery(context, mode, cachedSpaceId))
  assertFlatRequestSuccess(response, '查询失败')
  const payload = response.data
  if (payload?.success === false) throw new Error(payload.errMsg || payload.Code || '查询失败')
  return normalizeRelations(payload)
}
