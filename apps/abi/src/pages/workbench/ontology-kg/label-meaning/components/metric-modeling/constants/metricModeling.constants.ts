import type { AggregationCode } from '../types/metricModeling.types'

export const KNOWLEDGE_GROUP_TYPE = 'ontology'

export const INDICATOR_TYPE_OPTIONS = [
  { label: '原子指标', value: 'atomic' },
  { label: '派生指标', value: 'derived' },
  { label: '衍生指标', value: 'derivative' }
]

export const INDICATOR_TYPE_FILTER_OPTIONS = [
  { label: '原子指标', value: 'atomic' },
  { label: '派生指标', value: 'derived' },
  { label: '衍生指标', value: 'derivative' }
]

export const STATUS_OPTIONS = [
  { label: '启用', value: '1' },
  { label: '停用', value: '0' },
  { label: '草稿', value: '2' }
]

export const DATA_FREQUENCY_OPTIONS = [
  { label: '每小时', value: 'hourly' },
  { label: '每日', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' }
]

export const WEEKDAY_OPTIONS = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 }
]

export const STATISTICAL_DATE_UNIT_OPTIONS = [
  { label: '小时', value: 'hour' },
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '季度', value: 'quarter' },
  { label: '年', value: 'year' }
]

export const STATISTICAL_DATE_RANGE_MODE_OPTIONS = [
  { label: '最近', value: 'recent' },
  { label: '前', value: 'previous_full' },
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'this_week' },
  { label: '上周', value: 'last_week' },
  { label: '本月', value: 'this_month' },
  { label: '上月', value: 'last_month' },
  { label: '本季度', value: 'this_quarter' },
  { label: '上季度', value: 'last_quarter' },
  { label: '本年', value: 'this_year' },
  { label: '上年', value: 'last_year' }
]

export const KNOWLEDGE_DATA_TYPE_OPTIONS = [
  { label: '数值', value: 'num' },
  { label: '金额', value: 'amount' },
  { label: '百分比', value: 'percentage' },
  { label: '文本', value: 'plaintext' }
]

export const QUALITY_LEVEL_OPTIONS = [
  { label: 'P0-核心', value: 'P0' },
  { label: 'P1-重要', value: 'P1' },
  { label: 'P2-一般', value: 'P2' }
]

export const QUALITY_LEVEL_DISPLAY_TEXT_MAP: Record<string, string> = {
  p0: '核心',
  p1: '重要',
  p2: '一般'
}

export const AGG_METHOD_OPTIONS: Array<{ label: string; shortLabel: string; value: AggregationCode }> = [
  { label: '求和（SUM）', shortLabel: '求和', value: 'SUM' },
  { label: '计数（COUNT）', shortLabel: '计数', value: 'COUNT' },
  { label: '去重计数（COUNT DISTINCT）', shortLabel: '去重计数', value: 'COUNT DISTINCT' },
  { label: '平均值（AVG）', shortLabel: '平均值', value: 'AVG' },
  { label: '最大值（MAX）', shortLabel: '最大值', value: 'MAX' },
  { label: '最小值（MIN）', shortLabel: '最小值', value: 'MIN' },
  { label: '标准差（STDDEV）', shortLabel: '标准差', value: 'STDDEV' },
  { label: '方差（VARIANCE）', shortLabel: '方差', value: 'VARIANCE' },
  { label: '中位数（MEDIAN）', shortLabel: '中位数', value: 'MEDIAN' }
]

export const AGG_METHOD_LABEL_MAP = Object.fromEntries(
  AGG_METHOD_OPTIONS.map(item => [item.value, item.shortLabel])
) as Record<AggregationCode, string>

export const CUSTOM_AGGREGATION_EXPRESSION_LABEL = '自定义聚合方式表达式'

export const EXTENDED_TEMPLATE_OPTIONS = [
  { label: '占比类', value: 'ratio' },
  { label: '累积类', value: 'cumulative' },
  { label: '同环比类', value: 'comparison' },
  { label: '波动类', value: 'volatility' },
  { label: '分位数', value: 'percentile' },
  { label: '自定义类', value: 'custom' }
]

export const EXTENDED_TEMPLATE_DESC_MAP: Record<string, string> = {
  comparison: '衡量当前周期与历史周期的变化趋势',
  cumulative: '反映时间维度上的总量变化，如累计销售额',
  custom: '自定义表达式进行衍生指标计算',
  percentile: '描述数据分布情况，提供比平均值更全面的统计视角',
  ratio: '衡量部分与整体的关系，如转化率、成功率',
  volatility: '通过数据离散程度评估稳定性'
}

export const RATIO_PRECISION_OPTIONS = [
  { label: '保留整数', value: '0' },
  { label: '保留 1 位小数', value: '1' },
  { label: '保留 2 位小数', value: '2' },
  { label: '保留 3 位小数', value: '3' },
  { label: '保留 4 位小数', value: '4' }
]

export const CUMULATIVE_TIME_RANGE_OPTIONS = [
  { label: '本年 (YEAR)', value: 'YEAR' },
  { label: '本季度 (QUARTER)', value: 'QUARTER' },
  { label: '本月 (MONTH)', value: 'MONTH' },
  { label: '本周 (WEEK)', value: 'WEEK' }
]

export const CUMULATIVE_MODE_OPTIONS = [
  { label: '向上累计', value: 'UP' },
  { label: '向下累计', value: 'DOWN' }
]

export const COMPARISON_TYPE_OPTIONS = [
  { label: '同比 (YoY)', value: 'YOY' },
  { label: '环比 (MoM)', value: 'MOM' }
]

export const COMPARISON_OUTPUT_OPTIONS = [
  { label: '增长率 (Percentage)', value: 'PERCENTAGE' },
  { label: '差值 (Value)', value: 'VALUE' }
]

export const VOLATILITY_METHOD_OPTIONS = [
  { label: '标准差 (StdDev)', value: 'STDDEV' },
  { label: '方差 (Variance)', value: 'VARIANCE' },
  { label: '极差 (Range)', value: 'RANGE' }
]

export const VOLATILITY_DATA_RANGE_OPTIONS = [
  { label: '指定滚动窗口', value: 'ROLLING' },
  { label: '自然周期', value: 'NATURAL' }
]

export const DERIVED_OPERATOR_OPTIONS = [
  { label: '等于', value: '=' },
  { label: '不等于', value: '!=' },
  { label: '大于', value: '>' },
  { label: '大于等于', value: '>=' },
  { label: '小于', value: '<' },
  { label: '小于等于', value: '<=' },
  { label: '包含', value: 'LIKE' },
  { label: '不包含', value: 'NOT LIKE' }
]

export const DERIVED_LOGIC_OPTIONS = [
  { label: '且', value: 'AND' },
  { label: '或', value: 'OR' }
]

export const NULL_STRATEGY_OPTIONS = [
  { label: '置为0', value: 'set_zero' },
  { label: '忽略空值', value: 'ignore' },
  { label: '延用上一值', value: 'use_last' }
]

export const DIVIDE_ZERO_STRATEGY_OPTIONS = [
  { label: '返回0', value: 'return_zero' },
  { label: '返回空', value: 'return_null' },
  { label: '报错', value: 'throw_error' }
]

export const CALC_PERIOD_OPTIONS = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' }
]

export const STATUS_TEXT_MAP: Record<string, string> = {
  '0': '停用',
  '1': '启用',
  '2': '草稿'
}

export const INDICATOR_TYPE_TEXT_MAP: Record<string, string> = {
  atomic: '原子指标',
  derived: '派生指标',
  derivative: '衍生指标'
}
