import { DeleteOutlined, DiffOutlined, EditOutlined, SnippetsOutlined } from '@ant-design/icons'
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
    // {
    //   dataIndex: 'dictId',
    //   title: '字典ID'
    // },
    {
      align: 'left',
      dataIndex: 'dictField',
      title: '字典名称',
      width: 150,
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
      align: 'left',
      dataIndex: 'dictName',
      title: '中文名称',
      width: 150,
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
      width: 100,
      render: (text: string, record: DictionaryItem) => {
        return <ASwitch checked={text === '2'} onChange={() => handleStatusChange(record)} />
      },
      title: '状态',
    },
    {
      align: 'left',
      dataIndex: 'remark',
      title: '字典描述',
      width: 150,
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
      width: 180,
    },
    {
      align: 'center',
      width: 130,
      fixed: 'right',
      dataIndex: '操作',
      render: (_: any, record: DictionaryItem) => {
        return (
          <div className="flex items-center gap-2">
            <ATooltip title={t('page.manage.common.edit')}>
              <AButton color="primary" icon={<EditOutlined />} size="small" variant="link" onClick={() => handleEdit(record)} />
            </ATooltip>
            <ATooltip title={t('page.manage.common.add')}>
              <AButton color="primary" icon={<DiffOutlined/>} size="small" variant="link" onClick={() => handleDiff(record)} />
            </ATooltip>
            <APopconfirm cancelText="取消" description="确定要删除该字典吗？" okText="确认" title="删除字典" onConfirm={() => handleDelete(record)}>
              <ATooltip title={t('page.manage.common.delete')}>
                <AButton color="danger" icon={<DeleteOutlined />} size="small" variant="link" />
              </ATooltip>
            </APopconfirm>
          </div>
        )
      },
      title: '操作',
    },
  ]
  const getColumnWidth = useMemo(() => {
    return columns.reduce((total, column) => total + (column.width || 100), 0)
  }, [columns])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', overflow: 'hidden' }}>
        <ATable columns={columns} dataSource={dataSource.rows} pagination={false} scroll={{ x: getColumnWidth }} size="small" className="dictionary-table" />
      </div>

      {/* <div style={{ flex: 1, minHeight: 0 }} /> */}

      <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
        <Pagination current={current} pageSize={10} total={dataSource.total} onChange={(page) => handlePageChange(page)} />
      </div>
    </div>
  )
}
