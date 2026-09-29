import { toOffsetPageParams } from '@/utils/job-schedule'

import service from '../request'

interface ApiResponse<T = any> {
  code?: number
  data?: T
  message?: string
  [key: string]: any
}

// ===== 调度中心（XXL-JOB）接口，与管理端 apps/abi/src/service/api/job.ts 同一网关 =====

/** 作业列表：后端以 offset（0 基起始偏移）+ pagesize 分页；name/executorHandler/author/triggerStatus 为后端必填参数，空串/-1 表示不过滤 */
export async function fetchJobInfoList(params?: any): Promise<ApiResponse<any>> {
  const { author = '', executorHandler = '', name = '', triggerStatus = '-1', ...rest } = params || {}
  const res = await service.request<ApiResponse<any>>({
    method: 'get',
    params: toOffsetPageParams({ ...rest, author, executorHandler, name, triggerStatus }),
    url: '/api/abi-scheduler/jobinfo/list',
  })
  return res as ApiResponse<any>
}

/** 作业明细 */
export async function fetchJobDetail(jobId: string): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'get',
    url: `/api/abi-scheduler/jobinfo/${jobId}`,
  })
  return res as ApiResponse<any>
}

/** 作业创建 */
export async function addJobInfo(data?: any): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    data,
    method: 'post',
    url: '/api/abi-scheduler/jobinfo',
  })
  return res as ApiResponse<any>
}

/** 作业更新 */
export async function updateJobInfo(jobId: string, data?: any): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    data,
    method: 'put',
    url: `/api/abi-scheduler/jobinfo/${jobId}`,
  })
  return res as ApiResponse<any>
}

/** 作业删除 */
export async function deleteJobInfo(jobId: string): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'delete',
    url: `/api/abi-scheduler/jobinfo/${jobId}`,
  })
  return res as ApiResponse<any>
}

/** 作业启动 */
export async function startJob(jobId: string): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'post',
    url: `/api/abi-scheduler/jobinfo/${jobId}/start`,
  })
  return res as ApiResponse<any>
}

/** 作业停止 */
export async function stopJob(jobId: string): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'post',
    url: `/api/abi-scheduler/jobinfo/${jobId}/stop`,
  })
  return res as ApiResponse<any>
}

/** 作业手动触发一次 */
export async function triggerJob(jobId: string, data?: any): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    data,
    method: 'post',
    url: `/api/abi-scheduler/jobinfo/${jobId}/trigger`,
  })
  return res as ApiResponse<any>
}

/** 执行器列表：新增/编辑任务时默认取通用执行器 */
export async function fetchJobGroupList(params?: any): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'get',
    params: toOffsetPageParams(params, 100),
    url: '/api/abi-scheduler/jobgroup/list',
  })
  return res as ApiResponse<any>
}
