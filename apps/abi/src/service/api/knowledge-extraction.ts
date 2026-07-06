import { apiRequest } from '../request'

const INDICATOR_API_PREFIX = '/api/abi-ontology/api/v1/ontology/indicator'

export function queryKnowledgeIndicators(params: Record<string, any> & { pageNum?: number; pageSize?: number; spaceId: number }) {
  return apiRequest({
    data: {
      pageNum: 1,
      pageSize: 1000,
      ...params
    },
    method: 'post',
    url: `${INDICATOR_API_PREFIX}/list`
  })
}

export function addKnowledgeIndicator(params: Record<string, any>) {
  return apiRequest({
    data: params,
    method: 'post',
    url: `${INDICATOR_API_PREFIX}/create`
  })
}

export function editKnowledgeIndicator(params: Record<string, any>) {
  return apiRequest({
    data: params,
    method: 'put',
    url: `${INDICATOR_API_PREFIX}/update`
  })
}

export function deleteKnowledgeIndicator(params: { id: number; spaceId: number; techName?: string }) {
  return apiRequest({
    method: 'delete',
    params: {
      spaceId: params.spaceId,
      techName: params.techName || ''
    },
    url: `${INDICATOR_API_PREFIX}/delete/${params.id}`
  })
}

export function deleteKnowledgeIndicatorBatch(params: { ids: number[] }) {
  return apiRequest({
    data: {
      ids: params.ids
    },
    method: 'post',
    url: `${INDICATOR_API_PREFIX}/deleteBatch`
  })
}

export function queryKnowledgeIndicatorDetail(params: { id: number; }) {
  return apiRequest({
    method: 'get',
    url: `${INDICATOR_API_PREFIX}/detail/${params.id}`
  })
}

export function queryKnowledgeIndicatorDetailList(params: {
  dimId: number
  pageNum?: number
  pageSize?: number
  techName?: string
}) {
  return apiRequest({
    data: {
      pageNum: 1,
      pageSize: 10,
      ...params
    },
    method: 'post',
    url: `${INDICATOR_API_PREFIX}/detail`
  })
}

export function syncAtomicIndicators(data: Array<Record<string, any>>) {
  return apiRequest({
    data,
    method: 'post',
    url: `${INDICATOR_API_PREFIX}/sync/atom`
  })
}
