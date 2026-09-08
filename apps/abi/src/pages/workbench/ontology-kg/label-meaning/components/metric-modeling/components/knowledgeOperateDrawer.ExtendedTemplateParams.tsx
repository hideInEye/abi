import { CheckCircleOutlined, CodeOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import React from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'

import {
  COMPARISON_OUTPUT_OPTIONS,
  COMPARISON_TYPE_OPTIONS,
  CUMULATIVE_MODE_OPTIONS,
  CUMULATIVE_TIME_RANGE_OPTIONS,
  EXTENDED_TEMPLATE_DESC_MAP,
  RATIO_PRECISION_OPTIONS,
  VOLATILITY_DATA_RANGE_OPTIONS,
  VOLATILITY_METHOD_OPTIONS
} from '../constants/metricModeling.constants'
import type { KnowledgeFormValues, KnowledgeIndicatorItem, KnowledgeTechField } from '../types/metricModeling.types'

import { KnowledgeOperateExpressionEditor } from './knowledgeOperateDrawer.ExpressionEditor'
import { KnowledgeIndicatorSearchSelect } from './knowledgeOperateDrawer.IndicatorSearchSelect'

interface AtomicMetricOption {
  item?: KnowledgeIndicatorItem
  label: string
  value: string
}

interface Props {
  readonly allFields: KnowledgeTechField[]
  readonly atomicMetricOptions: AtomicMetricOption[]
  readonly form: FormInstance<KnowledgeFormValues>
  readonly indicatorOptionsLoading?: boolean
  readonly onIndicatorSearch: (searchText: string) => void
  readonly referenceMetricOptions: AtomicMetricOption[]
  readonly templateTypeVal: string
  readonly validateAccumulationDate: (_: unknown, value?: string) => Promise<void>
  readonly validateCustomExpression: (_: unknown, value?: string) => Promise<void>
  readonly validatePercentile: (_: unknown, value?: number | string) => Promise<void>
  readonly validatePositiveInt: (value: unknown, messageText: string) => Promise<void>
  readonly validateRollingWindow: (_: unknown, value?: number | string) => Promise<void>
  readonly validateThresholdMax: (_: unknown, value?: string) => Promise<void>
  readonly validateThresholdValue: (_: unknown, value?: string) => Promise<void>
}

function getLabel(options: AtomicMetricOption[], value?: string | number) {
  return options.find(item => String(item.value) === String(value || ''))?.label || '指标'
}

function formatCustomExpressionPreview(expression: unknown, options: AtomicMetricOption[]) {
  const text = String(expression || '').trim()
  if (!text) {
    return '请填写计算逻辑'
  }
  return text.replace(/##([^#]+)##/g, (_match, id) => getLabel(options, id))
}

function buildExtendedExpressionPreview(
  templateType: string,
  values: Partial<KnowledgeFormValues>,
  options: AtomicMetricOption[],
  referenceOptions: AtomicMetricOption[] = options
) {
  if (templateType === 'ratio') {
    const numerator = getLabel(options, values.ratioNumeratorId)
    const denominator = getLabel(options, values.ratioDenominatorId)
    const precision = values.ratioPrecision || '2'
    return {
      expression: `( ${numerator} / ${denominator} ) * 100%  [保留 ${precision} 位小数]`
    }
  }

  if (templateType === 'cumulative') {
    const metric = getLabel(options, values.cumulativeMetricId)
    const range = values.cumulativeTimeRange || 'YEAR'
    return {
      expression: `SUM( ${metric} ) OVER ( ${range} )`
    }
  }

  if (templateType === 'comparison') {
    const metric = getLabel(options, values.compareMetricId)
    const compareType = values.compareType || 'YOY'
    const period = values.comparePeriod || 1
    return {
      expression: `( 当前周期值(${metric}) - 比较周期值(${compareType}-${period}) ) / 比较周期值`
    }
  }

  if (templateType === 'volatility') {
    const metric = getLabel(options, values.volatilityMetricId)
    const method = values.volatilityMethod || 'STDDEV'
    const windowSize = values.rollingWindowSize || 'N'
    return {
      expression: `${method}( ${metric} ) OVER ( 过去 ${windowSize} 天 )`
    }
  }

  if (templateType === 'percentile') {
    const metric = getLabel(options, typeof values.techId === 'string' ? values.techId : undefined)
    const percentileValue = values.percentileValue || '0.9'
    return {
      expression: `PERCENTILE_CONT( ${percentileValue} ) WITHIN GROUP (ORDER BY ${metric})`
    }
  }

  return {
    expression: formatCustomExpressionPreview(values.expr, referenceOptions)
  }
}

export const KnowledgeOperateExtendedTemplateParams: React.FC<Props> = ({
  allFields,
  atomicMetricOptions,
  form,
  indicatorOptionsLoading,
  onIndicatorSearch,
  referenceMetricOptions,
  templateTypeVal,
  validateAccumulationDate,
  validateCustomExpression,
  validatePercentile,
  validatePositiveInt,
  validateRollingWindow,
  validateThresholdMax,
  validateThresholdValue
}) => {
  const ratioNumeratorId = AForm.useWatch('ratioNumeratorId', form)
  const ratioDenominatorId = AForm.useWatch('ratioDenominatorId', form)
  const ratioPrecision = AForm.useWatch('ratioPrecision', form)
  const cumulativeMetricId = AForm.useWatch('cumulativeMetricId', form)
  const cumulativeTimeRange = AForm.useWatch('cumulativeTimeRange', form)
  const compareMetricId = AForm.useWatch('compareMetricId', form)
  const compareType = AForm.useWatch('compareType', form)
  const comparePeriod = AForm.useWatch('comparePeriod', form)
  const comparisonOutputType = AForm.useWatch('comparisonOutputType', form)
  const volatilityMetricId = AForm.useWatch('volatilityMetricId', form)
  const volatilityMethod = AForm.useWatch('volatilityMethod', form)
  const rollingWindowSize = AForm.useWatch('rollingWindowSize', form)
  const techId = AForm.useWatch('techId', form)
  const percentileValue = AForm.useWatch('percentileValue', form)
  const expr = AForm.useWatch('expr', form)

  const preview = useMemo(
    () =>
      buildExtendedExpressionPreview(
        templateTypeVal,
        {
          compareMetricId,
          comparePeriod,
          compareType,
          comparisonOutputType,
          cumulativeMetricId,
          cumulativeTimeRange,
          expr,
          percentileValue,
          ratioDenominatorId,
          ratioNumeratorId,
          ratioPrecision,
          rollingWindowSize,
          techId,
          volatilityMethod,
          volatilityMetricId
        },
        atomicMetricOptions,
        referenceMetricOptions
      ),
    [
      atomicMetricOptions,
      compareMetricId,
      comparePeriod,
      compareType,
      comparisonOutputType,
      cumulativeMetricId,
      cumulativeTimeRange,
      expr,
      percentileValue,
      ratioDenominatorId,
      ratioNumeratorId,
      ratioPrecision,
      rollingWindowSize,
      referenceMetricOptions,
      templateTypeVal,
      techId,
      volatilityMethod,
      volatilityMetricId
    ]
  )

  useEffect(() => {
    if (templateTypeVal !== 'custom') {
      form.setFieldValue('expr', preview.expression)
    }
  }, [form, preview.expression, templateTypeVal])

  return (
    <>
      <div className="mb-4 border border-gray-200 rounded p-4">
        <OntologyFormSectionTitle icon={<CodeOutlined />}>衍生逻辑配置</OntologyFormSectionTitle>
        <div className="mb-3 text-gray-400">{EXTENDED_TEMPLATE_DESC_MAP[templateTypeVal] || '请选择衍生模板'}</div>

        {templateTypeVal === 'ratio' ? (
          <div className="grid grid-cols-2 gap-x-4">
            <AForm.Item
              label="分子指标"
              name="ratioNumeratorId"
              rules={[{ message: '请选择分子指标', required: true }]}
            >
              <KnowledgeIndicatorSearchSelect
                loading={indicatorOptionsLoading}
                options={atomicMetricOptions}
                placeholder="请选择分子指标"
                onSearch={onIndicatorSearch}
              />
            </AForm.Item>
            <AForm.Item
              label="分母指标"
              name="ratioDenominatorId"
              rules={[{ message: '请选择分母指标', required: true }]}
            >
              <KnowledgeIndicatorSearchSelect
                loading={indicatorOptionsLoading}
                options={atomicMetricOptions}
                placeholder="请选择分母指标"
                onSearch={onIndicatorSearch}
              />
            </AForm.Item>
            <AForm.Item
              label="计算精度"
              name="ratioPrecision"
              rules={[{ message: '请选择计算精度', required: true }]}
            >
              <ASelect
                options={RATIO_PRECISION_OPTIONS}
                placeholder="请选择计算精度"
              />
            </AForm.Item>
            <div>
              <div className="mb-2 text-sm text-gray-600">阈值范围 [Min, Max]（预警使用）</div>
              <div className="grid grid-cols-2 gap-x-2">
                <AForm.Item
                  name="thresholdMin"
                  rules={[{ validator: validateThresholdValue }]}
                >
                  <AInput placeholder="最小值" />
                </AForm.Item>
                <AForm.Item
                  dependencies={['thresholdMin']}
                  name="thresholdMax"
                  rules={[{ validator: validateThresholdMax }]}
                >
                  <AInput placeholder="最大值" />
                </AForm.Item>
              </div>
            </div>
          </div>
        ) : null}

        {templateTypeVal === 'cumulative' ? (
          <div className="grid grid-cols-2 gap-x-4">
            <AForm.Item
              label="原子指标"
              name="cumulativeMetricId"
              rules={[{ message: '请选择原子指标', required: true }]}
            >
              <KnowledgeIndicatorSearchSelect
                loading={indicatorOptionsLoading}
                options={atomicMetricOptions}
                placeholder="请选择原子指标"
                onSearch={onIndicatorSearch}
              />
            </AForm.Item>
            <AForm.Item
              label="时间范围"
              name="cumulativeTimeRange"
              rules={[{ message: '请选择时间范围', required: true }]}
            >
              <ASelect
                options={CUMULATIVE_TIME_RANGE_OPTIONS}
                placeholder="请选择时间范围"
              />
            </AForm.Item>
            <AForm.Item
              label="累加起点日期"
              name="accumulateStartDate"
              rules={[{ validator: validateAccumulationDate }]}
            >
              <AInput type="date" />
            </AForm.Item>
            <AForm.Item
              label="累加方式"
              name="cumulativeMode"
              rules={[{ message: '请选择累加方式', required: true }]}
            >
              <ASelect
                options={CUMULATIVE_MODE_OPTIONS}
                placeholder="请选择累加方式"
              />
            </AForm.Item>
          </div>
        ) : null}

        {templateTypeVal === 'comparison' ? (
          <div className="grid grid-cols-2 gap-x-4">
            <AForm.Item
              label="基准指标"
              name="compareMetricId"
              rules={[{ message: '请选择基准指标', required: true }]}
            >
              <KnowledgeIndicatorSearchSelect
                loading={indicatorOptionsLoading}
                options={atomicMetricOptions}
                placeholder="请选择基准指标"
                onSearch={onIndicatorSearch}
              />
            </AForm.Item>
            <AForm.Item
              label="对比类型"
              name="compareType"
              rules={[{ message: '请选择对比类型', required: true }]}
            >
              <ASelect
                options={COMPARISON_TYPE_OPTIONS}
                placeholder="请选择对比类型"
              />
            </AForm.Item>
            <AForm.Item
              label="比较周期长度"
              name="comparePeriod"
              rules={[{ validator: (_rule, value) => validatePositiveInt(value, '比较周期长度必须为大于0的正整数') }]}
            >
              <AInput placeholder="请输入比较周期长度" />
            </AForm.Item>
            <AForm.Item
              label="产出格式"
              name="comparisonOutputType"
              rules={[{ message: '请选择产出格式', required: true }]}
            >
              <ASelect
                options={COMPARISON_OUTPUT_OPTIONS}
                placeholder="请选择产出格式"
              />
            </AForm.Item>
          </div>
        ) : null}

        {templateTypeVal === 'volatility' ? (
          <div className="grid grid-cols-2 gap-x-4">
            <AForm.Item
              label="原始指标"
              name="volatilityMetricId"
              rules={[{ message: '请选择原始指标', required: true }]}
            >
              <KnowledgeIndicatorSearchSelect
                loading={indicatorOptionsLoading}
                options={atomicMetricOptions}
                placeholder="请选择原始指标"
                onSearch={onIndicatorSearch}
              />
            </AForm.Item>
            <AForm.Item
              label="计算方法"
              name="volatilityMethod"
              rules={[{ message: '请选择计算方法', required: true }]}
            >
              <ASelect
                options={VOLATILITY_METHOD_OPTIONS}
                placeholder="请选择计算方法"
              />
            </AForm.Item>
            <AForm.Item
              label="滚动窗口大小"
              name="rollingWindowSize"
              rules={[{ validator: validateRollingWindow }]}
            >
              <AInput placeholder="请输入滚动窗口大小" />
            </AForm.Item>
            <AForm.Item
              label="数据范围"
              name="volatilityDataRange"
              rules={[{ message: '请选择数据范围', required: true }]}
            >
              <ASelect
                options={VOLATILITY_DATA_RANGE_OPTIONS}
                placeholder="请选择数据范围"
              />
            </AForm.Item>
          </div>
        ) : null}

        {templateTypeVal === 'percentile' ? (
          <div className="grid grid-cols-2 gap-x-4">
            <AForm.Item
              label="分位数值 (0~1)"
              name="percentileValue"
              rules={[{ validator: validatePercentile }]}
            >
              <AInput placeholder="请输入分位数值" />
            </AForm.Item>
          </div>
        ) : null}

        {templateTypeVal === 'custom' ? (
          <KnowledgeOperateExpressionEditor
            strictCustom
            allFields={allFields}
            form={form}
            referenceMetricOptions={referenceMetricOptions}
            validateCustomExpression={validateCustomExpression}
            validateSqlExpression={validateCustomExpression}
          />
        ) : null}
      </div>

      <div className="mb-4 border border-gray-200 rounded bg-gray-50 p-4">
        <OntologyFormSectionTitle icon={<CheckCircleOutlined />}>衍生逻辑生成结果</OntologyFormSectionTitle>
        <div className="mb-2 border border-gray-200 rounded bg-white p-3">
          <div className="mb-1 text-gray-400">表达式预览</div>
          <div className="text-blue-600">{preview.expression}</div>
        </div>
      </div>
    </>
  )
}
