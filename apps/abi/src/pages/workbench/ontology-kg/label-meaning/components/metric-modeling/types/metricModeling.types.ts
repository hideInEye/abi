/* eslint-disable sort/type-properties */

export type JsonRecord = Record<string, unknown>

export type AggregationCode =
  | 'AVG'
  | 'COUNT'
  | 'COUNT DISTINCT'
  | 'MAX'
  | 'MEDIAN'
  | 'MIN'
  | 'STDDEV'
  | 'SUM'
  | 'VARIANCE'

export type KnowledgeAggregation =
  | { data: AggregationCode[]; type: 'simple' }
  | { data: string; type: 'complex' }

export interface KnowledgeTechField {
  agg?: KnowledgeAggregation | string
  alias?: string
  bizName?: string
  dataType?: string
  description?: string
  englishName?: string
  fieldName?: string
  fieldShortName?: string
  fieldType?: string
  name?: string
  originName?: string
  projectionFunc?: string
  rtableName?: string
  tableBizName?: string
  tableName?: string
  semanticType?: string
  techId?: string
  techName?: string
  tfieldAlias?: string
  tfieldId?: string
  tfieldName?: string
  tfieldType?: string
}

export interface KnowledgeAtomicMetricMeta {
  aggregationMethods?: AggregationCode[]
  field?: string
  fieldName?: string
  id?: number | string
  label?: string
  projectionFunc?: string
  semanticSchemaId?: number | string
  semanticSchemaName?: string
  value: string
}

export interface KnowledgeExpressionFieldMeta {
  field: string
  fieldName: string
  value: string
}

export interface KnowledgeDerivedCondition {
  fieldId?: string
  id?: string
  logic?: 'AND' | 'OR'
  logicWithPrevious?: 'AND' | 'OR'
  metric?: string
  operator?: string
  value?: number | string
}

export interface KnowledgeDerivedExpression {
  conditions?: KnowledgeDerivedCondition[]
  groups?: Array<{
    conditions?: KnowledgeDerivedCondition[]
    id?: string
    logicWithPrevious?: 'AND' | 'OR'
    name?: string
  }>
  id?: string
  innerLogic?: 'AND' | 'OR'
  name?: string
}

export type PrecomputeFrequency = 'daily' | 'hourly' | 'monthly' | 'weekly'

export interface ApiUpdateFrequency {
  day_of_month: number | null
  day_of_week: number | null
  frequency: PrecomputeFrequency
  minute: string
}

export type PrecomputeConfig =
  | { frequency: 'hourly'; minute: number }
  | { frequency: 'daily'; time: string }
  | { frequency: 'weekly'; time: string; weekday: number }
  | { frequency: 'monthly'; monthDay: number; time: string }

export type StatisticalDateRangeMode =
  | 'last_month'
  | 'last_quarter'
  | 'last_week'
  | 'last_year'
  | 'previous_full'
  | 'recent'
  | 'this_month'
  | 'this_quarter'
  | 'this_week'
  | 'this_year'
  | 'today'
  | 'yesterday'

export type StatisticalDateRangeUnit = 'day' | 'hour' | 'month' | 'quarter' | 'week' | 'year'

export interface StatisticalCaliber {
  dateRangeMode: StatisticalDateRangeMode
  dateRangeUnit: StatisticalDateRangeUnit
  dateRangeValue: number
  endTime?: string
  isCrossDim?: boolean
  startTime?: string
  subjectDimensionIds?: string[]
  subjectDimensionNameMap?: Record<string, string>
  /** 兼容已保存的单主体维度表单数据，新提交统一使用 subjectDimensionIds。 */
  subjectDimensionId?: string
  subjectDimensionName?: string
  timeRangeType: 'allDay' | 'specified'
}

export type ApiStatisticalDateRangeType =
  | 'current_month'
  | 'current_quarter'
  | 'current_week'
  | 'current_year'
  | 'last_month'
  | 'last_quarter'
  | 'last_week'
  | 'last_year'
  | 'previous'
  | 'recent'
  | 'today'
  | 'yesterday'

export interface ApiCalcPeriod {
  date_range: {
    type: ApiStatisticalDateRangeType
    unit: StatisticalDateRangeUnit | null
    value: number | null
  }
  time_range: {
    end_time: string | null
    start_time: string | null
    type: 'all_day' | 'custom'
  }
}

export interface ApiSubjectDimension {
  dim_id: string
  dim_name: string
}

export interface ApiDerivedTemplateCondition {
  conditionId: string
  field: string
  fieldName: string
  operator: 'EQ' | 'GE' | 'GT' | 'IN' | 'LE' | 'LT' | 'NE' | 'NOT_IN' | 'NOT_NULL' | 'NULL'
  operatorName: string
  value?: number | string
}

export interface ApiDerivedTemplateExpression {
  conditions: ApiDerivedTemplateCondition[]
  expressionId: string
  innerLogic: 'AND' | 'OR'
  name: string
}

export interface ApiDerivedTemplateLayer {
  expressions: ApiDerivedTemplateExpression[]
  groupLogic: 'AND' | 'OR'
  layerName: string
  sortOrder: number
}

export interface ApiDerivedIndicatorTemplates {
  layers: ApiDerivedTemplateLayer[]
}

export type KnowledgeTemplateParams = Partial<
  Pick<
    KnowledgeFormValues,
    | 'accumulateStartDate'
    | 'compareMetricId'
    | 'comparePeriod'
    | 'compareType'
    | 'comparisonOutputType'
    | 'cumulativeMetricId'
    | 'cumulativeMode'
    | 'cumulativeTimeRange'
    | 'expr'
    | 'percentileValue'
    | 'ratioDenominatorId'
    | 'ratioNumeratorId'
    | 'ratioPrecision'
    | 'relItemId'
    | 'rollingWindowSize'
    | 'templateType'
    | 'thresholdMax'
    | 'thresholdMin'
    | 'volatilityDataRange'
    | 'volatilityMethod'
    | 'volatilityMetricId'
  >
>

export interface KnowledgeSubmitPayload extends KnowledgeFormValues {
  alertConfig?: JsonRecord | string
  atomicMetricMetaMap?: Record<string, KnowledgeAtomicMetricMeta>
  derivedExpressionFieldMetaMap?: Record<string, KnowledgeExpressionFieldMeta>
  dimensionFieldIds?: string
  groupId: number | string
  indAlias?: string
  indId?: number
  relItemId?: string
  spaceId: number
  techId?: KnowledgeTechField[] | JsonRecord | string
  templateParams?: KnowledgeTemplateParams
  termId?: number
}

export interface AtomicMappingPayload {
  groupId?: string
  relSchemaId: number | string
  semanticsGroupId?: number | string
  spaceId: number
  projectionFunc: string
  techId: KnowledgeTechField[]
}

export interface KnowledgeGroupItem {
  children?: KnowledgeGroupItem[]
  groupAlias?: string
  groupCode?: string
  groupDesc?: string
  groupId: string
  groupName: string
  parentId?: number
  businessDefinition?: string
}

export interface KnowledgeIndicatorItem {
  agg?: KnowledgeAggregation | string
  accumulateStartDate?: string
  alertConfig?: JsonRecord | string
  atomicMetricId?: number | string
  bizName?: string
  calcPeriod?: string
  calcLogic?: JsonRecord | string
  compareMetricId?: number | string
  comparisonOutputType?: string
  compareType?: string
  comparePeriod?: number
  cumulativeMetricId?: number | string
  cumulativeMode?: string
  cumulativeTimeRange?: string
  createTime?: string
  createBy?: string
  dataType?: string
  derivedConditions?: KnowledgeDerivedCondition[]
  derivedConditionExpr?: string
  derivedExpressions?: KnowledgeDerivedExpression[]
  dimensionFieldIds?: string
  divideZeroStrategy?: string
  expr?: string
  groupId?: string
  groupName?: string
  indAlias?: string
  indId?: number
  indicatorCode?: string
  indicatorClass?: string
  indicatorOwner?: string
  isPublic?: string
  measurementUnit?: string
  nullStrategy?: string
  ownerEmail?: string
  ownerPhone?: string
  percentileValue?: number | string
  projectionFunc?: string
  precomputeConfig?: PrecomputeConfig
  qualityLevel?: string
  ratioDenominatorId?: number | string
  ratioNumeratorId?: number | string
  ratioPrecision?: string
  relItemId?: string
  relSchemaId?: number | string
  relSchemaName?: string
  relViewId?: number | string
  relViewid?: number | string
  relateDims?: string
  businessDefinition?: string
  rollingWindowSize?: number
  rawBizName?: string
  rawIndicatorCode?: string
  rawTechName?: string
  semanticGroupId?: number | string
  semanticsGroupId?: number | string
  semanticType?: string
  semanticSchemaId?: number | string
  semanticSchemaName?: string
  status?: number | string
  statisticalCaliber?: StatisticalCaliber
  techName?: string
  techId?: KnowledgeTechField[] | JsonRecord | string
  technicalDefinition?: string
  templateParams?: KnowledgeTemplateParams | JsonRecord | string
  templateType?: string
  termId?: number
  thresholdMax?: string
  thresholdMin?: string
  updateFrequency?: ApiUpdateFrequency | string
  updateTime?: string
  variableMappings?: Array<{ indicatorId?: number | string; variableName?: string }>
  volatilityDataRange?: string
  volatilityMethod?: string
  volatilityMetricId?: number | string
  versionNo?: string
  versionStatus?: string
}

export interface KnowledgeFormValues {
  accumulateStartDate?: string
  atomicAggregationExpression?: string
  atomicAggregationMethods?: AggregationCode[]
  atomicSourceFieldId?: string
  bizName?: string
  calcPeriod?: string
  compareMetricId?: number | string
  comparisonOutputType?: string
  compareType?: string
  comparePeriod?: number
  cumulativeMetricId?: number | string
  cumulativeMode?: string
  cumulativeTimeRange?: string
  dataType?: string
  derivedConditions?: KnowledgeDerivedCondition[]
  derivedConditionExpr?: string
  derivedExpressions?: KnowledgeDerivedExpression[]
  dimensionFieldIds?: string
  divideZeroStrategy?: string
  expr?: string
  indicatorClass?: string
  indicatorCode?: string
  indicatorOwner?: string
  indAlias?: string[] | string
  isPublic?: boolean | string
  measurementUnit?: string
  mappedBizNameTableName?: string
  mappedTechNameTableName?: string
  nullStrategy?: string
  ownerEmail?: string
  ownerPhone?: string
  percentileValue?: number | string
  precomputeConfig?: PrecomputeConfig
  projectionFunc?: string
  qualityLevel?: string
  ratioDenominatorId?: number | string
  ratioNumeratorId?: number | string
  ratioPrecision?: string
  relItemId?: string
  relSchemaId?: number | string
  relViewId?: number | string
  relViewid?: number | string
  businessDefinition?: string
  rollingWindowSize?: number
  semanticGroupId?: number | string
  semanticsGroupId?: number | string
  semanticGroupName?: string
  semanticSchemaId?: number | string
  semanticSchemaName?: string
  semanticType?: string
  status?: number | string
  statisticalCaliber?: StatisticalCaliber
  techName?: string
  techId?: KnowledgeTechField[] | JsonRecord | string
  technicalDefinition?: string
  templateType?: string
  thresholdMax?: string
  thresholdMin?: string
  variableMappings?: Array<{ indicatorId?: number | string; variableName?: string }>
  variableName?: string
  volatilityDataRange?: string
  volatilityMethod?: string
  volatilityMetricId?: number | string
  versionStatus?: string
}

export interface KnowledgeSearchParams {
  bizName: string
  status?: number
  type: string
}

export interface KnowledgePagination {
  pageNum: number
  pageSize: number
  total: number
}
