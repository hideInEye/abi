import { Typography } from 'antd'

import type { DictionaryItem } from '../types'

interface TableDictionaryProps {
  readonly dataSource: {
    code: number
    msg: string
    rows: any[]
    total: number
  }
  readonly onDelete: (id: number) => void
  readonly onDiff: (record: DictionaryItem) => void
  readonly onEdit: (record: DictionaryItem) => void
  readonly onSelectedRowKeysChange: (keys: React.Key[]) => void
  readonly onStatusChange: (record: DictionaryItem) => void
  readonly selectedRowKeys: React.Key[]
}

export const TableDictionary: React.FC<TableDictionaryProps> = ({ dataSource, onDelete, onDiff, onEdit, onSelectedRowKeysChange, onStatusChange, selectedRowKeys }: TableDictionaryProps) => {
  const handleEdit = (record: DictionaryItem) => {
    onEdit(record)
  }
  const handleDelete = (record: DictionaryItem) => {
    onDelete(record.dictId)
  }

  const handleDiff = (record: DictionaryItem) => {
    onDiff(record)
  }

  const handleStatusChange = (record: DictionaryItem) => {
    onStatusChange(record)
  }

  const rowSelection = {
    columnWidth: 48,
    fixed: true,
    selectedRowKeys,
    onChange: (keys: React.Key[]) => onSelectedRowKeysChange(keys),
  }

  const { t } = useTranslation()

  const columns: any[] = [
    {
      align: 'left' as const,
      className: 'col-dict-name',
      dataIndex: 'dictField',
      key: 'dictField',
      title: '字典名称',
      minWidth: 160,
      onHeaderCell: () => ({ className: 'col-dict-name' }),
      render: (text: string) => {
        if (!text) return ''
        if (text.length > 10) {
          return (
            <ATooltip title={text}>
              <span>{text.slice(0, 10)}...</span>
            </ATooltip>
          )
        }
        return <span>{text}</span>
      },
    },
    {
      align: 'left' as const,
      className: 'col-dict-name',
      dataIndex: 'dictName',
      key: 'dictName',
      title: '中文名称',
      minWidth: 160,
      onHeaderCell: () => ({ className: 'col-dict-name' }),
      render: (text: string) => {
        if (!text) return ''
        if (text.length > 7) {
          return (
            <ATooltip title={text}>
              <span>{text.slice(0, 7)}...</span>
            </ATooltip>
          )
        }
        return <span>{text}</span>
      },
    },
    {
      align: 'center',
      dataIndex: 'status',
      minWidth: 80,
      render: (text: string, record: DictionaryItem) => {
        return <ASwitch checked={text === '2'} onChange={() => handleStatusChange(record)} />
      },
      title: '状态',
    },
    {
      align: 'left' as const,
      className: 'col-dict-desc',
      dataIndex: 'remark',
      key: 'remark',
      title: '字典描述',
      minWidth: 200,
      onHeaderCell: () => ({ className: 'col-dict-desc' }),
      onCell: () => ({ style: { whiteSpace: 'normal', wordBreak: 'break-all' as const, maxWidth: 300 } }),
      render: (text: string) => text
        ? <Typography.Paragraph ellipsis={{ rows: 2, tooltip: text }} style={{ marginBottom: 0, fontSize: 'inherit', color: 'inherit', maxWidth: 260 }}>{text}</Typography.Paragraph>
        : <span style={{ color: '#9ca3af' }}>-</span>,
    },
    {
      align: 'center',
      dataIndex: 'createTime',
      title: '创建时间',
      minWidth: 160,
    },
    {
      align: 'center',
      minWidth: 200,
      fixed: 'right',
      dataIndex: '操作',
      render: (_: any, record: DictionaryItem) => {
        return (
          <div className="flex items-center justify-center" style={{ gap: 2 }}>
            <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleEdit(record)}>编辑</AButton>
            <AButton className="abi-action-link" size="small" variant="link" onClick={() => handleDiff(record)}>新增</AButton>
            <APopconfirm cancelText="取消" description="确定要删除该字典吗？" okText="确认" title="删除字典" onConfirm={() => handleDelete(record)}>
              <AButton className="abi-action-link-danger" size="small" variant="link">删除</AButton>
            </APopconfirm>
          </div>
        )
      },
      title: '操作',
    },
  ]
  const getColumnWidth = useMemo(() => {
    // 55 for rowSelection checkbox column
    return columns.reduce((total, column: any) => total + (column.minWidth || column.width || 100), 55)
  }, [columns])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div
        style={{
          border: '1px solid rgba(130,140,200,0.18)',
          borderRadius: '12px',
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
          <ATable
            columns={columns}
            dataSource={dataSource.rows}
            pagination={false}
            rowKey="dictId"
            rowSelection={rowSelection}
            scroll={{ x: getColumnWidth }}
            size="middle"
            className="dictionary-table abi-std-table"
            locale={{ emptyText: <TableEmpty description="暂无字典" /> }}
          />
        </div>
      </div>
    </div>
  )
}
