import { apiRequest } from '../request'

const DIMENSION_API_PREFIX = '/api/abi-ontology/api/v1/ontology/dimension'
const HIERARCHY_API_PREFIX = '/api/abi-ontology/api/v1/ontology/hierarchy'

export function queryDimensionList(params: {
  bizName?: string
  dimCategory?: string
  groupId?: number
  pageNum?: number
  pageSize?: number
  semanticType?: string
  spaceId: number
  techName?: string
  versionStatus?: string
}) {
  return apiRequest({
    data: {
      pageNum: 1,
      pageSize: 1000,
      ...params
    },
    method: 'post',
    url: `${DIMENSION_API_PREFIX}/list`
  })
}

export function addDimensionModel(params: Record<string, any>) {
  return apiRequest({
    data: params,
    method: 'post',
    url: `${DIMENSION_API_PREFIX}/create`
  })
}

export function editDimensionModel(params: Record<string, any>) {
  return apiRequest({
    data: params,
    method: 'put',
    url: `${DIMENSION_API_PREFIX}/update`
  })
}

export function deleteDimensionModel(params: { id: number }) {
  return apiRequest({
    method: 'delete',
    url: `${DIMENSION_API_PREFIX}/delete/${params.id}`
  })
}

export function queryDimensionDetail(params: { id: number }) {
  return apiRequest({
    method: 'get',
    url: `${DIMENSION_API_PREFIX}/detail/${params.id}`
  })
}

export function queryDimensionPreview(params: { dimId: number }) {
  return apiRequest({
    method: 'get',
    url: `${DIMENSION_API_PREFIX}/preview/${params.dimId}`
  })
}

export function editDimensionHierarchy(params: Record<string, any>[]) {
  return apiRequest({
    data: params,
    method: 'post',
    url: `${HIERARCHY_API_PREFIX}/edit`
  })
}

export function queryDimensionHierarchyByDimId(params: { dimId: number }) {
  return apiRequest({
    method: 'get',
    url: `${HIERARCHY_API_PREFIX}/listByDimId/${params.dimId}`
  })
}
