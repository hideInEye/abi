/* eslint-disable complexity */
import { CloseOutlined } from '@ant-design/icons'
import { message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React from 'react'

import { queryKnowledgeIndicators } from '@/service/api/knowledge-extraction'
import { getFirstErrorFieldName, scrollToFirstFormError } from '@/pages/workbench/ontology-kg/utils/form-scroll'

import { INDICATOR_TYPE_OPTIONS } from '../constants/metricModeling.constants'
import type {
  KnowledgeAtomicMetricMeta,
  KnowledgeExpressionFieldMeta,
  KnowledgeFormValues,
  KnowledgeIndicatorItem,
  KnowledgeSubmitPayload,
  KnowledgeTechField,
  KnowledgeTemplateParams,
} from '../types/metricModeling.types'
import {
  extractUniqueIds,
  getMetricFieldOptionLabel,
  getMetricIndicatorOptionLabel,
  getStepItems,
  parseTemplateParams,
} from '../utils/knowledgeOperateDrawer.utils'
import { createKnowledgeOperateValidators } from '../utils/knowledgeOperateDrawer.validators'
import { parseKnowledgeCalcLogicFormValues } from '../utils/knowledgeSubmitPayload'
import { getKnowledgeSpaceId } from '../utils/space'
import { getMappedBizNameParts, getMappedTechNameParts, restoreMappedBizName, restoreMappedTechName } from '../../../utils/ontologyName'

import { KnowledgeOperateBusinessStep } from './knowledgeOperateDrawer.BusinessStep'
import { KnowledgeOperateDimensionStep } from './knowledgeOperateDrawer.DimensionStep'
import { KnowledgeOperateTechnicalStep } from './knowledgeOperateDrawer.TechnicalStep'

type IndicatorType = 'atomic' | 'derivative' | 'derived'

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
  'rollingWindowSize',
  'templateType',
  'thresholdMax',
  'thresholdMin',
  'volatilityDataRange',
  'volatilityMethod',
  'volatilityMetricId',
]

const DERIVED_ONLY_FIELDS: Array<keyof KnowledgeFormValues> = ['derivedConditionExpr', 'derivedConditions', 'derivedExpressions', 'projectionFunc', 'techId']
const BUSINESS_FORM_FIELDS = new Set(['bizName', 'businessDefinition', 'calcPeriod', 'dataType', 'indicatorClass', 'indAlias', 'indicatorOwner', 'isPublic', 'measurementUnit', 'ownerEmail', 'ownerPhone', 'qualityLevel', 'updateFrequency', 'versionStatus'])

function normalizeIndicatorClass(value?: string): IndicatorType {
  const text = String(value || '').trim()
  if (text === 'atomic') {
    return 'atomic'
  }
  if (text === 'derivative') {
    return 'derivative'
  }
  return 'derived'
}

function normalizeAtomicSelectValue(item: KnowledgeIndicatorItem) {
  return String(item.termId || item.indId || item.indicatorCode || item.techName || item.bizName || '')
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
      techId: key,
    }
  }
  const techField = source as KnowledgeTechField
  const key = String(techField.techId || techField.tfieldId || techField.fieldName || techField.originName || techField.name || '').trim()
  if (!key) {
    return null
  }
  return {
    ...techField,
    fieldName: techField.fieldName || techField.originName || techField.name || key,
    techId: key,
  }
}

function extractAtomicFields(item?: KnowledgeIndicatorItem) {
  if (!item) {
    return []
  }

  const parsedTechId = parseJsonIfPossible(item.techId)
  const fieldSources = Array.isArray(parsedTechId) ? parsedTechId : [parsedTechId]

  const fieldMap = new Map<string, KnowledgeTechField>()
  fieldSources.forEach((source) => {
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
      value: key,
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
      value: key,
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
    .map((item) => item.trim())
    .filter(Boolean)
}

function resolveDerivedConditionMetrics(conditions: KnowledgeFormValues['derivedConditions'], fields: KnowledgeTechField[]) {
  if (!conditions?.length || !fields.length) {
    return conditions
  }

  const fieldKeyMap = new Map<string, string>()
  fields.forEach((item) => {
    const key = String(item.techId || item.fieldName || item.name || '').trim()
    if (!key) {
      return
    }

    ;[key, item.fieldName, item.originName, item.name, item.bizName, item.tfieldAlias].forEach((value) => {
      const text = String(value || '').trim()
      if (text) {
        fieldKeyMap.set(text, key)
      }
    })
  })

  return conditions.map((item) => {
    const metric = String(item?.metric || '').trim()
    return {
      ...item,
      metric: fieldKeyMap.get(metric) || metric,
    }
  })
}

function resolveDerivedExpressionMetrics(expressions: KnowledgeFormValues['derivedExpressions'], fields: KnowledgeTechField[]) {
  if (!expressions?.length) {
    return expressions
  }

  return expressions.map((expression) => ({
    ...expression,
    conditions: resolveDerivedConditionMetrics(expression.conditions, fields),
  }))
}

function compactTemplateParams(params: KnowledgeTemplateParams): KnowledgeTemplateParams | undefined {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (!entries.length) {
    return undefined
  }
  return Object.fromEntries(entries) as KnowledgeTemplateParams
}

function buildTemplateParams(values: KnowledgeFormValues, indicatorClass: IndicatorType): KnowledgeTemplateParams | undefined {
  if (indicatorClass !== 'derivative') {
    return undefined
  }

  const templateType = String(values.templateType || '')
  const common = {
    expr: values.expr,
    relItemId: values.relItemId,
    templateType: values.templateType,
  }

  if (templateType === 'ratio') {
    return compactTemplateParams({
      ...common,
      ratioDenominatorId: values.ratioDenominatorId,
      ratioNumeratorId: values.ratioNumeratorId,
      ratioPrecision: values.ratioPrecision,
      thresholdMax: values.thresholdMax,
      thresholdMin: values.thresholdMin,
    })
  }
  if (templateType === 'cumulative') {
    return compactTemplateParams({
      ...common,
      accumulateStartDate: values.accumulateStartDate,
      cumulativeMetricId: values.cumulativeMetricId,
      cumulativeMode: values.cumulativeMode,
      cumulativeTimeRange: values.cumulativeTimeRange,
    })
  }
  if (templateType === 'comparison') {
    return compactTemplateParams({
      ...common,
      compareMetricId: values.compareMetricId,
      comparePeriod: values.comparePeriod,
      comparisonOutputType: values.comparisonOutputType,
      compareType: values.compareType,
    })
  }
  if (templateType === 'volatility') {
    return compactTemplateParams({
      ...common,
      rollingWindowSize: values.rollingWindowSize,
      volatilityDataRange: values.volatilityDataRange,
      volatilityMethod: values.volatilityMethod,
      volatilityMetricId: values.volatilityMetricId,
    })
  }
  if (templateType === 'percentile') {
    return compactTemplateParams({
      ...common,
      percentileValue: values.percentileValue,
    })
  }
  if (templateType === 'custom') {
    return compactTemplateParams(common)
  }

  return compactTemplateParams(common)
}

function buildFormValuesFromDetail(item: KnowledgeIndicatorItem): KnowledgeFormValues {
  const templateValues = parseTemplateParams(item.templateParams) as Partial<KnowledgeFormValues>
  const calcLogicValues = parseKnowledgeCalcLogicFormValues(item.calcLogic) as Partial<KnowledgeFormValues>
  const rawBizName = (item.rawBizName ?? item.bizName ?? (item as Record<string, unknown>).biz_name) as string | undefined
  const rawTechName = (item.rawIndicatorCode ?? item.rawTechName ?? item.indicatorCode ?? item.techName) as string | undefined
  const mappedBizNameParts = getMappedBizNameParts(rawBizName)
  const mappedTechNameParts = getMappedTechNameParts(rawTechName)
  const values: KnowledgeFormValues = {
    ...item,
    ...templateValues,
    ...calcLogicValues,
    bizName: mappedBizNameParts.displayName,
    dimensionFieldIds: item.dimensionFieldIds ?? item.relateDims,
    indicatorCode: mappedTechNameParts.displayName,
    indAlias: splitAliasTags(item.indAlias),
    mappedBizNameFieldName: mappedBizNameParts.isMapped ? mappedBizNameParts.fieldName : undefined,
    mappedTechNameTableName: mappedTechNameParts.isMapped ? mappedTechNameParts.tableName : undefined,
    techName: mappedTechNameParts.displayName,
  }
  if (item.isPublic !== undefined && item.isPublic !== null) {
    values.isPublic = Boolean(item.isPublic) === true || String(item.isPublic) === '1'
  }
  return values
}

export const KnowledgeOperateDrawer: React.FC<Props> = ({ editingItem, existingItems = [], groupId, groupName, onClose, onSubmit, open }) => {
  const [form] = AForm.useForm<KnowledgeFormValues>()
  const [current, setCurrent] = useState(0)
  const [selectedIndicatorClass, setSelectedIndicatorClass] = useState<IndicatorType>('derived')
  const [allFields, setAllFields] = useState<KnowledgeTechField[]>([])
  const [indicatorOptionSource, setIndicatorOptionSource] = useState<KnowledgeIndicatorItem[]>([])
  const editMatchedRef = useRef(false)
  const formValuesRef = useRef<Partial<KnowledgeFormValues>>({})
  const templateTypeVal = AForm.useWatch('templateType', form)!

  const isEditing = Boolean(editingItem)
  const isAtomicEditing = normalizeIndicatorClass(editingItem?.indicatorClass) === 'atomic'
  const indicatorClass = normalizeIndicatorClass(String(form.getFieldValue('indicatorClass') || selectedIndicatorClass || 'derived'))
  const isAtomicMode = isAtomicEditing || indicatorClass === 'atomic'
  const stepItems = useMemo(() => getStepItems(true, isAtomicMode), [isAtomicMode])
  const currentStepKey = stepItems[current]?.key
  const atomicIndicatorOptions = useMemo(() => {
    const allowedClasses = indicatorClass === 'derivative' ? new Set(['atomic', 'derived']) : new Set(['atomic'])

    return indicatorOptionSource
      .filter((item) => allowedClasses.has(normalizeIndicatorClass(item.indicatorClass)))
      .map((item) => ({
        item,
        label: getMetricIndicatorOptionLabel(item),
        value: normalizeAtomicSelectValue(item),
      }))
      .filter((item) => item.value)
  }, [indicatorClass, indicatorOptionSource])
  const referenceMetricOptions = useMemo(
    () =>
      indicatorOptionSource
        .filter((item) => item.indicatorClass === 'atomic' || item.indicatorClass === 'derived')
        .map((item) => ({
          item,
          label: getMetricIndicatorOptionLabel(item),
          value: normalizeAtomicSelectValue(item),
        }))
        .filter((item) => item.value),
    [indicatorOptionSource],
  )

  const {
    validateAccumulationDate,
    validateAliasTags,
    validateBusinessRemark,
    validateCustomExpression,
    validateIndicatorName,
    validateMeasurementUnit,
    validatePercentile,
    validatePositiveInt,
    validateRollingWindow,
    validateTechName,
    validateTechnicalRemark,
    validateThresholdMax,
    validateThresholdValue,
  } = useMemo(
    () =>
      createKnowledgeOperateValidators({
        form,
        groupId,
        initialBizName: editingItem?.rawBizName || editingItem?.bizName,
        initialTechName: editingItem?.rawIndicatorCode || editingItem?.rawTechName || editingItem?.indicatorCode || editingItem?.techName,
      }),
    [editingItem, existingItems, form, groupId],
  )

  const fetchAtomicIndicatorOptions = useCallback(async () => {
    try {
      const res = await queryKnowledgeIndicators({
        pageNum: 1,
        pageSize: 1000,
        spaceId: getKnowledgeSpaceId(),
      })
      const allList = (res?.data?.list || []) as KnowledgeIndicatorItem[]
      setIndicatorOptionSource(allList)
    } catch {
      setIndicatorOptionSource([])
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    fetchAtomicIndicatorOptions()
  }, [fetchAtomicIndicatorOptions, open])

  useEffect(() => {
    if (!open) {
      editMatchedRef.current = false
      return
    }
    form.resetFields()
    editMatchedRef.current = false
    formValuesRef.current = {}
    setCurrent(0)

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
        setAllFields([])
      }

      form.setFieldsValue(editValues)
      formValuesRef.current = editValues
      setSelectedIndicatorClass(indicatorClassValue)

      return
    }
    const nextValues = {
      derivedExpressions: [
        {
          conditions: [
            {
              metric: '',
              operator: '=',
              value: '',
            },
          ],
          innerLogic: 'AND',
          name: '表达式1',
        },
      ],
      indAlias: [],
      variableMappings: [],
    }
    form.setFieldsValue(nextValues)
    formValuesRef.current = nextValues
    setSelectedIndicatorClass('derived')
    setAllFields([])
  }, [editingItem, form, isAtomicEditing, open])

  useEffect(() => {
    if (!open || !editingItem || isAtomicMode || editMatchedRef.current || !atomicIndicatorOptions.length) {
      return
    }

    const currentTechIdentity = resolveTechFieldIdentity(editingItem.techId)
    const matchedOption = atomicIndicatorOptions.find((item) => {
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
      techId: matchedOption.value,
    }
    form.setFieldsValue(nextValues)
    formValuesRef.current = {
      ...formValuesRef.current,
      ...nextValues,
    }
    setAllFields(nextAllFields)
    editMatchedRef.current = true
  }, [atomicIndicatorOptions, editingItem, form, isAtomicMode, open])

  useEffect(() => {
    if (current > stepItems.length - 1) {
      setCurrent(stepItems.length - 1)
    }
  }, [current, stepItems.length])

  const getTechnicalRequiredFields = () => {
    if (indicatorClass === 'derived') {
      return ['indicatorCode', 'techId', 'projectionFunc', 'derivedExpressions']
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
      templateFields.push('expr')
    }
    return templateFields
  }

  const handleValuesChange = (changeValues: Partial<KnowledgeFormValues>, allValues: KnowledgeFormValues) => {
    formValuesRef.current = {
      ...formValuesRef.current,
      ...allValues,
      ...changeValues,
    }

    if (Object.hasOwn(changeValues, 'expr')) {
      const relItemId = extractUniqueIds(changeValues.expr || '').join(',')
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
        ...clearedValues,
      }
    }

    if (Object.hasOwn(changeValues, 'indicatorClass')) {
      const nextClass = normalizeIndicatorClass(String(changeValues.indicatorClass || 'derived'))
      setSelectedIndicatorClass(nextClass)
      if (nextClass === 'derived') {
        clearFields([...DERIVATIVE_TEMPLATE_FIELDS, 'techName'])
      }
      if (nextClass === 'derivative') {
        clearFields([...DERIVED_ONLY_FIELDS, 'techName'])
        setAllFields([])
      }
      if (nextClass === 'atomic') {
        clearFields([...DERIVED_ONLY_FIELDS, ...DERIVATIVE_TEMPLATE_FIELDS, 'techName'])
        setAllFields([])
        setCurrent(0)
      }
    }

    if (Object.hasOwn(changeValues, 'templateType')) {
      clearFields(DERIVATIVE_TEMPLATE_FIELDS.filter((field) => field !== 'templateType'))
    }

    if (Object.hasOwn(changeValues, 'techId') && !isAtomicMode) {
      const selected = atomicIndicatorOptions.find((item) => item.value === String(changeValues.techId || ''))
      setAllFields(extractAtomicFields(selected?.item))
    }
  }

  const scrollKnowledgeFormError = (error: unknown) => {
    const firstName = getFirstErrorFieldName(error)
    const firstKey = Array.isArray(firstName) ? String(firstName[0] || '') : String(firstName || '')
    const targetStepKey = BUSINESS_FORM_FIELDS.has(firstKey) ? 'business' : firstKey === 'dimensionFieldIds' ? 'dimension' : 'technical'
    const targetStepIndex = stepItems.findIndex(item => item.key === targetStepKey)

    if (targetStepIndex >= 0 && targetStepIndex !== current) {
      setCurrent(targetStepIndex)
      setTimeout(() => scrollToFirstFormError(form, error), 0)
      return
    }

    scrollToFirstFormError(form, error)
  }

  const validateKnowledgeFields = async (fields: string[]) => {
    try {
      await form.validateFields(fields)
      return true
    } catch (error) {
      scrollKnowledgeFormError(error)
      return false
    }
  }

  const getBusinessRequiredFields = () => {
    const baseFields = ['bizName', 'indicatorClass', 'versionStatus', 'updateFrequency', 'calcPeriod', 'dataType', 'qualityLevel', 'businessDefinition']
    return isAtomicMode ? [...baseFields, 'techName'] : baseFields
  }

  const next = async () => {
    if (currentStepKey === 'business') {
      const valid = await validateKnowledgeFields(getBusinessRequiredFields())
      if (!valid) {
        return
      }
      setSelectedIndicatorClass(normalizeIndicatorClass(String(form.getFieldValue('indicatorClass') || 'derived')))
      setCurrent((prev) => prev + 1)
      return
    }

    if (currentStepKey === 'technical') {
      const valid = await validateKnowledgeFields(getTechnicalRequiredFields() as string[])
      if (!valid) {
        return
      }
      setCurrent((prev) => prev + 1)
    }
  }

  const prev = () => {
    setCurrent((pre) => Math.max(pre - 1, 0))
  }

  const handleOk = async () => {
    if (!groupId) {
      message.error('请先选择知识提取组')
      return
    }

    const baseFields = getBusinessRequiredFields()
    const valid = await validateKnowledgeFields(isAtomicMode ? baseFields : [...baseFields, ...(getTechnicalRequiredFields() as string[])])
    if (!valid) {
      return
    }

    const values = {
      ...formValuesRef.current,
      ...form.getFieldsValue(true),
    } as KnowledgeFormValues
    const nextIndicatorClass = normalizeIndicatorClass(values.indicatorClass)
    const submitBizName = restoreMappedBizName(values.bizName, values.mappedBizNameFieldName)
    const submitTechName = restoreMappedTechName(
      nextIndicatorClass === 'derived' ? values.indicatorCode : values.techName,
      values.mappedTechNameTableName
    )

    const selectedAtomic = atomicIndicatorOptions.find((item) => item.value === String(values.techId || ''))
    const selectedTechObject = isAtomicMode ? values.techId : (selectedAtomic?.item?.techId ?? values.techId)
    const aliasText = (Array.isArray(values.indAlias) ? values.indAlias : splitAliasTags(values.indAlias))
      .map((item) => String(item || '').trim())
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
      relItemId: extractUniqueIds(values.expr || '').join(','),
      spaceId: getKnowledgeSpaceId(),
      templateParams: buildTemplateParams(values, nextIndicatorClass),
    }

    if (nextIndicatorClass === 'derived') {
      payload.indicatorCode = submitTechName
      delete payload.techName
    } else {
      payload.techName = submitTechName
      delete payload.indicatorCode
    }
    payload.techId = selectedTechObject as KnowledgeSubmitPayload['techId']

    const success = await onSubmit(payload, isEditing)
    if (!success) {
      return
    }
    onClose(true)
  }

  return (
    <CommonDrawer
      open={open}
      title={isEditing ? '编辑指标建模原型' : '新建指标建模原型'}
      width="60%"
      footer={
        <ASpace className="w-full justify-end">
          <AButton onClick={() => onClose()}>取消</AButton>
          {current > 0 ? <AButton onClick={prev}>上一步</AButton> : null}
          {current < stepItems.length - 1 ? (
            <AButton type="primary" onClick={next}>
              下一步
            </AButton>
          ) : (
            <AButton type="primary" onClick={handleOk}>
              确认
            </AButton>
          )}
        </ASpace>
      }
      onClose={() => onClose()}
    >
      <div className="mb-4 rounded bg-gray-50 px-3 py-2 text-sm">当前分组：{groupName || '-'}</div>

      {stepItems.length > 1 ? (
        <div className="mx-auto mb-6 max-w-820px">
          <ASteps current={current} items={stepItems} />
        </div>
      ) : null}

      <AForm className="ds-form-section" preserve requiredMark form={form} layout="vertical" onValuesChange={handleValuesChange}>
        {currentStepKey === 'business' ? (
          <KnowledgeOperateBusinessStep
            indicatorNameDisabled={false}
            validateAliasTags={validateAliasTags}
            validateBusinessRemark={validateBusinessRemark}
            validateIndicatorName={validateIndicatorName}
            validateMeasurementUnit={validateMeasurementUnit}
            validateTechName={validateTechName}
          />
        ) : null}

        {currentStepKey === 'technical' ? (
          <KnowledgeOperateTechnicalStep
            allFields={allFields}
            atomicMetricOptions={atomicIndicatorOptions}
            form={form}
            indicatorClass={indicatorClass}
            referenceMetricOptions={referenceMetricOptions}
            templateTypeVal={templateTypeVal}
            validateAccumulationDate={validateAccumulationDate}
            validateCustomExpression={validateCustomExpression}
            validatePercentile={validatePercentile}
            validatePositiveInt={validatePositiveInt}
            validateRollingWindow={validateRollingWindow}
            validateTechName={validateTechName}
            validateTechnicalRemark={validateTechnicalRemark}
            validateThresholdMax={validateThresholdMax}
            validateThresholdValue={validateThresholdValue}
          />
        ) : null}

        {currentStepKey === 'dimension' ? <KnowledgeOperateDimensionStep form={form} /> : null}
      </AForm>
    </CommonDrawer>
  )
}
