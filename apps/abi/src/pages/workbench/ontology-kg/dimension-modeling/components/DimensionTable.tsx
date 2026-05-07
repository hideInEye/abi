import { DeleteOutlined, EditOutlined, NodeIndexOutlined } from '@ant-design/icons'
import { Button, Empty, Popconfirm, Space, Table, Tag, Tooltip } from 'antd'
import React from 'react'

import { DIMENSION_STATUS_TEXT_MAP, DIMENSION_TYPE_TEXT_MAP } from '../constants'
import type { DimensionModelItem, DimensionPagination } from '../types'

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
  const emptyNode = (
    <Empty
      className="my-10"
      description="暂无数据"
    />
  )

  const columns = useMemo(
    () => [
      {
        dataIndex: 'zhName',
        ellipsis: true,
        key: 'zhName',
        title: '中文名',
        width: 180
      },
      {
        dataIndex: 'englishName',
        ellipsis: true,
        key: 'englishName',
        title: '英文名',
        width: 180
      },
      {
        dataIndex: 'dimType',
        key: 'dimType',
        render: (value: string) => DIMENSION_TYPE_TEXT_MAP[value] || value || '-',
        title: '维度类型',
        width: 120
      },
      {
        dataIndex: 'path',
        ellipsis: true,
        key: 'path',
        title: '维度路径(目录)',
        width: 300
      },
      {
        dataIndex: 'owner',
        ellipsis: true,
        key: 'owner',
        title: '负责人',
        width: 130
      },
      {
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
        dataIndex: 'updateTime',
        key: 'updateTime',
        title: '更新时间',
        width: 180
      },
      {
        fixed: 'right' as const,
        key: 'action',
        render: (_: unknown, record: DimensionModelItem) => (
          <Space>
            <Tooltip title="编辑">
              <Button
                color="primary"
                icon={<EditOutlined />}
                size="small"
                variant="link"
                onClick={() => onEdit(record)}
              />
            </Tooltip>
            <Tooltip title="层级配置">
              <Button
                color="default"
                icon={<NodeIndexOutlined />}
                size="small"
                variant="link"
                onClick={() => onHierarchy(record)}
              />
            </Tooltip>
            <Popconfirm
              cancelText="取消"
              description="确定删除该维度吗？"
              okText="确定"
              title="提示"
              onConfirm={() => onDelete(record)}
            >
              <Tooltip title="删除">
                <Button
                  color="danger"
                  icon={<DeleteOutlined />}
                  size="small"
                  variant="link"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
        title: '操作',
        width: 140
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
      <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}>
        <Table
          className="assistant-table-scroll"
          columns={tableColumns as any}
          dataSource={dataSource}
          loading={loading}
          locale={{ emptyText: emptyNode }}
          rowKey={record => String(record.id)}
          scroll={dataSource.length > 0 ? { x: tableWidth } : undefined}
          size="small"
          pagination={{
            current: pagination.current,
            onChange: onPaginationChange,
            onShowSizeChange: onPaginationChange,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            total: pagination.total
          }}
        />
      </div>
    </div>
  )
}
