import { describe, expect, it } from 'vitest'

import type { KnowledgeSubmitPayload } from '../types/metricModeling.types'

import { buildKnowledgeCalcLogic, parseKnowledgeCalcLogicFormValues } from './knowledgeSubmitPayload'

const atomicMetricMetaMap = {
  order_count: {
    field: 'ORDER_COUNT',
    fieldName: '下单用户数',
    id: 101,
    value: 'order_count'
  },
  pay_amount: {
    field: 'PAY_AMOUNT',
    fieldName: '支付金额',
    id: 103,
    value: 'pay_amount'
  },
  visit_count: {
    field: 'VISIT_COUNT',
    fieldName: '访问用户数',
    id: 102,
    value: 'visit_count'
  }
}

describe('buildKnowledgeCalcLogic', () => {
  it('migrates legacy derived conditions into nested api expression groups', () => {
    const result = buildKnowledgeCalcLogic({
      derivedExpressionFieldMetaMap: {
        order_status: {
          field: 'order_status',
          fieldName: '订单状态',
          value: 'order_status'
        },
        pay_channel: {
          field: 'pay_channel',
          fieldName: '支付渠道',
          value: 'pay_channel'
        }
      },
      derivedExpressions: [
        {
          conditions: [
            { metric: 'order_status', operator: '=', value: '已支付' },
            { metric: 'pay_channel', operator: '=', value: '线上' },
            { metric: 'pay_channel', operator: '=', value: '线下' }
          ],
          innerLogic: 'AND'
        },
        {
          conditions: [{ metric: 'order_status', operator: '=', value: '退款' }],
          innerLogic: 'AND'
        }
      ],
      groupId: 1,
      indicatorClass: 'derived',
      spaceId: 82
    } as KnowledgeSubmitPayload)

    expect(result).not.toHaveProperty('derivedExpressions')
    expect(result.expressions).toEqual([
      {
        expressionId: 'exp_1',
        groups: [
          {
            conditions: [
              {
                conditionId: 'cond_1_1_1',
                field: 'order_status',
                fieldName: '订单状态',
                operator: 'EQ',
                operatorName: '等于',
                value: '已支付'
              },
              {
                conditionId: 'cond_1_1_2',
                field: 'pay_channel',
                fieldName: '支付渠道',
                logicWithPrevious: 'AND',
                operator: 'EQ',
                operatorName: '等于',
                value: '线上'
              },
              {
                conditionId: 'cond_1_1_3',
                field: 'pay_channel',
                fieldName: '支付渠道',
                logicWithPrevious: 'AND',
                operator: 'EQ',
                operatorName: '等于',
                value: '线下'
              }
            ],
            groupId: 'group_1_1',
            name: '条件分组 1'
          }
        ],
        name: '表达式1'
      },
      {
        expressionId: 'exp_2',
        groups: [
          {
            conditions: [
              {
                conditionId: 'cond_2_1_1',
                field: 'order_status',
                fieldName: '订单状态',
                operator: 'EQ',
                operatorName: '等于',
                value: '退款'
              }
            ],
            groupId: 'group_2_1',
            name: '条件分组 1'
          }
        ],
        name: '表达式2'
      }
    ])
  })

  it('builds api indicator_templates for derivative template params', () => {
    const result = buildKnowledgeCalcLogic({
      atomicMetricMetaMap,
      groupId: 1,
      indicatorClass: 'derivative',
      ratioDenominatorId: 'visit_count',
      ratioNumeratorId: 'order_count',
      ratioPrecision: '2',
      spaceId: 82,
      templateType: 'ratio',
      thresholdMax: '1',
      thresholdMin: '0'
    } as KnowledgeSubmitPayload)

    expect(result).not.toHaveProperty('templateType')
    expect(result).not.toHaveProperty('ratioNumeratorId')
    expect(result.indicator_templates).toEqual({
      proportion_indicator: {
        description: '衡量部分与整体的关系，如转化率、成功率',
        name: '占比类',
        parameters: [
          {
            description: '分子指标ID',
            field: 'ORDER_COUNT',
            id: '101',
            key: 'numerator_id',
            type: 'string'
          },
          {
            description: '分母指标ID',
            field: 'VISIT_COUNT',
            id: '102',
            key: 'denominator_id',
            type: 'string'
          },
          {
            description: '计算精度，代表保留小数位数',
            key: 'calc_precision',
            options: [0, 1, 2, 3, 4],
            type: 'enum',
            value: 2
          },
          {
            description: '阈值范围 [min, max]',
            key: 'threshold_range',
            type: 'array',
            value: ['0', '1']
          }
        ]
      }
    })
  })

  it('builds derivative cumulative indicator template according to api contract', () => {
    const result = buildKnowledgeCalcLogic({
      accumulateStartDate: '2024-01-12',
      atomicMetricMetaMap,
      cumulativeMetricId: 'pay_amount',
      cumulativeMode: 'DOWN',
      cumulativeTimeRange: 'QUARTER',
      groupId: 1,
      indicatorClass: 'derivative',
      spaceId: 82,
      templateType: 'cumulative'
    } as KnowledgeSubmitPayload)

    expect(result).toEqual({
      indicator_templates: {
        cumulative_indicator: {
          description: '反映时间维度上的总量变化，如累计销售额',
          name: '累积类',
          parameters: [
            {
              description: '原子指标ID',
              field: 'PAY_AMOUNT',
              id: '103',
              key: 'base_indicator_id',
              type: 'string'
            },
            {
              description: '时间范围',
              key: 'time_range',
              options: ['YEAR', 'QUARTER', 'MONTH', 'WEEK'],
              type: 'enum',
              value: 'QUARTER'
            },
            {
              description: '累加起点日期',
              key: 'accumulation_start',
              type: 'date',
              value: '2024-01-12'
            },
            {
              description: '累加方式',
              key: 'accumulation_type',
              type: 'string',
              value: 'DOWN'
            }
          ]
        }
      }
    })
  })

  it('builds derivative comparison, volatility and quantile template params', () => {
    const comparison = buildKnowledgeCalcLogic({
      atomicMetricMetaMap,
      compareMetricId: 'pay_amount',
      comparePeriod: 2,
      compareType: 'MOM',
      comparisonOutputType: 'VALUE',
      groupId: 1,
      indicatorClass: 'derivative',
      spaceId: 82,
      templateType: 'comparison'
    } as KnowledgeSubmitPayload)
    const volatility = buildKnowledgeCalcLogic({
      atomicMetricMetaMap,
      groupId: 1,
      indicatorClass: 'derivative',
      rollingWindowSize: 7,
      spaceId: 82,
      templateType: 'volatility',
      volatilityMethod: 'RANGE',
      volatilityMetricId: 'pay_amount'
    } as KnowledgeSubmitPayload)
    const quantile = buildKnowledgeCalcLogic({
      atomicMetricMetaMap,
      groupId: 1,
      indicatorClass: 'derivative',
      percentileValue: '0.9',
      spaceId: 82,
      techId: 'pay_amount',
      templateType: 'percentile'
    } as KnowledgeSubmitPayload)

    expect(comparison.indicator_templates).toMatchObject({
      comparison_indicator: {
        parameters: [
          { field: 'PAY_AMOUNT', id: '103', key: 'base_indicator_id' },
          { key: 'comparison_type', value: 'MoM' },
          { key: 'compare_cycle_num', value: 2 },
          { key: 'output_format', value: 'absolute_diff' }
        ]
      }
    })
    expect(volatility.indicator_templates).toMatchObject({
      volatility_indicator: {
        parameters: [
          { field: 'PAY_AMOUNT', id: '103', key: 'base_indicator_id' },
          { key: 'method', value: 'Range' },
          { key: 'window_size', value: 7 }
        ]
      }
    })
    expect(quantile.indicator_templates).toMatchObject({
      quantile_indicator: {
        parameters: [
          { field: 'PAY_AMOUNT', id: '103', key: 'base_indicator_id' },
          { key: 'quantile_val', value: 0.9 }
        ]
      }
    })
    expect(quantile).not.toHaveProperty('techId')
  })

  it('builds derivative custom template maps from variable mappings', () => {
    const result = buildKnowledgeCalcLogic({
      atomicMetricMetaMap,
      expr: '(A+B)/C',
      groupId: 1,
      indicatorClass: 'derivative',
      spaceId: 82,
      templateType: 'custom',
      variableMappings: [
        { indicatorId: 'order_count', variableName: 'A' },
        { indicatorId: 'visit_count', variableName: 'B' }
      ]
    } as KnowledgeSubmitPayload)

    expect(result.indicator_templates).toMatchObject({
      custom_indicator: {
        parameters: [
          { key: 'formula_expression', value: '(A+B)/C' },
          { key: 'input_id_map', value: { A: '101', B: '102' } },
          { key: 'input_indicators_map', value: { A: 'ORDER_COUNT', B: 'VISIT_COUNT' } }
        ]
      }
    })
  })

  it('migrates legacy api expressions back to nested form groups', () => {
    const result = parseKnowledgeCalcLogicFormValues({
      expressions: [
        {
          conditions: [
            {
              conditionId: 'cond_1_1',
              field: 'channel_type',
              fieldName: '渠道维',
              operator: 'EQ',
              operatorName: '等于',
              value: 'online'
            },
            {
              conditionId: 'cond_1_2',
              field: 'customer_type',
              fieldName: '客户维',
              operator: 'IN',
              operatorName: '包含',
              value: 'retail'
            }
          ],
          expressionId: 'exp_1',
          innerLogic: 'OR',
          name: '线上渠道过滤'
        }
      ],
      projectionFunc: 'sum'
    })

    expect(result).toMatchObject({
      derivedExpressions: [
        {
          groups: [
            {
              conditions: [
                {
                  fieldId: 'channel_type',
                  operator: '=',
                  value: 'online'
                },
                {
                  fieldId: 'customer_type',
                  logicWithPrevious: 'OR',
                  operator: 'LIKE',
                  value: 'retail'
                }
              ],
              name: '条件分组 1'
            }
          ],
          name: '线上渠道过滤'
        }
      ],
      projectionFunc: 'sum'
    })
  })

  it('parses api indicator_templates back to derivative ratio form fields', () => {
    const result = parseKnowledgeCalcLogicFormValues({
      indicator_templates: {
        proportion_indicator: {
          description: '衡量部分与整体的关系，如转化率、成功率',
          name: '占比类',
          parameters: [
            {
              description: '分子指标ID',
              field: 'ORDER_COUNT',
              id: '101',
              key: 'numerator_id',
              type: 'string'
            },
            {
              description: '分母指标ID',
              field: 'VISIT_COUNT',
              id: '102',
              key: 'denominator_id',
              type: 'string'
            },
            {
              description: '计算精度，代表保留小数位数',
              key: 'calc_precision',
              options: [0, 1, 2, 3, 4],
              type: 'enum',
              value: 2
            },
            {
              description: '阈值范围 [min, max]',
              key: 'threshold_range',
              type: 'array',
              value: ['0', '1']
            }
          ]
        }
      }
    })

    expect(result).toMatchObject({
      ratioDenominatorId: '102',
      ratioNumeratorId: '101',
      ratioPrecision: '2',
      templateType: 'ratio',
      thresholdMax: '1',
      thresholdMin: '0'
    })
  })
  it('round-trips nested groups, precompute config and statistical caliber', () => {
    const calcLogic = buildKnowledgeCalcLogic({
      derivedExpressionFieldMetaMap: {
        status: { field: 'order_status', fieldName: '订单状态', value: 'status' }
      },
      derivedExpressions: [
        {
          groups: [
            {
              conditions: [
                { fieldId: 'status', id: 'condition-1', operator: '=', value: 'paid' },
                { fieldId: 'status', id: 'condition-2', logicWithPrevious: 'OR', operator: 'IS NULL' }
              ],
              id: 'group-1',
              name: '订单条件'
            }
          ],
          id: 'layer-1',
          name: '支付分层'
        }
      ],
      groupId: 1,
      indicatorClass: 'derived',
      precomputeConfig: { frequency: 'weekly', time: '09:00', weekday: 1 },
      spaceId: 82,
      statisticalCaliber: {
        dateRangeUnit: 'day',
        dateRangeValue: 30,
        endTime: '18:00',
        startTime: '09:00',
        subjectDimensionId: 'shop-dimension',
        timeRangeType: 'specified'
      }
    } as KnowledgeSubmitPayload)

    expect(calcLogic).toMatchObject({
      expressions: [
        {
          expressionId: 'layer-1',
          groups: [
            {
              conditions: [
                { conditionId: 'condition-1', field: 'order_status', operator: 'EQ', value: 'paid' },
                { conditionId: 'condition-2', field: 'order_status', logicWithPrevious: 'OR', operator: 'IS_NULL' }
              ],
              groupId: 'group-1',
              name: '订单条件'
            }
          ],
          name: '支付分层'
        }
      ],
      precomputeConfig: { frequency: 'weekly', time: '09:00', weekday: 1 },
      statisticalCaliber: {
        dateRangeUnit: 'day',
        dateRangeValue: 30,
        subjectDimensionId: 'shop-dimension',
        timeRangeType: 'specified'
      }
    })

    expect(parseKnowledgeCalcLogicFormValues(calcLogic)).toMatchObject({
      derivedExpressions: [
        {
          groups: [
            {
              conditions: [
                { fieldId: 'order_status', operator: '=', value: 'paid' },
                { fieldId: 'order_status', logicWithPrevious: 'OR', operator: 'IS NULL' }
              ],
              name: '订单条件'
            }
          ],
          name: '支付分层'
        }
      ],
      precomputeConfig: { frequency: 'weekly', time: '09:00', weekday: 1 },
      updateFrequency: 'weekly'
    })
  })
})
