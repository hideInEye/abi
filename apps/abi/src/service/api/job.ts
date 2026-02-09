import { apiRequest } from '../request';


/**
 * 邮件列表 
 */
export const fetchEmailList = (data?: any) => {
  return apiRequest<any>({
    method: 'post',
    data,
    url: '/abi-system/shared/list'
  })
}


// 邮件分享
export function fetchShareEmail(data: any) {
  return apiRequest({
    url: "/abi-system/shared/add",
    method: "post",
    data,
  });
}
// 邮件列表删除
export function deleteShareEmail(id: string) {
  return apiRequest({
    url: `/abi-system/shared/deleteLog?logId=${id}`,
    method: "post",
  });
}
// 邮件列表批量删除
export function deleteShareEmailBatch(data: any) {
  return apiRequest({
    url: `/abi-system/shared/batchDeleteLog`,
    method: "post",
    data
  });
}

// 查询邮件详情
export function fetchShareEmailDetail(id: string) {
  return apiRequest({
    url: `/abi-system/shared/detail?recordId=${id}`,
    method: "get",
  });
}

// 邮件更新
export function updateShareEmail(data: any) {
  return apiRequest({
    url: "/abi-system/shared/update",
    method: "post",
    data,
  });
}

/** get data-source list */
export async function fetchJobList(data?: any) {
  const res = (await apiRequest<any>({
    method: 'post',
    data,
    url: '/abi-system/shared/jobList'
  })) as any;
  return { data: res };
}

/** get data-source list */
export async function fetchJobDetail(jobId: string) {
  return await apiRequest<any>({
    method: 'get',
    url: `/abi-job/job/${jobId}`
  });
}

export async function fetchChangeStatus(data?: any) {
  return await apiRequest<any>({
    // data,
    method: 'put',
    url: `/abi-system/shared/changeStatus?recordId=${data.recordId}`
  });
}

export function updateJob(data?: any) {
  return apiRequest<any>({
    data,
    method: 'put',
    url: '/abi-job/job'
  });
}

export function addJob(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/abi-job/job'
  });
}

// 批量删除定时任务
export function batchDeleteJob(data: any) {
  return apiRequest<any>({
    method: 'post',
    url: '/abi-system/shared/batchDelete',
    data
  });
}

export function deleteJob(id: string) {
  return apiRequest<any>({
    method: 'post',
    url: `/abi-system/shared/delete?recordId=${id}`
  });
}

export function runJob(data?: any) {
  return apiRequest<any>({
    data,
    method: 'put',
    url: '/abi-job/job/run'
  });
}

export function exportJob(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    responseType: 'blob' as any,
    url: '/abi-job/job/export'
  });
}

export async function fetchJobLogList(params?: any) {
  const pr = {...params}
  if(pr.lastSendTime){
    pr.startDate = pr.lastSendTime[0].format('YYYY-MM-DD HH:mm:ss');
    pr.endDate = pr.lastSendTime[1].format('YYYY-MM-DD HH:mm:ss');
    delete pr.lastSendTime;
  }
  const res = (await apiRequest<any>({
    method: 'get',
    params:pr,
    url: '/abi-job/job/log/sharedList'
  })) as any;
  return { data: res };
}

export function exportJobLog(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    responseType: 'blob' as any,
    url: '/abi-job/job/log/export'
  });
}

export async function fetchJobLogDetail(jobLogId: string) {
  return await apiRequest<any>({
    method: 'get',
    url: `/abi-job/job/log/${jobLogId}`
  });
}

export function deleteJobLog(jobLogIds: string) {
  return apiRequest<any>({
    method: 'delete',
    url: `/abi-job/job/log/${jobLogIds}`
  });
}

export function cleanJobLog() {
  return apiRequest<any>({
    method: 'delete',
    url: `/abi-job/job/log/clean`
  });
}
