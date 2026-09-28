import { apiRequest } from '../request';
import { formatLogFilterTime, toOffsetPageParams } from '../../pages/workbench/job/utils';

/** 调度中心请求入口（XXL-JOB 协议），经网关 abi-scheduler 服务 */
function jobRequest(config: any) {
  return apiRequest<any>(config);
}


/**
 * 邮件列表 
 */
export const fetchEmailList = (data?: any) => {
  return apiRequest<any>({
    method: 'post',
    data,
    url: '/api/abi-system/shared/list'
  })
}


// 邮件分享
export function fetchShareEmail(data: any) {
  return apiRequest({
    url: "/api/abi-system/shared/add",
    method: "post",
    data,
  });
}
// 邮件列表删除
export function deleteShareEmail(id: string) {
  return apiRequest({
    url: `/api/abi-system/shared/deleteLog?logId=${id}`,
    method: "post",
  });
}
// 邮件列表批量删除
export function deleteShareEmailBatch(data: any) {
  return apiRequest({
    url: `/api/abi-system/shared/batchDeleteLog`,
    method: "post",
    data
  });
}

// 查询邮件详情
export function fetchShareEmailDetail(id: string) {
  return apiRequest({
    url: `/api/abi-system/shared/detail?recordId=${id}`,
    method: "get",
  });
}

// 邮件更新
export function updateShareEmail(data: any) {
  return apiRequest({
    url: "/api/abi-system/shared/update",
    method: "post",
    data,
  });
}

// ===== 调度中心（XXL-JOB）接口，协议见 ABI-LOG.apifox.json =====

/** 作业列表：后端以 offset（0 基起始偏移）+ pagesize 分页；name/executorHandler/author/triggerStatus 为后端必填参数，空串/-1 表示不过滤 */
export function fetchJobInfoList(params?: any) {
  const { author = '', executorHandler = '', name = '', triggerStatus = '-1', ...rest } = params || {};
  return jobRequest({
    method: 'get',
    params: toOffsetPageParams({ ...rest, author, executorHandler, name, triggerStatus }),
    url: '/api/abi-scheduler/jobinfo/list',
  });
}

/** 作业明细 */
export function fetchJobDetail(jobId: string) {
  return jobRequest({
    method: 'get',
    url: `/api/abi-scheduler/jobinfo/${jobId}`,
  });
}

/** 作业创建 */
export function addJobInfo(data?: any) {
  return jobRequest({
    data,
    method: 'post',
    url: '/api/abi-scheduler/jobinfo',
  });
}

/** 作业更新 */
export function updateJobInfo(jobId: string, data?: any) {
  return jobRequest({
    data,
    method: 'put',
    url: `/api/abi-scheduler/jobinfo/${jobId}`,
  });
}

/** 作业删除 */
export function deleteJobInfo(jobId: string) {
  return jobRequest({
    method: 'delete',
    url: `/api/abi-scheduler/jobinfo/${jobId}`,
  });
}

/** 作业启动 */
export function startJob(jobId: string) {
  return jobRequest({
    method: 'post',
    url: `/api/abi-scheduler/jobinfo/${jobId}/start`,
  });
}

/** 作业停止 */
export function stopJob(jobId: string) {
  return jobRequest({
    method: 'post',
    url: `/api/abi-scheduler/jobinfo/${jobId}/stop`,
  });
}

/** 作业手动触发一次 */
export function triggerJob(jobId: string, data?: any) {
  return jobRequest({
    data,
    method: 'post',
    url: `/api/abi-scheduler/jobinfo/${jobId}/trigger`,
  });
}

/** 作业触发预览：按调度配置返回接下来若干次触发时间 */
export function fetchNextTriggerTime(data?: any) {
  return jobRequest({
    data,
    method: 'post',
    url: '/api/abi-scheduler/jobinfo/nextTriggerTime',
  });
}

/** 执行器列表：执行器下拉与注册节点数据源 */
export function fetchJobGroupList(params?: any) {
  return jobRequest({
    method: 'get',
    params: toOffsetPageParams(params, 100),
    url: '/api/abi-scheduler/jobgroup/list',
  });
}

/** 执行器明细：registryList 为注册节点地址 */
export function fetchJobGroupDetail(jobGroupId: string | number) {
  return jobRequest({
    method: 'get',
    url: `/api/abi-scheduler/jobgroup/${jobGroupId}`,
  });
}

/** 调度日志列表：filterTime 格式 'YYYY-MM-DD HH:mm:ss - YYYY-MM-DD HH:mm:ss'；jobId/logStatus/filterTime 为后端必填参数，0/-1/空串表示不过滤 */
export function fetchJobLogList(params?: any) {
  const { filterTime, jobId, logStatus = '-1', ...rest } = params || {};
  const formattedFilterTime = formatLogFilterTime(filterTime);
  return jobRequest({
    method: 'get',
    params: { ...toOffsetPageParams(rest), filterTime: formattedFilterTime || '', jobId: jobId ?? 0, logStatus },
    url: '/api/abi-scheduler/joblog/list',
  });
}

/** 调度日志内容：自 fromLineNum 起滚动拉取日志行 */
export function fetchJobLogContent(jobLogId: string, fromLineNum: number) {
  return jobRequest({
    method: 'get',
    params: { fromLineNum },
    url: `/api/abi-scheduler/joblog/${jobLogId}/content`,
  });
}

/** 日志终止运行作业 */
export function killJobLog(jobLogId: string) {
  return jobRequest({
    method: 'post',
    url: `/api/abi-scheduler/joblog/${jobLogId}/kill`,
  });
}

/** 日志清理历史 */
export function cleanJobLog(data?: any) {
  return jobRequest({
    data,
    method: 'delete',
    url: '/api/abi-scheduler/joblog/clean',
  });
}

// 邮件记录页仍在使用旧单条删除，保留
export function deleteJob(id: string) {
  return apiRequest<any>({
    method: 'post',
    url: `/api/abi-system/shared/delete?recordId=${id}`,
  });
}
