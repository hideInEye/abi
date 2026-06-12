import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Popconfirm, Table, Tag } from 'antd'
import React from 'react'

import { DIMENSION_STATUS_TEXT_MAP, DIMENSION_TYPE_TEXT_MAP } from '../constants/dimensionModeling.constants'
import type { DimensionModelItem, DimensionPagination } from '../types/dimensionModeling.types'

interface Props {
  readonly dataSource: DimensionModelItem[]
  readonly loading?: boolean
  readonly onDelete: (record: DimensionModelItem) => void
  readonly onEdit: (record: DimensionModelItem) => void
  readonly onHierarchy: (record: DimensionModelItem) => void
  readonly onPaginationChange: (page: number, pageSize: number) => void
  readonly pagination: DimensionPagination
}

const statusColorMap: Record<string, string> = {
  '0': 'default',
  '1': 'success'
}

export const DimensionTable: React.FC<Props> = ({
  dataSource,
  loading,
  onDelete,
  onEdit,
  onHierarchy,
  onPaginationChange,
  pagination
}) => {
  const columns = useMemo(
    () => [
      {
        align: 'center',
        dataIndex: 'zhName',
        ellipsis: true,
        key: 'zhName',
        title: '中文名',
        width: 180
      },
      {
        align: 'center',
        dataIndex: 'englishName',
        ellipsis: true,
        key: 'englishName',
        title: '英文名',
        width: 180
      },
      {
        align: 'center',
        dataIndex: 'dimType',
        key: 'dimType',
        render: (value: string) => DIMENSION_TYPE_TEXT_MAP[value] || value || '-',
        title: '维度类型',
        width: 120
      },
      {
        align: 'center',
        dataIndex: 'path',
        ellipsis: true,
        key: 'path',
        title: '维度路径(目录)',
        width: 300
      },
      {
        align: 'center',
        dataIndex: 'owner',
        ellipsis: true,
        key: 'owner',
        title: '负责人',
        width: 130
      },
      {
        align: 'center',
        dataIndex: 'status',
        key: 'status',
        render: (value: string | number) => {
          const key = String(value ?? '0')
          return <Tag color={statusColorMap[key] || 'default'}>{DIMENSION_STATUS_TEXT_MAP[key] || '禁用'}</Tag>
        },
        title: '状态',
        width: 100
      },
      {
        align: 'center',
        dataIndex: 'updateTime',
        key: 'updateTime',
        title: '更新时间',
        width: 180
      },
      {
        align: 'center',
        fixed: 'right',
        key: 'action',
        render: (_: unknown, record: DimensionModelItem) => (
          <div className="flex items-center justify-center" style={{ gap: 2 }}>
            <AButton className="abi-action-link" size="small" variant="link" onClick={() => onEdit(record)}>
              编辑
            </AButton>
            <AButton className="abi-action-link" size="small" variant="link" onClick={() => onHierarchy(record)}>
              层级配置
            </AButton>
            <Popconfirm
              cancelText="取消"
              description="确定删除该维度吗？"
              okText="确定"
              title="提示"
              onConfirm={() => onDelete(record)}
            >
              <AButton className="abi-action-link-danger" size="small" variant="link">删除</AButton>
            </Popconfirm>
          </div>
        ),
        title: '操作',
        width: 180
      }
    ],
    [onDelete, onEdit, onHierarchy]
  )

  const tableWidth = useMemo(() => columns.reduce((sum, item: any) => sum + (item.width || 120), 0), [columns])
  const tableColumns = useMemo(
    () =>
      dataSource.length
        ? columns
        : columns.map((item: any) => ({
            ...item,
            fixed: undefined,
            width: undefined
          })),
    [columns, dataSource.length]
  )

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: '12px', overflow: 'hidden', flex: 1, minHeight: 0, width: '100%' }}>
        <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
          <Table
            className="assistant-table-scroll abi-std-table"
            columns={tableColumns as any}
            dataSource={dataSource}
            loading={loading}
            rowKey={record => String(record.id)}
            scroll={dataSource.length > 0 ? { x: tableWidth } : undefined}
            size="middle"
            pagination={false}
          />
        </div>
      </div>
      <div className="data-source-pagination">
        <span className="total-text">共 {pagination.total} 条</span>
        <div className="pagination-controls">
          <ASelect
            value={pagination.pageSize}
            onChange={(size: number) => onPaginationChange(pagination.current, size)}
            options={[
              { label: '10条/页', value: 10 },
              { label: '15条/页', value: 15 },
              { label: '20条/页', value: 20 },
              { label: '25条/页', value: 25 },
              { label: '30条/页', value: 30 },
            ]}
            className="page-size-select"
          />
          <button className="page-btn" disabled={pagination.current === 1} onClick={() => onPaginationChange(pagination.current - 1, pagination.pageSize)}>
            <LeftOutlined />
          </button>
          {Array.from({ length: Math.ceil(pagination.total / pagination.pageSize) || 1 }, (_, i) => i + 1).map(page => (
            <span
              key={page}
              className={`page-item ${page === pagination.current ? 'page-active' : ''}`}
              onClick={() => onPaginationChange(page, pagination.pageSize)}
            >
              {page}
            </span>
          ))}
          <button className="page-btn" disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)} onClick={() => onPaginationChange(pagination.current + 1, pagination.pageSize)}>
            <RightOutlined />
          </button>
        </div>
      </div>
    </div>
  )
}
