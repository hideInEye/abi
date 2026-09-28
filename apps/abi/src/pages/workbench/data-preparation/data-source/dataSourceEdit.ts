export function parseJsonValue(value: unknown, fieldName: string): any {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`${fieldName}格式错误，无法编辑该数据源`)
  }
}

export function buildDataSourceEditRecord(record: any): any {
  const config = parseJsonValue(record.configuration, '数据源配置')
  if (record.excelDatasourceFlag) {
    if (!config?.excelConfig) throw new Error('Excel配置缺失，无法编辑该数据源')
    const excelConfig = parseJsonValue(config.excelConfig, 'Excel配置')
    if (!Array.isArray(excelConfig) || typeof excelConfig[0] !== 'object' || excelConfig[0] === null) {
      throw new Error('Excel配置格式错误，无法编辑该数据源')
    }
    return {
      ...excelConfig[0],
      sourceType: 'Excel',
      sourceName: record.sourceName,
      sourceFile: excelConfig,
      excelDatasourceFlag: true,
      sourceId: record.sourceId,
    }
  }
  return {
    ...record,
    ...config,
    sheets: config,
    sourceFile: [{ name: config?.[0]?.fileName }],
    tableName: config?.[0]?.deTableName,
  }
}
