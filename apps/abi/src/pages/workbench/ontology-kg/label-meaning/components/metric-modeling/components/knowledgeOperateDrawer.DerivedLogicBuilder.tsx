import { CheckCircleOutlined, FieldTimeOutlined, ProfileOutlined } from '@ant-design/icons'
import { Alert } from 'antd'
import type { FormInstance } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import {
  RuleExpressionBuilder,
  type RuleExpressionBuilderHandle,
  collectRuleFieldIds,
  compileRulePredicate,
  createRuleFieldOptions,
  normalizeRuleLayers,
  validateRuleLayers
} from '@/pages/workbench/ontology-kg/label-meaning/components/rule-expression'

import { AGG_METHOD_OPTIONS, STATISTICAL_DATE_UNIT_OPTIONS } from '../constants/metricModeling.constants'
import { useKnowledgeDimensions } from '../hooks/useKnowledgeDimensions'
import type {
  KnowledgeDerivedCondition,
  KnowledgeFormValues,
  KnowledgeIndicatorItem,
  KnowledgeTechField,
  StatisticalCaliber
} from '../types/metricModeling.types'
import { normalizeStatisticalCaliber } from '../utils/precomputeConfig'

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
  const statisticalCaliberValue = AForm.useWatch('statisticalCaliber', form) as StatisticalCaliber | undefined
  const statisticalCaliber = useMemo(
    () => normalizeStatisticalCaliber(statisticalCaliberValue),
    [statisticalCaliberValue]
  )
  const {
    error: dimensionError,
    loading: dimensionLoading,
    retry: retryDimensions,
    treeData: dimensionTree
  } = useKnowledgeDimensions()
  const ruleFields = useMemo(() => createRuleFieldOptions(allFields), [allFields])
  const normalizedLayers = useMemo(() => normalizeRuleLayers(derivedExpressions), [derivedExpressions])

  useEffect(() => {
    const current = form.getFieldValue('derivedExpressions')
    if (Array.isArray(current) && current.length) return
    const legacyConditions = form.getFieldValue('derivedConditions') as KnowledgeDerivedCondition[] | undefined
    form.setFieldValue(
      'derivedExpressions',
      normalizeRuleLayers(legacyConditions?.length ? [{ conditions: legacyConditions, name: '新分层' }] : [])
    )
  }, [form])

  const result = useMemo(() => {
    const atomicLabel =
      atomicMetricOptions.find(item => String(item.value) === String(techId || ''))?.label || '原子指标'
    const aggregation = AGG_METHOD_OPTIONS.find(item => item.value === (projectionFunc || 'sum'))?.label || '合计'
    const predicate = compileRulePredicate(normalizedLayers, ruleFields)
      .split('\n')
      .filter(Boolean)
      .map(item => `(${item})`)
      .join(' AND ')
    const periodLabel = `最近 ${statisticalCaliber.dateRangeValue} ${STATISTICAL_DATE_UNIT_OPTIONS.find(item => item.value === statisticalCaliber.dateRangeUnit)?.label || '小时'}`
    const timeLabel =
      statisticalCaliber.timeRangeType === 'specified'
        ? `${statisticalCaliber.startTime || '--:--'}～${statisticalCaliber.endTime || '--:--'}`
        : '全天'
    return {
      aggregation,
      atomicLabel,
      expressionPreview: `${aggregation}(${atomicLabel}) + ${periodLabel} + ${timeLabel}${predicate ? ` + Filters(${predicate})` : ''}`,
      periodLabel,
      predicate,
      sqlPreview: `${String(projectionFunc || 'sum').toUpperCase()}(${atomicLabel})${predicate ? `\nWHERE ${predicate}` : ''}`,
      timeLabel
    }
  }, [atomicMetricOptions, normalizedLayers, projectionFunc, ruleFields, statisticalCaliber, techId])

  useEffect(() => {
    form.setFieldValue('derivedConditionExpr', result.predicate ? `WHERE ${result.predicate}` : '')
    form.setFieldValue('expr', result.sqlPreview)
    form.setFieldValue('relItemId', collectRuleFieldIds(normalizedLayers).join(','))
  }, [form, normalizedLayers, result.predicate, result.sqlPreview])

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
              rules={[{ message: '请输入大于 0 的整数', min: 1, required: true, type: 'integer' }]}
            >
              <StatisticalDateRangeFields />
            </AForm.Item>
            <div className="mt-2 text-sm text-[#8995a8]">每次预计算时，动态统计所选最近周期的数据。</div>
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
        <div className="mt-6 max-w-[50%] pr-4">
          <AForm.Item
            extra="单选主体维度，选项与第三步维度设置使用同一数据源。"
            label="主体维度"
            name={['statisticalCaliber', 'subjectDimensionId']}
            rules={[{ message: '请选择主体维度', required: true }]}
          >
            <ATreeSelect
              showSearch
              treeDefaultExpandAll
              loading={dimensionLoading}
              placeholder="请选择主体维度"
              treeData={dimensionTree}
              treeNodeFilterProp="title"
            />
          </AForm.Item>
          {dimensionError ? (
            <Alert
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
        <AForm.Item
          name="derivedExpressions"
          rules={[
            {
              validator: (_, value) => {
                const validation = validateRuleLayers(value, ruleFields)
                if (validation.valid) return Promise.resolve()
                setShowRuleErrors(true)
                window.setTimeout(() => ruleBuilderRef.current?.focusFirstError())
                return Promise.reject(new Error(validation.issues[0]?.message || '请完善业务限定表达式'))
              }
            }
          ]}
        >
          <RuleExpressionBuilder
            fieldLoading={fieldLoading}
            fields={ruleFields}
            ref={ruleBuilderRef}
            validationRequested={showRuleErrors}
          />
        </AForm.Item>
      </div>

      <div className="mb-4 border border-gray-200 rounded bg-gray-50 p-4">
        <OntologyFormSectionTitle icon={<CheckCircleOutlined />}>派生逻辑生成结果</OntologyFormSectionTitle>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold">
            原子指标：{result.atomicLabel}
          </span>
          <span className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold">
            聚合方式：{result.aggregation}
          </span>
          <span className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold">
            日期范围：{result.periodLabel}
          </span>
          <span className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold">
            时段范围：{result.timeLabel}
          </span>
        </div>
        <div className="border border-blue-200 rounded border-dashed bg-white p-3">
          <div className="mb-1 text-gray-400">公式预览</div>
          <pre className="m-0 whitespace-pre-wrap text-blue-600">{result.expressionPreview}</pre>
          <div className="mb-1 mt-6 text-gray-400">SQL Preview</div>
          <pre className="m-0 whitespace-pre-wrap text-blue-600">{result.sqlPreview}</pre>
        </div>
      </div>
    </>
  )
}
