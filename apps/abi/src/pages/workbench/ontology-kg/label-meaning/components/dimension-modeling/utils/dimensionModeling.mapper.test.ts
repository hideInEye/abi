import { describe, expect, it, vi } from 'vitest'

import { buildDimensionBatchCreatePayload, buildDimensionBatchRows, buildDimensionFieldPayload, buildFormValues, buildSchemaFieldOptions, buildSubmitPayload, getDimensionFieldLookupKeys, mapDimensionFromApi, normalizeDimensionFieldSelectionKeys, normalizeDimensionSelectedFieldsToOptionKeys } from './dimensionModeling.mapper'

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

  it('normalizes numeric dimCategory to string for edit display', () => {
    const item = mapDimensionFromApi({
      bizName: '地区',
      dimCategory: 1001,
      dimId: 6
    })
    const values = buildFormValues(item)

    expect(item.dimCategory).toBe('1001')
    expect(values.dimCategory).toBe('1001')
  })

  it('splits mapped dimension names for list and edit display', () => {
    const item = mapDimensionFromApi({
      bizName: '交易明细表_#_收货城市',
      dimId: 4,
      techName: 'trade_detail.receive_city'
    })
    const values = buildFormValues(item)

    expect(item.zhName).toBe('交易明细表')
    expect(item.englishName).toBe('receive_city')
    expect(values.zhName).toBe('交易明细表')
    expect(values.englishName).toBe('receive_city')
    expect(values.mappedBizNameFieldName).toBe('收货城市')
    expect(values.mappedTechNameTableName).toBe('trade_detail')
  })

  it('uses raw dimension names for edit form fallback', () => {
    const item = mapDimensionFromApi({
      dimId: 5,
      rawEnglishName: 'trade_detail.receive_city',
      rawZhName: '交易明细表_#_收货城市'
    })
    const values = buildFormValues(item)

    expect(values.zhName).toBe('交易明细表')
    expect(values.englishName).toBe('receive_city')
    expect(values.mappedBizNameFieldName).toBe('收货城市')
    expect(values.mappedTechNameTableName).toBe('trade_detail')
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

  it('keeps lookup keys for related field key, fieldName and techId aliases', () => {
    expect(
      getDimensionFieldLookupKeys({
        fieldName: 'trade_date',
        key: 'field_2',
        techId: 'field_2'
      })
    ).toEqual(['field_2', 'trade_date'])
  })

  it('normalizes selected related field aliases to option keys for the field modal', () => {
    expect(
      normalizeDimensionFieldSelectionKeys(
        ['trade_date'],
        [
          {
            bizName: '交易日期',
            fieldName: 'trade_date',
            key: 'field_2',
            techId: 'field_2'
          }
        ]
      )
    ).toEqual(['field_2'])
  })

  it('normalizes selected related fields to option keys by source table and business name', () => {
    expect(
      normalizeDimensionSelectedFieldsToOptionKeys(
        [
          {
            bizName: '活动名称',
            key: 'old_key',
            sourceTableName: 't_campaign',
            techId: 'old_key'
          }
        ],
        [
          {
            bizName: '活动名称',
            fieldName: 'campaign_name',
            key: 'field_campaign_name',
            sourceTableName: 't_campaign',
            techId: 'field_campaign_name'
          }
        ],
        ['old_key']
      )
    ).toEqual(['field_campaign_name'])
  })

  it('builds selectable field options when schema detail modelDetail is already an object', () => {
    const fields = buildSchemaFieldOptions({
      bizName: '交易明细表',
      dbName: '',
      dbType: '',
      drillDim: null,
      filters: null,
      groupId: 9,
      modelDetail: {
        dimensions: [
          {
            bizName: '收货城市',
            fieldName: 'receive_city',
            tableName: 't_order',
            techId: 'field_receive_city',
            techName: 'receive_city_code',
            type: 'varchar'
          }
        ]
      },
      relViewId: 'view-1',
      remark: '',
      schemaId: 'schema-1',
      sourceId: '',
      spaceId: '82',
      status: '1',
      techName: 'trade_detail'
    })

    expect(fields).toMatchObject([
      {
        bizName: '收货城市',
        fieldName: 'receive_city',
        key: 'field_receive_city',
        relViewId: 'view-1',
        tableName: 't_order',
        techId: 'field_receive_city',
        techName: 'receive_city_code'
      }
    ])
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

  it('builds batchCreate payload with selected field params as techId', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => '82'
    })
    const [row] = buildDimensionBatchRows([
      {
        bizName: '语义模型名',
        dbName: '',
        dbType: '',
        drillDim: null,
        filters: null,
        groupId: 9,
        modelDetail: JSON.stringify({
          dimensions: [
            {
              bizName: '城市',
              fieldName: 'city',
              rtableName: '用户表',
              sourceId: '1272272164820750336',
              sourceTableName: 't_user',
              tableName: 't_user',
              techId: '10202611211000',
              techName: 'city_code',
              type: 'categorical'
            }
          ]
        }),
        relViewId: '1277996668473708544',
        remark: '',
        schemaId: 390,
        sourceId: '',
        spaceId: '82',
        status: '1',
        techName: 'trade_detail'
      }
    ])

    const payload = buildDimensionBatchCreatePayload({
      rows: [row],
      selectedGroupId: '2080501906844684314',
      semanticsGroupId: '2080501906844684306'
    })

    expect(payload).toEqual([
      {
        spaceId: 82,
        techId: [
          {
            bizName: '用户表_#_城市',
            fieldType: 'categorical',
            key: '10202611211000',
            originName: 'city',
            sourceId: '1272272164820750336',
            sourceTableName: 't_user',
            techName: 't_user.city_code',
            techId: '10202611211000'
          }
        ],
        semanticsGroupId: '2080501906844684306',
        groupId: '2080501906844684314',
        relSchemaId: 390,
        relViewId: '1277996668473708544'
      }
    ])
  })

  it('compacts empty optional field params for batchCreate techId field object', () => {
    expect(
      buildDimensionFieldPayload({
        bizName: '城市',
        fieldType: 'categorical',
        key: '10202611211000',
        originName: 'city',
        sourceId: '1272272164820750336',
        sourceTableName: 't_user',
        techId: '10202611211000'
      })
    ).toEqual({
      bizName: '城市',
      fieldType: 'categorical',
      key: '10202611211000',
      originName: 'city',
      sourceId: '1272272164820750336',
      sourceTableName: 't_user',
      techId: '10202611211000'
    })
  })

  it('restores mapped names when editing a mapped dimension', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => '82'
    })
    const payload = buildSubmitPayload({
      formValues: {
        dimType: 'std',
        drillDirection: 'down',
        englishName: 'receive_city_new',
        mappedBizNameFieldName: '收货城市',
        mappedTechNameTableName: 'trade_detail',
        owner: '',
        relatedFieldKeys: [],
        status: 1,
        timeGranularity: [],
        zhName: '交易明细表新'
      },
      id: 10,
      relatedFields: [],
      selectedGroupId: 9
    })

    expect(payload.bizName).toBe('交易明细表新_#_收货城市')
    expect(payload.techName).toBe('trade_detail.receive_city_new')
  })

})
