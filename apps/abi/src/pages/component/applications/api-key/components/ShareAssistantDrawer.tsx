import { LeftOutlined, RightOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Drawer, Empty, Spin } from 'antd'

import { useAppSelector } from '@/hooks/business/useStore'
import AssistantShareModal from '@/pages/workbench/app-workshop/my-assistant/AssistantShareModal'
import { fetchAppListApi } from '@/service/api/abi-chat-app'
import { fetchProjectShareListApi } from '@/service/api/share'
import { getSpaceId } from '@/store/slice/app'
import { normalizeShareUrl } from '@/utils/shareUrl'

import type { ApiKeyItem } from '../types'

interface ShareAssistantDrawerProps {
  /** 触发入口的 API Key 记录，列表展示其绑定的助手 */
  readonly apiKey: ApiKeyItem | null
  readonly open: boolean
  readonly onClose: () => void
}

interface AssistantRow {
  id: string | number
  name: string
  shareUrl: string
  createBy: string
  createTime: string
}

const PAGE_SIZE = 12

/** apiKeys 字段兼容数组 / 逗号分隔串（与分享记录列表口径一致） */
function parseApiKeys(value: any): string[] {
  if (Array.isArray(value)) return value.map((v: any) => String(v)).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean)
  return []
}

/**
 * API Key「分享助手」抽屉：展示当前 API Key 绑定的助手列表。
 * 绑定关系取自分享记录的 apiKeys 字段（含该 accessKey 的记录），按助手去重、取最近一条记录的分享链接。
 */
export function ShareAssistantDrawer({ apiKey, open, onClose }: ShareAssistantDrawerProps) {
  const currentSpaceId = useAppSelector(getSpaceId)
  const [rows, setRows] = useState<AssistantRow[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [jumpValue, setJumpValue] = useState('')
  const [shareAgent, setShareAgent] = useState<AssistantRow | null>(null)

  // 分享弹窗预选触发入口的 API Key（apiKey 变化时才换引用，避免 effect 重复触发）
  const defaultApiKeys = useMemo(() => (apiKey?.accessKey ? [apiKey.accessKey] : []), [apiKey])

  const loadList = useCallback(async (accessKey: string) => {
    setLoading(true)
    try {
      const [shareRes, appRes] = await Promise.all([
        fetchProjectShareListApi({ type: 'workflow', current: 1, size: 999 }),
        fetchAppListApi({ spaceId: currentSpaceId || undefined }),
      ])
      const sharePage = (shareRes as any)?.data ?? {}
      const shareRecords = Array.isArray(sharePage) ? sharePage : (sharePage.records ?? sharePage.rows ?? sharePage.list ?? [])
      const appPage = (appRes as any)?.data
      const appList = appPage?.rows || appPage || []
      // 助手名称/创建人/创建时间从助手列表映射，缺失时回退分享记录字段
      const appMap = new Map<string, any>()
      for (const item of Array.isArray(appList) ? appList : []) {
        if (item?.appId != null) appMap.set(String(item.appId), item)
      }
      const rowMap = new Map<string, AssistantRow>()
      for (const r of Array.isArray(shareRecords) ? shareRecords : []) {
        if (!parseApiKeys(r?.apiKeys ?? r?.accessKeys).includes(accessKey)) continue
        const pid = String(r?.projectId ?? '')
        if (!pid || rowMap.has(pid)) continue
        const app = appMap.get(pid)
        rowMap.set(pid, {
          id: pid,
          name: app?.appName || '-',
          shareUrl: r?.shareUrl ? normalizeShareUrl(r.shareUrl) : '',
          createBy: app?.createBy || r?.createBy || '-',
          createTime: app?.createTime
            ? String(app.createTime).replace('T', ' ')
            : r?.createTime ? String(r.createTime).replace('T', ' ') : '-',
        })
      }
      setRows([...rowMap.values()])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [currentSpaceId])

  useEffect(() => {
    if (!open || !apiKey?.accessKey) {
      setRows([])
      return
    }
    setCurrentPage(1)
    loadList(apiKey.accessKey)
  }, [open, apiKey, loadList])

  // 绑定助手量级小，前端分页
  const totalCount = rows.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, currentPage, pageSize])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  const renderPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i)
      pages.push('...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...')
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1, '...')
      pages.push(currentPage - 1, currentPage, currentPage + 1)
      pages.push('...', totalPages)
    }
    return pages.map((page, idx) => {
      if (page === '...') return <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">...</span>
      const isActive = page === currentPage
      return (
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => handlePageChange(page as number)}>
          {page}
        </span>
      )
    })
  }

  const columns: any[] = [
    { align: 'center', dataIndex: 'id', key: 'appId', minWidth: 120, title: '助手ID' },
    { align: 'center', dataIndex: 'name', key: 'appName', minWidth: 160, render: (value: string) => value || '-', title: '助手名称' },
    { align: 'center', dataIndex: 'shareUrl', ellipsis: true, key: 'shareUrl', minWidth: 220, render: (value: string) => value || '-', title: '分享链接' },
    { align: 'center', dataIndex: 'createBy', key: 'createBy', minWidth: 120, render: (value: string) => value || '-', title: '创建人' },
    { align: 'center', dataIndex: 'createTime', key: 'createTime', minWidth: 180, render: (value: string) => value || '-', title: '创建时间' },
    {
      align: 'center',
      fixed: 'right' as const,
      key: 'operate',
      minWidth: 100,
      render: (_: unknown, record: AssistantRow) => (
        <AButton className="abi-action-link" size="small" variant="link" onClick={() => setShareAgent(record)}>
          <ShareAltOutlined style={{ marginRight: 3, fontSize: 12 }} />分享
        </AButton>
      ),
      title: '操作'
    }
  ]

  return (
    <Drawer title="助手列表" width={760} open={open} onClose={onClose} destroyOnClose>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Spin spinning={loading}>
            {rows.length > 0 ? (
              <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: 12, overflow: 'hidden' }}>
                <ATable
                  columns={columns}
                  dataSource={pagedList}
                  pagination={false}
                  rowKey="id"
                  scroll={{ x: 'max-content' }}
                  size="middle"
                  className="abi-std-table"
                />
              </div>
            ) : (
              !loading && (
                <div className="abi-card-empty">
                  <Empty description="暂无绑定助手" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )
            )}
          </Spin>
        </div>
        <div className="data-source-pagination">
          <span className="total-text">共 {totalCount} 条</span>
          <div className="pagination-controls">
            <ASelect
              value={pageSize}
              options={[
                { label: '12条/页', value: 12 },
                { label: '18条/页', value: 18 },
                { label: '24条/页', value: 24 },
                { label: '30条/页', value: 30 },
              ]}
              onChange={(val: number) => { setPageSize(val); setCurrentPage(1) }}
              className="page-size-select"
            />
            <button className="page-btn" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
              <LeftOutlined />
            </button>
            {renderPageNumbers()}
            <button className="page-btn" disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)}>
              <RightOutlined />
            </button>
            <span className="quick-jumper">
              前往
              <AInput
                className="jump-input"
                style={{ width: 48, textAlign: 'center' }}
                value={jumpValue}
                onChange={(e: any) => setJumpValue(e.target.value)}
                onPressEnter={() => { const p = parseInt(jumpValue, 10); if (!isNaN(p)) handlePageChange(p); setJumpValue('') }}
              />
              页
            </span>
          </div>
        </div>
      </div>

      <AssistantShareModal
        agent={shareAgent}
        defaultApiKeys={defaultApiKeys}
        open={Boolean(shareAgent)}
        onClose={() => setShareAgent(null)}
        onShared={() => apiKey?.accessKey && loadList(apiKey.accessKey)}
      />
    </Drawer>
  )
}
