/* eslint-disable complexity */
import { CloseOutlined } from '@ant-design/icons'
import { message } from 'antd'
import React from 'react'

import { queryKnowledgeIndicators } from '@/service/api/knowledge-extraction'

import { INDICATOR_TYPE_OPTIONS } from '../constants/metricModeling.constants'
import type { KnowledgeFormValues, KnowledgeIndicatorItem, KnowledgeSubmitPayload, KnowledgeTechField, KnowledgeTemplateParams } from '../types/metricModeling.types'
import { extractUniqueIds, getStepItems, parseTemplateParams } from '../utils/knowledgeOperateDrawer.utils'
import { createKnowledgeOperateValidators } from '../utils/knowledgeOperateDrawer.validators'
import { getKnowledgeSpaceId } from '../utils/space'

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
  readonly groupId?: number
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

const DERIVED_ONLY_FIELDS: Array<keyof KnowledgeFormValues> = [
  'derivedConditionExpr',
  'derivedConditions',
  'projectionFunc',
  'techId',
]

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

function splitAliasTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
  }
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
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
  const values: KnowledgeFormValues = {
    ...item,
    ...templateValues,
    dimensionFieldIds: item.dimensionFieldIds ?? item.relateDims,
    indAlias: splitAliasTags(item.indAlias),
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
  const [atomicIndicatorOptions, setAtomicIndicatorOptions] = useState<AtomicIndicatorOption[]>([])
  const formValuesRef = useRef<Partial<KnowledgeFormValues>>({})

  const isEditing = Boolean(editingItem)
  const isAtomicEditing = normalizeIndicatorClass(editingItem?.indicatorClass) === 'atomic'
  const indicatorClass = normalizeIndicatorClass(String(form.getFieldValue('indicatorClass') || selectedIndicatorClass || 'derived'))
  const stepItems = useMemo(() => getStepItems(true, isAtomicEditing), [isAtomicEditing])
  const currentStepKey = stepItems[current]?.key

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
      }),
    [editingItem, existingItems, form],
  )

  const fetchAtomicIndicatorOptions = useCallback(async () => {
    try {
      const res = await queryKnowledgeIndicators({
        pageNum: 1,
        pageSize: 1000,
        spaceId: getKnowledgeSpaceId(),
      })
      const allList = (res?.response?.data?.data?.list || []) as KnowledgeIndicatorItem[]
      const options = allList
        .filter((item) => normalizeIndicatorClass(item.indicatorClass) === 'atomic')
        .map((item) => ({
          item,
          label: String(item.techName || item.bizName || item.indicatorCode || '-'),
          value: normalizeAtomicSelectValue(item),
        }))
        .filter((item) => item.value)
      setAtomicIndicatorOptions(options)
    } catch {
      setAtomicIndicatorOptions([])
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
      return
    }
    form.resetFields()
    formValuesRef.current = {}
    setCurrent(0)

    if (editingItem) {
      const editValues = buildFormValuesFromDetail(editingItem)
      const indicatorClassValue = normalizeIndicatorClass(editValues.indicatorClass)
      editValues.indicatorClass = indicatorClassValue

      if (!isAtomicEditing) {
        const currentTechIdentity = resolveTechFieldIdentity(editingItem.techId)
        const matchedOption = atomicIndicatorOptions.find((item) => {
          const optionTechIdentity = resolveTechFieldIdentity(item.item.techId)
          return optionTechIdentity && optionTechIdentity === currentTechIdentity
        })
        if (matchedOption) {
          editValues.techId = matchedOption.value
          setAllFields(extractAtomicFields(matchedOption.item))
        } else {
          setAllFields(extractAtomicFields(editingItem))
        }
      } else {
        setAllFields([])
      }

      form.setFieldsValue(editValues)
      formValuesRef.current = editValues
      setSelectedIndicatorClass(indicatorClassValue)

      return
    }
    const nextValues = {
      indAlias: [],
      variableMappings: [],
    }
    form.setFieldsValue(nextValues)
    formValuesRef.current = nextValues
    setSelectedIndicatorClass('derived')
    setAllFields([])
  }, [atomicIndicatorOptions, editingItem, form, isAtomicEditing, open])

  useEffect(() => {
    if (current > stepItems.length - 1) {
      setCurrent(stepItems.length - 1)
    }
  }, [current, stepItems.length])

  const getTechnicalRequiredFields = () => {
    if (indicatorClass === 'derived') {
      return ['indicatorCode', 'techId', 'projectionFunc', 'derivedConditions']
    }

    const templateType = String(form.getFieldValue('templateType') || '')
    const templateFields: Array<keyof KnowledgeFormValues> = ['templateType']
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
        clearFields(DERIVATIVE_TEMPLATE_FIELDS)
      }
      if (nextClass === 'derivative') {
        clearFields(DERIVED_ONLY_FIELDS)
        setAllFields([])
      }
    }

    if (Object.hasOwn(changeValues, 'templateType')) {
      clearFields(DERIVATIVE_TEMPLATE_FIELDS.filter(field => field !== 'templateType'))
    }

    if (Object.hasOwn(changeValues, 'techId') && !isAtomicEditing) {
      const selected = atomicIndicatorOptions.find((item) => item.value === String(changeValues.techId || ''))
      setAllFields(extractAtomicFields(selected?.item))
    }
  }

  const next = async () => {
    if (currentStepKey === 'business') {
      await form.validateFields(['techName', 'indicatorClass', 'versionStatus', 'updateFrequency', 'calcPeriod', 'dataType', 'qualityLevel', 'businessDefinition'])
      setSelectedIndicatorClass(normalizeIndicatorClass(String(form.getFieldValue('indicatorClass') || 'derived')))
      setCurrent((prev) => prev + 1)
      return
    }

    if (currentStepKey === 'technical') {
      await form.validateFields(getTechnicalRequiredFields() as string[])
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

    const baseFields = ['techName', 'indicatorClass', 'versionStatus', 'updateFrequency', 'calcPeriod', 'dataType', 'qualityLevel', 'businessDefinition']
    await form.validateFields(isAtomicEditing ? baseFields : [...baseFields, ...(getTechnicalRequiredFields() as string[])])

    const values = {
      ...formValuesRef.current,
      ...form.getFieldsValue(true),
    } as KnowledgeFormValues

    const selectedAtomic = atomicIndicatorOptions.find((item) => item.value === String(values.techId || ''))
    const selectedTechObject = isAtomicEditing ? values.techId : (selectedAtomic?.item?.techId ?? values.techId)
    const aliasText = (Array.isArray(values.indAlias) ? values.indAlias : splitAliasTags(values.indAlias))
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .join(',')
    const nextIndicatorClass = normalizeIndicatorClass(values.indicatorClass)

    const payload: KnowledgeSubmitPayload = {
      ...editingItem,
      ...values,
      dimensionFieldIds: values.dimensionFieldIds ?? editingItem?.dimensionFieldIds ?? '',
      groupId,
      indAlias: aliasText,
      relItemId: extractUniqueIds(values.expr || '').join(','),
      spaceId: getKnowledgeSpaceId(),
      templateParams: buildTemplateParams(values, nextIndicatorClass),
    }

    payload.techId = selectedTechObject as KnowledgeSubmitPayload['techId']

    const success = await onSubmit(payload, isEditing)
    if (!success) {
      return
    }
    onClose(true)
  }

  return (
    <ADrawer
      closeIcon={null}
      open={open}
      title={isEditing ? '编辑指标建模原型' : '新建指标建模原型'}
      width={1180}
      extra={<AButton icon={<CloseOutlined />} type="text" onClick={() => onClose()} />}
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

      <AForm preserve requiredMark form={form} layout="vertical" onValuesChange={handleValuesChange}>
        {currentStepKey === 'business' ? (
          <KnowledgeOperateBusinessStep
            indicatorNameDisabled={false}
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
            form={form}
            indicatorClass={indicatorClass}
            templateTypeVal={String(form.getFieldValue('templateType') || '')}
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
    </ADrawer>
  )
}
