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

  it('builds api indicator_templates for composite template params', () => {
    const result = buildKnowledgeCalcLogic({
      atomicMetricMetaMap,
      groupId: 1,
      indicatorClass: 'composite',
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

  it('builds composite cumulative indicator template according to api contract', () => {
    const result = buildKnowledgeCalcLogic({
      accumulateStartDate: '2024-01-12',
      atomicMetricMetaMap,
      cumulativeMetricId: 'pay_amount',
      cumulativeMode: 'DOWN',
      cumulativeTimeRange: 'QUARTER',
      groupId: 1,
      indicatorClass: 'composite',
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

  it('builds composite comparison, volatility and quantile template params', () => {
    const comparison = buildKnowledgeCalcLogic({
      atomicMetricMetaMap,
      compareMetricId: 'pay_amount',
      comparePeriod: 2,
      compareType: 'MOM',
      comparisonOutputType: 'VALUE',
      groupId: 1,
      indicatorClass: 'composite',
      spaceId: 82,
      templateType: 'comparison'
    } as KnowledgeSubmitPayload)
    const volatility = buildKnowledgeCalcLogic({
      atomicMetricMetaMap,
      groupId: 1,
      indicatorClass: 'composite',
      rollingWindowSize: 7,
      spaceId: 82,
      templateType: 'volatility',
      volatilityMethod: 'RANGE',
      volatilityMetricId: 'pay_amount'
    } as KnowledgeSubmitPayload)
    const quantile = buildKnowledgeCalcLogic({
      atomicMetricMetaMap,
      groupId: 1,
      indicatorClass: 'composite',
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

  it('builds composite custom template maps from variable mappings', () => {
    const result = buildKnowledgeCalcLogic({
      atomicMetricMetaMap,
      expr: '(A+B)/C',
      groupId: 1,
      indicatorClass: 'composite',
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

  it('parses api indicator_templates back to composite ratio form fields', () => {
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
        dateRangeMode: 'previous_full',
        dateRangeUnit: 'day',
        dateRangeValue: 30,
        endTime: '18:00',
        isCrossDim: true,
        startTime: '09:00',
        subjectDimensionIds: ['shop-dimension', 'region-dimension'],
        subjectDimensionNameMap: {
          'region-dimension': '区域维度',
          'shop-dimension': '门店维度'
        },
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
      calcPeriod: {
        date_range: { type: 'previous', unit: 'day', value: 30 },
        time_range: { end_time: '18:00', start_time: '09:00', type: 'custom' }
      },
      indicator_templates: {
        layers: [
          {
            expressions: [
              {
                conditions: [
                  { conditionId: 'status', field: 'order_status', operator: 'EQ', value: 'paid' },
                  { conditionId: 'status', field: 'order_status', operator: 'NULL' }
                ],
                expressionId: 'group-1',
                innerLogic: 'OR',
                name: '订单条件'
              }
            ],
            groupLogic: 'AND',
            layerName: '支付分层',
            sortOrder: 1
          }
        ]
      },
      isCrossDim: '是',
      precomputeConfig: { frequency: 'weekly', time: '09:00', weekday: 1 },
      subjectDimension: [
        { dim_id: 'shop-dimension', dim_name: '门店维度' },
        { dim_id: 'region-dimension', dim_name: '区域维度' }
      ],
      statisticalCaliber: {
        dateRangeMode: 'previous_full',
        dateRangeUnit: 'day',
        dateRangeValue: 30,
        isCrossDim: true,
        subjectDimensionId: 'shop-dimension',
        subjectDimensionIds: ['shop-dimension', 'region-dimension'],
        timeRangeType: 'specified'
      }
    })

    expect(parseKnowledgeCalcLogicFormValues(calcLogic)).toMatchObject({
      derivedExpressions: [
        {
          groups: [
            {
              conditions: [
                { fieldId: 'status', operator: '=', value: 'paid' },
                { fieldId: 'status', logicWithPrevious: 'OR', operator: 'IS NULL' }
              ],
              name: '订单条件'
            }
          ],
          name: '支付分层'
        }
      ],
      precomputeConfig: { frequency: 'weekly', time: '09:00', weekday: 1 },
      statisticalCaliber: {
        dateRangeMode: 'previous_full',
        dateRangeUnit: 'day',
        dateRangeValue: 30,
        isCrossDim: true,
        subjectDimensionId: 'shop-dimension',
        subjectDimensionIds: ['shop-dimension', 'region-dimension'],
        subjectDimensionName: '门店维度',
        subjectDimensionNameMap: {
          'region-dimension': '区域维度',
          'shop-dimension': '门店维度'
        }
      }
    })
  })

  it('prioritizes the new calc period, subject dimension and template layers when legacy fields conflict', () => {
    const result = parseKnowledgeCalcLogicFormValues({
      calcPeriod: {
        date_range: { type: 'current_month', unit: null, value: null },
        time_range: { end_time: null, start_time: null, type: 'all_day' }
      },
      expressions: [
        {
          conditions: [{ conditionId: 'legacy-row', field: 'legacy_field', operator: 'EQ', value: 'legacy' }],
          name: '旧表达式'
        }
      ],
      indicator_templates: {
        layers: [
          {
            expressions: [
              {
                conditions: [{ conditionId: 'new-field-id', field: 'new_field', operator: 'EQ', value: 'new' }],
                expressionId: 'new-group',
                innerLogic: 'AND',
                name: '新分组'
              }
            ],
            groupLogic: 'AND',
            layerName: '新分层',
            sortOrder: 1
          }
        ]
      },
      statisticalCaliber: {
        dateRangeMode: 'recent',
        dateRangeUnit: 'day',
        dateRangeValue: 99,
        subjectDimensionId: 'legacy-dim',
        timeRangeType: 'specified'
      },
      isCrossDim: '否',
      subjectDimension: [
        { dim_id: 'new-dim', dim_name: '新主体维度' },
        { dim_id: 'second-dim', dim_name: '第二主体维度' }
      ]
    })

    expect(result).toMatchObject({
      derivedExpressions: [
        {
          groups: [
            {
              conditions: [{ fieldId: 'new-field-id', operator: '=', value: 'new' }],
              name: '新分组'
            }
          ],
          name: '新分层'
        }
      ],
      statisticalCaliber: {
        dateRangeMode: 'this_month',
        isCrossDim: false,
        subjectDimensionId: 'new-dim',
        subjectDimensionIds: ['new-dim', 'second-dim'],
        subjectDimensionName: '新主体维度',
        subjectDimensionNameMap: {
          'new-dim': '新主体维度',
          'second-dim': '第二主体维度'
        },
        timeRangeType: 'allDay'
      }
    })
  })

  it('submits and restores the selected derived aggregation method', () => {
    const calcLogic = buildKnowledgeCalcLogic({
      groupId: 1,
      indicatorClass: 'derived',
      projectionFunc: 'COUNT DISTINCT',
      spaceId: 82
    } as KnowledgeSubmitPayload)

    expect(calcLogic).toMatchObject({
      aggMethod: 'COUNT DISTINCT',
      projectionFunc: 'distinct'
    })
    expect(parseKnowledgeCalcLogicFormValues(calcLogic).projectionFunc).toBe('COUNT DISTINCT')
  })

  it('submits and restores the real custom expression selected by a derived metric', () => {
    const expression = 'SUM(payment_amount) / COUNT(DISTINCT order_id)'
    const calcLogic = buildKnowledgeCalcLogic({
      groupId: 1,
      indicatorClass: 'derived',
      projectionFunc: expression,
      spaceId: 82
    } as KnowledgeSubmitPayload)

    expect(calcLogic).toMatchObject({
      aggMethod: expression,
      projectionFunc: expression
    })
    expect(parseKnowledgeCalcLogicFormValues(calcLogic).projectionFunc).toBe(expression)
  })

  it('keeps an edited one-click atomic metric aggregation type simple', () => {
    const calcLogic = buildKnowledgeCalcLogic({
      atomicAggregationMethods: ['SUM', 'AVG'],
      groupId: 1,
      indicatorClass: 'atomic',
      spaceId: 82,
      techId: [
        {
          agg: { data: ['SUM', 'AVG'], type: 'simple' },
          bizName: '订单明细表_#_支付金额',
          techId: 'field-1',
          techName: 'order_detail.payment_amount'
        }
      ]
    } as KnowledgeSubmitPayload)

    expect(calcLogic).toEqual({
      agg: { data: ['SUM', 'AVG'], type: 'simple' },
      bizeName: '订单明细表_#_支付金额',
      techName: 'order_detail.payment_amount'
    })
  })

  it('builds and restores the custom atomic complex aggregation payload', () => {
    const calcLogic = buildKnowledgeCalcLogic({
      atomicAggregationExpression: 'SUM(payment_amount)',
      groupId: 1,
      indicatorClass: 'atomic',
      spaceId: 82,
      techId: {
        bizName: '订单明细表_#_支付金额',
        techId: 'field-1',
        techName: 'order_detail.payment_amount'
      }
    } as KnowledgeSubmitPayload)

    expect(calcLogic).toEqual({
      agg: { data: 'SUM(payment_amount)', type: 'complex' },
      bizeName: '订单明细表_#_支付金额',
      techName: 'order_detail.payment_amount'
    })
    expect(parseKnowledgeCalcLogicFormValues(calcLogic).atomicAggregationExpression).toBe('SUM(payment_amount)')
  })
})
