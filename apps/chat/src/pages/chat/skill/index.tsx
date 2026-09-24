import { DownOutlined, EyeOutlined, FilterOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Empty, Input, message, Popover, Select, Spin, Tabs } from 'antd'
import dayjs from 'dayjs'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { SkillCard } from '@/constant/layout'
import { SidebarCollapseButton } from '@/components/layout/SidebarCollapseButton'
import { AssistantIconBlock } from '@/components/AssistantIcon'
import { RetryableLazy } from '@/components/performance/RetryableLazy'
import { fetchFavoriteList, fetchOperateNew } from '@/service/api/abi-system'
import { querySkillList, updateSkillStatus } from '@/service/api/skill'
import { getSpaceId } from '@/utils/runtime'
import SkillDetailDrawer from './-SkillDetailDrawer'

const loadDateRangePicker = () => import('@/components/performance/DeferredDateRangePicker')

/** 后端技能列表项 */
type SkillItem = {
  id: number | string
  bizName?: string
  summary?: string
  status?: string | number
  visibility?: string
  spaceId?: number | string
  spaceName?: string
  createTime?: string
  icon?: string
}

/** 卡片图标颜色轮询顺序（保持静态数据多色风格） */
const COLOR_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']

/** 将后端技能映射为卡片数据，卡片样式保持现状 */
function mapSkillToCard(item: SkillItem, index: number): SkillCard {
  const v = String(item.visibility || '').toUpperCase()
  const isPublic = v === 'PUBLIC'
  return {
    key: String(item.id),
    title: item.bizName || '-',
    description: item.summary || '',
    tag: isPublic ? 'builtin' : 'custom',
    tagLabel: isPublic ? '公开' : '私有',
    color: COLOR_KEYS[index % COLOR_KEYS.length],
    enabled: String(item.status) === '1',
    icon: item.icon || undefined,
  }
}

/** 技能卡片图标：优先用接口返回的 icon（跨设备同步），兜底按 key 稳定散列 */
const SKILL_ICON_KEYS = ['data', 'table', 'orchestration', 'flow', 'automation', 'text', 'chat', 'doc', 'finance', 'account', 'ops', 'security', 'analysis', 'chart', 'other']
function skillIconKey(key: string, apiIcon?: string): string {
  // 优先使用接口返回的 icon
  if (apiIcon && SKILL_ICON_KEYS.includes(apiIcon)) return apiIcon
  // 兜底散列
  let h = 0
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return SKILL_ICON_KEYS[h % SKILL_ICON_KEYS.length]
}

const PAGE_SIZE_OPTIONS = [
  { label: '12条/页', value: 12 },
  { label: '18条/页', value: 18 },
  { label: '24条/页', value: 24 },
  { label: '30条/页', value: 30 },
]

function SkillStoreView() {
  const [searchText, setSearchText] = useState('')
  const [cards, setCards] = useState<SkillCard[]>([])
  const [loading, setLoading] = useState(false)
  // 保存原始技能项（用于详情抽屉），key 为技能 id
  const [rawMap, setRawMap] = useState<Record<string, SkillItem>>({})
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeSkill, setActiveSkill] = useState<SkillItem | null>(null)
  const [tab, setTab] = useState<'plaza' | 'mine'>('plaza')
  // 已添加到「我的技能」的技能 id；与对话收藏同一套逻辑：
  // 初始为空集合，addOrRemove 切换时按响应回写，切到「我的技能」tab 才拉 favorite/list 校准
  const [myIds, setMyIds] = useState<Set<string>>(new Set())
  // 收藏列表加载中：未返回前不渲染列表，避免广场「添加」先闪一下再变「已添加」
  const [favLoading, setFavLoading] = useState(true)
  // 高级筛选：面板草稿值 / 已生效值（点「查询」才生效，对齐应用工坊）
  const [filterOpen, setFilterOpen] = useState(false)
  const [pendingRange, setPendingRange] = useState<any>(null)
  const [dateRange, setDateRange] = useState<any>(null)
  // 前端分页（对齐应用工坑：接口返回全量数据）
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [jumpValue, setJumpValue] = useState('')

  // 拉取「我的技能」集合（仅区分 favorType=skill）
  const fetchMyIds = useCallback(() => {
    setFavLoading(true)
    // 以后端为准：先清空前端残留的旧集合，避免重复进 tab 时先闪旧数据再刷新；只以接口返回渲染
    setMyIds(new Set())
    fetchFavoriteList({ favorType: 'skill' })
      .then((res: any) => {
        const rows = res?.rows ?? res?.data?.rows ?? res?.data?.list ?? (Array.isArray(res?.data) ? res.data : [])
        const list = Array.isArray(rows) ? rows : []
        setMyIds(new Set(list.map((r: any) => String(r.favorId ?? r.favor_id ?? r.skillId ?? '')).filter(Boolean)))
      })
      .catch(() => {})
      .finally(() => {
        setFavLoading(false)
      })
  }, [])

  // 拉取技能列表（与 abi 同一接口）：不传 spaceId 查全部，前端按 visibility 过滤
  const fetchList = useCallback(() => {
    setLoading(true)
    return querySkillList({})
      .then((res: any) => {
        const rows =
          res?.data?.data?.pageItems ||
          res?.data?.data?.rows ||
          res?.data?.list ||
          res?.data?.rows ||
          res?.data?.data ||
          (Array.isArray(res?.data) ? res.data : []) ||
          res?.rows ||
          []
        const list: SkillItem[] = Array.isArray(rows) ? rows : []
        setCards(list.map(mapSkillToCard))
        const map: Record<string, SkillItem> = {}
        list.forEach((it) => {
          map[String(it.id)] = it
        })
        setRawMap(map)
      })
      .catch(() => {
        setCards([])
        setRawMap({})
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // StrictMode 开发环境会重挂载组件，用 ref 保证仅首次请求一次，避免重复调用接口；
  // 进入技能页直接调两个列表：技能列表 + 收藏列表（我的技能），广场「已添加」状态对比两者得出，不调单条状态接口
  const didInitRef = useRef(false)
  useEffect(() => {
    if (didInitRef.current) return
    didInitRef.current = true
    fetchList()
    fetchMyIds()
  }, [fetchList, fetchMyIds])

  // 切到「我的技能」tab 再拉一次收藏列表校准（以最新后端数据渲染）
  useEffect(() => {
    if (tab === 'mine') {
      fetchMyIds()
    }
  }, [tab, fetchMyIds])

  // 打开详情抽屉（收藏态由「我的技能」tab 的 favorite/list 与 addOrRemove 响应回写维护；
  // 单条 favorite/status 查询暂不接入，等后端提供批量接口后再补）
  const handleOpenDetail = useCallback(
    (card: SkillCard) => {
      setActiveSkill(rawMap[card.key] || null)
      setDetailOpen(true)
    },
    [rawMap],
  )

  // 当前 tab 可见性 + 关键字 + 时间范围，一次过滤即可（避免多层中间数组，useMemo 才真正生效）：
  // 广场——公开(PUBLIC)全平台可见，私有(PRIVATE)仅本空间可见；我的技能——仅收藏的（收藏即可见）
  const filteredCards = useMemo(() => {
    const curSpaceId = String(getSpaceId() ?? '')
    const kw = searchText.trim()
    const start = dateRange?.[0] ? dayjs(dateRange[0]).startOf('day') : null
    const end = dateRange?.[1] ? dayjs(dateRange[1]).endOf('day') : null
    return cards.filter((c) => {
      const raw = rawMap[c.key]
      if (tab === 'mine') {
        if (!myIds.has(c.key)) return false
      } else if (String(raw?.visibility || '').toUpperCase() === 'PRIVATE') {
        if (String(raw?.spaceId ?? '') !== curSpaceId) return false
      }
      if (kw && !(c.title.includes(kw) || c.description.includes(kw) || c.tagLabel.includes(kw))) return false
      if (start && end) {
        const t = dayjs(raw?.createTime)
        if (!t.isValid() || t.isBefore(start) || t.isAfter(end)) return false
      }
      return true
    })
  }, [cards, rawMap, tab, myIds, searchText, dateRange])

  const totalCount = filteredCards.length
  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const pagedCards = useMemo(
    () => filteredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredCards, currentPage, pageSize],
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

  // 页码渲染（对齐应用工坑：最多 5 个可见页码 + 省略号）
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

  const handleToggleEnable = useCallback((card: SkillCard) => {
    const nextEnabled = !card.enabled
    const nextStatus = nextEnabled ? '1' : '0'
    // 乐观更新
    setCards((prev) => prev.map((c) => (c.key === card.key ? { ...c, enabled: nextEnabled } : c)))
    // 副作用放在 setState 更新函数外，避免 StrictMode 下重复调用接口
    updateSkillStatus({ skillId: card.key, status: nextStatus })
      .then((res: any) => {
        const code = Number(res?.code)
        if (code && code !== 200) {
          // 接口失败，回滚
          setCards((cur) => cur.map((c) => (c.key === card.key ? { ...c, enabled: card.enabled } : c)))
        } else {
          message.success(nextEnabled ? '已发布' : '已取消发布')
        }
      })
      .catch(() => {
        setCards((cur) => cur.map((c) => (c.key === card.key ? { ...c, enabled: card.enabled } : c)))
      })
  }, [])

  // 添加/移除：与收藏对话同一套逻辑（addOrRemove 由后端切换，按响应 favoriteStatus 回写，不乐观更新）
  const handleToggleSkill = useCallback(async (card: SkillCard) => {
    try {
      const res: any = await fetchOperateNew({ favorType: 'skill', favorId: card.key })
      if (res?.code !== 200) {
        message.error(res?.message || res?.msg || '操作失败，请稍后再试')
        return
      }
      const favorited = Number(res?.data?.favoriteStatus) === 1
      setMyIds((prev) => {
        const next = new Set(prev)
        if (favorited) next.add(card.key)
        else next.delete(card.key)
        return next
      })
      message.success(favorited ? '添加成功' : '取消添加成功')
    } catch {
      message.error('操作失败，请稍后再试')
    }
  }, [])

  // 切换 tab 时清空搜索与时间范围（搜索仅作用于当前 tab）
  const handleTabChange = useCallback((k: 'plaza' | 'mine') => {
    setTab(k)
    setSearchText('')
    setPendingRange(null)
    setDateRange(null)
    setCurrentPage(1)
  }, [])

  // 点「查询」才应用时间范围（草稿值 → 生效值），对齐应用工坊
  const handleQuery = useCallback(() => {
    setFilterOpen(false)
    setDateRange(pendingRange)
    setCurrentPage(1)
  }, [pendingRange])

  const handleResetFilter = useCallback(() => {
    setFilterOpen(false)
    setSearchText('')
    setPendingRange(null)
    setDateRange(null)
    setCurrentPage(1)
  }, [])

  // 高级筛选面板（时间范围 + 重置/查询），对齐应用工坊
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
          <Button className="ws-reset-btn" icon={<ReloadOutlined />} onClick={handleResetFilter}>
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
    <div className="skill-store-view">
      <div className="content-page-title-row">
        <SidebarCollapseButton />
        <div className="content-page-title">技能商店</div>
      </div>

      {/* Tabs：广场 / 我的技能（格式对齐 abi 技能管理 skill-filter-tabs） */}
      <Tabs
        activeKey={tab}
        className="skill-filter-tabs"
        items={[
          { key: 'plaza', label: '广场' },
          { key: 'mine', label: '我的技能' },
        ]}
        onChange={(k) => handleTabChange(k as 'plaza' | 'mine')}
      />

      {/* Search + 高级筛选（对齐应用工坊：输入框 + 高级筛选按钮；搜索/筛选仅作用于当前 tab） */}
      <div className="ws-search-row">
        <Input
          allowClear
          className="ws-field-input"
          placeholder="搜索技能名称、类型..."
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

      {/* Card Grid：样式对齐应用工坊「我的助手」ws-assistant-card（技能功能保留） */}
      <Spin spinning={loading || favLoading} wrapperClassName="ws-data-spin">
        {favLoading ? null : !loading && filteredCards.length === 0 ? (
          <div className="ws-empty">
            <Empty description="暂无技能" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <div className="ws-card-scroll">
            <div className="ws-card-grid">
              {pagedCards.map((card) => {
                const added = myIds.has(card.key)
                return (
                  <div key={card.key} className="ws-assistant-card" onClick={() => handleOpenDetail(card)}>
                    <div className="wac-head">
                      <AssistantIconBlock iconKey={skillIconKey(card.key, card.icon)} radius={12} size={42} />
                      <div className="wac-main">
                        <div className="wac-title" title={card.title}>{card.title}</div>
                        <div className="wac-desc">{card.description || '暂无描述'}</div>
                      </div>
                      {/* 广场 Tab：添加/已添加（点已添加可取消）；我的技能 Tab：移除 */}
                      {tab === 'plaza' ? (
                        added ? (
                          <button className="wac-add-btn wac-add-btn--added" onClick={(e) => { e.stopPropagation(); handleToggleSkill(card) }}>
                            已添加
                          </button>
                        ) : (
                          <button className="wac-add-btn" onClick={(e) => { e.stopPropagation(); handleToggleSkill(card) }}>
                            + 添加
                          </button>
                        )
                      ) : (
                        <button className="wac-add-btn wac-add-btn--danger" onClick={(e) => { e.stopPropagation(); handleToggleSkill(card) }}>
                          移除
                        </button>
                      )}
                    </div>
                    <div className="wac-footer">
                      <span className={`wac-tag ${card.enabled ? '' : 'offline'}`}>{card.enabled ? '当前启用' : '离线版本'}</span>
                      <div className="wac-actions">
                        <button type="button" className="wac-act" onClick={(e) => { e.stopPropagation(); handleOpenDetail(card) }}>
                          <EyeOutlined /> 查看
                        </button>
                        <button type="button" className="wac-act" onClick={(e) => { e.stopPropagation(); handleToggleEnable(card) }}>
                          {card.enabled ? '取消发布' : '发布'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Spin>

      {/* Pagination（对齐应用工坑 ws-pagination） */}
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

      <SkillDetailDrawer
        open={detailOpen}
        skill={activeSkill as any}
        onClose={() => setDetailOpen(false)}
        onDeleted={() => {
          setDetailOpen(false)
          fetchList()
        }}
      />
    </div>
  )
}

export const Route = createFileRoute('/chat/skill/')({
  component: SkillStoreView,
})
