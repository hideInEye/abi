/* eslint-disable sort/type-properties */

export type JsonRecord = Record<string, unknown>

export interface KnowledgeTechField {
  alias?: string
  bizName?: string
  description?: string
  englishName?: string
  fieldName?: string
  fieldShortName?: string
  fieldType?: string
  name?: string
  originName?: string
  rtableName?: string
  tableBizName?: string
  tableName?: string
  techId?: string
  techName?: string
  tfieldAlias?: string
  tfieldId?: string
  tfieldName?: string
  tfieldType?: string
}

export interface KnowledgeAtomicMetricMeta {
  field?: string
  fieldName?: string
  id?: number | string
  label?: string
  value: string
}

export interface KnowledgeExpressionFieldMeta {
  field: string
  fieldName: string
  value: string
}

export interface KnowledgeDerivedCondition {
  logic?: 'AND' | 'OR'
  metric?: string
  operator?: string
  value?: string
}

export interface KnowledgeDerivedExpression {
  conditions?: KnowledgeDerivedCondition[]
  innerLogic?: 'AND' | 'OR'
  name?: string
}

export type KnowledgeTemplateParams = Partial<
  Pick<
    KnowledgeFormValues,
    | 'accumulateStartDate'
    | 'compareMetricId'
    | 'comparePeriod'
    | 'comparisonOutputType'
    | 'compareType'
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
  groupId: string
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
  techName?: string
  techId?: KnowledgeTechField[] | JsonRecord | string
  technicalDefinition?: string
  templateParams?: KnowledgeTemplateParams | JsonRecord | string
  templateType?: string
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
  bizName?: string
  calcPeriod?: string
  compareMetricId?: number | string
  comparisonOutputType?: string
  compareType?: string
  comparePeriod?: number
  cumulativeMetricId?: number | string
  cumulativeMode?: string
  cumulativeTimeRange?: string
  updateFrequency?: string
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
  mappedBizNameFieldName?: string
  mappedTechNameTableName?: string
  nullStrategy?: string
  ownerEmail?: string
  ownerPhone?: string
  percentileValue?: number | string
  projectionFunc?: string
  qualityLevel?: string
  ratioDenominatorId?: number | string
  ratioNumeratorId?: number | string
  ratioPrecision?: string
  relItemId?: string
  relViewid?: number | string
  businessDefinition?: string
  rollingWindowSize?: number
  semanticGroupId?: number | string
  semanticsGroupId?: number | string
  semanticGroupName?: string
  semanticSchemaId?: number | string
  semanticSchemaName?: string
  status?: number | string
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
