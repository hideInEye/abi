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

// 关键词走后端 searchValue 做系统模块/操作类型 OR 模糊匹配；businessType 为后端 Integer 字典值，不可塞中文
export function buildOperLogSearchParams(state: OperLogSearchState) {
  return {
    pageNum: 1,
    operName: '',
    searchValue: state.keyword.trim(),
    title: state.title.trim(),
    businessType: state.businessType ?? '',
    operIp: state.operIp.trim(),
    status: state.status ?? '',
    ...timeParams(state.dateRange)
  };
}

export const EMPTY_OPER_LOG_SEARCH_PARAMS = {
  pageNum: 1,
  operName: '',
  searchValue: '',
  title: '',
  businessType: '',
  operIp: '',
  status: '',
  'params[beginTime]': '',
  'params[endTime]': ''
};
