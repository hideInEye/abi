import { CloseOutlined } from '@ant-design/icons'
import { message } from 'antd'
import React from 'react'

import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'
import { queryTableSemanticsDetail } from '@/service/api/data-table-meaning'

import { DEFAULT_FORM_VALUES } from '../constants'
import type { KnowledgeFormValues, KnowledgeIndicatorItem } from '../types'
import {
  buildEditFormValues,
  ensureDerivedConditions,
  extractUniqueIds,
  getStepItems
} from '../utils/knowledgeOperateDrawer.utils'
import { createKnowledgeOperateValidators } from '../utils/knowledgeOperateDrawer.validators'

import { KnowledgeOperateBusinessStep } from './knowledgeOperateDrawer.BusinessStep'
import { KnowledgeOperateDimensionStep } from './knowledgeOperateDrawer.DimensionStep'
import { KnowledgeOperateTechnicalStep } from './knowledgeOperateDrawer.TechnicalStep'

const MODEL_DETAIL_KEYS = new Set(['dimensions', 'identifiers', 'measures'])

interface AtomicMetricOption {
  label: string
  value: string
}

interface Props {
  readonly editingItem: KnowledgeIndicatorItem | null
  readonly existingItems?: KnowledgeIndicatorItem[]
  readonly groupId?: number
  readonly groupName?: string
  readonly onClose: (refresh?: boolean) => void
  readonly onSubmit: (payload: Record<string, any>, isEdit: boolean) => Promise<boolean>
  readonly open: boolean
}

export const KnowledgeOperateDrawer: React.FC<Props> = ({
  editingItem,
  existingItems = [],
  groupId,
  groupName,
  onClose,
  onSubmit,
  open
}) => {
  const [form] = AForm.useForm<KnowledgeFormValues>()
  const formValuesRef = useRef<Partial<KnowledgeFormValues>>({})
  const [current, setCurrent] = useState(0)
  const [selectedIndicatorType, setSelectedIndicatorType] = useState<string>(DEFAULT_FORM_VALUES.indicatorType)
  const [viewDataId, setViewDataId] = useState<number | string | undefined>(editingItem?.relViewid)
  const [atomicMetricLoading, setAtomicMetricLoading] = useState(false)
  const [atomicMetricOptions, setAtomicMetricOptions] = useState<AtomicMetricOption[]>([])
  const [schemaOptions, setSchemaOptions] = useState<TableSemanticParams[]>([])

  const semanticSchemaIdVal = AForm.useWatch('semanticSchemaId', form)
  const templateTypeVal = AForm.useWatch('templateType', form) || DEFAULT_FORM_VALUES.templateType

  const getIndicatorType = () => {
    const formType = String(form.getFieldValue('indicatorType') || '')
    if (formType) {
      return formType
    }
    return selectedIndicatorType || DEFAULT_FORM_VALUES.indicatorType
  }

  const stepItems = useMemo(() => getStepItems(selectedIndicatorType), [selectedIndicatorType])

  useEffect(() => {
    if (current > stepItems.length - 1) {
      setCurrent(stepItems.length - 1)
    }
  }, [current, stepItems.length])

  useEffect(() => {
    if (!open) {
      return
    }

    form.resetFields()
    formValuesRef.current = {}
    setCurrent(0)

    if (editingItem) {
      const editValues = buildEditFormValues(editingItem)
      const nextValues = {
        ...DEFAULT_FORM_VALUES,
        ...editValues
      }
      form.setFieldsValue(nextValues)
      formValuesRef.current = nextValues
      setSelectedIndicatorType(editValues.indicatorType || DEFAULT_FORM_VALUES.indicatorType)
      setViewDataId(editingItem.relViewid)
      setAtomicMetricOptions([])
      return
    }

    const nextValues = {
      ...DEFAULT_FORM_VALUES,
      derivedConditions: ensureDerivedConditions(),
      indicatorAliasTags: [],
      variableMappings: []
    }
    form.setFieldsValue(nextValues)
    formValuesRef.current = nextValues
    setSelectedIndicatorType(DEFAULT_FORM_VALUES.indicatorType)
    setViewDataId(undefined)
    setAtomicMetricOptions([])
  }, [editingItem, form, open])

  const setCachedFieldsValue = (values: Partial<KnowledgeFormValues>) => {
    form.setFieldsValue(values)
    formValuesRef.current = {
      ...formValuesRef.current,
      ...values
    }
  }

  const syncFormValuesSnapshot = () => {
    formValuesRef.current = {
      ...formValuesRef.current,
      ...form.getFieldsValue(true)
    }
  }

  // eslint-disable-next-line complexity
  const normalizeAtomicMetricOptions = useCallback((modelDetailRaw: any): AtomicMetricOption[] => {
    if (!modelDetailRaw) {
      return []
    }
    try {
      const modelDetail = typeof modelDetailRaw === 'string' ? JSON.parse(modelDetailRaw) : modelDetailRaw
      const options: AtomicMetricOption[] = []
      Object.keys(modelDetail || {}).forEach(rawKey => {
        const keyLower = String(rawKey || '')
          .trim()
          .toLowerCase()
        if (!MODEL_DETAIL_KEYS.has(keyLower)) {
          return
        }
        const items = Array.isArray(modelDetail[rawKey]) ? modelDetail[rawKey] : []
        // eslint-disable-next-line complexity
        items.forEach((item: any) => {
          const value = String(item?.techId || item?.tfieldId || '').trim()
          if (!value) {
            return
          }
          const bizName = String(item?.bizName || item?.techName || item?.fieldName || item?.originName || '').trim()
          const originName = String(item?.originName || item?.fieldName || item?.techName || '').trim()
          const label = originName ? `${bizName || value}(${originName})` : bizName || value
          options.push({ label, value })
        })
      })
      return options.filter((item, index, list) => list.findIndex(cur => cur.value === item.value) === index)
    } catch {
      return []
    }
  }, [])

  const ensureAtomicMetricSelectionVisible = useCallback(
    (options: AtomicMetricOption[]) => {
      const atomicMetricId = String(form.getFieldValue('atomicMetricId') || '').trim()
      if (!atomicMetricId || options.some(item => item.value === atomicMetricId)) {
        return options
      }
      return [...options, { label: atomicMetricId, value: atomicMetricId }]
    },
    [form]
  )

  const allFields = useMemo(() => {
    if (!semanticSchemaIdVal) {
      return []
    }
    const currentSchemaId = Number(semanticSchemaIdVal)
    const selectedSchema = schemaOptions.find(item => Number(item.schemaId) === currentSchemaId) as any
    if (!selectedSchema?.modelDetail) {
      return []
    }

    try {
      const modelDetailObj = JSON.parse(selectedSchema.modelDetail)
      const result: any[] = []

      Object.keys(modelDetailObj).forEach(rawKey => {
        const key = String(rawKey || '').trim()
        const keyLower = key.toLowerCase()
        if (!MODEL_DETAIL_KEYS.has(keyLower)) {
          return
        }

        const itemArr = Array.isArray(modelDetailObj[key]) ? modelDetailObj[key] : []
        if (!itemArr.length) {
          return
        }

        itemArr
          .filter((item: any) => item?.techId || item?.tfieldId)
          .forEach((item: any) => {
            let normalizedType = 'dimensions'
            if (keyLower === 'identifiers') {
              normalizedType = 'primaryKeys'
            } else if (keyLower === 'measures') {
              normalizedType = 'measures'
            }

            const isDateDimension = normalizedType === 'dimensions' && (item.type === 'datetime' || item.dateFormat)
            const tfieldType = isDateDimension ? 'dates' : normalizedType
            const typeTitleMap: Record<string, string> = {
              dates: '日期',
              dimensions: '维度',
              measures: '度量',
              primaryKeys: '主键'
            }

            result.push({
              ...item,
              techId: item.techId || item.tfieldId,
              tfieldType,
              typeTitle: typeTitleMap[tfieldType] || '维度'
            })
          })
      })

      return result
    } catch {
      return []
    }
  }, [semanticSchemaIdVal, schemaOptions])

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
    validateThresholdValue
  } = useMemo(
    () =>
      createKnowledgeOperateValidators({
        editingItem,
        existingItems,
        form
      }),
    [editingItem, existingItems, form]
  )

  const handleValuesChange = (changeValues: Partial<KnowledgeFormValues>) => {
    if (Object.hasOwn(changeValues, 'expr')) {
      const relItemId = extractUniqueIds(changeValues.expr || '').join(',')
      form.setFieldValue('relItemId', relItemId)
    }

    if (Object.hasOwn(changeValues, 'indicatorType')) {
      const nextType = changeValues.indicatorType
      setSelectedIndicatorType(String(nextType || DEFAULT_FORM_VALUES.indicatorType))
      if (nextType === 'derived') {
        setCachedFieldsValue({
          compareMetricId: undefined,
          comparePeriod: undefined,
          compareType: undefined,
          comparisonOutputType: undefined,
          cumulativeMetricId: undefined,
          cumulativeMode: undefined,
          cumulativeTimeRange: undefined,
          percentileValue: undefined,
          ratioDenominatorId: undefined,
          ratioNumeratorId: undefined,
          ratioPrecision: DEFAULT_FORM_VALUES.ratioPrecision,
          templateType: DEFAULT_FORM_VALUES.templateType,
          thresholdMax: undefined,
          thresholdMin: undefined,
          volatilityDataRange: DEFAULT_FORM_VALUES.volatilityDataRange,
          volatilityMethod: DEFAULT_FORM_VALUES.volatilityMethod,
          volatilityMetricId: undefined
        })
      }
      if (nextType === 'extended') {
        setCachedFieldsValue({
          derivedConditionExpr: undefined,
          derivedConditions: ensureDerivedConditions()
        })
      }
    }

    if (Object.hasOwn(changeValues, 'templateType')) {
      setCachedFieldsValue({
        compareMetricId: undefined,
        comparePeriod: undefined,
        compareType: DEFAULT_FORM_VALUES.compareType,
        comparisonOutputType: DEFAULT_FORM_VALUES.comparisonOutputType,
        cumulativeMetricId: undefined,
        cumulativeMode: DEFAULT_FORM_VALUES.cumulativeMode,
        cumulativeTimeRange: DEFAULT_FORM_VALUES.cumulativeTimeRange,
        percentileValue: undefined,
        ratioDenominatorId: undefined,
        ratioNumeratorId: undefined,
        ratioPrecision: DEFAULT_FORM_VALUES.ratioPrecision,
        rollingWindowSize: undefined,
        thresholdMax: undefined,
        thresholdMin: undefined,
        volatilityDataRange: DEFAULT_FORM_VALUES.volatilityDataRange,
        volatilityMethod: DEFAULT_FORM_VALUES.volatilityMethod,
        volatilityMetricId: undefined
      })
      if (changeValues.templateType !== 'custom') {
        form.setFieldValue('expr', undefined)
      }
    }
  }

  const getSchemaId = ({
    semanticGroupId,
    semanticSchemaId,
    viewId
  }: {
    semanticGroupId: number | null
    semanticSchemaId: number
    viewId: number | string
  }) => {
    const currentSchemaId = Number(form.getFieldValue('semanticSchemaId') || 0)
    if (currentSchemaId !== Number(semanticSchemaId || 0)) {
      setCachedFieldsValue({ atomicMetricId: undefined })
      setAtomicMetricOptions([])
    }
    setCachedFieldsValue({
      semanticGroupId: semanticGroupId || undefined,
      semanticSchemaId
    })
    setViewDataId(viewId)
  }

  const getTechnicalRequiredFields = (): Array<keyof KnowledgeFormValues> => {
    const indicatorType = getIndicatorType()
    const baseFields: Array<keyof KnowledgeFormValues> = [
      'indicatorCode',
      'semanticGroupId',
      'semanticSchemaId',
      'aggMethod'
    ]

    if (indicatorType === 'derived') {
      return [...baseFields, 'atomicMetricId', 'derivedConditions']
    }

    const templateFields: Array<keyof KnowledgeFormValues> = ['templateType']
    if (templateTypeVal === 'ratio') {
      templateFields.push('ratioNumeratorId', 'ratioDenominatorId', 'ratioPrecision')
    }
    if (templateTypeVal === 'cumulative') {
      templateFields.push('cumulativeMetricId', 'cumulativeTimeRange', 'accumulateStartDate', 'cumulativeMode')
    }
    if (templateTypeVal === 'comparison') {
      templateFields.push('compareMetricId', 'compareType', 'comparePeriod', 'comparisonOutputType')
    }
    if (templateTypeVal === 'volatility') {
      templateFields.push('volatilityMetricId', 'volatilityMethod', 'rollingWindowSize', 'volatilityDataRange')
    }
    if (templateTypeVal === 'percentile') {
      templateFields.push('atomicMetricId', 'percentileValue')
    }
    if (templateTypeVal === 'custom') {
      templateFields.push('expr')
    }

    return [...baseFields, ...templateFields]
  }

  const handleGenerateAtomicMetrics = async () => {
    const schemaId = Number(form.getFieldValue('semanticSchemaId'))
    if (!schemaId) {
      message.warning('请先选择表语义')
      return
    }
    setAtomicMetricLoading(true)
    try {
      const res = await queryTableSemanticsDetail(schemaId)
      const detail = res?.data ?? res?.response?.data?.data ?? res?.response?.data
      const options = normalizeAtomicMetricOptions(detail?.modelDetail)
      if (!options.length) {
        message.warning('当前表语义下暂无可用原子指标')
        setAtomicMetricOptions([])
        form.setFieldValue('atomicMetricId', undefined)
        return
      }
      const visibleOptions = ensureAtomicMetricSelectionVisible(options)
      setAtomicMetricOptions(visibleOptions)
      if (!visibleOptions.some(item => item.value === String(form.getFieldValue('atomicMetricId') || ''))) {
        form.setFieldValue('atomicMetricId', undefined)
      }
      message.success('原子指标生成成功')
    } catch {
      const currentSchemaId = Number(semanticSchemaIdVal || 0)
      const selectedSchema = schemaOptions.find(item => Number(item.schemaId) === currentSchemaId) as any
      const fallbackOptions = ensureAtomicMetricSelectionVisible(
        normalizeAtomicMetricOptions(selectedSchema?.modelDetail)
      )
      setAtomicMetricOptions(fallbackOptions)
      message.error('生成原子指标失败')
    } finally {
      setAtomicMetricLoading(false)
    }
  }

  const next = async () => {
    if (currentStepKey === 'business') {
      await form.validateFields([
        'bizName',
        'indicatorCategory',
        'indicatorType',
        'status',
        'dataFrequency',
        'calcPeriod',
        'dataType',
        'qualityLevel',
        'remark'
      ])
      syncFormValuesSnapshot()
      setSelectedIndicatorType(String(form.getFieldValue('indicatorType') || DEFAULT_FORM_VALUES.indicatorType))
      setCurrent(prev => prev + 1)
      return
    }

    if (currentStepKey === 'technical') {
      await form.validateFields(getTechnicalRequiredFields() as string[])
      syncFormValuesSnapshot()
      setCurrent(prev => prev + 1)
      return
    }

    syncFormValuesSnapshot()
    setCurrent(prev => prev + 1)
  }

  const prev = () => {
    setCurrent(pre => Math.max(pre - 1, 0))
  }

  const buildTemplateParams = (values: KnowledgeFormValues) => {
    return {
      accumulateStartDate: values.accumulateStartDate,
      atomicMetricId: values.atomicMetricId,
      calcPeriod: values.calcPeriod,
      compareMetricId: values.compareMetricId,
      comparePeriod: values.comparePeriod,
      compareType: values.compareType,
      comparisonOutputType: values.comparisonOutputType,
      cumulativeMetricId: values.cumulativeMetricId,
      cumulativeMode: values.cumulativeMode,
      cumulativeTimeRange: values.cumulativeTimeRange,
      derivedConditionExpr: values.derivedConditionExpr,
      derivedConditions: values.derivedConditions,
      divideZeroStrategy: values.divideZeroStrategy,
      nullStrategy: values.nullStrategy,
      percentileValue: values.percentileValue,
      ratioDenominatorId: values.ratioDenominatorId,
      ratioNumeratorId: values.ratioNumeratorId,
      ratioPrecision: values.ratioPrecision,
      rollingWindowSize: values.rollingWindowSize,
      templateType: values.templateType,
      thresholdMax: values.thresholdMax,
      thresholdMin: values.thresholdMin,
      variableMappings: values.variableMappings,
      variableName: values.variableName,
      volatilityDataRange: values.volatilityDataRange,
      volatilityMethod: values.volatilityMethod,
      volatilityMetricId: values.volatilityMetricId
    }
  }

  const handleOk = async () => {
    if (!groupId) {
      message.error('请先选择知识提取组')
      return
    }

    const fieldList = [
      'techName',
      'indicatorCategory',
      'indicatorType',
      'status',
      'dataFrequency',
      'calcPeriod',
      'dataType',
      'qualityLevel',
      'remark'
    ]
    fieldList.push(...(getTechnicalRequiredFields() as string[]))
    await form.validateFields(fieldList)

    await form.validateFields()
    syncFormValuesSnapshot()
    const values = {
      ...formValuesRef.current,
      ...form.getFieldsValue(true)
    } as KnowledgeFormValues

    const payload: Record<string, any> = {
      ...editingItem,
      ...values,
      dimensionFieldIds: values.dimensionFieldIds ?? editingItem?.dimensionFieldIds ?? '',
      groupId,
      relItemId: extractUniqueIds(values.expr || '').join(','),
      relViewid: viewDataId,
      spaceId: Number(localStorage.getItem('spaceId')),
      templateParams: buildTemplateParams(values),
      termAlias: (values.indicatorAliasTags || [])
        .map(item => String(item || '').trim())
        .filter(Boolean)
        .join(',')
    }

    delete payload.indicatorAliasTags

    const success = await onSubmit(payload, Boolean(editingItem))
    if (!success) {
      return
    }
    onClose(true)
  }

  return (
    <ADrawer
      closeIcon={null}
      open={open}
      title={editingItem ? '编辑指标建模原型' : '新建指标建模原型'}
      width={1180}
      extra={
        <AButton
          icon={<CloseOutlined />}
          type="text"
          onClick={() => onClose()}
        />
      }
      footer={
        <ASpace className="w-full justify-end">
          <AButton onClick={() => onClose()}>取消</AButton>
          {current > 0 ? <AButton onClick={prev}>上一步</AButton> : null}
          {current < stepItems.length - 1 ? (
            <AButton
              type="primary"
              onClick={next}
            >
              下一步
            </AButton>
          ) : (
            <AButton
              type="primary"
              onClick={handleOk}
            >
              确认
            </AButton>
          )}
        </ASpace>
      }
      onClose={() => onClose()}
    >
      <div className="mb-4 rounded bg-gray-50 px-3 py-2 text-sm">当前分组：{groupName || '-'}</div>
      <div className="mx-auto mb-6 max-w-820px">
        <ASteps
          current={current}
          items={stepItems}
        />
      </div>
      <AForm
        preserve
        requiredMark
        form={form}
        layout="vertical"
        onValuesChange={(changeValues, allValues) => {
          formValuesRef.current = {
            ...formValuesRef.current,
            ...allValues,
            ...changeValues
          }
          handleValuesChange(changeValues)
        }}
      >
        {currentStepKey === 'business' ? (
          <KnowledgeOperateBusinessStep
            validateAliasTags={validateAliasTags}
            validateBusinessRemark={validateBusinessRemark}
            validateIndicatorName={validateIndicatorName}
            validateMeasurementUnit={validateMeasurementUnit}
          />
        ) : null}

        {currentStepKey === 'technical' ? (
          <KnowledgeOperateTechnicalStep
            allFields={allFields}
            atomicMetricLoading={atomicMetricLoading}
            atomicMetricOptions={atomicMetricOptions}
            form={form}
            getSchemaId={getSchemaId}
            indicatorType={getIndicatorType()}
            setSchemaOptions={setSchemaOptions as any}
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
            onGenerateAtomicMetrics={handleGenerateAtomicMetrics}
          />
        ) : null}

        {currentStepKey === 'dimension' ? <KnowledgeOperateDimensionStep form={form} /> : null}
      </AForm>
    </ADrawer>
  )
}
