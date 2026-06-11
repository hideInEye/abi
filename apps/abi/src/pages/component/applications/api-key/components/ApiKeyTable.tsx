import { CheckCircleOutlined, DeleteOutlined, EyeOutlined, LeftOutlined, PauseCircleOutlined, RedoOutlined, RightOutlined } from '@ant-design/icons'
import { message, Empty } from 'antd'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'

import type { ApiKeyItem } from '../types'

interface ApiKeyTableProps {
  readonly current: number
  readonly dataSource: ApiKeyItem[]
  readonly loading?: boolean
  readonly onDelete: (record: ApiKeyItem) => void
  readonly onPageChange: (page: number) => void
  readonly onResetSk: (record: ApiKeyItem) => void
  readonly onToggleStatus: (record: ApiKeyItem) => void
  readonly onView: (record: ApiKeyItem) => void
  readonly pageSize: number
  readonly total: number
}

export function ApiKeyTable({
  current,
  dataSource,
  loading = false,
  onDelete,
  onPageChange,
  onResetSk,
  onToggleStatus,
  onView,
  pageSize,
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

  const columns = [
    {
      dataIndex: 'businessSpace',
      key: 'businessSpace',
      title: '业务空间',
      width: 180
    },
    {
      dataIndex: 'clientId',
      key: 'clientId',
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
      title: 'Client ID',
      width: 260
    },
    {
      dataIndex: 'accessKey',
      key: 'accessKey',
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
      title: 'Access Key',
      width: 260
    },
    {
      dataIndex: 'secretKey',
      key: 'secretKey',
      render: (value: string) => <span>{value || '********'}</span>,
      title: 'Secret Key',
      width: 160
    },
    {
      dataIndex: 'ipAccessType',
      key: 'ipAccessType',
      render: (value: ApiKeyItem['ipAccessType']) => <ATag>{value === 'unlimited' ? '不限制' : '仅白名单'}</ATag>,
      title: 'IP访问限制',
      width: 150
    },
    {
      dataIndex: 'timeoutSeconds',
      key: 'timeoutSeconds',
      render: (value?: number) => (typeof value === 'number' ? `${value} 秒` : '-'),
      title: 'Token超时',
      width: 150
    },
    {
      dataIndex: 'expireTime',
      key: 'expireTime',
      render: (value?: string | null) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '永久有效'),
      title: '过期时间',
      width: 180
    },
    {
      dataIndex: 'status',
      key: 'status',
      render: (value: ApiKeyItem['status']) =>
        value === 'normal' ? <ATag color="default">正常</ATag> : <ATag color="error">停用</ATag>,
      title: '状态',
      width: 120
    },
    {
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'),
      title: '创建时间',
      width: 200
    },
    {
      fixed: 'right' as const,
      key: 'operate',
      render: (_: unknown, record: ApiKeyItem) => (
        <ASpace size={6}>
          <ATooltip title="查看">
            <AButton
              icon={<EyeOutlined />}
              size="small"
              variant="link"
              onClick={() => onView(record)}
            />
          </ATooltip>
          <APopconfirm
            description="确认重置 Secret Key 吗？"
            title="重置 SK"
            onConfirm={() => onResetSk(record)}
          >
            <ATooltip title="重置SK">
              <AButton
                icon={<RedoOutlined />}
                size="small"
                variant="link"
              />
            </ATooltip>
          </APopconfirm>
          <ATooltip title={record.status === 'normal' ? '停用' : '启用'}>
            <AButton
              color={record.status === 'normal' ? 'default' : 'primary'}
              icon={record.status === 'normal' ? <PauseCircleOutlined /> : <CheckCircleOutlined />}
              size="small"
              variant="link"
              onClick={() => onToggleStatus(record)}
            />
          </ATooltip>
          <APopconfirm
            description="确认删除该 API Key 吗？"
            title="删除 API Key"
            onConfirm={() => onDelete(record)}
          >
            <ATooltip title="删除">
              <AButton
                color="danger"
                icon={<DeleteOutlined />}
                size="small"
                variant="link"
              />
            </ATooltip>
          </APopconfirm>
        </ASpace>
      ),
      title: '操作',
      width: 180
    }
  ]

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {dataSource.length > 0 ? (
        <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: '12px', overflow: 'hidden' }}>
          <ATable
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            pagination={false}
            rowKey="id"
            scroll={{ x: 1680 }}
            size="small"
          />
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
            const pages: number[] = []
            if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i) }
            else {
              pages.push(1)
              if (current > 3) pages.push(-1)
              const start = Math.max(2, current - 1)
              const end = Math.min(totalPages - 1, current + 1)
              for (let i = start; i <= end; i++) pages.push(i)
              if (current < totalPages - 2) pages.push(-2)
              pages.push(totalPages)
            }
            return pages.map(p => p < 0 ? <span key={p} className="page-item page-ellipsis">...</span> : <span key={p} className={`page-item${p === current ? ' page-active' : ''}`} onClick={() => onPageChange(p)}>{p}</span>)
          })()}
          <button className="page-btn" disabled={current >= totalPages} onClick={() => onPageChange(current + 1)}>
            <RightOutlined />
          </button>
          <span className="quick-jumper">
            前往
            <AInput className="jump-input" style={{ width: 48, textAlign: 'center' }} value={jumpValue} onChange={(e: any) => setJumpValue(e.target.value)} onPressEnter={() => { const p = parseInt(jumpValue, 10); if (p >= 1 && p <= totalPages) onPageChange(p); setJumpValue('') }} />
            页
          </span>
        </div>
      </div>
    </div>
  )
}
