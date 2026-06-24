import type {
  CreateOntologyEntityParams,
  CreateOntologyRelationParams,
  DeleteOntologyEntityParams,
  DeleteOntologyRelationParams,
  GetOntologyEntityParams,
  OntologyEntity,
  OntologyEntityDetail,
  OntologyGraphData,
  OntologyLabel,
  OntologyNetworkPageResult,
  OntologyRelation,
  QueryOntologyEntityListParams,
  QueryOntologyGraphParams,
  QueryOntologyLabelParams,
  QueryOntologyRelationListParams,
  SaveOntologyEntityAttributesParams,
  UpdateOntologyEntityParams,
  UpdateOntologyRelationParams,
} from '@/pages/workbench/ontology-kg/shared-network-types'

import { apiRequest } from '../request'

const ONTOLOGY_NETWORK_API_PREFIX = '/api/abi-ontology/v1/ontology'
const ONTOLOGY_LABEL_API_PREFIX = '/api/abi-copilot/v1/label'

/** 查询可用于实体标签类型的推荐标签。 */
export function queryOntologyLabels(params: QueryOntologyLabelParams) {
  return apiRequest<OntologyLabel[]>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_LABEL_API_PREFIX}/get`,
  })
}

/** 查询实体定义列表。 */
export function queryOntologyEntityList(params: QueryOntologyEntityListParams) {
  return apiRequest<OntologyNetworkPageResult<OntologyEntity>>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_NETWORK_API_PREFIX}/entity/list`,
  })
}

/** 获取实体及其已绑定属性。 */
export function getOntologyEntity(params: GetOntologyEntityParams) {
  return apiRequest<OntologyEntityDetail>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_NETWORK_API_PREFIX}/entity/get`,
  })
}

/** 新增实体定义。 */
export function createOntologyEntity(params: CreateOntologyEntityParams) {
  return apiRequest<OntologyEntity>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_NETWORK_API_PREFIX}/entity/add`,
  })
}

/** 更新实体允许变更的字段。 */
export function updateOntologyEntity(params: UpdateOntologyEntityParams) {
  return apiRequest<OntologyEntity>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_NETWORK_API_PREFIX}/entity/update`,
  })
}

/** 删除实体定义。 */
export function deleteOntologyEntity(params: DeleteOntologyEntityParams) {
  return apiRequest<boolean>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_NETWORK_API_PREFIX}/entity/delete`,
  })
}

/** 覆盖保存实体的完整属性绑定草稿。 */
export function saveOntologyEntityAttributes(params: SaveOntologyEntityAttributesParams) {
  return apiRequest<boolean>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_NETWORK_API_PREFIX}/entity/attribute/save`,
  })
}

/** 查询关系配置列表。 */
export function queryOntologyRelationList(params: QueryOntologyRelationListParams) {
  return apiRequest<OntologyNetworkPageResult<OntologyRelation>>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_NETWORK_API_PREFIX}/relation/list`,
  })
}

/** 新增实体关系。labelId 由后端处理，前端不传递。 */
export function createOntologyRelation(params: CreateOntologyRelationParams) {
  return apiRequest<OntologyRelation>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_NETWORK_API_PREFIX}/relation/add`,
  })
}

/** 更新实体关系。labelId 由后端处理，前端不传递。 */
export function updateOntologyRelation(params: UpdateOntologyRelationParams) {
  return apiRequest<OntologyRelation>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_NETWORK_API_PREFIX}/relation/update`,
  })
}

/** 删除实体关系。 */
export function deleteOntologyRelation(params: DeleteOntologyRelationParams) {
  return apiRequest<boolean>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_NETWORK_API_PREFIX}/relation/delete`,
  })
}

/** 查询图谱探索所需节点与边数据。 */
export function queryOntologyGraph(params: QueryOntologyGraphParams) {
  return apiRequest<OntologyGraphData>({
    data: params,
    method: 'post',
    url: `${ONTOLOGY_NETWORK_API_PREFIX}/graph`,
  })
}
