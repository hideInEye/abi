import service from '../request'

interface ApiResponse<T = any> {
  code?: number
  data?: T
  message?: string
  [key: string]: any
}

/** 查询定时任务列表 */
export async function fetchJobList(data?: any): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'post',
    url: '/api/abi-system/shared/jobList',
    data,
  })
  return res as ApiResponse<any>
}

/** 查询定时任务详情 */
export async function fetchJobDetail(jobId: string): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'get',
    url: `/api/abi-job/job/${jobId}`,
  })
  return res as ApiResponse<any>
}

/** 新增定时任务 */
export async function addJob(data?: any): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'post',
    url: '/api/abi-job/job',
    data,
  })
  return res as ApiResponse<any>
}

/** 更新定时任务 */
export async function updateJob(data?: any): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'put',
    url: '/api/abi-job/job',
    data,
  })
  return res as ApiResponse<any>
}

/** 删除定时任务 */
export async function deleteJob(recordId: string): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'post',
    url: `/api/abi-system/shared/delete?recordId=${recordId}`,
  })
  return res as ApiResponse<any>
}

/** 批量删除定时任务 */
export async function batchDeleteJob(data?: any): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'post',
    url: '/api/abi-system/shared/batchDelete',
    data,
  })
  return res as ApiResponse<any>
}

/** 切换定时任务状态 */
export async function fetchChangeStatus(data?: any): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'put',
    url: `/api/abi-system/shared/changeStatus?recordId=${data?.recordId}`,
  })
  return res as ApiResponse<any>
}

/** 立即执行定时任务 */
export async function runJob(data?: any): Promise<ApiResponse<any>> {
  const res = await service.request<ApiResponse<any>>({
    method: 'put',
    url: '/api/abi-job/job/run',
    data,
  })
  return res as ApiResponse<any>
}
