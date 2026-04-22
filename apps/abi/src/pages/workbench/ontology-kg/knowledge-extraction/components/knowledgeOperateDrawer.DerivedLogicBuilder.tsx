import { MinusOutlined, PlusOutlined } from '@ant-design/icons'
import React from 'react'

import { DATA_FREQUENCY_OPTIONS, DERIVED_LOGIC_OPTIONS, DERIVED_OPERATOR_OPTIONS } from '../constants'

interface AtomicMetricOption {
  label: string
  value: string
}

interface ConditionItem {
  logic?: 'AND' | 'OR'
  metric?: string
  operator?: string
  value?: string
}

interface Props {
  readonly allFields: any[]
  readonly atomicMetricOptions: AtomicMetricOption[]
  readonly form: any
}

const defaultCondition: ConditionItem = {
  logic: 'AND',
  metric: '',
  operator: '>=',
  value: ''
}

function quoteValue(value: string) {
  if (!value) {
    return "''"
  }
  const text = String(value).trim()
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return text
  }
  return `'${text}'`
}

function buildDerivedResult({
  allFields,
  atomicMetricId,
  atomicMetricOptions,
  conditions,
  dataFrequency,
  derivedTimeWindow
}: {
  allFields: any[]
  atomicMetricId?: string | number
  atomicMetricOptions: AtomicMetricOption[]
  conditions?: ConditionItem[]
  dataFrequency?: string
  derivedTimeWindow?: number
}) {
  const atomicLabel =
    atomicMetricOptions.find(item => String(item.value) === String(atomicMetricId || ''))?.label || '原子指标'

  const freqLabel =
    DATA_FREQUENCY_OPTIONS.find(item => String(item.value) === String(dataFrequency || ''))?.label || '周期'

  const fieldMap = new Map<string, string>()
  allFields.forEach(item => {
    const key = String(item.techId || item.fieldName || item.name || '')
    const label = String(item.bizName || item.fieldName || item.name || key)
    if (key) {
      fieldMap.set(key, label)
    }
  })

  const validConditions = (conditions || [])
    .map(item => ({
      logic: item?.logic || 'AND',
      metric: String(item?.metric || '').trim(),
      operator: String(item?.operator || '>=').trim(),
      value: String(item?.value || '').trim()
    }))
    .filter(item => item.metric && item.operator && item.value)

  const whereLines = validConditions.map((item, index) => {
    const metricLabel = fieldMap.get(item.metric) || item.metric
    const prefix = index === 0 ? 'WHERE' : item.logic
    return `${prefix} ${metricLabel} ${item.operator} ${quoteValue(item.value)}`
  })

  const whereClause = whereLines.join('\n')
  const sqlPreview = `SUM(${atomicLabel})${whereClause ? `\n${whereClause}` : ''}`

  const filterLabels = validConditions.map(item => {
    const metricLabel = fieldMap.get(item.metric) || item.metric
    return `${metricLabel} ${item.operator} ${item.value}`
  })

  const summaryText = [
    `AtomicMetric(${atomicLabel})`,
    `Frequency(${freqLabel})`,
    `TimeWindow(${derivedTimeWindow || 1})`,
    filterLabels.length ? `Filters(${filterLabels.join(' , ')})` : undefined
  ]
    .filter(Boolean)
    .join(' + ')

  const resultPreview = `近${derivedTimeWindow || 1}${freqLabel}满足条件的${atomicLabel}`

  const referenceCount = new Set([atomicLabel, ...filterLabels]).size

  return {
    expressionPreview: summaryText,
    referenceCount,
    resultPreview,
    sqlPreview,
    whereClause
  }
}

export const KnowledgeOperateDerivedLogicBuilder: React.FC<Props> = ({ allFields, atomicMetricOptions, form }) => {
  const atomicMetricId = AForm.useWatch('atomicMetricId', form)
  const dataFrequency = AForm.useWatch('dataFrequency', form)
  const derivedConditions = AForm.useWatch('derivedConditions', form) as ConditionItem[] | undefined
  const derivedTimeWindow = Number(AForm.useWatch('derivedTimeWindow', form) || 1)

  const fieldOptions = useMemo(
    () =>
      allFields.map(item => ({
        label: `${item.tableBizName || item.tableName || '未命名表'} - ${item.bizName || item.fieldName || item.name || item.techId}`,
        value: String(item.techId || item.fieldName || item.name || '')
      })),
    [allFields]
  )

  const result = useMemo(
    () =>
      buildDerivedResult({
        allFields,
        atomicMetricId,
        atomicMetricOptions,
        conditions: derivedConditions,
        dataFrequency,
        derivedTimeWindow
      }),
    [allFields, atomicMetricId, atomicMetricOptions, dataFrequency, derivedConditions, derivedTimeWindow]
  )

  useEffect(() => {
    form.setFieldValue('derivedConditionExpr', result.whereClause)
    form.setFieldValue('expr', result.sqlPreview)
  }, [form, result.sqlPreview, result.whereClause])

  return (
    <>
      <AForm.Item
        label="时间周期"
        name="derivedTimeWindow"
        rules={[{ message: '请输入时间周期', required: true }]}
      >
        <AInput
          maxLength={3}
          placeholder="请输入时间周期"
        />
      </AForm.Item>

      <div className="mb-4 border border-gray-200 rounded p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-base font-medium">业务限定表达式</span>
          <AButton
            size="small"
            type="primary"
            onClick={() => {
              const current = (form.getFieldValue('derivedConditions') || []) as ConditionItem[]
              form.setFieldValue('derivedConditions', [...current, defaultCondition])
            }}
          >
            新增表达式
          </AButton>
        </div>

        <AForm.List name="derivedConditions">
          {(fields, { add, remove }) => (
            <div>
              {fields.map((field, index) => (
                <div key={field.key}>
                  <div className="grid grid-cols-3 mb-2 gap-x-3">
                    <AForm.Item
                      {...field}
                      name={[field.name, 'metric']}
                      rules={[{ message: '请选择字段', required: true }]}
                    >
                      <ASelect
                        showSearch
                        options={fieldOptions}
                        placeholder="请选择字段"
                      />
                    </AForm.Item>

                    <AForm.Item
                      {...field}
                      name={[field.name, 'operator']}
                      rules={[{ message: '请选择操作符', required: true }]}
                    >
                      <ASelect
                        options={DERIVED_OPERATOR_OPTIONS}
                        placeholder="请选择操作符"
                      />
                    </AForm.Item>

                    <div className="flex gap-2">
                      <AForm.Item
                        className="m-0 w-0 flex-1"
                        {...field}
                        name={[field.name, 'value']}
                        rules={[{ message: '请输入值', required: true }]}
                      >
                        <AInput placeholder="请输入值" />
                      </AForm.Item>
                      <AButton
                        icon={<MinusOutlined />}
                        onClick={() => remove(field.name)}
                      />
                      <AButton
                        icon={<PlusOutlined />}
                        onClick={() => add(defaultCondition, field.name + 1)}
                      />
                    </div>
                  </div>

                  {index < fields.length - 1 ? (
                    <AForm.Item
                      className="mb-2 w-120px"
                      {...field}
                      name={[field.name, 'logic']}
                    >
                      <ASelect options={DERIVED_LOGIC_OPTIONS} />
                    </AForm.Item>
                  ) : null}
                </div>
              ))}

              {fields.length === 0 ? (
                <AButton
                  icon={<PlusOutlined />}
                  onClick={() => add(defaultCondition)}
                >
                  添加条件
                </AButton>
              ) : null}
            </div>
          )}
        </AForm.List>
      </div>

      <div className="mb-4 border border-gray-200 rounded bg-gray-50 p-4">
        <div className="mb-2 text-base font-medium">派生逻辑生成结果</div>
        <div className="mb-2 border border-gray-200 rounded bg-white p-3">
          <div className="mb-1 text-gray-400">表达式预览</div>
          <div className="text-blue-600">{result.expressionPreview}</div>
        </div>
        <div className="mb-2 border border-gray-200 rounded bg-white p-3">
          <div className="mb-1 text-gray-400">SQL Preview</div>
          <pre className="m-0 whitespace-pre-wrap text-blue-600">{result.sqlPreview}</pre>
        </div>
        <div className="mb-2 border border-gray-200 rounded bg-white p-3 text-blue-600">{result.resultPreview}</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-gray-200 rounded bg-white p-3">
            <div className="text-gray-400">构成要素校验</div>
            <div className="text-green-600">原子指标 / 时间周期 / 业务限定 已齐全</div>
          </div>
          <div className="border border-gray-200 rounded bg-white p-3">
            <div className="text-gray-400">引用对象</div>
            <div>引用指标 {result.referenceCount} 个</div>
          </div>
          <div className="border border-gray-200 rounded bg-white p-3">
            <div className="text-gray-400">提交状态</div>
            <div className="text-orange-500">当前仅保存，未提交</div>
          </div>
        </div>
      </div>
    </>
  )
}
