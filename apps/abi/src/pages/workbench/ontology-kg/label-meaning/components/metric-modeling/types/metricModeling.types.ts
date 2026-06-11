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
  tableBizName?: string
  tableName?: string
  techId?: string
  techName?: string
  tfieldAlias?: string
  tfieldId?: string
  tfieldName?: string
  tfieldType?: string
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
  dimensionFieldIds?: string
  groupId: number
  indAlias?: string
  indId?: number
  relItemId?: string
  spaceId: number
  techId?: KnowledgeTechField[] | JsonRecord | string
  templateParams?: KnowledgeTemplateParams
  termId?: number
}

export interface AtomicMappingPayload {
  groupId?: number
  relSchemaId: number
  spaceId: number
  techId: KnowledgeTechField[]
}

export interface KnowledgeGroupItem {
  children?: KnowledgeGroupItem[]
  groupAlias?: string
  groupCode?: string
  groupDesc?: string
  groupId: number
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
  dataType?: string
  derivedConditions?: Array<{ logic?: 'AND' | 'OR'; metric?: string; operator?: string; value?: string }>
  derivedConditionExpr?: string
  dimensionFieldIds?: string
  divideZeroStrategy?: string
  expr?: string
  groupId?: number
  groupName?: string
  indAlias?: string
  indId?: number
  indicatorClass?: string
  indicatorCode?: string
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
  relSchemaId?: number
  relSchemaName?: string
  relViewId?: number | string
  relViewid?: number | string
  relateDims?: string
  businessDefinition?: string
  rollingWindowSize?: number
  semanticGroupId?: number
  semanticType?: string
  semanticSchemaId?: number
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
  derivedConditions?: Array<{ logic?: 'AND' | 'OR'; metric?: string; operator?: string; value?: string }>
  derivedConditionExpr?: string
  dimensionFieldIds?: string
  divideZeroStrategy?: string
  expr?: string
  indicatorClass?: string
  indicatorCode?: string
  indicatorOwner?: string
  indAlias?: string[] | string
  isPublic?: boolean | string
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
  relViewid?: number | string
  businessDefinition?: string
  rollingWindowSize?: number
  semanticGroupId?: number
  semanticGroupName?: string
  semanticSchemaId?: number
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
  techName: string
  status?: number
  type: string
}
