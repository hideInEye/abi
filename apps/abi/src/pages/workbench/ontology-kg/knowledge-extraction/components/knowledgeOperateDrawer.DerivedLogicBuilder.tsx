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
  calcPeriod,
  conditions,
  dataFrequency
}: {
  allFields: any[]
  atomicMetricId?: string | number
  atomicMetricOptions: AtomicMetricOption[]
  calcPeriod?: string | number
  conditions?: ConditionItem[]
  dataFrequency?: string
}) {
  const atomicLabel =
    atomicMetricOptions.find(item => String(item.value) === String(atomicMetricId || ''))?.label || '原子指标'

  const freqLabel =
    DATA_FREQUENCY_OPTIONS.find(item => String(item.value) === String(dataFrequency || ''))?.label || '周期'
  const timeWindow = String(calcPeriod || '1').trim() || '1'

  const fieldMap = new Map<string, string>()
  const sqlFieldMap = new Map<string, string>()
  allFields.forEach(item => {
    const key = String(item.techId || item.fieldName || item.name || '')
    const label = String(item.bizName || item.fieldName || item.name || key)
    if (key) {
      fieldMap.set(key, label)
      sqlFieldMap.set(key, String(item.fieldName || item.originName || item.name || key))
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
    const metricField = sqlFieldMap.get(item.metric) || item.metric
    const prefix = index === 0 ? 'WHERE' : item.logic
    return `${prefix} ${metricField} ${item.operator} ${quoteValue(item.value)}`
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
    `TimeWindow(${timeWindow})`,
    filterLabels.length ? `Filters(${filterLabels.join(' , ')})` : undefined
  ]
    .filter(Boolean)
    .join(' + ')

  return {
    expressionPreview: summaryText,
    filterLabels,
    frequencyLabel: freqLabel,
    metricLabel: atomicLabel,
    sqlPreview,
    timeWindow,
    whereClause
  }
}

export const KnowledgeOperateDerivedLogicBuilder: React.FC<Props> = ({ allFields, atomicMetricOptions, form }) => {
  const atomicMetricId = AForm.useWatch('atomicMetricId', form)
  const calcPeriod = AForm.useWatch('calcPeriod', form)
  const dataFrequency = AForm.useWatch('dataFrequency', form)
  const derivedConditions = AForm.useWatch('derivedConditions', form) as ConditionItem[] | undefined

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
        calcPeriod,
        conditions: derivedConditions,
        dataFrequency
      }),
    [allFields, atomicMetricId, atomicMetricOptions, calcPeriod, dataFrequency, derivedConditions]
  )

  useEffect(() => {
    form.setFieldValue('derivedConditionExpr', result.whereClause)
    form.setFieldValue('expr', result.sqlPreview)
  }, [form, result.sqlPreview, result.whereClause])

  return (
    <>
      <div className="mb-4 border border-gray-200 rounded p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-base font-semibold">业务限定表达式</span>
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

        <div className="mb-3 text-sm font-semibold">表达式定义</div>
        <AForm.List name="derivedConditions">
          {(fields, { add, remove }) => (
            <div className="relative pl-8">
              {fields.length > 1 ? <div className="absolute bottom-6 left-3 top-6 w-1px bg-blue-100" /> : null}
              {fields.map((field, index) => (
                <div
                  className="relative"
                  key={field.key}
                >
                  {index > 0 ? (
                    <AForm.Item
                      className="absolute top-1 mb-0 w-7 -left-8"
                      {...field}
                      name={[field.name, 'logic']}
                    >
                      <ASelect
                        bordered={false}
                        className="knowledge-derived-logic-node"
                        options={DERIVED_LOGIC_OPTIONS}
                        popupMatchSelectWidth={80}
                      />
                    </AForm.Item>
                  ) : null}
                  <div className="grid grid-cols-[180px_140px_1fr_80px] mb-3 items-start gap-x-3">
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
        <div className="mb-3 text-base font-semibold">派生逻辑生成结果</div>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold">
            原子指标：{result.metricLabel}
          </span>
          <span className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold">
            数据频度：{result.frequencyLabel}
          </span>
          <span className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold">
            时间周期：{result.timeWindow}
          </span>
          {result.filterLabels.map(item => (
            <span
              className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold"
              key={item}
            >
              业务限定：{item}
            </span>
          ))}
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
