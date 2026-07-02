import dayjs from "dayjs";
import request from "../request/index";
import { getChatbiBaseApi } from '../../utils/index'

// 获取部门列表
export function fetchDeptList(params: any) {
  return request({
    url: "/abi-system/dept/list",
    method: "get",
    params,
    baseURL: getChatbiBaseApi()
  });
}

// 获取用户列表
export function fetchUserList(params: { dept_id?: string | number }) {
  return request({
    url: "/abi-system/user/list",
    method: "get",
    params,
    baseURL: getChatbiBaseApi()
  });
}

// 收藏、分享（接口已废弃，保留逻辑不请求）
export function fetchOperate(_data: any) {
  // TODO: 接口已停用，恢复时取消注释
  // const data = {
  //   status: _data.status,
  //   createBy: _data.create_by,
  //   createTime: _data.create_time ? dayjs(_data.create_time).format('YYYY-MM-DD HH:mm:ss') : '',
  //   updateBy: _data.update_by,
  //   updateTime: _data.update_time ? dayjs(_data.update_time).format('YYYY-MM-DD HH:mm:ss') : '',
  //   remark: _data.remark,
  //   convId: _data.conv_id,
  //   convUid: _data.conv_uid,
  //   chatId: _data.chat_id,
  //   spaceId: _data.space_id,
  //   userInput: _data.user_input,
  //   chatMode: _data.chat_mode,
  //   appCode: _data.app_code,
  //   selectParam: _data.select_param,
  //   userName: _data.user_name,
  //   sysCode: _data.sys_code,
  //   agentId: _data.agent_id,
  //   bizName: _data.biz_name,
  //   groupId: _data.group_id,
  //   lastQuestion: _data.last_question,
  //   dbName: _data.dbName,
  //   modelName: _data.modelName,
  //   type: _data.type,
  //   name: _data.name,
  //   operator: _data.operator,
  //   operationTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
  // }
  // return request({
  //   url: "/abi-system/record/add",
  //   method: "post",
  //   data,
  //   baseURL: getChatbiBaseApi()
  // });
  return Promise.resolve({ code: 200, msg: 'ok', data: {} })
}

// 新版收藏
export function fetchOperateNew(data: any) {
  return request({
    url: "/api/abi-system/favorite/addOrRemove",
    method: "post",
    data,
  });
}

// 查询是否收藏（接口已废弃，保留逻辑不请求）
export function fetchIsFavorite(data: any) {
  // TODO: 接口已停用，恢复时取消注释
  // return request({
  //   url: "/api/abi-system/favorite/status",
  //   method: "get",
  //   params: data,
  // });
  return Promise.resolve({ code: 200, data: { favoriteStatus: 0 } })
}
/**
 * 获取部门列表
 *
 * @param params - 请求参数
 * @param params.dataSource - 数据源 0:独立 3: 嵌入
 * @param params.onenetToken - token 嵌入时传参
 * @returns
 */
export function queryDeptList({ dataSource, onenetToken }: { dataSource: 0 | 3; onenetToken: string }) {
  return request({
    data: { dataSource, onenetToken },
    method: 'post',
    url: '/abi-system/dept/allList',
    baseURL: getChatbiBaseApi()
  });
}

/** 获取用户列表 */
export function queryUserList(
  params = {
    deptId: 0
  }
) {
  return request({
    data: params,
    method: 'get',
    url: `/api/abi-system/user/list?deptId=${params.deptId}`
  });
}


// 获取大模型列表
export function fetchModelList(params?: { pageNum?: number; pageSize?: number; modelName?: string; spaceId?: number }) {
  return request({
    url: "/abi-copilot/v1/model/list",
    method: "get",
    params: { pageNum: 1, pageSize: 999, modelName: '', ...params },
    baseURL: window.APP_CONFIG?.VITE_BASE_API,
  });
}

// 邮件分享
export function fetchShareEmail(data: any) {
  return request({
    url: "/api/abi-system/shared/add",
    method: "post",
    data,
  });
}