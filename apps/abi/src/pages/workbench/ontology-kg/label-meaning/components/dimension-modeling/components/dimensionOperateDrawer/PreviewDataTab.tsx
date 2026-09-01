import React from 'react'

import { queryDimensionPreview } from '@/service/api/dimension-modeling'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import type { DimensionFieldOption, DimensionType } from '../../types/dimensionModeling.types'

interface Props {
  readonly dimId?: number
  readonly fieldTableData: DimensionFieldOption[]
  readonly sampleValues?: string
  readonly type: DimensionType
}

interface PreviewField {
  originName?: string
  tfieldAlias?: string
  tfieldName?: string
  tfieldShowName?: string
}

interface PreviewData {
  data: Array<Record<string, any>>
  fields: PreviewField[]
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

function getPreviewPayload(res: any): PreviewData {
  const data = res?.response?.data?.data || res?.data?.data || res?.data || {}
  return {
    data: Array.isArray(data.data) ? data.data : [],
    fields: Array.isArray(data.fields) ? data.fields : []
  }
}

function buildPreviewColumns(fields: PreviewField[], rows: Array<Record<string, any>>) {
  const firstRow = rows[0]
  if (!firstRow) {
    return []
  }
  const fieldMap = new Map(fields.filter(item => item?.tfieldName).map(item => [String(item.tfieldName), item]))
  return Object.keys(firstRow)
    .filter(key => key !== 'key')
    .map(key => {
      const matchedField = fieldMap.get(key)
      return {
        dataIndex: key,
        ellipsis: true,
        key,
        title: matchedField?.tfieldAlias || matchedField?.originName || matchedField?.tfieldShowName || key,
        width: 160
      }
    })
}

export const PreviewDataTab: React.FC<Props> = ({ dimId, fieldTableData, sampleValues, type }) => {
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData>({ data: [], fields: [] })

  useEffect(() => {
    if (!dimId) {
      setPreviewData({ data: [], fields: [] })
      return undefined
    }
    let canceled = false
    const fetchPreview = async () => {
      setLoading(true)
      try {
        const res = await queryDimensionPreview({ dimId })
        assertFlatRequestSuccess(res)
        if (!canceled) {
          setPreviewData(getPreviewPayload(res))
        }
      } catch {
        // The shared request layer already reports the request error.
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }
    fetchPreview()
    return () => {
      canceled = true
    }
  }, [dimId])

  const fallbackColumns = useMemo(() => buildColumns(type, fieldTableData), [fieldTableData, type])
  const fallbackDataSource = useMemo(
    () => buildRows(type, fieldTableData, sampleValues),
    [fieldTableData, sampleValues, type]
  )
  const previewColumns = useMemo(
    () => buildPreviewColumns(previewData.fields, previewData.data),
    [previewData.data, previewData.fields]
  )
  const columns = previewColumns.length ? previewColumns : fallbackColumns
  const dataSource = previewData.data.length
    ? previewData.data.map((item, index) => ({ ...item, key: index }))
    : fallbackDataSource

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
        loading={loading}
        locale={{ emptyText: '暂无预览数据' }}
        pagination={false}
        rowKey={row => String(row.key)}
        scroll={columns.length > 4 ? { x: columns.length * 160 } : undefined}
        size="small"
      />
    </>
  )
}
