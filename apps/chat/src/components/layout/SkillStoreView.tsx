import { DownOutlined, EyeOutlined, FilterOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, DatePicker, Empty, Input, message, Popover, Spin, Tabs } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { SkillCard } from '@/constant/layout'
import { fetchOperateNew } from '@/service/api/abi-system'
import { querySkillList, updateSkillStatus } from '@/service/api/skill'
import { getSpaceId } from '@/utils'
import SkillDetailDrawer from './SkillDetailDrawer'

type SkillStoreViewProps = {
  onBack?: () => void
}

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
  }
}

/** 已添加技能 id 本地存储 key（后端参数就绪后改为接口字段过滤） */
const MY_SKILLS_KEY = 'mySkills'

function readMySkillIds(): string[] {
  try {
    const arr = JSON.parse(localStorage.getItem(MY_SKILLS_KEY) || '[]')
    return Array.isArray(arr) ? arr.map(String) : []
  } catch {
    return []
  }
}

export function SkillStoreView({ onBack }: SkillStoreViewProps) {
  const [searchText, setSearchText] = useState('')
  const [cards, setCards] = useState<SkillCard[]>([])
  const [loading, setLoading] = useState(false)
  // 保存原始技能项（用于详情抽屉），key 为技能 id
  const [rawMap, setRawMap] = useState<Record<string, SkillItem>>({})
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeSkill, setActiveSkill] = useState<SkillItem | null>(null)
  const [tab, setTab] = useState<'plaza' | 'mine'>('plaza')
  // 已添加到「我的技能」的技能 id
  const [myIds, setMyIds] = useState<string[]>(readMySkillIds)
  // 高级筛选：面板草稿值 / 已生效值（点「查询」才生效，对齐应用工坊）
  const [filterOpen, setFilterOpen] = useState(false)
  const [pendingRange, setPendingRange] = useState<any>(null)
  const [dateRange, setDateRange] = useState<any>(null)

  // 拉取技能列表（与 abi 同一接口）
  const fetchList = useCallback(() => {
    setLoading(true)
    return querySkillList({ spaceId: getSpaceId() })
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

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // 打开详情抽屉
  const handleOpenDetail = useCallback(
    (card: SkillCard) => {
      setActiveSkill(rawMap[card.key] || null)
      setDetailOpen(true)
    },
    [rawMap],
  )

  const tabCards = tab === 'mine' ? cards.filter((c) => myIds.includes(c.key)) : cards

  // 仅搜索/筛选当前 tab 下的内容：名称/描述/标签关键字 + 高级筛选时间范围
  const filteredCards = useMemo(() => {
    const kw = searchText.trim()
    let arr = kw
      ? tabCards.filter(
          (c) => c.title.includes(kw) || c.description.includes(kw) || c.tagLabel.includes(kw),
        )
      : tabCards
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dayjs(dateRange[0]).startOf('day')
      const end = dayjs(dateRange[1]).endOf('day')
      arr = arr.filter((c) => {
        const t = dayjs(rawMap[c.key]?.createTime)
        return t.isValid() && !t.isBefore(start) && !t.isAfter(end)
      })
    }
    return arr
  }, [tabCards, searchText, dateRange, rawMap])

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
          message.success(nextEnabled ? '已启用' : '已停用')
        }
      })
      .catch(() => {
        setCards((cur) => cur.map((c) => (c.key === card.key ? { ...c, enabled: card.enabled } : c)))
      })
  }, [])

  // 广场卡片右上角「添加」：走对话收藏接口（addOrRemove 由后端切换状态），类型为 skill
  const handleAddSkill = useCallback(
    (card: SkillCard) => {
      if (myIds.includes(card.key)) return
      fetchOperateNew({ favorType: 'skill', favorId: card.key }).catch(() => {})
      const next = [...myIds, card.key]
      setMyIds(next)
      localStorage.setItem(MY_SKILLS_KEY, JSON.stringify(next))
      message.success('已添加到我的技能')
    },
    [myIds],
  )

  // 取消添加：同一收藏接口，addOrRemove 自动取消收藏
  const handleRemoveSkill = useCallback(
    (card: SkillCard) => {
      if (!myIds.includes(card.key)) return
      fetchOperateNew({ favorType: 'skill', favorId: card.key }).catch(() => {})
      const next = myIds.filter((id) => id !== card.key)
      setMyIds(next)
      localStorage.setItem(MY_SKILLS_KEY, JSON.stringify(next))
      message.success('已从我的技能移除')
    },
    [myIds],
  )

  // 切换 tab 时清空搜索与时间范围（搜索仅作用于当前 tab）
  const handleTabChange = useCallback((k: 'plaza' | 'mine') => {
    setTab(k)
    setSearchText('')
    setPendingRange(null)
    setDateRange(null)
  }, [])

  // 点「查询」才应用时间范围（草稿值 → 生效值），对齐应用工坊
  const handleQuery = useCallback(() => {
    setFilterOpen(false)
    setDateRange(pendingRange)
  }, [pendingRange])

  const handleResetFilter = useCallback(() => {
    setFilterOpen(false)
    setSearchText('')
    setPendingRange(null)
    setDateRange(null)
  }, [])

  // 高级筛选面板（时间范围 + 重置/查询），对齐应用工坊
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
    <div className="skill-store-view" style={{ display: 'flex' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
        技能商店
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
          onChange={(e) => setSearchText(e.target.value)}
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

      {/* Card Grid：格式完全对齐 abi 技能管理 abi-data-card */}
      <Spin spinning={loading}>
        {!loading && filteredCards.length === 0 ? (
          <div className="abi-card-empty">
            <Empty description="暂无技能" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <div className="abi-card-grid">
            <div className="abi-card-grid-inner">
              {filteredCards.map((card) => {
                const raw = rawMap[card.key] || ({} as SkillItem)
                const spaceName = raw.spaceName || (raw.spaceId ? `空间${raw.spaceId}` : '')
                const added = myIds.includes(card.key)
                return (
                  <div key={card.key} className="abi-data-card" onClick={() => handleOpenDetail(card)}>
                    <div className="abi-data-card-head">
                      <div className="abi-data-card-title">
                        <span className="abi-data-card-name" title={card.title}>{card.title}</span>
                      </div>
                      {/* 广场 Tab：添加/已添加（点已添加可取消）；我的技能 Tab：移除 */}
                      {tab === 'plaza' ? (
                        added ? (
                          <button className="btn-accent-gradient btn-accent-gradient--sm btn-accent-gradient--added" onClick={(e) => { e.stopPropagation(); handleRemoveSkill(card) }}>
                            已添加
                          </button>
                        ) : (
                          <button className="btn-accent-gradient btn-accent-gradient--sm" onClick={(e) => { e.stopPropagation(); handleAddSkill(card) }}>
                            + 添加
                          </button>
                        )
                      ) : (
                        <button className="btn-accent-gradient btn-accent-gradient--sm btn-accent-gradient--danger" onClick={(e) => { e.stopPropagation(); handleRemoveSkill(card) }}>
                          移除
                        </button>
                      )}
                    </div>
                    <div className="abi-data-card-body">
                      <div className="row"><span className="lbl">技能描述</span><span className="val">{card.description || '-'}</span></div>
                      <div className="row"><span className="lbl">空间</span><span className="val">{spaceName || '-'}</span></div>
                      {raw.createTime && (
                        <div className="row"><span className="lbl">创建时间</span><span className="val">{String(raw.createTime).replace('T', ' ')}</span></div>
                      )}
                      <div className="row">
                        <span className="lbl">状态</span>
                        <span className={`abi-status-tag ${card.enabled ? 'status-normal' : 'status-disabled'}`}>
                          {card.enabled ? '启用' : '停用'}
                        </span>
                      </div>
                    </div>
                    <div className="abi-data-card-footer">
                      <button className="abi-card-act" onClick={(e) => { e.stopPropagation(); handleOpenDetail(card) }}>
                        <EyeOutlined style={{ marginRight: 3 }} />查看
                      </button>
                      <button className="abi-card-act" onClick={(e) => { e.stopPropagation(); handleToggleEnable(card) }}>
                        {card.enabled ? '停用' : '启用'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Spin>

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
