import { apiRequest } from '../request'

const DIMENSION_API_PREFIX = '/api/abi-ontology/api/v1/ontology/dimension'
const HIERARCHY_API_PREFIX = '/api/abi-ontology/api/v1/ontology/hierarchy'

interface BatchCreateDimensionModelParams {
  spaceId: number
  techId: string
  semanticsGroupId?: number | string
  groupId?: number
  relSchemaId: number | string
  relViewId?: number | string
}

const MOCK_DIMENSION_CATEGORY_OPTIONS = [
  { label: '地理', value: 'geography' },
  { label: '时间', value: 'time' },
  { label: '组织', value: 'organization' },
  { label: '客户', value: 'customer' },
  { label: '产品', value: 'product' }
]

export function queryDimensionList(params: {
  bizName?: string
  dimCategory?: string
  groupId?: number | string
  pageNum?: number
  pageSize?: number
  semanticType?: string
  spaceId: number
  techName?: string
  versionStatus?: string
}) {
  return apiRequest({
    method: 'post',
    data:params,
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

export function batchCreateDimensionModels(params: BatchCreateDimensionModelParams[]) {
  return apiRequest({
    data: params,
    method: 'post',
    url: `${DIMENSION_API_PREFIX}/batchCreate`
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

export function deleteDimensionModelBatch(params: { ids: number[] }) {
  return apiRequest({
    data: {
      ids: params.ids
    },
    method: 'post',
    url: `${DIMENSION_API_PREFIX}/deleteBatch`
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

export function queryDimensionCategoryOptions(params?: { keyword?: string; spaceId?: number }) {
  const keyword = String(params?.keyword || '').trim().toLowerCase()
  const data = keyword
    ? MOCK_DIMENSION_CATEGORY_OPTIONS.filter(item => item.label.toLowerCase().includes(keyword) || item.value.toLowerCase().includes(keyword))
    : MOCK_DIMENSION_CATEGORY_OPTIONS

  return Promise.resolve({ data })
}
