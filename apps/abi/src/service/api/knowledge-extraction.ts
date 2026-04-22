import { apiRequest } from '../request'

export function queryKnowledgeIndicators(params: { pageNum?: number; pageSize?: number; spaceId: number }) {
  return apiRequest({
    data: {
      pageNum: 1,
      pageSize: 1000,
      ...params
    },
    method: 'post',
    url: '/api/ontology/api/v1/ontology/indicator/list'
  })
}

export function addKnowledgeIndicator(params: Record<string, any>) {
  return apiRequest({
    data: params,
    method: 'post',
    url: '/api/ontology/api/v1/ontology/indicator/create'
  })
}

export function editKnowledgeIndicator(params: Record<string, any>) {
  return apiRequest({
    data: params,
    method: 'put',
    url: '/api/ontology/api/v1/ontology/indicator/update'
  })
}

export function deleteKnowledgeIndicator(params: { id: number; spaceId: number; techName?: string }) {
  return apiRequest({
    method: 'delete',
    params: {
      spaceId: params.spaceId,
      techName: params.techName || ''
    },
    url: `/api/ontology/api/v1/ontology/indicator/delete/${params.id}`
  })
}

export function queryKnowledgeIndicatorDetail(params: { id: number; spaceId: number; techName?: string }) {
  return apiRequest({
    method: 'get',
    params: {
      spaceId: params.spaceId,
      techName: params.techName || ''
    },
    url: `/api/ontology/api/v1/ontology/indicator/detail/${params.id}`
  })
}
