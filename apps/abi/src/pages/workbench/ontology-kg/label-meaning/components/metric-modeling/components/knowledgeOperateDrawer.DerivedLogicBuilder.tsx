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
  hasConfiguredRuleConditions,
  normalizeRuleLayers,
  validateRuleLayers,
  validateRuleLogicUniformity
} from '@/pages/workbench/ontology-kg/label-meaning/components/rule-expression'

import { CUSTOM_AGGREGATION_EXPRESSION_LABEL } from '../constants/metricModeling.constants'
import { useKnowledgeDimensions } from '../hooks/useKnowledgeDimensions'
import type {
  KnowledgeDerivedCondition,
  KnowledgeFormValues,
  KnowledgeIndicatorItem,
  KnowledgeTechField,
  StatisticalCaliber
} from '../types/metricModeling.types'
import { getAtomicAggregationMethods, getAtomicComplexAggregationExpression } from '../utils/atomicMetricSource'
import { buildDerivedMetricPreview } from '../utils/derivedMetricPreview'
import type { OntologyAggregationMethodOption } from '../utils/ontologyFunctionDictionary'
import {
  getStatisticalDateRangeHint,
  isDynamicStatisticalDateRangeMode,
  isValidStatisticalDateRangeValue,
  normalizeStatisticalCaliber
} from '../utils/precomputeConfig'

import styles from './knowledgeOperateDrawer.DerivedLogicBuilder.module.scss'
import { KnowledgeFormItemLabel } from './knowledgeOperateDrawer.FormItemLabel'
import { TimeStringPicker } from './knowledgeOperateDrawer.PrecomputeConfig'
import { StatisticalDateRangeFields } from './knowledgeOperateDrawer.StatisticalDateRangeFields'

interface AtomicMetricOption {
  item?: KnowledgeIndicatorItem
  label: string
  value: string
}

interface Props {
  readonly aggregationOptions: OntologyAggregationMethodOption[]
  readonly aggregationOptionsLoading?: boolean
  readonly allFields: KnowledgeTechField[]
  readonly atomicMetricOptions: AtomicMetricOption[]
  readonly fieldError?: boolean
  readonly fieldLoading?: boolean
  readonly form: FormInstance<KnowledgeFormValues>
  readonly onRetryFields?: () => void
}

export const KnowledgeOperateDerivedLogicBuilder: React.FC<Props> = ({
  aggregationOptions: dictionaryAggregationOptions,
  aggregationOptionsLoading,
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
  const customAggregationExpression = useMemo(
    () => getAtomicComplexAggregationExpression(selectedAtomicOption?.item),
    [selectedAtomicOption]
  )
  const aggregationOptions = useMemo(() => {
    if (customAggregationExpression) {
      return [{ label: CUSTOM_AGGREGATION_EXPRESSION_LABEL, value: customAggregationExpression }]
    }
    const availableMethods = new Set(getAtomicAggregationMethods(selectedAtomicOption?.item))
    return dictionaryAggregationOptions.filter(item => availableMethods.has(item.value))
  }, [customAggregationExpression, dictionaryAggregationOptions, selectedAtomicOption])
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
            <div className="mb-2 flex items-center gap-1 text-sm text-[#3e5068] font-medium">
              <KnowledgeFormItemLabel
                helpText={getStatisticalDateRangeHint(statisticalCaliberValue || statisticalCaliber)}
                title="日期范围"
              />
              <span className="text-red-500">*</span>
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
          </div>
          <div>
            <AForm.Item
              className="mb-0!"
              name="projectionFunc"
              rules={[{ message: '请选择派生聚合方式', required: true }]}
              label={
                <KnowledgeFormItemLabel
                  title="派生聚合方式"
                  helpText={
                    customAggregationExpression
                      ? '该原子指标使用自定义聚合表达式，派生指标直接继承该表达式。'
                      : '仅展示当前原子指标已配置的聚合方式，派生指标只能选择其中 1 个。'
                  }
                />
              }
            >
              <ASelect
                loading={aggregationOptionsLoading}
                options={aggregationOptions}
                placeholder="请选择派生聚合方式"
              />
            </AForm.Item>
            {customAggregationExpression ? (
              <div className={styles.customAggregationNotice}>
                <span>已继承原子指标的自定义聚合方式表达式</span>
                <APopover
                  content={<pre className={styles.customAggregationExpression}>{customAggregationExpression}</pre>}
                  placement="bottomRight"
                  trigger="click"
                >
                  <AButton
                    className={styles.customAggregationViewButton}
                    type="link"
                  >
                    查看表达式
                  </AButton>
                </APopover>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-6">
          <div className={styles.subjectDimensionRow}>
            <AForm.Item
              className={`mb-0! ${styles.subjectDimensionField}`}
              name={['statisticalCaliber', 'subjectDimensionIds']}
              rules={[{ message: '请选择主体维度', min: 1, required: true, type: 'array' }]}
              label={
                <KnowledgeFormItemLabel
                  helpText="可选择多个主体维度，选项与第三步维度设置使用同一数据源。"
                  title="主体维度"
                />
              }
            >
              <ATreeSelect
                multiple
                showSearch
                treeCheckable
                treeDefaultExpandAll
                treeExpandAction="click"
                loading={dimensionLoading}
                maxTagCount="responsive"
                placeholder="请选择主体维度"
                treeData={dimensionTree}
                treeNodeFilterProp="title"
                onChange={value => {
                  const dimensionIds = Array.isArray(value)
                    ? value.map(item => String(item ?? '').trim()).filter(Boolean)
                    : []
                  const currentNameMap = form.getFieldValue(['statisticalCaliber', 'subjectDimensionNameMap']) as
                    | Record<string, string>
                    | undefined
                  const subjectDimensionNameMap = dimensionIds.reduce<Record<string, string>>(
                    (nameMap, dimensionId) => {
                      const option = dimensionOptions.find(item => String(item.key) === dimensionId)
                      nameMap[dimensionId] = option?.name || currentNameMap?.[dimensionId] || dimensionId
                      return nameMap
                    },
                    {}
                  )
                  form.setFieldValue(['statisticalCaliber', 'subjectDimensionNameMap'], subjectDimensionNameMap)
                }}
              />
            </AForm.Item>
            <AForm.Item
              className={`mb-0! ${styles.crossDimensionField}`}
              name={['statisticalCaliber', 'isCrossDim']}
              valuePropName="checked"
            >
              <ACheckbox>
                <KnowledgeFormItemLabel
                  helpText="如需多个维度组合分析指标，请勾选"
                  title="是否维度交叉"
                />
              </ACheckbox>
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
        <div className="mt-6">
          <div>
            <div className="mb-2 text-sm text-[#3e5068] font-medium">
              <KnowledgeFormItemLabel
                title="时段范围"
                helpText={
                  statisticalCaliber.timeRangeType === 'specified'
                    ? `仅统计每天 ${statisticalCaliber.startTime || '--:--'}～${statisticalCaliber.endTime || '--:--'} 的数据。`
                    : '默认统计全天数据。'
                }
              />
            </div>
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
          </div>
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
                if (!hasConfiguredRuleConditions(value)) {
                  setShowRuleErrors(false)
                  return Promise.resolve()
                }
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
            optional
            uniformLogic
            fieldLoading={fieldLoading}
            fields={ruleFields}
            ref={ruleBuilderRef}
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
