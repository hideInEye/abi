import { DownOutlined, EyeOutlined, FilterOutlined, FolderOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button, Empty, Input, Popover, Select, Spin } from 'antd'
import dayjs from 'dayjs'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import { SidebarCollapseButton } from '@/components/layout/SidebarCollapseButton'
import { AssistantIconBlock } from '@/components/AssistantIcon'
import { RetryableLazy } from '@/components/performance/RetryableLazy'
import { fetchFavoriteList, fetchOperateRecordList } from '@/service/api/abi-system'
import { fetchAssistantList } from '@/service/api/app'
import { fetchSemanticGroups } from '@/service/api/semantic'
import { getSpaceId } from '@/utils/runtime'

const loadDateRangePicker = () => import('@/components/performance/DeferredDateRangePicker')
const loadAssistantDetailDrawer = () => import('./-AssistantDetailDrawer')
const loadDataDirectoryDropdown = () => import('./-DataDirectoryDropdown')

/** 应用工坊 tab 顺序：我的助手、我的分析、我的报告、最近使用、我的收藏、我的分享 */
const WORKSHOP_TABS = [
  { key: 'my-assistant', label: '我的助手' },
  { key: 'my-analysis', label: '我的分析' },
  { key: 'my-report', label: '我的报告' },
  { key: 'recently-used', label: '最近使用' },
  { key: 'my-collect', label: '我的收藏' },
  { key: 'my-share', label: '我的分享' },
] as const

type WorkshopTabKey = (typeof WORKSHOP_TABS)[number]['key']

/** 操作记录/收藏列表统一行数据（time 仅用于高级筛选的时间过滤，卡片不展示） */
type WorkshopRecord = {
  id: string
  chatId: string
  chatName: string
  spaceName: string
  time: string
}

/** 从接口响应中提取 rows（兼容顶层 {rows} / {data:{rows|list}} / {data:[]} / 直接数组 结构） */
function pickRows(res: any): any[] {
  if (Array.isArray(res)) return res
  // record/recentlyUseList、favorite/list 后端把 rows 放在响应体顶层；助手列表放在 data 下
  const rows = res?.rows ?? res?.data?.rows ?? res?.data?.list ?? res?.data
  return Array.isArray(rows) ? rows : []
}

/** 将后端记录映射为统一行数据 */
function mapRecord(item: any): WorkshopRecord {
  return {
    id: String(item.id ?? item.chatId ?? item.sessionId ?? ''),
    chatId: String(item.chatId ?? item.sessionId ?? ''),
    chatName: item.chatName || item.name || '-',
    spaceName: item.spaceName || '-',
    time: item.recentlyUseTime || item.sharedTime || item.createTime || '-',
  }
}

/** 助手卡片数据（我的助手 tab） */
type AssistantCard = {
  id: string
  name: string
  description: string
  icon?: string
  status: string
  createTime: string
  groupId?: string
}

/** 将后端 AppItem 映射为助手卡片数据 */
function mapAssistant(item: any): AssistantCard {
  return {
    id: String(item.appId ?? item.id ?? ''),
    name: item.appName || item.name || '-',
    description: item.description || '',
    icon: item.icon,
    status: item.status ?? '1',
    createTime: item.createTime ? String(item.createTime).replace('T', ' ') : '-',
    groupId: item.groupId != null && String(item.groupId) !== '0' ? String(item.groupId) : undefined,
  }
}

/** 按时间范围过滤（对齐 abi filterByCreateTime：按天粒度闭区间） */
function filterByTimeRange(rows: WorkshopRecord[], range: any): WorkshopRecord[] {
  if (!range || !range[0] || !range[1]) return rows
  const start = dayjs(range[0]).startOf('day')
  const end = dayjs(range[1]).endOf('day')
  return rows.filter((r) => {
    const t = dayjs(r.time)
    return t.isValid() && !t.isBefore(start) && !t.isAfter(end)
  })
}

const PAGE_SIZE_OPTIONS = [
  { label: '12条/页', value: 12 },
  { label: '18条/页', value: 18 },
  { label: '24条/页', value: 24 },
  { label: '30条/页', value: 30 },
]

function WorkshopView() {
  const navigate = useNavigate()
  // 默认选中 WORKSHOP_TABS 第一个 tab，跟随 tab 顺序不另写死 key
  const [activeTab, setActiveTab] = useState<WorkshopTabKey>(WORKSHOP_TABS[0].key)
  const [searchText, setSearchText] = useState('')
  const [rows, setRows] = useState<WorkshopRecord[]>([])
  const [assistants, setAssistants] = useState<AssistantCard[]>([])
  const [groupId, setGroupId] = useState('')
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  // 我的助手：只读详情抽屉
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailAgent, setDetailAgent] = useState<AssistantCard | null>(null)
  const [directoryActivated, setDirectoryActivated] = useState(false)
  // 高级筛选：面板草稿值 / 已生效值（点「查询」才生效，对齐 abi DeferredRangePicker）
  const [filterOpen, setFilterOpen] = useState(false)
  const [pendingRange, setPendingRange] = useState<any>(null)
  const [dateRange, setDateRange] = useState<any>(null)
  // 前端分页（对齐 abi：接口返回全量数据）
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [jumpValue, setJumpValue] = useState('')

  // 按当前 tab 拉取列表：最近使用/我的分享走操作记录接口，我的收藏走收藏接口
  const fetchList = useCallback((tab: WorkshopTabKey) => {
    if (tab === 'my-assistant') {
      setLoading(true)
      fetchAssistantList({ status: '1' })
        .then((res: any) => {
          setAssistants(pickRows(res).map(mapAssistant))
        })
        .catch(() => {
          setAssistants([])
        })
        .finally(() => {
          setLoading(false)
        })
      return
    }
    if (tab === 'my-analysis' || tab === 'my-report') {
      setRows([])
      return
    }
    setLoading(true)
    const req =
      tab === 'my-collect'
        ? fetchFavoriteList()
        : fetchOperateRecordList(tab === 'recently-used' ? '1' : '3')
    req
      .then((res: any) => {
        setRows(pickRows(res).map(mapRecord))
      })
      .catch(() => {
        setRows([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchList(activeTab)
  }, [activeTab, fetchList])

  // 拉取助手分组目录（groupType=assistant），供「数据目录」下拉筛选
  useEffect(() => {
    fetchSemanticGroups({ groupType: 'assistant', pageNum: 1, pageSize: 60, spaceId: getSpaceId() || undefined })
      .then((res: any) => {
        const list = res?.data?.rows || res?.rows || res?.data || []
        setGroups(Array.isArray(list) ? list : [])
      })
      .catch(() => setGroups([]))
  }, [])

  const handleTabChange = useCallback((key: WorkshopTabKey) => {
    setActiveTab(key)
    setSearchText('')
    setGroupId('')
    setPendingRange(null)
    setDateRange(null)
    setCurrentPage(1)
    setRows([])
    setAssistants([])
  }, [])

  const handleQuery = useCallback(() => {
    setFilterOpen(false)
    setDateRange(pendingRange)
    setCurrentPage(1)
  }, [pendingRange])

  const handleReset = useCallback(() => {
    setFilterOpen(false)
    setSearchText('')
    setGroupId('')
    setPendingRange(null)
    setDateRange(null)
    setCurrentPage(1)
    fetchList(activeTab)
  }, [activeTab, fetchList])

  const handleOpenConversation = useCallback(
    (record: WorkshopRecord) => {
      if (!record.chatId) return
      navigate({ to: TASK_DETAIL_ROUTE, params: { taskId: record.chatId } })
    },
    [navigate],
  )

  // 点击助手卡片不立即创建会话：仅跳转携带 appId 进入助手欢迎页（展示开场引导），
  // 首次发送时由会话页创建绑定该助手的新会话（载荷与之前立即创建一致，仅时机延后）。
  const handleEnterAssistantChat = useCallback(
    (agent: AssistantCard) => {
      navigate({
        to: TASK_DETAIL_ROUTE,
        params: { taskId: 'new' },
        search: { appId: agent.id },
      })
    },
    [navigate],
  )

  // 查看助手详情（只读抽屉）
  const handleViewAssistant = useCallback((agent: AssistantCard) => {
    setDetailAgent(agent)
    setDetailOpen(true)
  }, [])

  // 名称搜索 + 时间范围过滤 + 前端分页
  const isAssistantTab = activeTab === 'my-assistant'

  const filteredRows = useMemo(() => {
    const keyword = searchText.trim()
    const byName = keyword
      ? rows.filter((r) => r.chatName.includes(keyword) || r.spaceName.includes(keyword))
      : rows
    return filterByTimeRange(byName, dateRange)
  }, [rows, searchText, dateRange])

  // 我的助手：数据目录（分组，仅当前分组自身，不含子分组） + 名称/描述搜索 + 创建时间范围过滤（对齐 abi filterByCreateTime）
  const filteredAssistants = useMemo(() => {
    const keyword = searchText.trim()
    let byGroup = assistants
    if (groupId) {
      byGroup = assistants.filter((a) => a.groupId != null && String(a.groupId) === groupId)
    }
    const byName = keyword
      ? byGroup.filter((a) => a.name.includes(keyword) || a.description.includes(keyword))
      : byGroup
    if (!dateRange || !dateRange[0] || !dateRange[1]) return byName
    const start = dayjs(dateRange[0]).startOf('day')
    const end = dayjs(dateRange[1]).endOf('day')
    return byName.filter((a) => {
      const t = dayjs(a.createTime)
      return t.isValid() && !t.isBefore(start) && !t.isAfter(end)
    })
  }, [assistants, searchText, dateRange, groupId])

  const totalCount = isAssistantTab ? filteredAssistants.length : filteredRows.length
  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const pagedRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredRows, currentPage, pageSize],
  )
  const pagedAssistants = useMemo(
    () => filteredAssistants.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredAssistants, currentPage, pageSize],
  )

  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page)
      }
    },
    [totalPages],
  )

  const handlePageSizeChange = useCallback((value: number) => {
    setPageSize(value)
    setCurrentPage(1)
  }, [])

  const handleJump = useCallback(() => {
    const page = parseInt(jumpValue, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page)
      setJumpValue('')
    }
  }, [jumpValue, totalPages, handlePageChange])

  // 页码渲染（对齐 abi：最多 5 个可见页码 + 省略号）
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
      if (page === '...') return <span key={`ellipsis-${idx}`} className="ws-page-item ws-page-ellipsis">...</span>
      const isActive = page === currentPage
      return (
        <span
          key={page}
          className={`ws-page-item ${isActive ? 'ws-page-active' : ''}`}
          onClick={() => handlePageChange(page as number)}
        >
          {page}
        </span>
      )
    })
  }

  // 高级筛选面板（时间范围 + 重置/查询）
  const filterPanel = (
    <div className="ws-filter-panel">
      <div className="ws-filter-grid">
        <label className="ws-filter-field">
          <span>时间范围</span>
          {filterOpen ? (
            <RetryableLazy
              loader={loadDateRangePicker}
              componentProps={{ value: pendingRange, onChange: setPendingRange }}
              fallback={<div aria-busy="true" className="h-8 w-[260px] animate-pulse rounded-md bg-slate-100" />}
            />
          ) : null}
        </label>
        <div className="ws-filter-actions">
          <Button className="ws-reset-btn" icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button className="ws-query-btn" type="primary" onClick={handleQuery}>
            <SearchOutlined /> 查询
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="workshop-view">
      <div className="content-page-title-row">
        <SidebarCollapseButton />
        <div className="content-page-title">应用工坊</div>
      </div>

      {/* Tabs */}
      <div className="ws-tabs">
        {WORKSHOP_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`ws-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + 高级筛选（对齐 abi SearchFilterBar） */}
      <div className="ws-search-row">
        <Input
          allowClear
          className="ws-field-input"
          placeholder={isAssistantTab ? '请输入助手名称' : '请输入对话名称'}
          prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value)
            setCurrentPage(1)
          }}
        />
        {isAssistantTab && (
          directoryActivated ? (
            <RetryableLazy
              loader={loadDataDirectoryDropdown}
              componentProps={{
                assistants,
                groups,
                initialOpen: true,
                onChange: (id: string) => {
                  setGroupId(id)
                  setCurrentPage(1)
                },
                value: groupId,
              }}
              fallback={<div aria-busy="true" className="ws-filter-btn ws-filter-btn--loading">正在加载目录…</div>}
            />
          ) : (
            <Button
              className="ws-filter-btn"
              icon={<FolderOutlined />}
              onClick={() => setDirectoryActivated(true)}
              onFocus={() => void loadDataDirectoryDropdown()}
              onMouseEnter={() => void loadDataDirectoryDropdown()}
            >
              数据目录
              <DownOutlined className="ws-filter-arrow" />
            </Button>
          )
        )}
        <Popover
          content={filterPanel}
          open={filterOpen}
          placement="bottomRight"
          trigger="click"
          onOpenChange={setFilterOpen}
        >
          <Button className="ws-filter-btn" icon={<FilterOutlined />}>
            高级筛选
            <DownOutlined className={`ws-filter-arrow ${filterOpen ? 'ws-filter-arrow-open' : ''}`} />
          </Button>
        </Popover>
      </div>

      {/* Data area：占满剩余高度 */}
      <Spin spinning={loading} wrapperClassName="ws-data-spin">
        <div className="ws-data-area">
          {isAssistantTab ? (
            pagedAssistants.length === 0 ? (
              !loading && (
                <div className="ws-empty">
                  <Empty description="暂无助手" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
              )
            ) : (
              <div className="ws-card-scroll">
                <div className="ws-card-grid">
                  {pagedAssistants.map((agent) => {
                    const statusLabel =
                      agent.status === '1' ? '当前启用' : agent.status === '0' ? '编辑中' : '历史版本'
                    const tagCls = agent.status === '1' ? '' : agent.status === '0' ? 'draft' : 'archived'
                    return (
                      <div
                        key={agent.id}
                        className="ws-assistant-card ws-assistant-card--clickable"
                        onClick={() => handleEnterAssistantChat(agent)}
                      >
                        <div className="wac-head">
                          <AssistantIconBlock iconKey={agent.icon} radius={12} size={42} />
                          <div className="wac-main">
                            <div className="wac-title" title={agent.name}>
                              {agent.name}
                            </div>
                            <div className="wac-desc">{agent.description || '暂无描述'}</div>
                          </div>
                        </div>
                        <div className="wac-footer">
                          <span className={`wac-tag ${tagCls}`}>{statusLabel}</span>
                          <div className="wac-actions">
                            <button
                              type="button"
                              className="wac-act"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewAssistant(agent)
                              }}
                            >
                              <EyeOutlined /> 查看
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          ) : pagedRows.length === 0 ? (
            // 加载中不渲染空态（由 Spin 遮罩负责）
            !loading && (
              <div className="ws-empty">
                <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )
          ) : (
            <div className="ws-card-scroll">
              <div className="ws-card-grid">
                {pagedRows.map((record) => (
                  <div key={record.id} className="ws-assistant-card">
                    <div className="wac-head">
                      <AssistantIconBlock iconKey="chat" radius={12} size={42} />
                      <div className="wac-main">
                        <div className="wac-title" title={record.chatName}>
                          {record.chatName}
                        </div>
                        <div className="wac-desc">所属空间：{record.spaceName}</div>
                      </div>
                    </div>
                    {/* 无状态标签，操作按钮保持与助手卡片同一位置（右下角） */}
                    <div className="wac-footer wac-footer--end">
                      <div className="wac-actions">
                        <button
                          type="button"
                          className="wac-act"
                          onClick={() => handleOpenConversation(record)}
                        >
                          进入对话
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Spin>

      {/* Pagination（对齐 abi data-source-pagination） */}
      <div className="ws-pagination">
        <span className="ws-total-text">共 {totalCount} 条</span>
        <div className="ws-pagination-controls">
          <Select
            aria-label="每页条数"
            className="ws-page-size-select"
            value={pageSize}
            options={PAGE_SIZE_OPTIONS}
            onChange={handlePageSizeChange}
          />
          <button
            type="button"
            className="ws-page-btn"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            ‹
          </button>
          {renderPageNumbers()}
          <button
            type="button"
            className="ws-page-btn"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            ›
          </button>
          <span className="ws-quick-jumper">
            前往
            <Input
              aria-label="跳转页码"
              className="ws-jump-input"
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onPressEnter={handleJump}
            />
            页
          </span>
        </div>
      </div>
      {detailOpen ? (
        <RetryableLazy
          loader={loadAssistantDetailDrawer}
          componentProps={{
            appId: detailAgent?.id,
            fallback: detailAgent,
            onClose: () => setDetailOpen(false),
            open: detailOpen,
          }}
          fallback={<div aria-busy="true" className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/90">正在加载助手详情…</div>}
        />
      ) : null}
    </div>
  )
}

export const Route = createFileRoute('/chat/workshop/')({
  component: WorkshopView,
})
