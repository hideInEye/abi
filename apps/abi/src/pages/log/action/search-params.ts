interface DateRangeItem {
  format: (fmt: string) => string;
}

// 若依时间范围查询走 params[beginTime]/params[endTime]
export function timeParams(range: [DateRangeItem, DateRangeItem] | null) {
  return {
    'params[beginTime]': range?.[0] ? `${range[0].format('YYYY-MM-DD')} 00:00:00` : '',
    'params[endTime]': range?.[1] ? `${range[1].format('YYYY-MM-DD')} 23:59:59` : ''
  };
}

export interface OperLogSearchState {
  keyword: string;
  title: string;
  businessType?: string;
  operIp: string;
  status?: string;
  dateRange: [DateRangeItem, DateRangeItem] | null;
}

// 顶部关键词同时下发 title 与 businessType，由后端对系统模块、操作类型任一模糊命中即返回；高级筛选值优先
export function buildOperLogSearchParams(state: OperLogSearchState) {
  const keyword = state.keyword.trim();
  return {
    pageNum: 1,
    operName: '',
    title: state.title.trim() || keyword,
    businessType: state.businessType ?? keyword,
    operIp: state.operIp.trim(),
    status: state.status ?? '',
    ...timeParams(state.dateRange)
  };
}

export const EMPTY_OPER_LOG_SEARCH_PARAMS = {
  pageNum: 1,
  operName: '',
  title: '',
  businessType: '',
  operIp: '',
  status: '',
  'params[beginTime]': '',
  'params[endTime]': ''
};
