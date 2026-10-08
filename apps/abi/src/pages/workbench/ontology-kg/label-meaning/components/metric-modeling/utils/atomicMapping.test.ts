import { describe, expect, it } from 'vitest'

import { buildAtomicMappingPayload } from './atomicMapping'

describe('atomic metric one-click mapping payload', () => {
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
      groupId: 'group-1',
      projectionFunc: 'sum',
      relSchemaId: 'schema-1',
      semanticsGroupId: 'semantic-group-1',
      spaceId: 82,
      techId: [
        {
          agg: { data: ['SUM', 'AVG'], type: 'simple' },
          bizName: '订单明细表_#_支付金额',
          dataType: 'amount',
          fieldType: 'decimal',
          projectionFunc: 'sum',
          techId: 'field-1',
          techName: 'order_detail.payment_amount'
        }
      ]
    })
    expect(payload[0]).not.toHaveProperty('bizName')
    expect(payload[0]).not.toHaveProperty('dataType')
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
    expect(payload.techId[0].dataType).toBe('num')
  })
})
