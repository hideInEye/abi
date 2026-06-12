import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Popconfirm, Table, Tag } from 'antd'
import type { TableColumnsType } from 'antd'
import React from 'react'

import { INDICATOR_TYPE_TEXT_MAP, STATUS_TEXT_MAP } from '../constants/metricModeling.constants'
import type { KnowledgeIndicatorItem } from '../types/metricModeling.types'

interface Props {
  readonly dataSource: KnowledgeIndicatorItem[]
  readonly loading?: boolean
  readonly onDelete: (record: KnowledgeIndicatorItem) => void
  readonly onEdit: (record: KnowledgeIndicatorItem) => void
}

const statusColorMap: Record<string, string> = {
  '0': 'default',
  '1': 'success',
  '2': 'processing'
}

export const KnowledgeTable: React.FC<Props> = ({ dataSource, loading, onDelete, onEdit }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const columns = useMemo<TableColumnsType<KnowledgeIndicatorItem>>(
    () => [
      {
        align: 'center',
        dataIndex: 'techName',
        ellipsis: true,
        key: 'techName',
        title: '指标名称',
        width: 180
      },
      {
        align: 'center',
        dataIndex: 'indicatorCode',
        ellipsis: true,
        key: 'indicatorCode',
        render: (value: string) => value || '-',
        title: '指标编码',
        width: 180
      },
      {
        align: 'center',
        dataIndex: 'indicatorClass',
        key: 'indicatorClass',
        render: (value: string) => {
          const text = INDICATOR_TYPE_TEXT_MAP[value] || value || '-'
          return <Tag color="blue">{text}</Tag>
        },
        title: '指标类型',
        width: 130
      },
      { align: 'center', dataIndex: 'qualityLevel', key: 'qualityLevel', render: (value: string) => value || '-', title: '质量等级', width: 120 },
      {
        align: 'center',
        dataIndex: 'status',
        key: 'status',
        render: (value: string | number) => {
          const key = String(value ?? '2')
          return <Tag color={statusColorMap[key] || 'default'}>{STATUS_TEXT_MAP[key] || '草稿'}</Tag>
        },
        title: '状态',
        width: 100
      },
      {
        align: 'center',
        fixed: 'right',
        key: 'action',
        render: (_: unknown, record: KnowledgeIndicatorItem) => (
          <div className="flex items-center justify-center" style={{ gap: 2 }}>
            <AButton className="abi-action-link" size="small" variant="link" onClick={() => onEdit(record)}>
              编辑
            </AButton>
            <Popconfirm
              cancelText="取消"
              description="确定删除该指标吗？"
              okText="确定"
              title="提示"
              onConfirm={() => onDelete(record)}
            >
              <AButton className="abi-action-link-danger" size="small" variant="link">删除</AButton>
            </Popconfirm>
          </div>
        ),
        title: '操作',
        width: 140
      }
    ],
    [onDelete, onEdit]
  )

  const tableWidth = useMemo(() => columns.reduce((sum, item) => sum + (Number(item.width) || 120), 0), [columns])
  const tableColumns = useMemo(
    () =>
      dataSource.length
        ? columns
        : columns.map((item) => ({
            ...item,
            fixed: undefined,
            width: undefined
          })) as TableColumnsType<KnowledgeIndicatorItem>,
    [columns, dataSource.length]
  )
  const pagedDataSource = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return dataSource.slice(startIndex, startIndex + pageSize)
  }, [currentPage, dataSource, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [dataSource, pageSize])

  const handlePageChange = (page: number) => {
    const totalPages = Math.ceil(dataSource.length / pageSize) || 1
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }
  const handlePrev = () => { if (currentPage > 1) handlePageChange(currentPage - 1) }
  const handleNext = () => { if (currentPage < Math.ceil(dataSource.length / pageSize)) handlePageChange(currentPage + 1) }

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: '12px', overflow: 'hidden', flex: 1, minHeight: 0, width: '100%' }}>
        <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
          <Table
            className="assistant-table-scroll abi-std-table"
            columns={tableColumns}
            dataSource={pagedDataSource}
            loading={loading}
            pagination={false}
            rowKey={record => String(record.indId || record.termId || record.techName || record.bizName)}
            scroll={pagedDataSource.length > 0 ? { x: tableWidth } : undefined}
            size="middle"
          />
        </div>
      </div>
      <div className="data-source-pagination">
        <span className="total-text">共 {dataSource.length} 条</span>
        <div className="pagination-controls">
          <ASelect
            value={pageSize}
            onChange={(val: number) => { setPageSize(val); setCurrentPage(1); }}
            options={[
              { label: '10条/页', value: 10 },
              { label: '15条/页', value: 15 },
              { label: '20条/页', value: 20 },
              { label: '25条/页', value: 25 },
              { label: '30条/页', value: 30 },
            ]}
            className="page-size-select"
          />
          <button className="page-btn" disabled={currentPage === 1} onClick={handlePrev}>
            <LeftOutlined />
          </button>
          {Array.from({ length: Math.ceil(dataSource.length / pageSize) || 1 }, (_, i) => i + 1).map(page => (
            <span
              key={page}
              className={`page-item ${page === currentPage ? 'page-active' : ''}`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </span>
          ))}
          <button className="page-btn" disabled={currentPage >= Math.ceil(dataSource.length / pageSize)} onClick={handleNext}>
            <RightOutlined />
          </button>
        </div>
      </div>
    </div>
  )
}
