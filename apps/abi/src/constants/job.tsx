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

// 日志清理方式（XXL-JOB type 1-9）
export const LOG_CLEAN_TYPE_OPTIONS = [
  {
    label: '清理一个月之前日志数据',
    value: 1
  },
  {
    label: '清理三个月之前日志数据',
    value: 2
  },
  {
    label: '清理六个月之前日志数据',
    value: 3
  },
  {
    label: '清理一年之前日志数据',
    value: 4
  },
  {
    label: '清理一千条以前日志数据',
    value: 5
  },
  {
    label: '清理一万条以前日志数据',
    value: 6
  },
  {
    label: '清理三万条以前日志数据',
    value: 7
  },
  {
    label: '清理十万条以前日志数据',
    value: 8
  },
  {
    label: '清理所有日志数据',
    value: 9
  }
];

// 调度模式（产品化调度：单次/连续/定期/自定义 CRON）
export const SCHEDULE_MODE_OPTIONS = [
  {
    label: '单次任务',
    value: 'ONCE'
  },
  {
    label: '连续任务',
    value: 'CONTINUOUS'
  },
  {
    label: '定期任务',
    value: 'PERIODIC'
  },
  {
    label: '自定义',
    value: 'CUSTOM'
  }
];

// 重复周期单位（连续/定期任务）
export const REPEAT_UNIT_OPTIONS = [
  {
    label: '小时',
    value: 'HOUR'
  },
  {
    label: '天',
    value: 'DAY'
  },
  {
    label: '周',
    value: 'WEEK'
  },
  {
    label: '月',
    value: 'MONTH'
  },
  {
    label: '年',
    value: 'YEAR'
  }
];

// 星期（quartz 周字段名）
export const WEEK_DAY_OPTIONS = [
  {
    label: '周一',
    value: 'MON'
  },
  {
    label: '周二',
    value: 'TUE'
  },
  {
    label: '周三',
    value: 'WED'
  },
  {
    label: '周四',
    value: 'THU'
  },
  {
    label: '周五',
    value: 'FRI'
  },
  {
    label: '周六',
    value: 'SAT'
  },
  {
    label: '周日',
    value: 'SUN'
  }
];

// 作业场景（JobHandler）
export const JOB_SCENE_OPTIONS = [
  {
    label: '智能分析',
    value: 'aiAnalysis'
  },
  {
    label: '报告生成',
    value: 'reportGenerate'
  },
  {
    label: '数据大屏',
    value: 'dataScreen'
  },
  {
    label: '渠道推送',
    value: 'channelPush'
  },
  {
    label: '数据同步-实时',
    value: 'syncRealtime'
  },
  {
    label: '数据同步-批量',
    value: 'syncBatch'
  },
  {
    label: '指标预计算',
    value: 'metricPrecompute'
  },
  {
    label: '监控告警',
    value: 'monitorAlarm'
  }
];

// 渠道推送的推送渠道
export const PUSH_CHANNEL_OPTIONS = [
  {
    label: '飞书',
    value: 'feishu'
  },
  {
    label: '钉钉',
    value: 'dingtalk'
  },
  {
    label: '企业微信',
    value: 'wecom'
  },
  {
    label: '邮件',
    value: 'email'
  },
  {
    label: 'Webhook',
    value: 'webhook'
  }
];

// 调度过期策略
export const MISFIRE_STRATEGY_OPTIONS = [
  {
    label: '忽略',
    value: 'DO_NOTHING'
  },
  {
    label: '立即执行一次',
    value: 'FIRE_ONCE_NOW'
  }
];

// 路由策略
export const ROUTE_STRATEGY_OPTIONS = [
  {
    label: '第一个',
    value: 'FIRST'
  },
  {
    label: '最后一个',
    value: 'LAST'
  },
  {
    label: '轮询',
    value: 'ROUND'
  },
  {
    label: '随机',
    value: 'RANDOM'
  },
  {
    label: '一致性HASH',
    value: 'CONSISTENT_HASH'
  },
  {
    label: '最不经常使用',
    value: 'LEAST_FREQUENTLY_USED'
  },
  {
    label: '最近最久未使用',
    value: 'LEAST_RECENTLY_USED'
  },
  {
    label: '故障转移',
    value: 'FAILOVER'
  },
  {
    label: '忙碌转移',
    value: 'BUSYOVER'
  },
  {
    label: '分片广播',
    value: 'SHARDING_BROADCAST'
  }
];

// 阻塞处理策略
export const BLOCK_STRATEGY_OPTIONS = [
  {
    label: '串行执行',
    value: 'SERIAL_EXECUTION'
  },
  {
    label: '丢弃后续调度',
    value: 'DISCARD_LATER'
  },
  {
    label: '覆盖之前调度',
    value: 'COVER_EARLY'
  }
];

// 任务状态 triggerStatus：1 运行中、0 停止，查询 -1 全部
export const TRIGGER_STATUS_OPTIONS = [
  {
    label: '全部',
    value: '-1'
  },
  {
    label: '运行中',
    value: '1'
  },
  {
    label: '停止',
    value: '0'
  }
];

// 调度日志状态 logStatus：-1 全部、1 成功、2 失败、3 运行中
export const LOG_STATUS_OPTIONS = [
  {
    label: '全部',
    value: '-1'
  },
  {
    label: '成功',
    value: '1'
  },
  {
    label: '失败',
    value: '2'
  },
  {
    label: '运行中',
    value: '3'
  }
];
