import React from 'react'

import type { DimensionFieldOption, DimensionType } from '../../types'

interface Props {
  readonly fieldTableData: DimensionFieldOption[]
  readonly sampleValues?: string
  readonly type: DimensionType
}

function formatFieldLabel(item: DimensionFieldOption) {
  const bizName = item.bizName || item.techId
  const originName = item.originName || item.techId
  return `${bizName}(${originName})`
}

function buildColumns(type: DimensionType, fields: DimensionFieldOption[]) {
  if (!fields.length) {
    return []
  }
  if (type === 'std') {
    return [
      {
        dataIndex: fields[0].key,
        key: fields[0].key,
        title: formatFieldLabel(fields[0])
      }
    ]
  }
  return fields.slice(0, 5).map(item => ({
    dataIndex: item.key,
    key: item.key,
    title: formatFieldLabel(item)
  }))
}

function buildRows(type: DimensionType, fields: DimensionFieldOption[], sampleValues?: string) {
  const samples = String(sampleValues || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  if (type === 'std') {
    if (!fields[0]) {
      return []
    }
    return samples.map((item, index) => ({
      [fields[0].key]: item,
      key: index
    }))
  }
  return []
}

export const PreviewDataTab: React.FC<Props> = ({ fieldTableData, sampleValues, type }) => {
  const columns = useMemo(() => buildColumns(type, fieldTableData), [fieldTableData, type])
  const dataSource = useMemo(() => buildRows(type, fieldTableData, sampleValues), [fieldTableData, sampleValues, type])

  return (
    <>
      <AAlert
        showIcon
        className="mb-4"
        message={type === 'std' ? '标准维预览展示示例值和枚举情况' : '时间维预览展示各时间层级样例数据'}
        type="info"
      />
      <ATable
        columns={columns as any}
        dataSource={dataSource}
        locale={{ emptyText: '暂无预览数据' }}
        pagination={false}
        rowKey={row => String(row.key)}
        size="small"
      />
    </>
  )
}
