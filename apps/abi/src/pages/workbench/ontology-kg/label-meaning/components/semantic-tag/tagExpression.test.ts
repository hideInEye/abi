import { describe, expect, it } from 'vitest'

import { parseTagExpression, serializeTagExpression } from './tagExpression'

describe('tag expression adapter', () => {
  it('round-trips the three-level structure without persisting transient ids', () => {
    const encoded = serializeTagExpression([
      {
        groups: [
          {
            conditions: [{ fieldId: 'field-1', id: 'condition-ui', operator: '=', value: 'A' }],
            id: 'group-ui',
            name: '条件分组 1'
          }
        ],
        id: 'layer-ui',
        name: '分层 A'
      }
    ])
    const raw = JSON.parse(decodeURIComponent(encoded))
    expect(raw).toEqual([
      {
        binName: '分层 A',
        groups: [{ conditions: [{ metric: 'field-1', operator: '=', value: 'A' }], name: '条件分组 1' }]
      }
    ])
    expect(parseTagExpression(encoded)[0]).toMatchObject({
      groups: [{ conditions: [{ fieldId: 'field-1' }], name: '条件分组 1' }],
      name: '分层 A'
    })
  })
})
