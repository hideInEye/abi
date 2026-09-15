import { CheckCircleOutlined, FieldTimeOutlined, ProfileOutlined } from '@ant-design/icons'
import { Alert } from 'antd'
import type { FormInstance } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import {
  RuleExpressionBuilder,
  type RuleExpressionBuilderHandle,
  RuleExpressionFormItem,
  collectRuleFieldIds,
  createRuleFieldOptions,
  normalizeRuleLayers,
  validateRuleLayers,
  validateRuleLogicUniformity
} from '@/pages/workbench/ontology-kg/label-meaning/components/rule-expression'

import { useKnowledgeDimensions } from '../hooks/useKnowledgeDimensions'
import type {
  KnowledgeDerivedCondition,
  KnowledgeFormValues,
  KnowledgeIndicatorItem,
  KnowledgeTechField,
  StatisticalCaliber
} from '../types/metricModeling.types'
import { buildDerivedMetricPreview } from '../utils/derivedMetricPreview'
import {
  getStatisticalDateRangeHint,
  isDynamicStatisticalDateRangeMode,
  isValidStatisticalDateRangeValue,
  normalizeStatisticalCaliber
} from '../utils/precomputeConfig'

import styles from './knowledgeOperateDrawer.DerivedLogicBuilder.module.scss'
import { TimeStringPicker } from './knowledgeOperateDrawer.PrecomputeConfig'
import { StatisticalDateRangeFields } from './knowledgeOperateDrawer.StatisticalDateRangeFields'

interface AtomicMetricOption {
  item?: KnowledgeIndicatorItem
  label: string
  value: string
}

interface Props {
  readonly allFields: KnowledgeTechField[]
  readonly atomicMetricOptions: AtomicMetricOption[]
  readonly fieldError?: boolean
  readonly fieldLoading?: boolean
  readonly form: FormInstance<KnowledgeFormValues>
  readonly onRetryFields?: () => void
}

export const KnowledgeOperateDerivedLogicBuilder: React.FC<Props> = ({
  allFields,
  atomicMetricOptions,
  fieldError = false,
  fieldLoading = false,
  form,
  onRetryFields
}) => {
  const [showRuleErrors, setShowRuleErrors] = useState(false)
  const ruleBuilderRef = useRef<RuleExpressionBuilderHandle>(null)
  const techId = AForm.useWatch('techId', form)
  const projectionFunc = AForm.useWatch('projectionFunc', form)
  const derivedExpressions = AForm.useWatch('derivedExpressions', form)
  const bizName = AForm.useWatch('bizName', { form, preserve: true })
  const dimensionFieldIds = AForm.useWatch('dimensionFieldIds', { form, preserve: true })
  const indicatorCode = AForm.useWatch('indicatorCode', form)
  const statisticalCaliberValue = AForm.useWatch('statisticalCaliber', form) as StatisticalCaliber | undefined
  const statisticalCaliber = useMemo(
    () => normalizeStatisticalCaliber(statisticalCaliberValue),
    [statisticalCaliberValue]
  )
  const {
    error: dimensionError,
    loading: dimensionLoading,
    options: dimensionOptions,
    retry: retryDimensions,
    treeData: dimensionTree
  } = useKnowledgeDimensions()
  const ruleFields = useMemo(() => createRuleFieldOptions(allFields), [allFields])
  const normalizedLayers = useMemo(() => normalizeRuleLayers(derivedExpressions), [derivedExpressions])

  useEffect(() => {
    const subjectDimensionIds = statisticalCaliber.subjectDimensionIds || []
    if (!subjectDimensionIds.length) return

    const currentNameMap = statisticalCaliber.subjectDimensionNameMap || {}
    const nextNameMap = subjectDimensionIds.reduce<Record<string, string>>((result, dimensionId) => {
      const option = dimensionOptions.find(item => String(item.key) === dimensionId)
      result[dimensionId] = option?.name || currentNameMap[dimensionId] || dimensionId
      return result
    }, {})
    const nameMapChanged = subjectDimensionIds.some(
      dimensionId => nextNameMap[dimensionId] !== currentNameMap[dimensionId]
    )
    if (!nameMapChanged || !dimensionOptions.length) return

    form.setFieldValue(['statisticalCaliber', 'subjectDimensionNameMap'], nextNameMap)
  }, [dimensionOptions, form, statisticalCaliber.subjectDimensionIds, statisticalCaliber.subjectDimensionNameMap])

  useEffect(() => {
    const current = form.getFieldValue('derivedExpressions')
    if (Array.isArray(current) && current.length) return
    const legacyConditions = form.getFieldValue('derivedConditions') as KnowledgeDerivedCondition[] | undefined
    form.setFieldValue(
      'derivedExpressions',
      normalizeRuleLayers(legacyConditions?.length ? [{ conditions: legacyConditions, name: '新分层' }] : [])
    )
  }, [form])

  const selectedAtomicOption = useMemo(
    () => atomicMetricOptions.find(item => String(item.value) === String(techId || '')),
    [atomicMetricOptions, techId]
  )
  const result = useMemo(
    () =>
      buildDerivedMetricPreview({
        allFields,
        atomicLabel: selectedAtomicOption?.label,
        atomicMetric: selectedAtomicOption?.item,
        bizName,
        dimensionFieldIds,
        dimensionOptions,
        indicatorCode,
        projectionFunc,
        ruleFields,
        ruleLayers: normalizedLayers,
        statisticalCaliber
      }),
    [
      allFields,
      bizName,
      dimensionFieldIds,
      dimensionOptions,
      indicatorCode,
      normalizedLayers,
      projectionFunc,
      ruleFields,
      selectedAtomicOption,
      statisticalCaliber
    ]
  )

  useEffect(() => {
    form.setFieldValue('derivedConditionExpr', result.predicate ? `WHERE ${result.predicate}` : '')
    form.setFieldValue('expr', result.submissionExpression)
    form.setFieldValue('relItemId', collectRuleFieldIds(normalizedLayers).join(','))
  }, [form, normalizedLayers, result.predicate, result.submissionExpression])

  return (
    <>
      <div className="mb-4 border border-gray-200 rounded bg-white p-4">
        <OntologyFormSectionTitle icon={<FieldTimeOutlined />}>统计口径</OntologyFormSectionTitle>
        <div className="grid grid-cols-2 gap-x-8">
          <div>
            <div className="mb-2 text-sm text-[#3e5068] font-medium">
              日期范围 <span className="text-red-500">*</span>
            </div>
            <AForm.Item
              className="mb-0!"
              name={['statisticalCaliber', 'dateRangeValue']}
              rules={[
                {
                  validator: (_, fieldValue) => {
                    const mode = form.getFieldValue(['statisticalCaliber', 'dateRangeMode'])
                    if (!isDynamicStatisticalDateRangeMode(mode)) return Promise.resolve()
                    return isValidStatisticalDateRangeValue(fieldValue)
                      ? Promise.resolve()
                      : Promise.reject(new Error('请输入 1 至 999 的正整数'))
                  }
                }
              ]}
            >
              <StatisticalDateRangeFields mode={statisticalCaliber.dateRangeMode} />
            </AForm.Item>
            <div className="mt-2 text-sm text-[#8995a8]">
              {getStatisticalDateRangeHint(statisticalCaliberValue || statisticalCaliber)}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm text-[#3e5068] font-medium">时段范围</div>
            <div className="flex gap-3">
              <AForm.Item
                className="mb-0!"
                name={['statisticalCaliber', 'timeRangeType']}
                rules={[{ message: '请选择时段范围', required: true }]}
              >
                <ASelect
                  style={{ width: 130 }}
                  options={[
                    { label: '全天', value: 'allDay' },
                    { label: '指定时段', value: 'specified' }
                  ]}
                />
              </AForm.Item>
              {statisticalCaliber.timeRangeType === 'specified' ? (
                <>
                  <AForm.Item
                    className="mb-0!"
                    name={['statisticalCaliber', 'startTime']}
                    rules={[{ message: '请选择开始时间', required: true }]}
                  >
                    <TimeStringPicker />
                  </AForm.Item>
                  <span className="self-center text-[#8995a8]">至</span>
                  <AForm.Item
                    className="mb-0!"
                    dependencies={[['statisticalCaliber', 'startTime']]}
                    name={['statisticalCaliber', 'endTime']}
                    rules={[
                      { message: '请选择结束时间', required: true },
                      {
                        validator: (_, value) => {
                          const startTime = form.getFieldValue(['statisticalCaliber', 'startTime'])
                          return !startTime || !value || value > startTime
                            ? Promise.resolve()
                            : Promise.reject(new Error('结束时间必须晚于开始时间'))
                        }
                      }
                    ]}
                  >
                    <TimeStringPicker />
                  </AForm.Item>
                </>
              ) : null}
            </div>
            <div className="mt-2 text-sm text-[#8995a8]">
              {statisticalCaliber.timeRangeType === 'specified'
                ? `仅统计每天 ${statisticalCaliber.startTime || '--:--'}～${statisticalCaliber.endTime || '--:--'} 的数据。`
                : '默认统计全天数据。'}
            </div>
          </div>
        </div>
        <div className="mt-6 max-w-[70%] pr-4">
          <div className="flex items-start gap-6">
            <AForm.Item
              className="mb-0! min-w-0 flex-1"
              extra="可选择多个主体维度，选项与第三步维度设置使用同一数据源。"
              label="主体维度"
              name={['statisticalCaliber', 'subjectDimensionIds']}
              rules={[{ message: '请选择主体维度', min: 1, required: true, type: 'array' }]}
            >
              <ATreeSelect
                showSearch
                treeDefaultExpandAll
                loading={dimensionLoading}
                maxTagCount="responsive"
                multiple
                placeholder="请选择主体维度"
                treeData={dimensionTree}
                treeNodeFilterProp="title"
                onChange={value => {
                  const dimensionIds = Array.isArray(value)
                    ? value.map(item => String(item ?? '').trim()).filter(Boolean)
                    : []
                  const currentNameMap = form.getFieldValue([
                    'statisticalCaliber',
                    'subjectDimensionNameMap'
                  ]) as Record<string, string> | undefined
                  const subjectDimensionNameMap = dimensionIds.reduce<Record<string, string>>(
                    (result, dimensionId) => {
                      const option = dimensionOptions.find(item => String(item.key) === dimensionId)
                      result[dimensionId] = option?.name || currentNameMap?.[dimensionId] || dimensionId
                      return result
                    },
                    {}
                  )
                  form.setFieldValue(['statisticalCaliber', 'subjectDimensionNameMap'], subjectDimensionNameMap)
                }}
              />
            </AForm.Item>
            <AForm.Item
              className="mb-0! pt-8"
              name={['statisticalCaliber', 'isCrossDim']}
              valuePropName="checked"
            >
              <ACheckbox>是否维度交叉</ACheckbox>
            </AForm.Item>
          </div>
          {dimensionError ? (
            <Alert
              className="mt-2"
              message="主体维度加载失败"
              type="error"
              action={
                <AButton
                  size="small"
                  onClick={retryDimensions}
                >
                  重试
                </AButton>
              }
            />
          ) : null}
        </div>
      </div>

      <div className="mb-4 border border-gray-200 rounded bg-white p-4">
        <OntologyFormSectionTitle icon={<ProfileOutlined />}>业务限定表达式</OntologyFormSectionTitle>
        {fieldError ? (
          <Alert
            className="mb-3"
            message="数据语义字段加载失败"
            type="error"
            action={
              <AButton
                size="small"
                onClick={onRetryFields}
              >
                重试
              </AButton>
            }
          />
        ) : null}
        <RuleExpressionFormItem
          name="derivedExpressions"
          rules={[
            {
              validator: (_, value) => {
                const baseValidation = validateRuleLayers(value, ruleFields)
                const logicValidation = validateRuleLogicUniformity(value)
                const issues = [...baseValidation.issues, ...logicValidation.issues]
                if (!issues.length) return Promise.resolve()
                setShowRuleErrors(true)
                window.setTimeout(() => ruleBuilderRef.current?.focusFirstError())
                return Promise.reject(new Error(issues[0]?.message || '请完善业务限定表达式'))
              }
            }
          ]}
        >
          <RuleExpressionBuilder
            fieldLoading={fieldLoading}
            fields={ruleFields}
            ref={ruleBuilderRef}
            uniformLogic
            validationRequested={showRuleErrors}
          />
        </RuleExpressionFormItem>
      </div>

      <div className="mb-4 border border-gray-200 rounded bg-white p-4">
        <OntologyFormSectionTitle icon={<CheckCircleOutlined />}>指标预览</OntologyFormSectionTitle>
        <div className={styles.previewGrid}>
          <div className={styles.previewCard}>
            <div className={styles.previewCardTitle}>公式预览</div>
            <pre className={styles.businessPreview}>{result.businessPreview}</pre>
          </div>
          <div className={styles.previewCard}>
            <div className={styles.previewCardTitle}>SQL Preview</div>
            <pre className={styles.sqlPreview}>{result.displaySql}</pre>
          </div>
        </div>
      </div>
    </>
  )
}
