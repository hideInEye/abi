import { describe, expect, it } from 'vitest'

import { buildAtomicMappingPayload, getDuplicateAtomicMappingName } from './atomicMapping'

describe('atomic metric one-click mapping payload', () => {
  it('rejects duplicate names within the selected batch after trimming', () => {
    expect(getDuplicateAtomicMappingName([{ indicatorName: '实付金额' }, { indicatorName: ' 实付金额 ' }])).toBe('实付金额')
    expect(getDuplicateAtomicMappingName([{ indicatorName: '实付金额' }, { indicatorName: '退款金额' }])).toBeUndefined()
  })
  it('keeps the existing object-array request and submits every selected aggregation method', () => {
    const payload = buildAtomicMappingPayload(
      [
        {
          aggregationMethods: ['SUM', 'AVG'],
          alias: '支付金额',
          bizName: '支付金额',
          description: '订单支付金额',
          englishName: 'payment_amount',
          fieldType: 'decimal',
          indicatorName: ' 实付金额指标 ',
          dataType: 'amount',
          raw: { techId: 'field-1' },
          tableBizName: '订单明细表',
          tableTechName: 'order_detail'
        }
      ],
      {
        groupId: 'group-1',
        relSchemaId: 'schema-1',
        semanticsGroupId: 'semantic-group-1',
        spaceId: 82
      }
    )

    expect(payload).toHaveLength(1)
    expect(payload[0]).toMatchObject({
      bizName: '实付金额指标',
      dataType: 'amount',
      groupId: 'group-1',
      projectionFunc: 'sum',
      relSchemaId: 'schema-1',
      semanticsGroupId: 'semantic-group-1',
      spaceId: 82,
      techId: [
        {
          agg: { data: ['SUM', 'AVG'], type: 'simple' },
          bizName: '订单明细表_#_支付金额',
          fieldType: 'decimal',
          projectionFunc: 'sum',
          techId: 'field-1',
          techName: 'order_detail.payment_amount'
        }
      ]
    })
  })

  it('uses the first aggregation method for the legacy compatibility field', () => {
    const [payload] = buildAtomicMappingPayload(
      [
        {
          aggregationMethods: ['COUNT DISTINCT', 'COUNT'],
          alias: '客户数',
          bizName: '客户数',
          description: '',
          englishName: 'customer_id',
          fieldType: 'string',
          indicatorName: '客户去重数',
          dataType: 'num',
          raw: { techId: 'field-2' },
          tableBizName: '订单明细表',
          tableTechName: 'order_detail'
        }
      ],
      { relSchemaId: 'schema-1', spaceId: 82 }
    )

    expect(payload.projectionFunc).toBe('distinct')
    expect(payload.techId[0].projectionFunc).toBe('distinct')
  })
})
