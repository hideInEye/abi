import { apiRequest } from '../request'
/** 获取标语义组 */
export function grouplist(params: { groupName?: string; pageNum?: number; pageSize?: number; spaceId?: number }) {
  return apiRequest({
    method: 'get',
    params: {
      groupName: params.groupName,
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      spaceId: params.spaceId
    },
    url: '/api/copilot/v1/group/list'
  })
}
/** 修改标语义组 */
export function editGroup(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: '/api/copilot/v1/group'
  })
}
/** 新增标语义组 */
export function addgroupsub(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/copilot/v1/group'
  })
}
/** 删除表语义组 */
export function delgroup(data: any, groupIds: any) {
  return apiRequest({
    data,
    method: 'delete',
    url: `/api/copilot/v1/group/${groupIds}`
  })
}
/** 获取标语义组 */
export function tablegroup(params: any, groupId: any) {
  return apiRequest({
    method: 'get',
    params,
    url: `/api/copilot/v1/group/${groupId}`
  })
}
/** 获取标语义组右侧列表接口 */
export function schemalist(params: { bizName?: string; groupId?: string; pageNum?: number; pageSize?: number; startTime?: string; endTime?: string }) {
  return apiRequest({
    method: 'get',
    params: {
      bizName: params.bizName,
      endTime: params.endTime,
      groupId: params.groupId,
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      startTime: params.startTime
    },
    url: `/api/copilot/v1/schema/list`
  })
}
/** 数据集合列表 */
export function dataSetList(
  data = {
    pageNum: 1,
    pageSize: 10000,
    spaceId: Number(localStorage.getItem('spaceId'))
  }
) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/dataset/queryDataSetList'
  })
}
/** 查询数据集详情 */
export function queryDataSetDetail(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/dataset/queryDataSetDetail'
  })
}

/** 新增表语义 */
export function addTableSemantics(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/copilot/v1/schema'
  })
}

/** 删除表语义 */
export function deleteTableSemantics(schemaId: number) {
  return apiRequest({
    data: {},
    method: 'delete',
    url: `/api/copilot/v1/schema/${schemaId}`
  })
}

/** 编辑表语义 */
export function editTableSemantics(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: '/api/copilot/v1/schema'
  })
}

/** 查询表语义详情 */
export function queryTableSemanticsDetail(schemaId: number | string) {
  return apiRequest({
    method: 'get',
    url: `/api/copilot/v1/schema/${schemaId}`
  })
}

/** 获取 验证码 */
export function getCode() {
  return apiRequest({
    data: {},
    method: 'get',
    url: '/api/code'
  })
}

/** AI帮填 - 语义修改 */
export function semanticModify(data: { dsl: string; chat_model_id: string }) {
  return apiRequest({
    data,
    method: 'post',
    timeout: 120 * 1000,
    url: '/api/chat-proxy/api/v1/semantic/modify'
  })
}
