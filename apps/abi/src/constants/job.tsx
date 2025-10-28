// 是否并发
export const JOB_GROUP_OPTIONS = [
  {
    label: '默认',
    value: 'DEFAULT'
  },
  {
    label: '系统',
    value: 'SYSTEM'
  }
];

// 状态
export const JOB_STATUS_OPTIONS = [
  {
    label: '正常',
    value: '0'
  },
  {
    label: '暂停',
    value: '1'
  }
];

// 日志 - 状态
export const RUN_STATUS_OPTIONS = [
  {
    label: '成功',
    value: '0'
  },
  {
    label: '失败',
    value: '1'
  }
];

// 执行策略
export const STRATEGY_TYPE_OPTIONS = [
  {
    label: '立即执行',
    value: '1'
  },
  {
    label: '执行一次',
    value: '2'
  },
  {
    label: '放弃执行',
    value: '3'
  }
];

// 是否并发
export const CONCURRENT_TYPE_OPTIONS = [
  {
    label: '允许',
    value: '0'
  },
  {
    label: '禁止',
    value: '1'
  }
];

// Cron表达式生成器 - 指定 下拉项
export const APPOINT_OPTIONS = Array.from({ length: 60 }, (_: unknown, index: number) => index).map(num => ({
  label: num,
  value: num
}));

// Cron表达式生成器 - 星期几 下拉项
export const WEEK_OPTIONS = [
  {
    label: '星期一',
    value: 2
  },
  {
    label: '星期二',
    value: 3
  },
  {
    label: '星期三',
    value: 4
  },
  {
    label: '星期四',
    value: 5
  },
  {
    label: '星期五',
    value: 6
  },
  {
    label: '星期六',
    value: 7
  },
  {
    label: '星期日',
    value: 1
  }
];

// Cron表达式生成器 - 年 - 指定 下拉项
let year = 2025;
const yearArr = [];
while (year < 2034) {
  year += 1;
  yearArr.push(year);
}

export const YEAR_OPTIONS = yearArr.map(val => ({
  label: val,
  value: val
}));
