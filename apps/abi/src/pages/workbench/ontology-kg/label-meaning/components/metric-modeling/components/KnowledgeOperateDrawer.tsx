/* eslint-disable complexity */
import { useDebounceFn } from 'ahooks'
import { Modal, message } from 'antd'
import React from 'react'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import {
  collectRuleFieldIds,
  createDefaultRuleLayers,
  hasConfiguredRuleConditions
} from '@/pages/workbench/ontology-kg/label-meaning/components/rule-expression'
import { getFirstErrorFieldName, scrollToFirstFormError } from '@/pages/workbench/ontology-kg/utils/form-scroll'
import { queryTableSemanticsDetail } from '@/service/api/data-table-meaning'
import { queryKnowledgeIndicatorDetail, queryKnowledgeIndicators } from '@/service/api/knowledge-extraction'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import {
  getMappedBizNameParts,
  getMappedTechNameParts,
  restoreMappedBizName,
  restoreMappedTechName
} from '../../../utils/ontologyName'
import type {
  KnowledgeAtomicMetricMeta,
  KnowledgeExpressionFieldMeta,
  KnowledgeFormValues,
  KnowledgeIndicatorItem,
  KnowledgeSubmitPayload,
  KnowledgeTechField,
  KnowledgeTemplateParams
} from '../types/metricModeling.types'
import {
  buildCustomAtomicSourceField,
  buildSimpleAtomicSourceField,
  getApiResponseData,
  getAtomicAggregationMethods,
  getAtomicAggregationType,
  getAtomicSemanticSchemaId,
  getAtomicSemanticSchemaName,
  getKnowledgeTechFieldId,
  hasAtomicAggregationMetadata,
  parseAtomicSourceFields,
  parseSemanticModelFields,
  resolveDerivedAggregationMethod
} from '../utils/atomicMetricSource'
import { getCustomExpressionSourceFields } from '../utils/customAtomic'
import { parseApiUpdateFrequency } from '../utils/indicatorApiAdapter'
import { normalizeKnowledgeIndicatorListItem } from '../utils/knowledgeIndicator.mapper'
import {
  appendMetricIndicatorSearchResults,
  buildMetricIndicatorSearchQuery,
  extractUniqueIds,
  getMetricFieldOptionLabel,
  getMetricIndicatorOptionLabel,
  getMetricIndicatorOptionValue,
  getStepItems,
  hasMoreMetricIndicatorSearchResults,
  mergeMetricIndicatorSearchResults,
  parseTemplateParams,
  shouldShowMetricPrecomputeConfig
} from '../utils/knowledgeOperateDrawer.utils'
import { createKnowledgeOperateValidators } from '../utils/knowledgeOperateDrawer.validators'
import { parseKnowledgeCalcLogicFormValues } from '../utils/knowledgeSubmitPayload'
import {
  DEFAULT_PRECOMPUTE_CONFIG,
  DEFAULT_STATISTICAL_CALIBER,
  isDynamicStatisticalDateRangeMode,
  normalizePrecomputeConfig,
  normalizeStatisticalCaliber
} from '../utils/precomputeConfig'
import { getKnowledgeSpaceId } from '../utils/space'

import { KnowledgeOperateBusinessStep } from './knowledgeOperateDrawer.BusinessStep'
import { KnowledgeOperateDimensionStep } from './knowledgeOperateDrawer.DimensionStep'
import { KnowledgeOperateSimpleAtomicTechnicalSection } from './knowledgeOperateDrawer.SimpleAtomicTechnicalSection'
import { KnowledgeOperateTechnicalStep } from './knowledgeOperateDrawer.TechnicalStep'

type IndicatorType = 'atomic' | 'composite' | 'derived'
type ValidationField = (number | string)[] | string

interface AtomicIndicatorOption {
  item: KnowledgeIndicatorItem
  label: string
  value: string
}

interface Props {
  readonly editingItem: KnowledgeIndicatorItem | null
  readonly existingItems?: KnowledgeIndicatorItem[]
  readonly groupId?: string
  readonly groupName?: string
  readonly onClose: (refresh?: boolean) => void
  readonly onSubmit: (payload: KnowledgeSubmitPayload, isEdit: boolean) => Promise<boolean>
  readonly open: boolean
}

const DERIVATIVE_TEMPLATE_FIELDS: Array<keyof KnowledgeFormValues> = [
  'accumulateStartDate',
  'compareMetricId',
  'comparePeriod',
  'compareType',
  'comparisonOutputType',
  'cumulativeMetricId',
  'cumulativeMode',
  'cumulativeTimeRange',
  'expr',
  'percentileValue',
  'ratioDenominatorId',
  'ratioNumeratorId',
  'ratioPrecision',
  'relItemId',
  'relSchemaId',
  'relViewId',
  'rollingWindowSize',
  'semanticGroupId',
  'semanticSchemaId',
  'semanticsGroupId',
  'semanticType',
  'templateType',
  'thresholdMax',
  'thresholdMin',
  'volatilityDataRange',
  'volatilityMethod',
  'volatilityMetricId'
]

const DERIVED_ONLY_FIELDS: Array<keyof KnowledgeFormValues> = [
  'derivedConditionExpr',
  'derivedConditions',
  'derivedExpressions',
  'projectionFunc',
  'statisticalCaliber',
  'techId'
]
const ATOMIC_ONLY_FIELDS: Array<keyof KnowledgeFormValues> = [
  'atomicAggregationExpression',
  'atomicAggregationMethods',
  'atomicSourceFieldId',
  'relSchemaId',
  'relViewId',
  'semanticGroupId',
  'semanticSchemaId',
  'semanticsGroupId',
  'semanticType'
]
const INDICATOR_OPTION_FORM_FIELDS: Array<keyof KnowledgeFormValues> = [
  'techId',
  'ratioNumeratorId',
  'ratioDenominatorId',
  'cumulativeMetricId',
  'compareMetricId',
  'volatilityMetricId'
]
const BUSINESS_FORM_FIELDS = new Set([
  'bizName',
  'businessDefinition',
  'dataType',
  'indicatorClass',
  'indAlias',
  'indicatorOwner',
  'isPublic',
  'measurementUnit',
  'ownerEmail',
  'ownerPhone',
  'precomputeConfig',
  'qualityLevel',
  'versionStatus'
])

function normalizeIndicatorClass(value?: string): IndicatorType {
  const text = String(value || '').trim()
  if (text === 'atomic') {
    return 'atomic'
  }
  if (text === 'composite') {
    return 'composite'
  }
  return 'derived'
}

function resolveTechFieldIdentity(value: unknown) {
  if (!value) {
    return ''
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return resolveTechFieldIdentity(parsed[0])
      }
      if (parsed && typeof parsed === 'object') {
        return resolveTechFieldIdentity(parsed)
      }
    } catch {
      return value.trim()
    }
  }
  if (Array.isArray(value) && value.length > 0) {
    return resolveTechFieldIdentity(value[0])
  }
  if (typeof value === 'object') {
    const source = value as KnowledgeTechField
    return String(source.techId || source.tfieldId || source.fieldName || source.originName || '').trim()
  }
  return String(value).trim()
}

function parseJsonIfPossible(value: unknown) {
  if (!value || typeof value !== 'string') {
    return value
  }
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function toFieldObject(source: unknown): KnowledgeTechField | null {
  if (!source) {
    return null
  }
  if (typeof source !== 'object') {
    const key = String(source).trim()
    if (!key) {
      return null
    }
    return {
      bizName: key,
      fieldName: key,
      name: key,
      originName: key,
      techId: key
    }
  }
  const techField = source as KnowledgeTechField
  const key = String(
    techField.techId || techField.tfieldId || techField.fieldName || techField.originName || techField.name || ''
  ).trim()
  if (!key) {
    return null
  }
  return {
    ...techField,
    fieldName: techField.fieldName || techField.originName || techField.name || key,
    techId: key
  }
}

function extractAtomicFields(item?: KnowledgeIndicatorItem) {
  if (!item) {
    return []
  }

  const parsedTechId = parseJsonIfPossible(item.techId)
  const fieldSources = Array.isArray(parsedTechId) ? parsedTechId : [parsedTechId]

  const fieldMap = new Map<string, KnowledgeTechField>()
  fieldSources.forEach(source => {
    const field = toFieldObject(source)
    if (!field) {
      return
    }
    const key = String(field.techId || field.fieldName || field.originName || field.name || '').trim()
    if (!key) {
      return
    }
    fieldMap.set(key, field)
  })

  return Array.from(fieldMap.values())
}

function buildAtomicMetricMetaMap(options: AtomicIndicatorOption[]) {
  return options.reduce<Record<string, KnowledgeAtomicMetricMeta>>((acc, option) => {
    const key = String(option.value || '').trim()
    if (!key) {
      return acc
    }

    acc[key] = {
      field: String(option.item.indicatorCode || key).trim(),
      fieldName: getMetricIndicatorOptionLabel(option.item),
      id: option.item.indId ?? option.item.termId ?? key,
      label: option.label,
      aggregationMethods: getAtomicAggregationMethods(option.item),
      projectionFunc: getAtomicAggregationMethods(option.item)[0],
      semanticSchemaId: getAtomicSemanticSchemaId(option.item),
      semanticSchemaName: option.item.semanticSchemaName || option.item.relSchemaName,
      value: key
    }

    return acc
  }, {})
}

function buildDerivedExpressionFieldMetaMap(fields: KnowledgeTechField[]) {
  return fields.reduce<Record<string, KnowledgeExpressionFieldMeta>>((acc, item) => {
    const key = String(item.techId || item.fieldName || item.name || '').trim()
    if (!key) {
      return acc
    }

    acc[key] = {
      field: String(item.fieldName || item.originName || item.name || key).trim(),
      fieldName: getMetricFieldOptionLabel(item),
      value: key
    }

    return acc
  }, {})
}

function splitAliasTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function resolveDerivedConditionMetrics(
  conditions: KnowledgeFormValues['derivedConditions'],
  fields: KnowledgeTechField[]
) {
  if (!conditions?.length || !fields.length) {
    return conditions
  }

  const fieldKeyMap = new Map<string, string>()
  fields.forEach(item => {
    const key = String(item.techId || item.fieldName || item.name || '').trim()
    if (!key) {
      return
    }

    ;[key, item.fieldName, item.originName, item.name, item.bizName, item.tfieldAlias].forEach(value => {
      const text = String(value || '').trim()
      if (text) {
        fieldKeyMap.set(text, key)
      }
    })
  })

  return conditions.map(item => {
    const metric = String(item?.fieldId || item?.metric || '').trim()
    return {
      ...item,
      ...(item.fieldId ? { fieldId: fieldKeyMap.get(metric) || metric } : { metric: fieldKeyMap.get(metric) || metric })
    }
  })
}

function resolveDerivedExpressionMetrics(
  expressions: KnowledgeFormValues['derivedExpressions'],
  fields: KnowledgeTechField[]
) {
  if (!expressions?.length) {
    return expressions
  }

  return expressions.map(expression => ({
    ...expression,
    conditions: resolveDerivedConditionMetrics(expression.conditions, fields),
    groups: expression.groups?.map(group => ({
      ...group,
      conditions: resolveDerivedConditionMetrics(group.conditions, fields)
    }))
  }))
}

function compactTemplateParams(params: KnowledgeTemplateParams): KnowledgeTemplateParams | undefined {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (!entries.length) {
    return undefined
  }
  return Object.fromEntries(entries) as KnowledgeTemplateParams
}

function buildTemplateParams(
  values: KnowledgeFormValues,
  indicatorClass: IndicatorType,
  allFields: KnowledgeTechField[]
): KnowledgeTemplateParams | undefined {
  if (indicatorClass !== 'composite') {
    return undefined
  }

  const templateType = String(values.templateType || '')
  const common = {
    expr: values.expr,
    relItemId: values.relItemId,
    templateType: values.templateType
  }

  if (templateType === 'ratio') {
    return compactTemplateParams({
      ...common,
      ratioDenominatorId: values.ratioDenominatorId,
      ratioNumeratorId: values.ratioNumeratorId,
      ratioPrecision: values.ratioPrecision,
      thresholdMax: values.thresholdMax,
      thresholdMin: values.thresholdMin
    })
  }
  if (templateType === 'cumulative') {
    return compactTemplateParams({
      ...common,
      accumulateStartDate: values.accumulateStartDate,
      cumulativeMetricId: values.cumulativeMetricId,
      cumulativeMode: values.cumulativeMode,
      cumulativeTimeRange: values.cumulativeTimeRange
    })
  }
  if (templateType === 'comparison') {
    return compactTemplateParams({
      ...common,
      compareMetricId: values.compareMetricId,
      comparePeriod: values.comparePeriod,
      compareType: values.compareType,
      comparisonOutputType: values.comparisonOutputType
    })
  }
  if (templateType === 'volatility') {
    return compactTemplateParams({
      ...common,
      rollingWindowSize: values.rollingWindowSize,
      volatilityDataRange: values.volatilityDataRange,
      volatilityMethod: values.volatilityMethod,
      volatilityMetricId: values.volatilityMetricId
    })
  }
  if (templateType === 'percentile') {
    return compactTemplateParams({
      ...common,
      percentileValue: values.percentileValue
    })
  }
  if (templateType === 'custom') {
    return compactTemplateParams({
      ...common,
      relItemId: buildRelItemId(values, indicatorClass, allFields)
    })
  }

  return compactTemplateParams(common)
}

function buildRelItemId(
  values: KnowledgeFormValues,
  indicatorClass: IndicatorType,
  allFields: KnowledgeTechField[]
) {
  if (indicatorClass === 'derived') {
    return collectRuleFieldIds(values.derivedExpressions).join(',')
  }
  if (indicatorClass === 'composite') {
    if (values.templateType === 'custom') {
      return getCustomExpressionSourceFields(values.expr, allFields)
        .map(getKnowledgeTechFieldId)
        .filter(Boolean)
        .join(',')
    }
    return extractUniqueIds(values.expr || '').join(',')
  }
  return undefined
}

function buildFormValuesFromDetail(item: KnowledgeIndicatorItem): KnowledgeFormValues {
  const templateValues = parseTemplateParams(item.templateParams) as Partial<KnowledgeFormValues>
  const calcLogicValues = parseKnowledgeCalcLogicFormValues(item.calcLogic) as Partial<KnowledgeFormValues>
  const rawBizName = (item.rawBizName ?? item.bizName ?? (item as Record<string, unknown>).biz_name) as
    | string
    | undefined
  const rawTechName = (item.rawIndicatorCode ?? item.rawTechName ?? item.indicatorCode ?? item.techName) as
    | string
    | undefined
  const mappedBizNameParts = getMappedBizNameParts(rawBizName)
  const mappedTechNameParts = getMappedTechNameParts(rawTechName)
  const rawCalcLogic = parseJsonIfPossible(item.calcLogic) as Record<string, unknown>
  const atomicSourceField = parseAtomicSourceFields(item.techId)[0]
  const precomputeConfig = parseApiUpdateFrequency(item.updateFrequency, rawCalcLogic?.precomputeConfig)
  const statisticalCaliber = normalizeStatisticalCaliber(calcLogicValues.statisticalCaliber)
  const values: KnowledgeFormValues = {
    ...item,
    ...templateValues,
    ...calcLogicValues,
    atomicAggregationMethods: getAtomicAggregationMethods(item),
    bizName: mappedBizNameParts.displayName,
    atomicSourceFieldId: resolveTechFieldIdentity(atomicSourceField),
    dimensionFieldIds: item.dimensionFieldIds ?? item.relateDims,
    indAlias: splitAliasTags(item.indAlias),
    indicatorCode: mappedTechNameParts.displayName,
    mappedBizNameTableName: mappedBizNameParts.isMapped ? mappedBizNameParts.tableName : undefined,
    mappedTechNameTableName: mappedTechNameParts.isMapped ? mappedTechNameParts.tableName : undefined,
    precomputeConfig,
    projectionFunc: calcLogicValues.projectionFunc || item.projectionFunc,
    relSchemaId: item.relSchemaId ?? item.semanticSchemaId,
    relViewId: item.relViewId ?? item.relViewid,
    semanticGroupId: item.semanticGroupId ?? item.semanticsGroupId,
    semanticSchemaId: item.semanticSchemaId ?? item.relSchemaId,
    semanticsGroupId: item.semanticsGroupId ?? item.semanticGroupId,
    semanticType: item.semanticType ?? atomicSourceField?.semanticType,
    statisticalCaliber,
    techName: mappedTechNameParts.displayName
  }
  if (item.isPublic !== undefined && item.isPublic !== null) {
    values.isPublic = Boolean(item.isPublic) === true || String(item.isPublic) === '1'
  }
  return values
}

export const KnowledgeOperateDrawer: React.FC<Props> = ({
  editingItem,
  groupId,
  groupName,
  onClose,
  onSubmit,
  open
}) => {
  const [form] = AForm.useForm<KnowledgeFormValues>()
  const [current, setCurrent] = useState(0)
  const [selectedIndicatorClass, setSelectedIndicatorClass] = useState<IndicatorType>('derived')
  const [allFields, setAllFields] = useState<KnowledgeTechField[]>([])
  const [fieldError, setFieldError] = useState(false)
  const [fieldLoading, setFieldLoading] = useState(false)
  const [indicatorOptionSource, setIndicatorOptionSource] = useState<KnowledgeIndicatorItem[]>([])
  const [referenceIndicatorOptionSource, setReferenceIndicatorOptionSource] = useState<KnowledgeIndicatorItem[]>([])
  const [indicatorOptionsLoading, setIndicatorOptionsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const currentSemanticSchemaRef = useRef<string>('')
  const editMatchedRef = useRef(false)
  const formValuesRef = useRef<Partial<KnowledgeFormValues>>({})
  const lastAtomicOptionRef = useRef<AtomicIndicatorOption>()
  const indicatorOptionsLoadingRef = useRef(false)
  const indicatorSearchHasMoreRef = useRef(true)
  const indicatorSearchPageRef = useRef(0)
  const indicatorSearchRequestRef = useRef(0)
  const indicatorSearchTextRef = useRef('')
  const semanticRequestRef = useRef(0)
  const submitLockRef = useRef(false)
  const templateTypeVal = AForm.useWatch('templateType', form)!

  const isEditing = Boolean(editingItem)
  const isAtomicEditing = normalizeIndicatorClass(editingItem?.indicatorClass) === 'atomic'
  const isSimpleAtomicEditing = isAtomicEditing && getAtomicAggregationType(editingItem || undefined) === 'simple'
  const indicatorClass = normalizeIndicatorClass(
    String(form.getFieldValue('indicatorClass') || selectedIndicatorClass || 'derived')
  )
  const isAtomicMode = isAtomicEditing || indicatorClass === 'atomic'
  const stepItems = useMemo(() => getStepItems(!isAtomicMode, isSimpleAtomicEditing), [isAtomicMode, isSimpleAtomicEditing])
  const currentStepKey = stepItems[current]?.key
  const atomicIndicatorOptions = useMemo(() => {
    const allowedClasses = indicatorClass === 'composite' ? new Set(['atomic', 'derived']) : new Set(['atomic'])

    return indicatorOptionSource
      .filter(item => allowedClasses.has(normalizeIndicatorClass(item.indicatorClass)))
      .map(item => ({
        item,
        label: getMetricIndicatorOptionLabel(item),
        value: getMetricIndicatorOptionValue(item)
      }))
      .filter(item => item.value)
  }, [indicatorClass, indicatorOptionSource])
  const referenceMetricOptions = useMemo(
    () =>
      referenceIndicatorOptionSource
        .filter(item => item.indicatorClass === 'atomic' || item.indicatorClass === 'derived')
        .map(item => ({
          item,
          label: getMetricIndicatorOptionLabel(item),
          value: getMetricIndicatorOptionValue(item)
        }))
        .filter(item => item.value),
    [referenceIndicatorOptionSource]
  )

  const {
    validateAccumulationDate,
    validateAliasTags,
    validateBusinessRemark,
    validateIndicatorName,
    validateMeasurementUnit,
    validatePercentile,
    validatePositiveInt,
    validateRollingWindow,
    validateSqlExpression,
    validateTechName,
    validateTechnicalRemark,
    validateThresholdMax,
    validateThresholdValue
  } = useMemo(
    () =>
      createKnowledgeOperateValidators({
        form,
        groupId,
        initialBizName: editingItem?.rawBizName || editingItem?.bizName,
        initialTechName:
          editingItem?.rawIndicatorCode ||
          editingItem?.rawTechName ||
          editingItem?.indicatorCode ||
          editingItem?.techName
      }),
    [editingItem, form, groupId]
  )

  const queryIndicatorOptions = useCallback(
    async (searchText: string, pageNum: number, requestId: number) => {
      indicatorOptionsLoadingRef.current = true
      setIndicatorOptionsLoading(true)
      try {
        const res = await queryKnowledgeIndicators(
          buildMetricIndicatorSearchQuery(searchText, getKnowledgeSpaceId(), pageNum)
        )
        assertFlatRequestSuccess(res)
        if (requestId !== indicatorSearchRequestRef.current) return
        const responseData = getApiResponseData(res)
        const nextItems = (Array.isArray(responseData.list) ? responseData.list : []).map(item =>
          normalizeKnowledgeIndicatorListItem(item as KnowledgeIndicatorItem)
        )
        const selectedValues = INDICATOR_OPTION_FORM_FIELDS.map(field => form.getFieldValue(field)).filter(
          value => typeof value === 'string' || typeof value === 'number'
        )
        const mergeItems = (currentItems: KnowledgeIndicatorItem[]) =>
          pageNum === 1
            ? mergeMetricIndicatorSearchResults(currentItems, nextItems, selectedValues)
            : appendMetricIndicatorSearchResults(currentItems, nextItems)
        setIndicatorOptionSource(mergeItems)
        if (!searchText.trim()) {
          setReferenceIndicatorOptionSource(mergeItems)
        }
        indicatorSearchPageRef.current = pageNum
        indicatorSearchHasMoreRef.current = hasMoreMetricIndicatorSearchResults(
          responseData.total,
          nextItems.length,
          pageNum
        )
      } catch {
        // The shared request layer reports the error; keep the last successful options.
      } finally {
        if (requestId === indicatorSearchRequestRef.current) {
          indicatorOptionsLoadingRef.current = false
          setIndicatorOptionsLoading(false)
        }
      }
    },
    [form]
  )

  const { cancel: cancelIndicatorSearch, run: runIndicatorSearch } = useDebounceFn(
    (searchText: string, pageNum: number, requestId: number) => {
      queryIndicatorOptions(searchText, pageNum, requestId)
    },
    { wait: 300 }
  )

  const handleIndicatorSearch = useCallback(
    (searchText: string) => {
      indicatorSearchTextRef.current = searchText
      indicatorSearchPageRef.current = 0
      indicatorSearchHasMoreRef.current = true
      const requestId = indicatorSearchRequestRef.current + 1
      indicatorSearchRequestRef.current = requestId
      runIndicatorSearch(searchText, 1, requestId)
    },
    [runIndicatorSearch]
  )

  const handleIndicatorLoadMore = useCallback(() => {
    if (
      indicatorOptionsLoadingRef.current ||
      !indicatorSearchHasMoreRef.current ||
      indicatorSearchPageRef.current < 1
    ) {
      return
    }
    const requestId = indicatorSearchRequestRef.current + 1
    indicatorSearchRequestRef.current = requestId
    queryIndicatorOptions(indicatorSearchTextRef.current, indicatorSearchPageRef.current + 1, requestId)
  }, [queryIndicatorOptions])

  const updateIndicatorOptionItem = useCallback((optionValue: string, values: KnowledgeIndicatorItem) => {
    const updateItems = (items: KnowledgeIndicatorItem[]) =>
      items.map(item => (getMetricIndicatorOptionValue(item) === optionValue ? { ...item, ...values } : item))
    setIndicatorOptionSource(updateItems)
    setReferenceIndicatorOptionSource(updateItems)
  }, [])

  const fetchSemanticSchemaDetail = useCallback(async (schemaId: number | string) => {
    const schemaResult = await queryTableSemanticsDetail(schemaId)
    assertFlatRequestSuccess(schemaResult)
    return getApiResponseData(schemaResult)
  }, [])

  const loadAtomicSemanticFields = useCallback(
    async (option?: AtomicIndicatorOption, settings?: { confirmChange?: boolean; previousTechId?: unknown }) => {
      semanticRequestRef.current += 1
      const requestId = semanticRequestRef.current
      lastAtomicOptionRef.current = option
      if (!option) {
        setAllFields([])
        setFieldError(false)
        setFieldLoading(false)
        currentSemanticSchemaRef.current = ''
        form.setFieldValue('projectionFunc', undefined)
        return
      }

      setFieldLoading(true)
      setFieldError(false)
      try {
        let resolvedItem = option.item
        let schemaId = getAtomicSemanticSchemaId(resolvedItem)
        const detailId = resolvedItem.indId ?? resolvedItem.termId
        if (
          detailId !== undefined &&
          (!schemaId || getAtomicSemanticSchemaName(resolvedItem) === '-' || !hasAtomicAggregationMetadata(resolvedItem))
        ) {
          const detailResult = await queryKnowledgeIndicatorDetail({ id: detailId })
          assertFlatRequestSuccess(detailResult)
          const detail = getApiResponseData(detailResult)
          if (requestId !== semanticRequestRef.current) return
          resolvedItem = { ...resolvedItem, ...detail }
          schemaId = getAtomicSemanticSchemaId(resolvedItem)
        }
        lastAtomicOptionRef.current = { ...option, item: resolvedItem }
        updateIndicatorOptionItem(option.value, resolvedItem)

        const nextSchemaId = String(schemaId ?? '')
        const schemaChanged = Boolean(
          currentSemanticSchemaRef.current && nextSchemaId && currentSemanticSchemaRef.current !== nextSchemaId
        )
        if (
          settings?.confirmChange !== false &&
          schemaChanged &&
          hasConfiguredRuleConditions(form.getFieldValue('derivedExpressions'))
        ) {
          const confirmed = await new Promise<boolean>(resolve => {
            Modal.confirm({
              cancelText: '取消',
              content: '切换数据语义将清空已配置的业务限定条件，是否继续？',
              okText: '继续切换',
              onCancel: () => resolve(false),
              onOk: () => resolve(true),
              title: '切换原子指标'
            })
          })
          if (requestId !== semanticRequestRef.current) return
          if (!confirmed) {
            form.setFieldValue('techId', settings?.previousTechId)
            formValuesRef.current = {
              ...formValuesRef.current,
              techId: settings?.previousTechId as KnowledgeFormValues['techId']
            }
            lastAtomicOptionRef.current = undefined
            return
          }
          form.setFieldValue('derivedExpressions', createDefaultRuleLayers())
          form.setFieldValue('derivedConditionExpr', '')
        }
        if (schemaChanged) setAllFields([])

        const projectionFunc = resolveDerivedAggregationMethod(
          resolvedItem,
          form.getFieldValue('projectionFunc'),
          settings?.confirmChange === false
        )
        form.setFieldValue('projectionFunc', projectionFunc)
        formValuesRef.current = { ...formValuesRef.current, projectionFunc, techId: option.value }
        currentSemanticSchemaRef.current = nextSchemaId

        if (!schemaId) {
          setAllFields(parseAtomicSourceFields(resolvedItem.techId))
          setFieldError(true)
          return
        }

        const schemaDetail = await fetchSemanticSchemaDetail(schemaId)
        if (requestId !== semanticRequestRef.current) return
        const fields = parseSemanticModelFields(schemaDetail)
        setAllFields(fields)
        const atomicSemanticSchemaName = getAtomicSemanticSchemaName(resolvedItem)
        const semanticSchemaName = String(
          (atomicSemanticSchemaName !== '-' && atomicSemanticSchemaName) ||
            schemaDetail.rtableName ||
            schemaDetail.bizName ||
            schemaDetail.schemaName ||
            schemaDetail.name ||
            '-'
        ).trim()
        updateIndicatorOptionItem(option.value, { ...resolvedItem, semanticSchemaName })
        form.setFieldValue(
          'derivedExpressions',
          resolveDerivedExpressionMetrics(form.getFieldValue('derivedExpressions'), fields)
        )
      } catch {
        if (requestId !== semanticRequestRef.current) return
        setAllFields(parseAtomicSourceFields(option.item.techId))
        setFieldError(true)
      } finally {
        if (requestId === semanticRequestRef.current) setFieldLoading(false)
      }
    },
    [fetchSemanticSchemaDetail, form, updateIndicatorOptionItem]
  )

  const loadCustomAtomicSemanticFields = useCallback(
    async (schemaId: number | string) => {
      semanticRequestRef.current += 1
      const requestId = semanticRequestRef.current
      currentSemanticSchemaRef.current = String(schemaId)
      setFieldLoading(true)
      setFieldError(false)
      try {
        const schemaDetail = await fetchSemanticSchemaDetail(schemaId)
        if (requestId !== semanticRequestRef.current) return
        setAllFields(parseSemanticModelFields(schemaDetail))
      } catch {
        if (requestId !== semanticRequestRef.current) return
        setFieldError(true)
      } finally {
        if (requestId === semanticRequestRef.current) setFieldLoading(false)
      }
    },
    [fetchSemanticSchemaDetail]
  )

  const handleAtomicSchemaChange = useCallback(
    async ({
      semanticGroupId,
      semanticSchemaId,
      semanticsGroupId,
      viewId
    }: {
      semanticGroupId: number | string | null
      semanticSchemaId: number | string
      semanticsGroupId: number | string | null
      viewId: number | string
    }) => {
      const nextGroupId = semanticsGroupId ?? semanticGroupId ?? undefined
      const isDerivativeCustom =
        normalizeIndicatorClass(form.getFieldValue('indicatorClass')) === 'composite' &&
        form.getFieldValue('templateType') === 'custom'
      const nextValues: Partial<KnowledgeFormValues> = {
        atomicSourceFieldId: undefined,
        relSchemaId: semanticSchemaId,
        relViewId: viewId,
        semanticGroupId: nextGroupId,
        semanticSchemaId,
        semanticsGroupId: nextGroupId,
        semanticType: undefined
      }
      if (isDerivativeCustom) {
        nextValues.expr = undefined
      } else {
        nextValues.atomicAggregationExpression = undefined
      }
      form.setFieldsValue(nextValues)
      formValuesRef.current = { ...formValuesRef.current, ...nextValues }
      setAllFields([])
      await loadCustomAtomicSemanticFields(semanticSchemaId)
    },
    [form, loadCustomAtomicSemanticFields]
  )

  const retryAtomicSemanticFields = useCallback(() => {
    const indicatorClassValue = normalizeIndicatorClass(form.getFieldValue('indicatorClass'))
    if (
      indicatorClassValue === 'atomic' ||
      (indicatorClassValue === 'composite' && form.getFieldValue('templateType') === 'custom')
    ) {
      const schemaId = form.getFieldValue('semanticSchemaId') || form.getFieldValue('relSchemaId')
      if (schemaId !== undefined && schemaId !== null && schemaId !== '') {
        loadCustomAtomicSemanticFields(schemaId)
      }
      return
    }
    loadAtomicSemanticFields(lastAtomicOptionRef.current, {
      confirmChange: false,
      previousTechId: form.getFieldValue('techId')
    })
  }, [form, loadAtomicSemanticFields, loadCustomAtomicSemanticFields])

  useEffect(() => {
    if (!open) {
      cancelIndicatorSearch()
      indicatorSearchRequestRef.current += 1
      indicatorOptionsLoadingRef.current = false
      indicatorSearchHasMoreRef.current = true
      indicatorSearchPageRef.current = 0
      indicatorSearchTextRef.current = ''
      setIndicatorOptionsLoading(false)
      return
    }
    indicatorSearchTextRef.current = ''
    indicatorSearchPageRef.current = 0
    indicatorSearchHasMoreRef.current = true
    const requestId = indicatorSearchRequestRef.current + 1
    indicatorSearchRequestRef.current = requestId
    queryIndicatorOptions('', 1, requestId)
  }, [cancelIndicatorSearch, open, queryIndicatorOptions])

  useEffect(() => {
    if (!open) {
      editMatchedRef.current = false
      semanticRequestRef.current += 1
      return
    }
    form.resetFields()
    editMatchedRef.current = false
    formValuesRef.current = {}
    setCurrent(0)
    setFieldError(false)
    setFieldLoading(false)
    currentSemanticSchemaRef.current = ''

    if (editingItem) {
      const editValues = buildFormValuesFromDetail(editingItem)
      const indicatorClassValue = normalizeIndicatorClass(editValues.indicatorClass)
      editValues.indicatorClass = indicatorClassValue

      if (!isAtomicEditing) {
        const nextAllFields = extractAtomicFields(editingItem)
        editValues.derivedConditions = resolveDerivedConditionMetrics(editValues.derivedConditions, nextAllFields)
        editValues.derivedExpressions = resolveDerivedExpressionMetrics(editValues.derivedExpressions, nextAllFields)
        setAllFields(nextAllFields)
      } else {
        setAllFields(parseAtomicSourceFields(editingItem.techId))
      }

      form.setFieldsValue(editValues)
      formValuesRef.current = editValues
      setSelectedIndicatorClass(indicatorClassValue)

      if (
        editValues.semanticSchemaId &&
        (isAtomicEditing || (indicatorClassValue === 'composite' && editValues.templateType === 'custom'))
      ) {
        loadCustomAtomicSemanticFields(editValues.semanticSchemaId)
      }

      return
    }
    const nextValues = {
      derivedExpressions: createDefaultRuleLayers(),
      indAlias: [],
      precomputeConfig: DEFAULT_PRECOMPUTE_CONFIG,
      projectionFunc: undefined,
      statisticalCaliber: DEFAULT_STATISTICAL_CALIBER,
      variableMappings: []
    }
    form.setFieldsValue(nextValues)
    formValuesRef.current = nextValues
    setSelectedIndicatorClass('derived')
    setAllFields([])
  }, [editingItem, form, isAtomicEditing, loadCustomAtomicSemanticFields, open])

  useEffect(() => {
    const isDerivativeCustomEditing =
      normalizeIndicatorClass(editingItem?.indicatorClass) === 'composite' &&
      form.getFieldValue('templateType') === 'custom'
    if (
      !open ||
      !editingItem ||
      isAtomicMode ||
      isDerivativeCustomEditing ||
      editMatchedRef.current ||
      !atomicIndicatorOptions.length
    ) {
      return
    }

    const currentTechIdentity = resolveTechFieldIdentity(editingItem.techId)
    const matchedOption = atomicIndicatorOptions.find(item => {
      const optionTechIdentity = resolveTechFieldIdentity(item.item.techId)
      return optionTechIdentity && optionTechIdentity === currentTechIdentity
    })

    if (!matchedOption) {
      return
    }

    const nextAllFields = extractAtomicFields(matchedOption.item)
    const nextValues: Partial<KnowledgeFormValues> = {
      derivedConditions: resolveDerivedConditionMetrics(form.getFieldValue('derivedConditions'), nextAllFields),
      derivedExpressions: resolveDerivedExpressionMetrics(form.getFieldValue('derivedExpressions'), nextAllFields),
      techId: matchedOption.value
    }
    form.setFieldsValue(nextValues)
    formValuesRef.current = {
      ...formValuesRef.current,
      ...nextValues
    }
    setAllFields(nextAllFields)
    editMatchedRef.current = true
    loadAtomicSemanticFields(matchedOption, { confirmChange: false, previousTechId: matchedOption.value })
  }, [atomicIndicatorOptions, editingItem, form, isAtomicMode, loadAtomicSemanticFields, open])

  useEffect(() => {
    if (current > stepItems.length - 1) {
      setCurrent(stepItems.length - 1)
    }
  }, [current, stepItems.length])

  const getTechnicalRequiredFields = () => {
    if (indicatorClass === 'atomic') {
      if (isSimpleAtomicEditing) {
        return ['semanticSchemaId', 'atomicSourceFieldId', 'atomicAggregationMethods']
      }
      return ['techName', 'semanticSchemaId', 'atomicSourceFieldId', 'atomicAggregationExpression']
    }

    if (indicatorClass === 'derived') {
      const statisticalCaliber = normalizeStatisticalCaliber(form.getFieldValue('statisticalCaliber'))
      const fields: ValidationField[] = [
        'indicatorCode',
        'techId',
        'projectionFunc',
        ['statisticalCaliber', 'dateRangeMode'],
        ['statisticalCaliber', 'timeRangeType'],
        ['statisticalCaliber', 'subjectDimensionIds'],
        'derivedExpressions'
      ]
      if (isDynamicStatisticalDateRangeMode(statisticalCaliber.dateRangeMode)) {
        fields.push(['statisticalCaliber', 'dateRangeValue'], ['statisticalCaliber', 'dateRangeUnit'])
      }
      if (statisticalCaliber.timeRangeType === 'specified') {
        fields.push(['statisticalCaliber', 'startTime'], ['statisticalCaliber', 'endTime'])
      }
      return fields
    }

    const templateType = String(form.getFieldValue('templateType') || '')
    const templateFields: Array<keyof KnowledgeFormValues> = ['techName', 'templateType']
    if (templateType === 'ratio') {
      templateFields.push('ratioNumeratorId', 'ratioDenominatorId', 'ratioPrecision')
    }
    if (templateType === 'cumulative') {
      templateFields.push('cumulativeMetricId', 'cumulativeTimeRange', 'accumulateStartDate', 'cumulativeMode')
    }
    if (templateType === 'comparison') {
      templateFields.push('compareMetricId', 'compareType', 'comparePeriod', 'comparisonOutputType')
    }
    if (templateType === 'volatility') {
      templateFields.push('volatilityMetricId', 'volatilityMethod', 'rollingWindowSize', 'volatilityDataRange')
    }
    if (templateType === 'percentile') {
      templateFields.push('percentileValue')
    }
    if (templateType === 'custom') {
      templateFields.push('semanticSchemaId', 'expr')
    }
    return templateFields
  }

  const handleValuesChange = (changeValues: Partial<KnowledgeFormValues>, allValues: KnowledgeFormValues) => {
    const previousTechId = formValuesRef.current.techId
    formValuesRef.current = {
      ...formValuesRef.current,
      ...allValues,
      ...changeValues
    }

    if (Object.hasOwn(changeValues, 'expr')) {
      const isDerivativeCustom =
        normalizeIndicatorClass(form.getFieldValue('indicatorClass')) === 'composite' &&
        form.getFieldValue('templateType') === 'custom'
      const relItemId = isDerivativeCustom
        ? buildRelItemId(allValues, 'composite', allFields)
        : extractUniqueIds(changeValues.expr || '').join(',')
      form.setFieldValue('relItemId', relItemId)
    }

    const clearFields = (fields: Array<keyof KnowledgeFormValues>) => {
      const clearedValues = fields.reduce<Partial<KnowledgeFormValues>>((acc, field) => {
        acc[field] = undefined
        return acc
      }, {})
      form.setFieldsValue(clearedValues)
      formValuesRef.current = {
        ...formValuesRef.current,
        ...clearedValues
      }
    }

    if (Object.hasOwn(changeValues, 'indicatorClass')) {
      const nextClass = normalizeIndicatorClass(String(changeValues.indicatorClass || 'derived'))
      setSelectedIndicatorClass(nextClass)
      if (nextClass === 'derived') {
        clearFields([...ATOMIC_ONLY_FIELDS, ...DERIVATIVE_TEMPLATE_FIELDS, 'techName'])
        const derivedDefaults: Partial<KnowledgeFormValues> = {
          derivedExpressions: createDefaultRuleLayers(),
          projectionFunc: undefined,
          statisticalCaliber: { ...DEFAULT_STATISTICAL_CALIBER }
        }
        form.setFieldsValue(derivedDefaults)
        formValuesRef.current = { ...formValuesRef.current, ...derivedDefaults }
      }
      if (nextClass === 'composite') {
        clearFields([...ATOMIC_ONLY_FIELDS, ...DERIVED_ONLY_FIELDS, 'techName'])
        setAllFields([])
      }
      if (nextClass === 'atomic') {
        clearFields([...DERIVED_ONLY_FIELDS, ...DERIVATIVE_TEMPLATE_FIELDS, 'techName'])
        setAllFields([])
        setCurrent(0)
      }
    }

    if (Object.hasOwn(changeValues, 'templateType')) {
      clearFields(DERIVATIVE_TEMPLATE_FIELDS.filter(field => field !== 'templateType'))
      currentSemanticSchemaRef.current = ''
      setAllFields([])
    }

    if (Object.hasOwn(changeValues, 'techId') && !isAtomicMode) {
      const selected = atomicIndicatorOptions.find(item => item.value === String(changeValues.techId || ''))
      loadAtomicSemanticFields(selected, { previousTechId })
    }
  }

  const scrollKnowledgeFormError = (error: unknown) => {
    const firstName = getFirstErrorFieldName(error)
    const firstKey = Array.isArray(firstName) ? String(firstName[0] || '') : String(firstName || '')
    let targetStepKey = 'technical'
    if (BUSINESS_FORM_FIELDS.has(firstKey)) {
      targetStepKey = 'business'
    } else if (firstKey === 'dimensionFieldIds') {
      targetStepKey = 'dimension'
    }
    const targetStepIndex = stepItems.findIndex(item => item.key === targetStepKey)

    if (targetStepIndex >= 0 && targetStepIndex !== current) {
      setCurrent(targetStepIndex)
      setTimeout(() => scrollToFirstFormError(form, error), 0)
      return
    }

    scrollToFirstFormError(form, error)
  }

  const validateKnowledgeFields = async (fields: ValidationField[]) => {
    try {
      await form.validateFields(fields)
      return true
    } catch (error) {
      scrollKnowledgeFormError(error)
      return false
    }
  }

  const getBusinessRequiredFields = () => {
    const precomputeFields: ValidationField[] = []
    if (shouldShowMetricPrecomputeConfig(indicatorClass)) {
      const precomputeConfig = normalizePrecomputeConfig(form.getFieldValue('precomputeConfig'))
      precomputeFields.push(['precomputeConfig', 'frequency'])
      if (precomputeConfig.frequency === 'hourly') precomputeFields.push(['precomputeConfig', 'minute'])
      if (precomputeConfig.frequency === 'daily') precomputeFields.push(['precomputeConfig', 'time'])
      if (precomputeConfig.frequency === 'weekly')
        precomputeFields.push(['precomputeConfig', 'weekday'], ['precomputeConfig', 'time'])
      if (precomputeConfig.frequency === 'monthly')
        precomputeFields.push(['precomputeConfig', 'monthDay'], ['precomputeConfig', 'time'])
    }
    const baseFields: ValidationField[] = [
      'bizName',
      'indicatorClass',
      'versionStatus',
      'dataType',
      'qualityLevel',
      'businessDefinition',
      ...precomputeFields
    ]
    return baseFields
  }

  const next = async () => {
    if (currentStepKey === 'business') {
      const valid = await validateKnowledgeFields(getBusinessRequiredFields())
      if (!valid) {
        return
      }
      setSelectedIndicatorClass(normalizeIndicatorClass(String(form.getFieldValue('indicatorClass') || 'derived')))
      setCurrent(prev => prev + 1)
      return
    }

    if (currentStepKey === 'technical') {
      const valid = await validateKnowledgeFields(getTechnicalRequiredFields())
      if (!valid) {
        return
      }
      setCurrent(prev => prev + 1)
    }
  }

  const prev = () => {
    setCurrent(pre => Math.max(pre - 1, 0))
  }

  const handleOk = async () => {
    if (!groupId) {
      message.error('请先选择知识提取组')
      return
    }

    const baseFields = getBusinessRequiredFields()
    const valid = await validateKnowledgeFields([...baseFields, ...getTechnicalRequiredFields()])
    if (!valid) {
      return
    }

    const values = {
      ...formValuesRef.current,
      ...form.getFieldsValue(true)
    } as KnowledgeFormValues
    const nextIndicatorClass = normalizeIndicatorClass(values.indicatorClass)
    const submitBizName = restoreMappedBizName(values.bizName, values.mappedBizNameTableName)
    const submitTechName = restoreMappedTechName(
      nextIndicatorClass === 'derived' ? values.indicatorCode : values.techName,
      values.mappedTechNameTableName
    )

    const selectedAtomic = atomicIndicatorOptions.find(item => item.value === String(values.techId || ''))
    const selectedAtomicSource = allFields.find(
      item => getKnowledgeTechFieldId(item) === String(values.atomicSourceFieldId || '')
    )
    const isDerivativeCustom = nextIndicatorClass === 'composite' && values.templateType === 'custom'
    const originalAtomicSource = parseAtomicSourceFields(editingItem?.techId)[0]
    const atomicSourceInput =
      isSimpleAtomicEditing &&
      selectedAtomicSource &&
      getKnowledgeTechFieldId(selectedAtomicSource) === getKnowledgeTechFieldId(originalAtomicSource)
        ? { ...selectedAtomicSource, ...originalAtomicSource }
        : selectedAtomicSource
    let atomicSourceField: KnowledgeTechField | null = null
    if (isAtomicMode) {
      atomicSourceField = isSimpleAtomicEditing
        ? buildSimpleAtomicSourceField(atomicSourceInput, values.atomicAggregationMethods)
        : buildCustomAtomicSourceField(atomicSourceInput)
    }
    if (isAtomicMode && !atomicSourceField) {
      message.error('来源字段信息未加载完成，请重新选择数据后重试')
      const technicalStepIndex = stepItems.findIndex(item => item.key === 'technical')
      if (technicalStepIndex >= 0) setCurrent(technicalStepIndex)
      return
    }
    const derivativeCustomSourceFields = isDerivativeCustom
      ? getCustomExpressionSourceFields(values.expr, allFields)
          .map(buildCustomAtomicSourceField)
          .filter((item): item is KnowledgeTechField => Boolean(item))
      : []
    if (isDerivativeCustom && !derivativeCustomSourceFields.length) {
      message.error('请在聚合逻辑表达式中插入至少一个来源字段')
      const technicalStepIndex = stepItems.findIndex(item => item.key === 'technical')
      if (technicalStepIndex >= 0) setCurrent(technicalStepIndex)
      return
    }
    let selectedTechObject = selectedAtomic?.item?.techId ?? values.techId
    if (isAtomicMode && atomicSourceField) {
      selectedTechObject = [atomicSourceField]
    } else if (isDerivativeCustom) {
      selectedTechObject = derivativeCustomSourceFields
    }
    const aliasText = (Array.isArray(values.indAlias) ? values.indAlias : splitAliasTags(values.indAlias))
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .join(',')

    const payload: KnowledgeSubmitPayload = {
      ...editingItem,
      ...values,
      atomicMetricMetaMap: buildAtomicMetricMetaMap(atomicIndicatorOptions),
      bizName: submitBizName,
      derivedExpressionFieldMetaMap: buildDerivedExpressionFieldMetaMap(allFields),
      dimensionFieldIds: values.dimensionFieldIds ?? editingItem?.dimensionFieldIds ?? '',
      groupId,
      indAlias: aliasText,
      relItemId: buildRelItemId(values, nextIndicatorClass, allFields),
      spaceId: getKnowledgeSpaceId(),
      templateParams: buildTemplateParams(values, nextIndicatorClass, allFields)
    }

    if (nextIndicatorClass === 'derived') {
      payload.indicatorCode = submitTechName
      delete payload.techName
    } else {
      payload.techName = submitTechName
      delete payload.indicatorCode
    }
    if (isSimpleAtomicEditing && atomicSourceField?.projectionFunc) {
      payload.projectionFunc = atomicSourceField.projectionFunc
    }
    payload.techId = selectedTechObject as KnowledgeSubmitPayload['techId']

    if (submitLockRef.current) {
      return
    }
    submitLockRef.current = true
    setSubmitting(true)
    try {
      const success = await onSubmit(payload, isEditing)
      if (!success) {
        return
      }
      onClose()
    } finally {
      submitLockRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <CommonDrawer
      open={open}
      title={isEditing ? '编辑指标建模' : '新建指标建模'}
      width="60%"
      footer={
        <ASpace className="w-full justify-end">
          <AButton disabled={submitting} onClick={() => onClose()}>取消</AButton>
          {current > 0 ? <AButton disabled={submitting} onClick={prev}>上一步</AButton> : null}
          {current < stepItems.length - 1 ? (
            <AButton
              type="primary"
              onClick={next}
            >
              下一步
            </AButton>
          ) : (
            <AButton
              loading={submitting}
              type="primary"
              onClick={handleOk}
            >
              确认
            </AButton>
          )}
        </ASpace>
      }
      onClose={() => {
        if (!submitting) onClose()
      }}
    >
      <div className="mb-4 rounded bg-gray-50 px-3 py-2 text-sm">当前分组：{groupName || '-'}</div>

      {stepItems.length > 1 ? (
        <div className="mx-auto mb-6 max-w-820px">
          <ASteps
            current={current}
            items={stepItems}
          />
        </div>
      ) : null}

      <AForm
        preserve
        requiredMark
        className="ds-form-section"
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
      >
        {currentStepKey === 'business' ? (
          <KnowledgeOperateBusinessStep
            atomicTechnicalSection={
              isSimpleAtomicEditing ? (
                <KnowledgeOperateSimpleAtomicTechnicalSection
                  allFields={allFields}
                  fieldError={fieldError}
                  fieldLoading={fieldLoading}
                  form={form}
                  onRetryFields={retryAtomicSemanticFields}
                  onSchemaChange={handleAtomicSchemaChange}
                />
              ) : null
            }
            form={form}
            indicatorNameDisabled={false}
            indicatorTypeDisabled={isEditing}
            validateAliasTags={validateAliasTags}
            validateBusinessRemark={validateBusinessRemark}
            validateIndicatorName={validateIndicatorName}
            validateMeasurementUnit={validateMeasurementUnit}
          />
        ) : null}

        {currentStepKey === 'technical' ? (
          <KnowledgeOperateTechnicalStep
            allFields={allFields}
            atomicMetricOptions={atomicIndicatorOptions}
            editing={isEditing}
            fieldError={fieldError}
            fieldLoading={fieldLoading}
            form={form}
            indicatorClass={indicatorClass}
            indicatorOptionsLoading={indicatorOptionsLoading}
            onAtomicSchemaChange={handleAtomicSchemaChange}
            referenceMetricOptions={referenceMetricOptions}
            templateTypeVal={templateTypeVal}
            validateAccumulationDate={validateAccumulationDate}
            validatePercentile={validatePercentile}
            validatePositiveInt={validatePositiveInt}
            validateRollingWindow={validateRollingWindow}
            validateSqlExpression={validateSqlExpression}
            validateTechName={validateTechName}
            validateTechnicalRemark={validateTechnicalRemark}
            validateThresholdMax={validateThresholdMax}
            validateThresholdValue={validateThresholdValue}
            onIndicatorLoadMore={handleIndicatorLoadMore}
            onIndicatorSearch={handleIndicatorSearch}
            onRetryFields={retryAtomicSemanticFields}
          />
        ) : null}

        {currentStepKey === 'dimension' ? <KnowledgeOperateDimensionStep form={form} /> : null}
      </AForm>
    </CommonDrawer>
  )
}
