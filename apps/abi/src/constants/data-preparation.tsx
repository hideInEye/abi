// * 系统字段类型：0-文本，1-时间，2-整型数值，3-浮点数值，4-布尔，5-地理位置，6-二进制，7-URL

// 字段类型
export const FIELD_TYPE_OPTIONS = [
  {
    icon: 'text',
    key: 0,
    label: '文本',
    value: 0
  },
  {
    children: [
      {
        key: 'yyyy-MM-dd',
        label: 'yyyy-MM-dd',
        value: 'yyyy-MM-dd'
      },
      {
        key: 'yyyy/MM/dd',
        label: 'yyyy/MM/dd',
        value: 'yyyy/MM/dd'
      },
      {
        key: 'yyyy-MM-dd HH:mm:ss',
        label: 'yyyy-MM-dd HH:mm:ss',
        value: 'yyyy-MM-dd HH:mm:ss'
      },
      {
        key: 'yyyy/MM/dd HH:mm:ss',
        label: 'yyyy/MM/dd HH:mm:ss',
        value: 'yyyy/MM/dd HH:mm:ss'
      },
      {
        key: 'custom',
        label: '自定义',
        value: 'custom'
      }
    ],
    icon: 'time',
    key: 1,
    label: '时间',
    value: 1
  },
  {
    icon: 'value',
    key: 2,
    label: '数值',
    value: 2
  },
  {
    icon: 'value',
    key: 3,
    label: '数值(小数)',
    value: 3
  },
  {
    icon: 'boolean',
    key: 4,
    label: '布尔',
    value: 4
  },
  {
    icon: 'location',
    key: 5,
    label: '地理位置',
    value: 5
  },
  {
    icon: 'binary',
    key: 6,
    label: '二进制',
    value: 6
  },
  {
    icon: 'url',
    key: 7,
    label: 'URL',
    value: 7
  }
];

// 数据类型
export const DATA_TYPE_OPTIONS = [
  {
    label: '维度',
    value: 1
  },
  {
    label: '指标',
    value: 2
  }
];

export const DIMENSION_ENUM = [
  {
    label: 'SCHED_NAME',
    value: 'SCHED_NAME'
  },
  {
    label: 'TRIGGER_NAME',
    value: 'TRIGGER_NAME'
  },
  {
    label: 'TRIGGER_GROUP',
    value: 'TRIGGER_GROUP'
  },
  {
    label: 'BLOB_DATA',
    value: 'BLOB_DATA'
  }
];

export const FUN_ENUM = [
  {
    explain: '获取从字符串s中的第n个位置开始长度为len的字符串',
    subTitle: 'SUBSTRING(s,n,len)',
    title: 'SUBSTRING'
  },
  {
    explain: '返回x的绝对值',
    subTitle: 'ABS(x)',
    title: 'ABS'
  },
  {
    explain: '返回不小于x的最小整数',
    subTitle: 'CEIL(x)',
    title: 'CEIL'
  },
  {
    explain: '返回不大于x的最大整数',
    subTitle: 'FLOOR(x)',
    title: 'FLOOR'
  },
  {
    explain: '返回离x最近的整数',
    subTitle: 'ROUND(x)',
    title: 'ROUND'
  },
  {
    explain: '保留x小数点后y位的值，但截断时要进行四舍五入',
    subTitle: 'ROUND(x,y)',
    title: 'ROUND'
  },
  {
    explain: '对x计数',
    subTitle: 'COUNT(x)',
    title: 'COUNT'
  },
  {
    explain: '对x求和',
    subTitle: 'SUM(x)',
    title: 'SUM(x)'
  },
  {
    explain: '对x求平均值',
    subTitle: 'AVG(x)',
    title: 'AVG'
  },
  {
    explain: '对x求最大值',
    subTitle: 'MAX(x)',
    title: 'MAX'
  },
  {
    explain: '对x求最小值',
    subTitle: 'MIN(x)',
    title: 'MIN'
  }
];

export const DATA_COLLECTION_CONFIG_TYPE_OPTIONS = [
  { label: '快速创建', value: 'union' },
  { label: 'SQL创建', value: 'sql' }
];

export const DATA_COLLECTION_T_FIELD_TYPE_OPTIONS = [
  { label: '维度', value: 'd' },
  { label: '指标', value: 'q' }
];
