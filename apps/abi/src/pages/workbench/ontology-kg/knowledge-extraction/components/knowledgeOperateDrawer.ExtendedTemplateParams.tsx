import React from 'react'

import {
  COMPARISON_OUTPUT_OPTIONS,
  COMPARISON_TYPE_OPTIONS,
  CUMULATIVE_MODE_OPTIONS,
  CUMULATIVE_TIME_RANGE_OPTIONS,
  EXTENDED_TEMPLATE_DESC_MAP,
  RATIO_PRECISION_OPTIONS,
  VOLATILITY_DATA_RANGE_OPTIONS,
  VOLATILITY_METHOD_OPTIONS
} from '../constants'

import { KnowledgeOperateExpressionEditor } from './knowledgeOperateDrawer.ExpressionEditor'

interface AtomicMetricOption {
  label: string
  value: string
}

interface Props {
  readonly allFields: any[]
  readonly atomicMetricOptions: AtomicMetricOption[]
  readonly form: any
  readonly templateTypeVal: string
  readonly validateAccumulationDate: (_: any, value?: string) => Promise<void>
  readonly validateCustomExpression: (_: any, value?: string) => Promise<void>
  readonly validatePercentile: (_: any, value?: number | string) => Promise<void>
  readonly validatePositiveInt: (value: any, messageText: string) => Promise<void>
  readonly validateRollingWindow: (_: any, value?: number | string) => Promise<void>
  readonly validateSqlExpression: (_: any, value?: string) => Promise<void>
  readonly validateThresholdMax: (_: any, value?: string) => Promise<void>
  readonly validateThresholdValue: (_: any, value?: string) => Promise<void>
}

function getLabel(options: AtomicMetricOption[], value?: string | number) {
  return options.find(item => String(item.value) === String(value || ''))?.label || '指标'
}

function buildExtendedExpressionPreview(
  templateType: string,
  values: Record<string, any>,
  options: AtomicMetricOption[]
) {
  if (templateType === 'ratio') {
    const numerator = getLabel(options, values.ratioNumeratorId)
    const denominator = getLabel(options, values.ratioDenominatorId)
    const precision = values.ratioPrecision || '2'
    return {
      expression: `( ${numerator} / ${denominator} ) * 100%  [保留 ${precision} 位小数]`,
      referenceCount: new Set([numerator, denominator]).size
    }
  }

  if (templateType === 'cumulative') {
    const metric = getLabel(options, values.cumulativeMetricId)
    const range = values.cumulativeTimeRange || 'YEAR'
    return {
      expression: `SUM( ${metric} ) OVER ( ${range} )`,
      referenceCount: 1
    }
  }

  if (templateType === 'comparison') {
    const metric = getLabel(options, values.compareMetricId)
    const compareType = values.compareType || 'YOY'
    const period = values.comparePeriod || 1
    return {
      expression: `( 当前周期值(${metric}) - 比较周期值(${compareType}-${period}) ) / 比较周期值`,
      referenceCount: 1
    }
  }

  if (templateType === 'volatility') {
    const metric = getLabel(options, values.volatilityMetricId)
    const method = values.volatilityMethod || 'STDDEV'
    const windowSize = values.rollingWindowSize || 'N'
    return {
      expression: `${method}( ${metric} ) OVER ( 过去 ${windowSize} 天 )`,
      referenceCount: 1
    }
  }

  if (templateType === 'percentile') {
    const metric = getLabel(options, values.atomicMetricId)
    const percentileValue = values.percentileValue || '0.9'
    return {
      expression: `PERCENTILE_CONT( ${percentileValue} ) WITHIN GROUP (ORDER BY ${metric})`,
      referenceCount: 1
    }
  }

  return {
    expression: String(values.expr || '').trim() || '请填写计算逻辑',
    referenceCount: 1
  }
}

export const KnowledgeOperateExtendedTemplateParams: React.FC<Props> = ({
  allFields,
  atomicMetricOptions,
  form,
  templateTypeVal,
  validateAccumulationDate,
  validateCustomExpression,
  validatePercentile,
  validatePositiveInt,
  validateRollingWindow,
  validateSqlExpression,
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
  const atomicMetricId = AForm.useWatch('atomicMetricId', form)
  const percentileValue = AForm.useWatch('percentileValue', form)
  const expr = AForm.useWatch('expr', form)

  const preview = useMemo(
    () =>
      buildExtendedExpressionPreview(
        templateTypeVal,
        {
          atomicMetricId,
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
          volatilityMethod,
          volatilityMetricId
        },
        atomicMetricOptions
      ),
    [
      atomicMetricId,
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
      templateTypeVal,
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
        <div className="mb-2 text-base font-semibold">衍生逻辑配置</div>
        <div className="mb-3 text-gray-400">{EXTENDED_TEMPLATE_DESC_MAP[templateTypeVal] || '请选择衍生模板'}</div>

        {templateTypeVal === 'ratio' ? (
          <div className="grid grid-cols-2 gap-x-4">
            <AForm.Item
              label="分子指标"
              name="ratioNumeratorId"
              rules={[{ message: '请选择分子指标', required: true }]}
            >
              <ASelect
                options={atomicMetricOptions}
                placeholder="请选择分子指标"
              />
            </AForm.Item>
            <AForm.Item
              label="分母指标"
              name="ratioDenominatorId"
              rules={[{ message: '请选择分母指标', required: true }]}
            >
              <ASelect
                options={atomicMetricOptions}
                placeholder="请选择分母指标"
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
              <ASelect
                options={atomicMetricOptions}
                placeholder="请选择原子指标"
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
              <ASelect
                options={atomicMetricOptions}
                placeholder="请选择基准指标"
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
              <ASelect
                options={atomicMetricOptions}
                placeholder="请选择原始指标"
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
              label="原子指标"
              name="atomicMetricId"
              rules={[{ message: '请选择原子指标', required: true }]}
            >
              <ASelect
                options={atomicMetricOptions}
                placeholder="请选择原子指标"
              />
            </AForm.Item>
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
            allFields={allFields}
            form={form}
            validateCustomExpression={validateCustomExpression}
            validateSqlExpression={validateSqlExpression}
          />
        ) : null}
      </div>

      <div className="mb-4 border border-gray-200 rounded bg-gray-50 p-4">
        <div className="mb-2 text-base font-semibold">衍生逻辑生成结果</div>
        <div className="mb-2 border border-gray-200 rounded bg-white p-3">
          <div className="mb-1 text-gray-400">表达式预览</div>
          <div className="text-blue-600">{preview.expression}</div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-gray-200 rounded bg-white p-3">
            <div className="text-gray-400">语法校验</div>
            <div className="text-green-600">通过（模版生成）</div>
          </div>
          <div className="border border-gray-200 rounded bg-white p-3">
            <div className="text-gray-400">引用对象</div>
            <div>引用指标 {preview.referenceCount} 个</div>
          </div>
          <div className="border border-gray-200 rounded bg-white p-3">
            <div className="text-gray-400">可执行提示</div>
            <div className="text-green-600">模板参数已配置</div>
          </div>
        </div>
      </div>
    </>
  )
}
