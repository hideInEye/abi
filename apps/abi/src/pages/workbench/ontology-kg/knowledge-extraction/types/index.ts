/* eslint-disable sort/type-properties */

export interface KnowledgeGroupItem {
  children?: KnowledgeGroupItem[]
  groupAlias?: string
  groupCode?: string
  groupDesc?: string
  groupId: number
  groupName: string
  parentId?: number
  remark?: string
}

export interface KnowledgeIndicatorItem {
  accumulateStartDate?: string
  aggMethod?: string
  alertConfig?: Record<string, any> | string
  atomicMetricId?: number | string
  bizName?: string
  calcPeriod?: string
  calcLogic?: Record<string, any> | string
  compareMetricId?: number | string
  comparisonOutputType?: string
  compareType?: string
  comparePeriod?: number
  cumulativeMetricId?: number | string
  cumulativeMode?: string
  cumulativeTimeRange?: string
  createTime?: string
  dataFrequency?: string
  dataType?: string
  derivedConditions?: Array<{ logic?: 'AND' | 'OR'; metric?: string; operator?: string; value?: string }>
  derivedConditionExpr?: string
  derivedTimeWindow?: number
  dimensionFieldIds?: string
  divideZeroStrategy?: string
  expr?: string
  groupId?: number
  groupName?: string
  indAlias?: string
  indId?: number
  indicatorCategory?: string
  indicatorClass?: string
  indicatorCode?: string
  indicatorOwner?: string
  indicatorType?: string
  isPublic?: string
  measurementUnit?: string
  nullStrategy?: string
  ownerEmail?: string
  ownerPhone?: string
  owner?: string
  percentileValue?: number | string
  projectionFunc?: string
  qualityLevel?: string
  ratioDenominatorId?: number | string
  ratioNumeratorId?: number | string
  ratioPrecision?: string
  relItemId?: string
  relSchemaId?: number
  relSchemaName?: string
  relViewId?: number
  relViewid?: number
  relateDims?: string
  remark?: string
  rollingWindowSize?: number
  semanticGroupId?: number
  semanticType?: string
  semanticSchemaId?: number
  semanticSchemaName?: string
  status?: number | string
  techName?: string
  techId?: string
  technicalRemark?: string
  technicalDefinition?: string
  templateParams?: Record<string, any> | string
  templateType?: string
  termAlias?: string
  termId?: number
  thresholdMax?: string
  thresholdMin?: string
  updateFrequency?: string
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
  aggMethod?: string
  atomicMetricId?: number | string
  bizName?: string
  calcPeriod?: string
  compareMetricId?: number | string
  comparisonOutputType?: string
  compareType?: string
  comparePeriod?: number
  cumulativeMetricId?: number | string
  cumulativeMode?: string
  cumulativeTimeRange?: string
  dataFrequency?: string
  dataType?: string
  derivedConditions?: Array<{ logic?: 'AND' | 'OR'; metric?: string; operator?: string; value?: string }>
  derivedConditionExpr?: string
  derivedTimeWindow?: number
  dimensionFieldIds?: string
  divideZeroStrategy?: string
  expr?: string
  indicatorAliasTags?: string[]
  indicatorType?: string
  measurementUnit?: string
  nullStrategy?: string
  owner?: string
  percentileValue?: number
  qualityLevel?: string
  ratioDenominatorId?: number | string
  ratioNumeratorId?: number | string
  ratioPrecision?: string
  relItemId?: string
  relViewid?: number
  remark?: string
  rollingWindowSize?: number
  semanticGroupId?: number
  semanticSchemaId?: number
  status?: number | string
  techName?: string
  technicalRemark?: string
  templateType?: string
  thresholdMax?: string
  thresholdMin?: string
  variableMappings?: Array<{ indicatorId?: number | string; variableName?: string }>
  variableName?: string
  volatilityDataRange?: string
  volatilityMethod?: string
  volatilityMetricId?: number | string
}

export interface KnowledgeSearchParams {
  keyword: string
  status?: number
  type: string
}
