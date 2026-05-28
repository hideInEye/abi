import { Pagination } from 'antd'

import type { DictionaryItem } from '../types'

interface TableDictionaryProps {
  readonly current: number
  readonly dataSource: {
    code: number
    msg: string
    rows: any[]
    total: number
  }
  readonly onDelete: (id: number) => void
  readonly onDiff: (record: DictionaryItem) => void
  readonly onEdit: (record: DictionaryItem) => void
  readonly onPageChange: (page: number) => void
  readonly onStatusChange: (record: DictionaryItem) => void
}

export const TableDictionary: React.FC<TableDictionaryProps> = ({ current, dataSource, onDelete, onDiff, onEdit, onPageChange, onStatusChange }: TableDictionaryProps) => {
  const handleEdit = (record: DictionaryItem) => {
    onEdit(record)
  }
  const handleDelete = (record: DictionaryItem) => {
    onDelete(record.dictId)
  }

  const handlePageChange = (page: number) => {
    onPageChange(page)
  }

  const handleDiff = (record: DictionaryItem) => {
    onDiff(record)
  }

  const handleStatusChange = (record: DictionaryItem) => {
    onStatusChange(record)
  }

  const { t } = useTranslation()

  const columns = [
    {
      align: 'center',
      dataIndex: 'dictField',
      title: '字典名称',
      minWidth: 120,
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
      align: 'center',
      dataIndex: 'dictName',
      title: '中文名称',
      minWidth: 120,
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
      align: 'center',
      dataIndex: 'remark',
      title: '字典描述',
      minWidth: 120,
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
      dataIndex: 'createTime',
      title: '创建时间',
      minWidth: 160,
    },
    {
      align: 'center',
      minWidth: 130,
      fixed: 'right',
      dataIndex: '操作',
      render: (_: any, record: DictionaryItem) => {
        return (
          <div className="flex items-center justify-center gap-12px">
            <AButton color="primary" size="small" variant="link" onClick={() => handleEdit(record)}>编辑</AButton>
            <AButton color="primary" size="small" variant="link" onClick={() => handleDiff(record)}>新增</AButton>
            <APopconfirm cancelText="取消" description="确定要删除该字典吗？" okText="确认" title="删除字典" onConfirm={() => handleDelete(record)}>
              <AButton color="danger" size="small" variant="link">删除</AButton>
            </APopconfirm>
          </div>
        )
      },
      title: '操作',
    },
  ]
  const getColumnWidth = useMemo(() => {
    return columns.reduce((total, column: any) => total + (column.minWidth || column.width || 100), 0)
  }, [columns])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', overflow: 'hidden' }}>
        <ATable columns={columns} dataSource={dataSource.rows} pagination={false} scroll={{ x: getColumnWidth }} size="middle" className="dictionary-table abi-std-table" />
      </div>

      {/* <div style={{ flex: 1, minHeight: 0 }} /> */}

      <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
        <Pagination current={current} pageSize={10} total={dataSource.total} onChange={(page) => handlePageChange(page)} />
      </div>
    </div>
  )
}
