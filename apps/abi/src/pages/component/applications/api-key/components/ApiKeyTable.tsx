import { DeleteOutlined, DownOutlined, EyeOutlined, LeftOutlined, MoreOutlined, RightOutlined } from '@ant-design/icons'
import { Empty, message } from 'antd'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'

import type { ColumnOption } from '@/components/ViewControls'
import type { ApiKeyItem } from '../types'

interface ApiKeyTableProps {
  readonly columnOptions: ColumnOption[]
  readonly current: number
  readonly dataSource: ApiKeyItem[]
  readonly loading?: boolean
  readonly onDelete: (record: ApiKeyItem) => void
  readonly onPageChange: (page: number) => void
  readonly onResetSk: (record: ApiKeyItem) => void
  readonly onSelectedRowKeysChange: (keys: React.Key[]) => void
  readonly onToggleStatus: (record: ApiKeyItem) => void
  readonly onView: (record: ApiKeyItem) => void
  readonly pageSize: number
  readonly selectedRowKeys: React.Key[]
  readonly total: number
}

export function ApiKeyTable({
  columnOptions,
  current,
  dataSource,
  loading = false,
  onDelete,
  onPageChange,
  onResetSk,
  onSelectedRowKeysChange,
  onToggleStatus,
  onView,
  pageSize,
  selectedRowKeys,
  total
}: ApiKeyTableProps) {
  const copyValue = (value: string, label: string) => {
    if (!value) {
      message.warning(`${label}为空，无法复制`)
      return
    }

    copy(value)
    message.success(`${label}已复制`)
  }

  const [jumpValue, setJumpValue] = useState('')
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const rowSelection = {
    fixed: true,
    selectedRowKeys,
    onChange: (keys: React.Key[]) => onSelectedRowKeysChange(keys),
  }

  const columns: any[] = [
    {
      align: 'left',
      className: 'col-apikey-left',
      dataIndex: 'businessSpace',
      key: 'businessSpace',
      minWidth: 160,
      onHeaderCell: () => ({ className: 'col-apikey-left' }),
      title: '业务空间'
    },
    {
      align: 'center',
      dataIndex: 'clientId',
      key: 'clientId',
      minWidth: 260,
      render: (value: string) => (
        <ASpace>
          <span>{value || '-'}</span>
          <AButton
            style={{ paddingInline: 0 }}
            type="link"
            onClick={() => copyValue(value, 'Client ID')}
          >
            复制
          </AButton>
        </ASpace>
      ),
      title: 'Client ID'
    },
    {
      align: 'center',
      dataIndex: 'accessKey',
      key: 'accessKey',
      minWidth: 260,
      render: (value: string) => (
        <ASpace>
          <span>{value || '-'}</span>
          <AButton
            style={{ paddingInline: 0 }}
            type="link"
            onClick={() => copyValue(value, 'Access Key')}
          >
            复制
          </AButton>
        </ASpace>
      ),
      title: 'Access Key'
    },
    {
      align: 'center',
      dataIndex: 'secretKey',
      key: 'secretKey',
      minWidth: 160,
      render: (value: string) => <span>{value || '********'}</span>,
      title: 'Secret Key'
    },
    {
      align: 'center',
      dataIndex: 'ipAccessType',
      key: 'ipAccessType',
      minWidth: 150,
      render: (value: ApiKeyItem['ipAccessType']) => <ATag>{value === 'unlimited' ? '不限制' : '仅白名单'}</ATag>,
      title: 'IP访问限制'
    },
    {
      align: 'center',
      dataIndex: 'timeoutSeconds',
      key: 'timeoutSeconds',
      minWidth: 150,
      render: (value?: number) => (typeof value === 'number' ? `${value} 秒` : '-'),
      title: 'Token超时'
    },
    {
      align: 'center',
      dataIndex: 'expireTime',
      key: 'expireTime',
      minWidth: 180,
      render: (value?: string | null) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '永久有效'),
      title: '过期时间'
    },
    {
      align: 'center',
      dataIndex: 'status',
      key: 'status',
      minWidth: 120,
      render: (value: ApiKeyItem['status']) =>
        value === 'normal' ? <ATag color="default">正常</ATag> : <ATag color="error">停用</ATag>,
      title: '状态'
    },
    {
      align: 'center',
      dataIndex: 'createdAt',
      key: 'createdAt',
      minWidth: 200,
      render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
      title: '创建时间'
    },
    {
      align: 'center',
      fixed: 'right' as const,
      key: 'operate',
      minWidth: 200,
      render: (_: unknown, record: ApiKeyItem) => (
        <div className="ds-action-group">
          <AButton className="abi-action-link" size="small" variant="link" onClick={() => onView(record)}>
            <EyeOutlined style={{ marginRight: 3, fontSize: 12 }} />查看
          </AButton>
          <AButton
            className="abi-action-link"
            size="small"
            variant="link"
            onClick={() => onToggleStatus(record)}
          >
            {record.status === 'normal' ? '停用' : '启用'}
          </AButton>
          <ADropdown
            menu={{
              items: [
                {
                  key: 'resetSk',
                  label: (
                    <APopconfirm
                      description="确认重置 Secret Key 吗？"
                      title="重置 SK"
                      onConfirm={() => onResetSk(record)}
                    >
                      <span>重置SK</span>
                    </APopconfirm>
                  ),
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  danger: true,
                  label: (
                    <APopconfirm
                      description="确认删除该 API Key 吗？"
                      title="删除 API Key"
                      onConfirm={() => onDelete(record)}
                    >
                      <span><DeleteOutlined style={{ marginRight: 4 }} />删除</span>
                    </APopconfirm>
                  ),
                },
              ],
            }}
          >
            <AButton className="abi-action-link" size="small" variant="link">
              更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
            </AButton>
          </ADropdown>
        </div>
      ),
      title: '操作'
    }
  ]

  const filteredColumns = useMemo(() => {
    const visibleKeys = new Set(columnOptions.filter(c => c.visible).map(c => c.key))
    return columns.filter(col => col.key === 'operate' || visibleKeys.has(col.key))
  }, [columnOptions, columns])

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {dataSource.length > 0 ? (
        <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: '12px', overflow: 'hidden', flex: 1, minHeight: 0 }}>
          <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
            <ATable
              columns={filteredColumns}
              dataSource={dataSource}
              loading={loading}
              pagination={false}
              rowKey="id"
              rowSelection={rowSelection}
              scroll={dataSource.length > 0 ? { x: 'max-content' } : undefined}
              size="middle"
              className="api-key-table abi-std-table"
            />
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(130,140,200,0.18)',
          borderRadius: '12px',
          background: '#F5F7FF',
        }}>
          <Empty description="暂无数据" />
        </div>
      )}

      <div className="data-source-pagination">
        <span className="total-text">共 {total} 条</span>
        <div className="pagination-controls">
          <ASelect
            value={pageSize}
            options={[
              { label: '10条/页', value: 10 },
              { label: '20条/页', value: 20 },
              { label: '50条/页', value: 50 },
            ]}
            disabled
            className="page-size-select"
          />
          <button className="page-btn" disabled={current === 1} onClick={() => onPageChange(current - 1)}>
            <LeftOutlined />
          </button>
          {(() => {
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
                <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => onPageChange(page as number)}>
                  {page}
                </span>
              )
            })
          })()}
          <button className="page-btn" disabled={current >= totalPages} onClick={() => onPageChange(current + 1)}>
            <RightOutlined />
          </button>
          <span className="quick-jumper">
            前往
            <AInput className="jump-input" style={{ width: 48, textAlign: 'center' }} value={jumpValue} onChange={(e: any) => setJumpValue(e.target.value)} onPressEnter={() => { const p = parseInt(jumpValue, 10); if (!isNaN(p) && p >= 1 && p <= totalPages) onPageChange(p); setJumpValue('') }} />
            页
          </span>
        </div>
      </div>
    </div>
  )
}
