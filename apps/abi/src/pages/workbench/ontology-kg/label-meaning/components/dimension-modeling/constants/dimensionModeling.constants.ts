import type { DimensionFormValues } from '../types/dimensionModeling.types'

export const DIMENSION_GROUP_TYPE = 'ontology-dimension'

export const DIMENSION_TYPE_TEXT_MAP: Record<string, string> = {
  std: '标准维',
  time: '时间维'
}

export const DIMENSION_TYPE_OPTIONS = [
  { label: '标准维', value: 'std' },
  { label: '时间维', value: 'time' }
]

export const DIMENSION_CATEGORY_OPTIONS = [
  { label: '时间', value: 'time' },
  { label: '地理', value: 'geography' },
  { label: '组织', value: 'organization' },
  { label: '产品', value: 'product' },
  { label: '客户', value: 'customer' }
]

export const DIMENSION_STATUS_TEXT_MAP: Record<string, string> = {
  '0': '禁用',
  '1': '启用'
}

export const DIMENSION_STATUS_OPTIONS = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 }
]

export const DIMENSION_DRILL_DIRECTION_OPTIONS = [
  { label: '向上钻取', value: 'up' },
  { label: '向下钻取', value: 'down' },
  { label: '双向钻取', value: 'both' }
]

export const DIMENSION_UPDATE_FREQ_OPTIONS = [
  { label: '年', value: 'yearly' },
  { label: '季', value: 'quarterly' },
  { label: '月', value: 'monthly' },
  { label: '周', value: 'weekly' },
  { label: '日', value: 'daily' },
  { label: '时', value: 'hourly' }
]

export const DIMENSION_TIME_FORMAT_OPTIONS = [
  { label: 'yyyy-MM-dd', value: 'yyyy-MM-dd' },
  { label: 'yyyyMMdd', value: 'yyyyMMdd' },
  { label: 'yyyy-MM-dd HH:mm:ss', value: 'yyyy-MM-dd HH:mm:ss' }
]

export const DIMENSION_TIME_GRANULARITY_OPTIONS = [
  { label: '年', value: 'year' },
  { label: '半年', value: 'half_year' },
  { label: '季', value: 'quarter' },
  { label: '月', value: 'month' },
  { label: '周', value: 'week' },
  { label: '日', value: 'day' },
  { label: '时', value: 'hour' }
]

export const DEFAULT_FORM_VALUES: DimensionFormValues = {
  dimCategory: 'geography',
  dimType: 'std',
  drillDirection: 'down',
  englishName: '',
  owner: '',
  relatedFieldKeys: [],
  sampleValues: '',
  status: 1,
  timeGranularity: ['year', 'month', 'day'],
  updateFreq: 'daily',
  zhName: ''
}
