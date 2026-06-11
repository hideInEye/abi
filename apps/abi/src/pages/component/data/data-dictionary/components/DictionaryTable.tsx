import { LeftOutlined, RightOutlined } from '@ant-design/icons'

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

  const columns: any[] = [
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
      minWidth: 160,
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
    return columns.reduce((total, column: any) => total + (column.minWidth || column.width || 100), 0)
  }, [columns])
  const pageSize = 10
  const totalCount = dataSource.total || 0
  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const [jumpValue, setJumpValue] = useState('')

  const handlePageJump = (page: number) => {
    if (page >= 1 && page <= totalPages) handlePageChange(page)
  }
  const handlePrev = () => { if (current > 1) handlePageChange(current - 1) }
  const handleNext = () => { if (current < totalPages) handlePageChange(current + 1) }

  const handleJump = () => {
    const page = parseInt(jumpValue, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page)
      setJumpValue('')
    }
  }

  const renderPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (current <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i)
      pages.push('...', totalPages)
    } else if (current >= totalPages - 2) {
      pages.push(1, '...')
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1, '...')
      pages.push(current - 1, current, current + 1)
      pages.push('...', totalPages)
    }
    return pages.map((page, idx) => {
      if (page === '...') return <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">...</span>
      const isActive = page === current
      return (
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => handlePageJump(page as number)}>
          {page}
        </span>
      )
    })
  }

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
          <ATable columns={columns} dataSource={dataSource.rows} pagination={false} scroll={{ x: getColumnWidth }} size="middle" className="dictionary-table abi-std-table" />
        </div>
      </div>
      <div className="data-source-pagination">
        <span className="total-text">共 {totalCount} 条</span>
        <div className="pagination-controls">
          <button className="page-btn" disabled={current === 1} onClick={handlePrev}>
            <LeftOutlined />
          </button>
          {renderPageNumbers()}
          <button className="page-btn" disabled={current === totalPages} onClick={handleNext}>
            <RightOutlined />
          </button>
          <span className="quick-jumper">
            前往
            <AInput
              className="jump-input"
              style={{ width: 48, textAlign: 'center' }}
              value={jumpValue}
              onChange={(e: any) => setJumpValue(e.target.value)}
              onPressEnter={handleJump}
            />
            页
          </span>
        </div>
      </div>
    </div>
  )
}
