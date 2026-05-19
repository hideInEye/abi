export const KNOWLEDGE_GROUP_TYPE = 'ontology'

export const INDICATOR_TYPE_OPTIONS = [
  { label: '派生指标', value: 'derived' },
  { label: '衍生指标', value: 'extended' }
]

export const STATUS_OPTIONS = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
  { label: '草稿', value: 2 }
]

export const INDICATOR_CATEGORY_OPTIONS = [
  { label: '普惠贷款指标', value: '普惠贷款指标' },
  { label: '交易域/核心指标', value: '交易域/核心指标' }
]

export const DATA_FREQUENCY_OPTIONS = [
  { label: '年', value: 'year' },
  { label: '季', value: 'quarter' },
  { label: '月', value: 'month' },
  { label: '周', value: 'week' },
  { label: '日', value: 'day' },
  { label: '时', value: 'hour' }
]

export const KNOWLEDGE_DATA_TYPE_OPTIONS = [
  { label: '数值', value: 'number' },
  { label: '金额', value: 'amount' },
  { label: '百分比', value: 'percent' },
  { label: '文本', value: 'text' }
]

export const QUALITY_LEVEL_OPTIONS = [
  { label: 'P0-核心', value: 'p0' },
  { label: 'P1-重要', value: 'p1' },
  { label: 'P2-一般', value: 'p2' }
]

export const AGG_METHOD_OPTIONS = [
  { label: '合计（SUM）', value: 'SUM' },
  { label: '平均值（AVG）', value: 'AVG' },
  { label: '计数（COUNT）', value: 'COUNT' },
  { label: '去重计数（COUNT DISTINCT）', value: 'COUNT_DISTINCT' },
  { label: '最大值（MAX）', value: 'MAX' },
  { label: '最小值（MIN）', value: 'MIN' }
]

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
  { label: '保留 0 位小数', value: '0' },
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
  derived: '派生指标',
  extended: '衍生指标'
}

export const DEFAULT_FORM_VALUES = {
  aggMethod: 'SUM',
  calcPeriod: '1',
  compareType: 'YOY',
  comparisonOutputType: 'PERCENTAGE',
  cumulativeMode: 'UP',
  cumulativeTimeRange: 'YEAR',
  dataFrequency: 'day',
  dataType: 'number',
  derivedConditions: [{ logic: 'AND' as const, metric: '', operator: '>=', value: '' }],
  divideZeroStrategy: 'return_zero',
  indicatorAliasTags: [],
  indicatorCategory: '普惠贷款指标',
  indicatorType: 'derived',
  isPublic: true,
  nullStrategy: 'set_zero',
  qualityLevel: 'p1',
  ratioPrecision: '2',
  status: 1,
  templateType: 'ratio',
  variableMappings: [],
  volatilityDataRange: 'ROLLING',
  volatilityMethod: 'STDDEV'
}
