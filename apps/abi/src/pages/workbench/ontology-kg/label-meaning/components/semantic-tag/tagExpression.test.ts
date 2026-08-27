import { describe, expect, it } from 'vitest'

import { parseTagExpression, serializeTagExpression } from './tagExpression'

describe('tag expression adapter', () => {
  const fields = [
    {
      category: 'dimensions' as const,
      id: 'field-1',
      label: '账号机构',
      sourceName: 'account_org',
      tableName: '账号表'
    }
  ]

  it('serializes the tag expression with the same api structure used by derived indicators', () => {
    const payload = serializeTagExpression(
      [
        {
          groups: [
            {
              conditions: [
                { fieldId: 'field-1', id: 'condition-ui-1', operator: '=', value: 'A' },
                {
                  fieldId: 'field-1',
                  id: 'condition-ui-2',
                  logicWithPrevious: 'OR',
                  operator: 'IS NOT NULL'
                }
              ],
              id: 'group-ui',
              name: '条件分组 1'
            }
          ],
          id: 'layer-ui',
          name: '分层 A'
        }
      ],
      fields
    )

    expect(payload).toEqual({
      layers: [
        {
          expressions: [
            {
              conditions: [
                {
                  conditionId: 'field-1',
                  field: 'account_org',
                  fieldName: '账号机构',
                  operator: 'EQ',
                  operatorName: '等于',
                  value: 'A'
                },
                {
                  conditionId: 'field-1',
                  field: 'account_org',
                  fieldName: '账号机构',
                  operator: 'NOT_NULL',
                  operatorName: '不为空'
                }
              ],
              expressionId: 'group-ui',
              innerLogic: 'OR',
              name: '条件分组 1'
            }
          ],
          groupLogic: 'AND',
          layerName: '分层 A',
          sortOrder: 1
        }
      ]
    })
    const parsed = parseTagExpression(payload)
    expect(parsed[0].name).toBe('分层 A')
    expect(parsed[0].groups[0].name).toBe('条件分组 1')
    expect(parsed[0].groups[0].conditions.map(item => item.fieldId)).toEqual(['field-1', 'field-1'])
    expect(parsed[0].groups[0].conditions[1]).toMatchObject({
      logicWithPrevious: 'OR',
      operator: 'IS NOT NULL'
    })
  })

  it('continues to parse the legacy uri-encoded tag structure', () => {
    const legacy = encodeURIComponent(
      JSON.stringify([
        {
          binName: '历史分层',
          groups: [
            {
              conditions: [{ metric: 'field-1', operator: 'LIKE', value: 'VIP' }],
              name: '历史分组'
            }
          ]
        }
      ])
    )

    expect(parseTagExpression(legacy)[0]).toMatchObject({
      groups: [{ conditions: [{ fieldId: 'field-1', operator: 'LIKE', value: 'VIP' }], name: '历史分组' }],
      name: '历史分层'
    })
  })
})
