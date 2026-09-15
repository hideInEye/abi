import { describe, expect, it } from 'vitest'

import { buildDataSourceEditRecord } from './dataSourceEdit'

describe('data source edit config', () => {
  it('parses a valid database configuration', () => {
    expect(buildDataSourceEditRecord({ configuration: '[{"fileName":"a","deTableName":"t"}]' })).toMatchObject({
      tableName: 't',
      sourceFile: [{ name: 'a' }],
    })
  })

  it('stops the edit flow for malformed outer or Excel JSON', () => {
    expect(() => buildDataSourceEditRecord({ configuration: '{broken' })).toThrow('数据源配置格式错误')
    expect(() => buildDataSourceEditRecord({ excelDatasourceFlag: true, configuration: '{"excelConfig":"bad"}' })).toThrow('Excel配置格式错误')
  })
})
