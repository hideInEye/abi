import { DownOutlined, FilterOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Button, DatePicker, Empty, Input, Popover, Select, Spin } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import { SidebarCollapseButton } from '@/components/layout/SidebarCollapseButton'
import { fetchFavoriteList, fetchOperateRecordList } from '@/service/api/abi-system'

/** 应用工坊 tab 顺序：最近使用、我的收藏、我的分享、我的分析、我的报告 */
const WORKSHOP_TABS = [
  { key: 'recently-used', label: '最近使用' },
  { key: 'my-collect', label: '我的收藏' },
  { key: 'my-share', label: '我的分享' },
  { key: 'my-analysis', label: '我的分析' },
  { key: 'my-report', label: '我的报告' },
] as const

type WorkshopTabKey = (typeof WORKSHOP_TABS)[number]['key']

/** 操作记录/收藏列表统一行数据 */
type WorkshopRecord = {
  id: string
  chatId: string
  chatName: string
  spaceName: string
  time: string
}

/** 各 tab 时间列标题 */
const TIME_COLUMN_TITLE: Partial<Record<WorkshopTabKey, string>> = {
  'recently-used': '最近使用时间',
  'my-collect': '收藏时间',
  'my-share': '分享时间',
}

/** 从接口响应中提取 rows（兼容 {data:{rows}} / {data:[]} 结构） */
function pickRows(res: any): any[] {
  const rows = res?.data?.rows || res?.data?.list || (Array.isArray(res?.data) ? res.data : [])
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
  { label: '10条/页', value: 10 },
  { label: '15条/页', value: 15 },
  { label: '20条/页', value: 20 },
  { label: '25条/页', value: 25 },
  { label: '30条/页', value: 30 },
]

export function WorkshopView() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<WorkshopTabKey>('recently-used')
  const [searchText, setSearchText] = useState('')
  const [rows, setRows] = useState<WorkshopRecord[]>([])
  const [loading, setLoading] = useState(false)
  // 高级筛选：面板草稿值 / 已生效值（点「查询」才生效，对齐 abi DeferredRangePicker）
  const [filterOpen, setFilterOpen] = useState(false)
  const [pendingRange, setPendingRange] = useState<any>(null)
  const [dateRange, setDateRange] = useState<any>(null)
  // 前端分页（对齐 abi：接口返回全量数据）
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [jumpValue, setJumpValue] = useState('')

  // 按当前 tab 拉取列表：最近使用/我的分享走操作记录接口，我的收藏走收藏接口
  const fetchList = useCallback((tab: WorkshopTabKey) => {
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

  const handleTabChange = useCallback((key: WorkshopTabKey) => {
    setActiveTab(key)
    setSearchText('')
    setPendingRange(null)
    setDateRange(null)
    setCurrentPage(1)
    setRows([])
  }, [])

  const handleQuery = useCallback(() => {
    setFilterOpen(false)
    setDateRange(pendingRange)
    setCurrentPage(1)
  }, [pendingRange])

  const handleReset = useCallback(() => {
    setFilterOpen(false)
    setSearchText('')
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

  // 名称搜索 + 时间范围过滤 + 前端分页
  const filteredRows = useMemo(() => {
    const keyword = searchText.trim()
    const byName = keyword
      ? rows.filter((r) => r.chatName.includes(keyword) || r.spaceName.includes(keyword))
      : rows
    return filterByTimeRange(byName, dateRange)
  }, [rows, searchText, dateRange])

  const totalCount = filteredRows.length
  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const pagedRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredRows, currentPage, pageSize],
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
          <DatePicker.RangePicker
            allowClear
            format="YYYY-MM-DD"
            placeholder={['开始时间', '结束时间']}
            value={pendingRange}
            getPopupContainer={(trigger) =>
              (trigger.closest('.ant-popover-inner') as HTMLElement) || (trigger.parentElement as HTMLElement)
            }
            onChange={(dates) => setPendingRange(dates)}
          />
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
          placeholder="请输入对话名称"
          prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value)
            setCurrentPage(1)
          }}
        />
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
          {!loading && pagedRows.length === 0 ? (
            <div className="ws-empty">
              <Empty description="暂无数据" />
            </div>
          ) : (
            <div className="ws-table-wrap">
              <table className="ws-table">
                <thead>
                  <tr>
                    <th>对话名称</th>
                    <th>所属空间</th>
                    <th>{TIME_COLUMN_TITLE[activeTab] || '时间'}</th>
                    <th style={{ width: 100, textAlign: 'center' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((record) => (
                    <tr key={record.id}>
                      <td>{record.chatName}</td>
                      <td>{record.spaceName}</td>
                      <td>{record.time}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="ws-link-btn"
                          onClick={() => handleOpenConversation(record)}
                        >
                          进入对话
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Spin>

      {/* Pagination（对齐 abi data-source-pagination） */}
      <div className="ws-pagination">
        <span className="ws-total-text">共 {totalCount} 条</span>
        <div className="ws-pagination-controls">
          <Select
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
              className="ws-jump-input"
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onPressEnter={handleJump}
            />
            页
          </span>
        </div>
      </div>
    </div>
  )
}
