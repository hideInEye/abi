import { describe, expect, it } from 'vitest';

import { EMPTY_OPER_LOG_SEARCH_PARAMS, buildOperLogSearchParams, timeParams } from './search-params';

// 覆盖调用文件 apps/abi/src/pages/log/action/index.tsx 的查询参数组装逻辑
// 对应接口：getOperLogListApi（GET /api/abi-system/operlog/list）
describe('buildOperLogSearchParams', () => {
  it('关键词 trim 后只下发 searchValue，由后端对系统模块/操作类型做 OR 模糊匹配', () => {
    const params = buildOperLogSearchParams({ keyword: ' 删除 ', title: '', businessType: undefined, operIp: '', status: undefined, dateRange: null });
    expect(params.searchValue).toBe('删除');
    expect(params.title).toBe('');
    expect(params.businessType).toBe('');
    expect(params.operName).toBe('');
    expect(params.pageNum).toBe(1);
  });

  it('businessType 只接受字典值，关键词不得注入（后端为 Integer 类型）', () => {
    const params = buildOperLogSearchParams({ keyword: '删除', title: '', businessType: undefined, operIp: '', status: undefined, dateRange: null });
    expect(params.businessType).toBe('');
  });

  it('高级筛选与关键词各自独立下发，后端按 AND 组合', () => {
    const params = buildOperLogSearchParams({ keyword: '删除', title: ' 用户操作 ', businessType: '3', operIp: '', status: undefined, dateRange: null });
    expect(params.searchValue).toBe('删除');
    expect(params.title).toBe('用户操作');
    expect(params.businessType).toBe('3');
  });

  it('空关键词时 searchValue 为空串，其余筛选字段保留', () => {
    const params = buildOperLogSearchParams({ keyword: '   ', title: '', businessType: undefined, operIp: ' 192.168.1.1 ', status: '0', dateRange: null });
    expect(params.searchValue).toBe('');
    expect(params.title).toBe('');
    expect(params.businessType).toBe('');
    expect(params.operIp).toBe('192.168.1.1');
    expect(params.status).toBe('0');
  });
});

describe('timeParams', () => {
  it('生成若依 params[beginTime]/params[endTime]', () => {
    const range: any = [
      { format: () => '2026-09-01' },
      { format: () => '2026-09-29' }
    ];
    expect(timeParams(range)).toEqual({
      'params[beginTime]': '2026-09-01 00:00:00',
      'params[endTime]': '2026-09-29 23:59:59'
    });
  });

  it('未选时间范围时返回空串', () => {
    expect(timeParams(null)).toEqual({ 'params[beginTime]': '', 'params[endTime]': '' });
  });
});

describe('EMPTY_OPER_LOG_SEARCH_PARAMS', () => {
  it('重置时所有筛选字段为空', () => {
    expect(EMPTY_OPER_LOG_SEARCH_PARAMS).toEqual({
      pageNum: 1,
      operName: '',
      searchValue: '',
      title: '',
      businessType: '',
      operIp: '',
      status: '',
      'params[beginTime]': '',
      'params[endTime]': ''
    });
  });
});
