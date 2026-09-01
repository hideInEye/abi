import { describe, expect, it } from 'vitest'

import {
  buildApiDerivedIndicatorTemplates,
  parseApiDerivedIndicatorTemplates
} from './derivedIndicatorTemplateAdapter'

describe('derived indicator template adapter', () => {
  it('maps all ten supported operators to the backend codes', () => {
    const mappings = [
      ['=', 'EQ'],
      ['!=', 'NE'],
      ['>', 'GT'],
      ['>=', 'GE'],
      ['<', 'LT'],
      ['<=', 'LE'],
      ['LIKE', 'IN'],
      ['NOT LIKE', 'NOT_IN'],
      ['IS NULL', 'NULL'],
      ['IS NOT NULL', 'NOT_NULL']
    ] as const
    const result = buildApiDerivedIndicatorTemplates(
      [
        {
          groups: [
            {
              conditions: mappings.map(([operator], index) => ({
                fieldId: 'field-1',
                id: `condition-${index}`,
                ...(index ? { logicWithPrevious: 'AND' as const } : {}),
                operator,
                value: 'value'
              })),
              id: 'group-1',
              name: '全部运算符'
            }
          ],
          id: 'layer-1',
          name: '默认分层'
        }
      ],
      { 'field-1': { field: 'status', fieldName: '状态', value: 'field-1' } }
    )

    expect(result?.layers[0].expressions[0].conditions.map(item => item.operator)).toEqual(
      mappings.map(([, apiOperator]) => apiOperator)
    )
    expect(result?.layers[0].expressions[0].conditions.at(-2)).not.toHaveProperty('value')
    expect(result?.layers[0].expressions[0].conditions.at(-1)).not.toHaveProperty('value')
  })

  it('maps layers, uniform logic, semantic field metadata and operators', () => {
    const result = buildApiDerivedIndicatorTemplates(
      [
        {
          groups: [
            {
              conditions: [
                { fieldId: 'field-1', id: 'ui-row-1', operator: '=', value: 100 },
                {
                  fieldId: 'field-1',
                  id: 'ui-row-2',
                  logicWithPrevious: 'OR',
                  operator: 'IS NOT NULL'
                }
              ],
              id: 'group-1',
              name: '金额条件'
            }
          ],
          id: 'ui-layer-1',
          name: '高价值'
        }
      ],
      {
        'field-1': { field: 'pay_amount', fieldName: '支付金额', value: 'field-1' }
      }
    )

    expect(result).toEqual({
      layers: [
        {
          expressions: [
            {
              conditions: [
                {
                  conditionId: 'field-1',
                  field: 'pay_amount',
                  fieldName: '支付金额',
                  operator: 'EQ',
                  operatorName: '等于',
                  value: 100
                },
                {
                  conditionId: 'field-1',
                  field: 'pay_amount',
                  fieldName: '支付金额',
                  operator: 'NOT_NULL',
                  operatorName: '不为空'
                }
              ],
              expressionId: 'group-1',
              innerLogic: 'OR',
              name: '金额条件'
            }
          ],
          groupLogic: 'AND',
          layerName: '高价值',
          sortOrder: 1
        }
      ]
    })
  })

  it('prioritizes api layers on read, sorts them and creates independent ui row ids', () => {
    const result = parseApiDerivedIndicatorTemplates({
      layers: [
        { expressions: [], groupLogic: 'AND', layerName: '第二层', sortOrder: 2 },
        {
          expressions: [
            {
              conditions: [
                { conditionId: 'field-1', field: 'status', fieldName: '状态', operator: 'IN', value: ['A', 'B'] },
                { conditionId: 'field-1', field: 'status', fieldName: '状态', operator: 'NULL' }
              ],
              expressionId: 'group-1',
              innerLogic: 'OR',
              name: '状态条件'
            }
          ],
          groupLogic: 'AND',
          layerName: '第一层',
          sortOrder: 1
        }
      ]
    })

    expect(result?.map(item => item.name)).toEqual(['第一层', '第二层'])
    expect(result?.[0].groups?.[0].conditions).toMatchObject([
      { fieldId: 'field-1', operator: 'LIKE', value: 'A,B' },
      { fieldId: 'field-1', logicWithPrevious: 'OR', operator: 'IS NULL', value: '' }
    ])
    expect(result?.[0].groups?.[0].conditions?.[0].id).not.toBe(result?.[0].groups?.[0].conditions?.[1].id)
  })
})
