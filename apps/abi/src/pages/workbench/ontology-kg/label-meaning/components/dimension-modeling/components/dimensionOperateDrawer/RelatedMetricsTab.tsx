import React from 'react'

import { queryKnowledgeIndicatorDetailList } from '@/service/api/knowledge-extraction'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import type { DimensionModelItem } from '../../types/dimensionModeling.types'

interface Props {
  readonly onGoMetricModeling?: () => void
  readonly onTotalChange?: (total: number) => void
  readonly record?: DimensionModelItem | null
}

function getMetricListPayload(res: any) {
  const data = res?.response?.data?.data || res?.data?.data || res?.data || {}
  return {
    current: Number(data.pageNum || 1),
    list: Array.isArray(data.list) ? data.list : [],
    pageSize: Number(data.pageSize || 10),
    total: Number(data.total || 0)
  }
}

export const RelatedMetricsTab: React.FC<Props> = ({ onGoMetricModeling, onTotalChange, record }) => {
  const [keyword, setKeyword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [pagination, setPagination] = React.useState({ current: 1, pageSize: 10, total: 0 })
  const [tableData, setTableData] = React.useState<any[]>([])

  const fetchMetrics = React.useCallback(
    async (pageNum = 1, pageSize = 10, techName = keyword) => {
      if (!record?.id) {
        setTableData([])
        setPagination(prev => ({ ...prev, total: 0 }))
        onTotalChange?.(0)
        return
      }
      setLoading(true)
      try {
        const res = await queryKnowledgeIndicatorDetailList({
          dimId: record.id,
          pageNum,
          pageSize,
          techName: techName.trim() || undefined
        })
        assertFlatRequestSuccess(res)
        const data = getMetricListPayload(res)
        setTableData(data.list)
        setPagination({
          current: data.current || pageNum,
          pageSize: data.pageSize || pageSize,
          total: data.total
        })
        onTotalChange?.(data.total)
      } catch {
        // The shared request layer already reports the request error.
      } finally {
        setLoading(false)
      }
    },
    [keyword, onTotalChange, record?.id]
  )

  React.useEffect(() => {
    fetchMetrics(1, 10, '')
  }, [fetchMetrics])

  const handleSearch = () => {
    fetchMetrics(1, pagination.pageSize, keyword)
  }

  const handleTableChange = (nextPagination: any) => {
    fetchMetrics(nextPagination.current, nextPagination.pageSize, keyword)
  }

  const dataSource = React.useMemo(
    () =>
      tableData.map(item => ({
        groupName: item.indicatorCategory || item.groupName,
        id: item.indId,
        name: item.techName,
        refType: item.refType || item.referenceType || '统计维度',
        updateTime: item.updateTime || item.createTime
      })),
    [tableData]
  )

  const tabCount = pagination.total || dataSource.length

  return (
    <div className="space-y-4">
      <AAlert
        showIcon
        className="border-[#c9dcff] rounded-lg bg-[#eef5ff] py-3"
        message="相关指标由指标建模模块引用后自动生成，此处仅展示引用结果，不支持手工新增绑定。"
        type="info"
      />

      <div className="flex items-center justify-between gap-4">
        <AInput
          allowClear
          className="w-[260px]"
          placeholder="搜索指标名称"
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
          onPressEnter={handleSearch}
        />
        <AButton onClick={handleSearch}>查询</AButton>
        <AButton
          type="primary"
          onClick={onGoMetricModeling}
        >
          去指标建模配置
        </AButton>
      </div>

      <ATable
        className="[&_.ant-table-thead>tr>th]:bg-[#f4f6fb] [&_.ant-table-thead>tr>th]:font-semibold"
        dataSource={dataSource}
        loading={loading}
        locale={{ emptyText: '暂无关联指标' }}
        rowKey={(item, index) => String(item.id || `${item.name}-${index}`)}
        size="small"
        columns={[
          {
            dataIndex: 'name',
            key: 'name',
            render: (value: string) => (
              <AButton
                className="px-0 font-semibold"
                type="link"
                onClick={onGoMetricModeling}
              >
                {value || '-'}
              </AButton>
            ),
            title: '指标名称'
          },
          { dataIndex: 'groupName', key: 'groupName', render: (v: string) => v || '-', title: '指标分组' },
          { dataIndex: 'refType', key: 'refType', render: (v: string) => v || '-', title: '引用方式' },
          {
            dataIndex: 'updateTime',
            key: 'updateTime',
            render: (v: string) => (v ? String(v).slice(0, 10) : '-'),
            title: '最近更新时间'
          }
        ]}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          showTotal: total => `共 ${total} 条`,
          total: tabCount
        }}
        onChange={handleTableChange}
      />
    </div>
  )
}
