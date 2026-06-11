import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Empty, Pagination, Popconfirm, Space, Table, Tag, Tooltip } from 'antd'
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

  const emptyNode = (
    <Empty
      className="my-10"
      description="暂无数据"
    />
  )

  const columns = useMemo<TableColumnsType<KnowledgeIndicatorItem>>(
    () => [
      {
        dataIndex: 'techName',
        ellipsis: true,
        key: 'techName',
        title: '指标名称',
        width: 180
      },
      {
        dataIndex: 'indicatorCode',
        ellipsis: true,
        key: 'indicatorCode',
        render: (value: string) => value || '-',
        title: '指标编码',
        width: 180
      },
      {
        dataIndex: 'indicatorClass',
        key: 'indicatorClass',
        render: (value: string) => {
          const text = INDICATOR_TYPE_TEXT_MAP[value] || value || '-'
          return <Tag color="blue">{text}</Tag>
        },
        title: '指标类型',
        width: 130
      },
      { dataIndex: 'qualityLevel', key: 'qualityLevel', render: (value: string) => value || '-', title: '质量等级', width: 120 },
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

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <div className="assistant-table-scroll" style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}>
        <Table
          className="assistant-table-scroll abi-std-table"
          columns={tableColumns}
          dataSource={pagedDataSource}
          loading={loading}
          locale={{ emptyText: emptyNode }}
          pagination={false}
          rowKey={record => String(record.indId || record.termId || record.techName || record.bizName)}
          scroll={pagedDataSource.length > 0 ? { x: tableWidth } : undefined}
          size="small"
        />
      </div>
      <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          showSizeChanger
          total={dataSource.length}
          onChange={(page, size) => {
            setCurrentPage(page)
            setPageSize(size)
          }}
        />
      </div>
    </div>
  )
}
