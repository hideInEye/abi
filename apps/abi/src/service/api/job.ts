import { apiRequest } from '../request';

/** get data-source list */
export async function fetchJobList(params?: any) {
  const res = (await apiRequest<any>({
    method: 'get',
    params,
    url: '/abi-job/job/list'
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
    data,
    method: 'put',
    url: '/abi-job/job/changeStatus'
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

export function deleteJob(jobIds: string) {
  return apiRequest<any>({
    method: 'delete',
    url: `/abi-job/job/${jobIds}`
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
  const res = (await apiRequest<any>({
    method: 'get',
    params,
    url: '/abi-job/job/log/list'
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
