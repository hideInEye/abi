import { describe, expect, it, vi } from 'vitest'

import { buildDimensionBatchCreatePayload, buildDimensionBatchRows, buildFormValues, mapDimensionFromApi } from './dimensionModeling.mapper'

describe('dimensionModeling mapper', () => {
  it('keeps all time granularities from typeParams when editing time dimensions', () => {
    const item = mapDimensionFromApi({
      bizName: '测试时间维',
      dimId: 1,
      dimType: 'time',
      fieldType: 'datetime',
      techName: 'test_time',
      typeParams: '{"timeGranularity":["month","week","day"]}'
    })

    expect(buildFormValues(item).timeGranularity).toEqual(['month', 'week', 'day'])
  })

  it('keeps API levelPath for the dimension list path display', () => {
    const item = mapDimensionFromApi({
      bizName: '地区',
      dimId: 2,
      levelPath: '客户/地区',
      path: '旧目录'
    })

    expect(item.levelPath).toBe('客户/地区')
    expect(item.path).toBe('旧目录')
  })

  it('keeps API createBy for the dimension card creator display', () => {
    const item = mapDimensionFromApi({
      bizName: '地区',
      createBy: 'admin',
      dimId: 3
    })

    expect(item.createBy).toBe('admin')
  })

  it('builds batch rows from dimension and identifier fields only', () => {
    const rows = buildDimensionBatchRows([
      {
        bizName: '交易明细表',
        dbName: '',
        dbType: '',
        drillDim: null,
        filters: null,
        groupId: 9,
        modelDetail: JSON.stringify({
          dimensions: [
            { bizName: '收货城市', fieldName: 'receive_city', techId: 'field_1', type: 'string' },
            { bizName: '交易日期', fieldName: 'trade_date', techId: 'field_2', type: 'datetime' }
          ],
          identifiers: [
            { bizName: '订单编号', fieldName: 'order_no', techId: 'field_3', type: 'varchar' }
          ],
          measures: [
            { bizName: '支付金额', fieldName: 'pay_amount', techId: 'field_4', type: 'decimal' }
          ]
        }),
        relViewId: 'view-1',
        remark: '',
        schemaId: 'schema-1',
        sourceId: '',
        spaceId: '82',
        status: '1',
        techName: 'trade_detail'
      }
    ])

    expect(rows.map(item => item.field.fieldName)).toEqual(['receive_city', 'trade_date', 'order_no'])
    expect(rows.map(item => item.field.techId)).toEqual(['field_1', 'field_2', 'field_3'])
    expect(rows.find(item => item.field.fieldName === 'pay_amount')).toBeUndefined()
    expect(rows.map(item => item.dimType)).toEqual(['std', 'time', 'std'])
    expect(rows[0]).toMatchObject({
      relSchemaId: 'schema-1',
      relViewId: 'view-1',
      semanticSchemaName: '交易明细表',
      semanticsGroupId: 9
    })
  })

  it('marks existing batch rows disabled by englishName or related field key', () => {
    const rows = buildDimensionBatchRows(
      [
        {
          bizName: '交易明细表',
          dbName: '',
          dbType: '',
          drillDim: null,
          filters: null,
          groupId: 9,
          modelDetail: JSON.stringify({
            dimensions: [
              { bizName: '收货城市', techId: 'receive_city', type: 'string' },
              { bizName: '支付方式', techId: 'pay_method', type: 'string' }
            ]
          }),
          relViewId: 'view-1',
          remark: '',
          schemaId: 'schema-1',
          sourceId: '',
          spaceId: '82',
          status: '1',
          techName: 'trade_detail'
        }
      ],
      [
        {
          dimType: 'std',
          englishName: 'receive_city',
          id: 1,
          owner: '',
          path: '',
          relatedFields: [],
          status: 1,
          updateTime: '',
          zhName: '收货城市'
        },
        {
          dimType: 'std',
          englishName: 'other',
          id: 2,
          owner: '',
          path: '',
          relatedFields: [{ bizName: '支付方式', key: 'pay_method', techId: 'pay_method' }],
          status: 1,
          updateTime: '',
          zhName: '支付方式'
        }
      ]
    )

    expect(rows.map(item => item.disabled)).toEqual([true, true])
  })

  it('marks existing batch rows disabled by fieldName', () => {
    const rows = buildDimensionBatchRows(
      [
        {
          bizName: '交易明细表',
          dbName: '',
          dbType: '',
          drillDim: null,
          filters: null,
          groupId: 9,
          modelDetail: JSON.stringify({
            dimensions: [
              { bizName: '收货城市', fieldName: 'receive_city', techId: 'field_1', type: 'string' }
            ]
          }),
          relViewId: 'view-1',
          remark: '',
          schemaId: 'schema-1',
          sourceId: '',
          spaceId: '82',
          status: '1',
          techName: 'trade_detail'
        }
      ],
      [
        {
          dimType: 'std',
          englishName: 'other',
          id: 1,
          owner: '',
          path: '',
          relatedFields: [{ bizName: '收货城市', fieldName: 'receive_city', key: 'receive_city', techId: 'field_1' }],
          status: 1,
          updateTime: '',
          zhName: '收货城市'
        }
      ]
    )

    expect(rows[0].disabled).toBe(true)
  })

  it('uses only the field type property to infer batch dimension type', () => {
    const rows = buildDimensionBatchRows([
      {
        bizName: '交易明细表',
        dbName: '',
        dbType: '',
        drillDim: null,
        filters: null,
        groupId: 9,
        modelDetail: JSON.stringify({
          dimensions: [
            { bizName: '创建时间文本', fieldType: 'datetime', techId: 'created_text', type: 'varchar' }
          ]
        }),
        relViewId: 'view-1',
        remark: '',
        schemaId: 'schema-1',
        sourceId: '',
        spaceId: '82',
        status: '1',
        techName: 'trade_detail'
      }
    ])

    expect(rows[0].dimType).toBe('std')
  })

  it('builds create payload for a batch datetime dimension', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => '82'
    })
    const [row] = buildDimensionBatchRows([
      {
        bizName: '交易明细表',
        dbName: '',
        dbType: '',
        drillDim: null,
        filters: null,
        groupId: 9,
        modelDetail: JSON.stringify({
          dimensions: [
            { bizName: '交易日期', fieldName: 'trade_date', techId: 'field_2', type: 'datetime' }
          ]
        }),
        relViewId: 'view-1',
        remark: '',
        schemaId: '101',
      sourceId: '',
      spaceId: '82',
      status: '1',
      techName: 'trade_detail'
      }
    ])

    const payload = buildDimensionBatchCreatePayload({
      row,
      selectedGroupId: 7,
      semanticsGroupId: 9
    })

    expect(payload).toMatchObject({
      bizName: '交易日期',
      fieldType: 'datetime',
      groupId: 7,
      relSchemaId: 101,
      relViewId: 'view-1',
      semanticType: 'datetime',
      semanticsGroupId: 9,
      spaceId: 82,
      techName: 'trade_date',
      typeParams: '{"timeGranularity":["day"]}'
    })
    expect(payload.relFields).toEqual([
      {
        bizName: '交易日期',
        fieldType: 'datetime',
        fieldName: 'trade_date',
        key: 'trade_date',
        originName: 'trade_date',
        sourceId: '',
        sourceTableName: '交易明细表',
        techId: 'field_2',
        timeFormat: 'yyyy-MM-dd'
      }
    ])
  })
})
