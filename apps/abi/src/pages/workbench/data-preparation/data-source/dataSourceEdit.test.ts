import { describe, expect, it } from 'vitest'

import { buildDataSourceEditRecord } from './dataSourceEdit'

describe('data source edit config', () => {
  it('preserves the object configuration used by database data sources', () => {
    const config = {
      dbName: 'analytics',
      host: '127.0.0.1',
      port: 3306,
      userName: 'root'
    }

    const editRecord = buildDataSourceEditRecord({ configuration: JSON.stringify(config), sourceId: 'source-1' })

    expect(editRecord).toMatchObject({
      ...config,
      sheets: config,
      sourceId: 'source-1'
    })
    expect(Array.isArray(editRecord.sheets)).toBe(false)
  })

  it('keeps compatibility with an indexed configuration', () => {
    expect(buildDataSourceEditRecord({ configuration: '[{"fileName":"a","deTableName":"t"}]' })).toMatchObject({
      sourceFile: [{ name: 'a' }],
      tableName: 't'
    })
  })

  it('stops the edit flow for malformed outer or Excel JSON', () => {
    expect(() => buildDataSourceEditRecord({ configuration: '{broken' })).toThrow('数据源配置格式错误')
    expect(() =>
      buildDataSourceEditRecord({ configuration: '{"excelConfig":"bad"}', excelDatasourceFlag: true })
    ).toThrow('Excel配置格式错误')
  })
})
