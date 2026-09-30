import { describe, expect, it } from 'vitest'

import { parseSchemaFieldsFromModelDetail } from './schemaFields'

describe('parseSchemaFieldsFromModelDetail', () => {
  it('classifies identifiers, dates, dimensions and measures without the drawer module', () => {
    const fields = parseSchemaFieldsFromModelDetail(JSON.stringify({
      dimensions: [
        { fieldName: 'created_at', fieldType: 'timestamp', type: 'datetime' },
        { alias: '地区', fieldName: 'region', fieldType: 'string', type: 'category' },
      ],
      identifiers: [{ fieldDesc: '订单主键', fieldName: 'order_id', fieldType: 'string' }],
      measures: [{ bizName: '收入', fieldName: 'revenue', fieldType: 'decimal' }],
    }))

    expect(fields.map(field => [field.name, field.semantic])).toEqual([
      ['order_id', 'pk'],
      ['created_at', 'date'],
      ['region', 'dim'],
      ['revenue', 'metric'],
    ])
    expect(fields[2]).toMatchObject({ alias: '地区', semLabel: '维度' })
  })

  it('returns an empty list for invalid or non-object JSON', () => {
    expect(parseSchemaFieldsFromModelDetail('{broken')).toEqual([])
    expect(parseSchemaFieldsFromModelDetail('[]')).toEqual([])
  })
})
