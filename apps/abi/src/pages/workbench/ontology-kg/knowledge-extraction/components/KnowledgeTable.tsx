import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Empty, Popconfirm, Space, Table, Tag, Tooltip } from 'antd'
import React from 'react'

import { INDICATOR_TYPE_TEXT_MAP, STATUS_TEXT_MAP } from '../constants'
import type { KnowledgeIndicatorItem } from '../types'

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
  const emptyNode = (
    <Empty
      className="my-10"
      description="暂无数据"
    />
  )

  const columns = useMemo(
    () => [
      {
        dataIndex: 'bizName',
        ellipsis: true,
        key: 'bizName',
        title: '指标名称',
        width: 180
      },
      {
        dataIndex: 'groupName',
        ellipsis: true,
        key: 'groupName',
        title: '指标分类',
        width: 180
      },
      {
        dataIndex: 'indicatorType',
        key: 'indicatorType',
        render: (value: string) => {
          const text = INDICATOR_TYPE_TEXT_MAP[value] || value || '-'
          return <Tag color="blue">{text}</Tag>
        },
        title: '指标类型',
        width: 130
      },
      {
        dataIndex: 'semanticSchemaName',
        ellipsis: true,
        key: 'semanticSchemaName',
        render: (value: string) => value || '-',
        title: '所属模型',
        width: 220
      },
      {
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
        dataIndex: 'updateTime',
        key: 'updateTime',
        render: (_: string, record: KnowledgeIndicatorItem) => record.updateTime || record.createTime || '-',
        title: '更新时间',
        width: 190
      },
      {
        fixed: 'right' as const,
        key: 'action',
        render: (_: unknown, record: KnowledgeIndicatorItem) => (
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
            <Popconfirm
              cancelText="取消"
              description="确定删除该指标吗？"
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
        width: 120
      }
    ],
    [onDelete, onEdit]
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
          pagination={{ pageSize: 10, showSizeChanger: true }}
          rowKey={record => String(record.termId || record.techName || record.bizName)}
          scroll={dataSource.length > 0 ? { x: tableWidth } : undefined}
          size="small"
        />
      </div>
    </div>
  )
}
