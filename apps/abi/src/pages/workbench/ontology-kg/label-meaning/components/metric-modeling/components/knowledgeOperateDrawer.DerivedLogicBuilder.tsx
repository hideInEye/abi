import { CheckCircleOutlined, MinusOutlined, PlusOutlined, ProfileOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import React from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'

import { DATA_FREQUENCY_OPTIONS, DERIVED_OPERATOR_OPTIONS } from '../constants/metricModeling.constants'
import type { KnowledgeDerivedCondition, KnowledgeDerivedExpression, KnowledgeFormValues, KnowledgeTechField } from '../types/metricModeling.types'

interface AtomicMetricOption {
  label: string
  value: string
}

interface Props {
  readonly allFields: KnowledgeTechField[]
  readonly atomicMetricOptions: AtomicMetricOption[]
  readonly form: FormInstance<KnowledgeFormValues>
}

const defaultCondition: KnowledgeDerivedCondition = {
  metric: '',
  operator: '=',
  value: ''
}

function createDefaultExpression(): KnowledgeDerivedExpression {
  return {
    conditions: [{ ...defaultCondition }],
    innerLogic: 'AND'
  }
}

function quoteValue(value?: string) {
  const text = String(value ?? '').trim()
  if (!text) {
    return "''"
  }
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return text
  }
  return `'${text}'`
}

function normalizeExpressions(expressions?: KnowledgeDerivedExpression[], fallbackConditions?: KnowledgeDerivedCondition[]) {
  if (expressions?.length) {
    return expressions.map(item => ({
      ...item,
      conditions: item.conditions?.length ? item.conditions : [{ ...defaultCondition }],
      innerLogic: item.innerLogic === 'OR' ? 'OR' : 'AND'
    }))
  }

  if (fallbackConditions?.length) {
    return [
      {
        conditions: fallbackConditions,
        innerLogic: fallbackConditions.some(item => item.logic === 'OR') ? 'OR' : 'AND'
      }
    ]
  }

  return [createDefaultExpression()]
}

function buildDerivedResult({
  allFields,
  atomicMetricOptions,
  calcPeriod,
  expressions,
  updateFrequency,
  techId
}: {
  allFields: KnowledgeTechField[]
  atomicMetricOptions: AtomicMetricOption[]
  calcPeriod?: string | number
  expressions?: KnowledgeDerivedExpression[]
  updateFrequency?: string
  techId?: string | number
}) {
  const atomicLabel = atomicMetricOptions.find(item => String(item.value) === String(techId || ''))?.label || '原子指标'
  const freqLabel = DATA_FREQUENCY_OPTIONS.find(item => String(item.value) === String(updateFrequency || ''))?.label || '周期'
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

  const expressionGroups = normalizeExpressions(expressions)
    .map((expression, expressionIndex) => {
      const validConditions = (expression.conditions || [])
        .map(item => ({
          metric: String(item?.metric || '').trim(),
          operator: String(item?.operator || '=').trim(),
          value: String(item?.value ?? '').trim()
        }))
        .filter(item => item.metric && item.operator)

      return {
        conditions: validConditions,
        innerLogic: expression.innerLogic === 'OR' ? 'OR' : 'AND',
        name: expression.name || `表达式${expressionIndex + 1}`
      }
    })
    .filter(item => item.conditions.length)

  const whereClause = expressionGroups
    .map(group => {
      const lines = group.conditions.map((item, index) => {
        const metricField = sqlFieldMap.get(item.metric) || item.metric
        const prefix = index === 0 ? 'WHERE' : group.innerLogic
        return `${prefix} ${metricField} ${item.operator} ${quoteValue(item.value)}`
      })
      return `${group.name}\n${lines.join('\n')}`
    })
    .join('\n\n')
  const sqlPreview = `SUM(${atomicLabel})${whereClause ? `\n${whereClause}` : ''}`

  const filterLabels = expressionGroups.flatMap(group =>
    group.conditions.map(item => {
      const metricLabel = fieldMap.get(item.metric) || item.metric
      return `${group.name}：${metricLabel} ${item.operator} ${item.value}`
    })
  )

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
  const techId = AForm.useWatch('techId', form)
  const calcPeriod = AForm.useWatch('calcPeriod', form)
  const updateFrequency = AForm.useWatch('updateFrequency', form)
  const derivedExpressions = AForm.useWatch('derivedExpressions', form) as KnowledgeDerivedExpression[] | undefined

  useEffect(() => {
    const current = form.getFieldValue('derivedExpressions') as KnowledgeDerivedExpression[] | undefined
    if (current?.length) {
      return
    }
    const legacyConditions = form.getFieldValue('derivedConditions') as KnowledgeDerivedCondition[] | undefined
    form.setFieldValue('derivedExpressions', normalizeExpressions(current, legacyConditions))
  }, [form])

  const fieldOptions = useMemo(
    () =>
      allFields.map(item => ({
        label: `${item.bizName || item.fieldName || item.name || item.techId}（${item.fieldName || item.originName || item.name || item.techId}）`,
        value: String(item.techId || item.fieldName || item.name || '')
      })),
    [allFields]
  )

  const result = useMemo(
    () =>
      buildDerivedResult({
        allFields,
        atomicMetricOptions,
        calcPeriod,
        expressions: derivedExpressions,
        updateFrequency,
        techId
      }),
    [allFields, atomicMetricOptions, calcPeriod, updateFrequency, derivedExpressions, techId]
  )

  useEffect(() => {
    form.setFieldValue('derivedConditionExpr', result.whereClause)
    form.setFieldValue('expr', result.sqlPreview)
  }, [form, result.sqlPreview, result.whereClause])

  function toggleExpressionLogic(expressionName: number) {
    const currentLogic = form.getFieldValue(['derivedExpressions', expressionName, 'innerLogic']) === 'OR' ? 'OR' : 'AND'
    form.setFieldValue(['derivedExpressions', expressionName, 'innerLogic'], currentLogic === 'OR' ? 'AND' : 'OR')
  }

  return (
    <>
      <div className="mb-4 border border-gray-200 rounded p-4">
        <OntologyFormSectionTitle icon={<ProfileOutlined />}>表达式定义</OntologyFormSectionTitle>
        <AForm.List name="derivedExpressions">
          {(expressionFields, { add: addExpression, remove: removeExpression }) => (
            <div className="flex flex-col gap-4">
              {expressionFields.map((expressionField, expressionIndex) => {
                const expressionLogic = derivedExpressions?.[expressionField.name]?.innerLogic === 'OR' ? 'OR' : 'AND'
                const logicLabel = expressionLogic === 'OR' ? '或' : '且'

                return (
                  <div className="rounded-xl border border-gray-100 bg-white px-6 py-5" key={expressionField.key}>
                    <div className="mb-5 flex items-center justify-between">
                      <div className="min-w-36 rounded-md bg-gray-50 px-5 py-3 text-lg font-semibold text-gray-900">表达式{expressionIndex + 1}</div>
                      <AButton danger type="text" onClick={() => removeExpression(expressionField.name)}>
                        删除表达式
                      </AButton>
                    </div>

                    <AForm.Item hidden initialValue="AND" name={[expressionField.name, 'innerLogic']}>
                      <AInput />
                    </AForm.Item>

                    <AForm.List name={[expressionField.name, 'conditions']}>
                      {(conditionFields, { add: addCondition, remove: removeCondition }) => (
                        <div className="relative pl-16">
                          {conditionFields.length > 1 ? (
                            <>
                              <div className="absolute bottom-20 left-8 top-10 w-px bg-blue-100" />
                              <button
                                className="absolute left-[17px] top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border-2 border-blue-200 bg-white text-base font-semibold text-blue-600 shadow-sm transition hover:border-blue-400 hover:text-blue-700"
                                type="button"
                                onClick={() => toggleExpressionLogic(expressionField.name)}
                              >
                                {logicLabel}
                              </button>
                            </>
                          ) : null}

                          {conditionFields.map(conditionField => (
                            <div className="relative" key={conditionField.key}>
                              <div className="absolute -left-8 top-6 h-px w-8 bg-blue-100" />
                              <div className="mb-3 grid grid-cols-[minmax(220px,1fr)_140px_minmax(240px,1.4fr)_88px] items-start gap-x-3">
                                <AForm.Item {...conditionField} name={[conditionField.name, 'metric']} rules={[{ message: '请选择字段', required: true }]}>
                                  <ASelect showSearch options={fieldOptions} placeholder="请选择字段" />
                                </AForm.Item>

                                <AForm.Item {...conditionField} name={[conditionField.name, 'operator']} rules={[{ message: '请选择操作符', required: true }]}>
                                  <ASelect options={DERIVED_OPERATOR_OPTIONS} placeholder="请选择操作符" />
                                </AForm.Item>

                                <AForm.Item className="m-0" {...conditionField} name={[conditionField.name, 'value']}>
                                  <AInput placeholder="请输入值" />
                                </AForm.Item>

                                <div className="flex gap-2">
                                  <AButton icon={<MinusOutlined />} onClick={() => removeCondition(conditionField.name)} />
                                  <AButton icon={<PlusOutlined />} onClick={() => addCondition({ ...defaultCondition }, conditionField.name + 1)} />
                                </div>
                              </div>
                            </div>
                          ))}

                          <AButton className="mt-2 pl-0" icon={<PlusOutlined />} type="link" onClick={() => addCondition({ ...defaultCondition })}>
                            添加一个分支
                          </AButton>
                        </div>
                      )}
                    </AForm.List>
                  </div>
                )
              })}

              <AButton icon={<PlusOutlined />} onClick={() => addExpression(createDefaultExpression())}>
                新增表达式
              </AButton>
            </div>
          )}
        </AForm.List>
      </div>

      <div className="mb-4 border border-gray-200 rounded bg-gray-50 p-4">
        <OntologyFormSectionTitle icon={<CheckCircleOutlined />}>派生逻辑生成结果</OntologyFormSectionTitle>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold">原子指标：{result.metricLabel}</span>
          <span className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold">数据频度：{result.frequencyLabel}</span>
          <span className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold">时间周期：{result.timeWindow}</span>
          {result.filterLabels.map(item => (
            <span className="border border-gray-200 rounded bg-white px-3 py-2 text-sm font-semibold" key={item}>
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
