import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addJobInfo,
  cleanJobLog,
  deleteJobInfo,
  fetchJobGroupList,
  fetchJobInfoList,
  fetchJobLogContent,
  fetchJobLogList,
  fetchNextTriggerTime,
  killJobLog,
  startJob,
  stopJob,
  triggerJob,
  updateJobInfo,
} from './job';

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock('../request', () => ({ apiRequest }));

describe('schedule center API routes', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('queries jobinfo list with offset/pagesize paging', () => {
    fetchJobInfoList({ jobGroup: 3, name: 'report', pageNum: 2, pageSize: 10, triggerStatus: '-1' });

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      params: { author: '', executorHandler: '', jobGroup: 3, name: 'report', offset: 10, pagesize: 10, triggerStatus: '-1' },
      url: '/api/abi-scheduler/jobinfo/list',
    });
  });

  it('fills required jobinfo list filters with no-filter defaults', () => {
    fetchJobInfoList({ jobGroup: 1, pageNum: 1, pageSize: 12 });

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      params: { author: '', executorHandler: '', jobGroup: 1, name: '', offset: 0, pagesize: 12, triggerStatus: '-1' },
      url: '/api/abi-scheduler/jobinfo/list',
    });
  });

  it('writes jobinfo through restful routes', () => {
    addJobInfo({ name: 'daily' });
    expect(apiRequest).toHaveBeenCalledWith({ data: { name: 'daily' }, method: 'post', url: '/api/abi-scheduler/jobinfo' });

    updateJobInfo('3', { name: 'daily2' });
    expect(apiRequest).toHaveBeenCalledWith({ data: { name: 'daily2' }, method: 'put', url: '/api/abi-scheduler/jobinfo/3' });

    deleteJobInfo('5');
    expect(apiRequest).toHaveBeenCalledWith({ method: 'delete', url: '/api/abi-scheduler/jobinfo/5' });

    startJob('6');
    expect(apiRequest).toHaveBeenCalledWith({ method: 'post', url: '/api/abi-scheduler/jobinfo/6/start' });

    stopJob('6');
    expect(apiRequest).toHaveBeenCalledWith({ method: 'post', url: '/api/abi-scheduler/jobinfo/6/stop' });

    triggerJob('6', { addressList: '', executorParam: '{"force":true}' });
    expect(apiRequest).toHaveBeenCalledWith({ data: { addressList: '', executorParam: '{"force":true}' }, method: 'post', url: '/api/abi-scheduler/jobinfo/6/trigger' });

    fetchNextTriggerTime({ scheduleConf: '0 30 8 * * ?', scheduleType: 'CRON' });
    expect(apiRequest).toHaveBeenCalledWith({ data: { scheduleConf: '0 30 8 * * ?', scheduleType: 'CRON' }, method: 'post', url: '/api/abi-scheduler/jobinfo/nextTriggerTime' });
  });

  it('queries jobgroup list with default pagesize 100', () => {
    fetchJobGroupList({ pageNum: 1 });

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      params: { offset: 0, pagesize: 100 },
      url: '/api/abi-scheduler/jobgroup/list',
    });
  });

  it('queries joblog list with formatted filterTime', () => {
    fetchJobLogList({ filterTime: [dayjs('2026-09-01 00:00:00'), dayjs('2026-09-15 23:59:59')], jobGroup: 1, logStatus: '-1', pageNum: 1, pageSize: 12 });

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      params: {
        filterTime: '2026-09-01 00:00:00 - 2026-09-15 23:59:59',
        jobGroup: 1,
        jobId: 0,
        logStatus: '-1',
        offset: 0,
        pagesize: 12,
      },
      url: '/api/abi-scheduler/joblog/list',
    });
  });

  it('fills required joblog list params with no-filter defaults', () => {
    fetchJobLogList({ jobGroup: 1, pageNum: 1, pageSize: 12 });

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      params: { filterTime: '', jobGroup: 1, jobId: 0, logStatus: '-1', offset: 0, pagesize: 12 },
      url: '/api/abi-scheduler/joblog/list',
    });
  });

  it('operates joblog through restful routes', () => {
    fetchJobLogContent('3', 21);
    expect(apiRequest).toHaveBeenCalledWith({ method: 'get', params: { fromLineNum: 21 }, url: '/api/abi-scheduler/joblog/3/content' });

    killJobLog('3');
    expect(apiRequest).toHaveBeenCalledWith({ method: 'post', url: '/api/abi-scheduler/joblog/3/kill' });

    cleanJobLog({ jobGroup: 1, jobId: 0, type: 1 });
    expect(apiRequest).toHaveBeenCalledWith({ data: { jobGroup: 1, jobId: 0, type: 1 }, method: 'delete', url: '/api/abi-scheduler/joblog/clean' });
  });
});
