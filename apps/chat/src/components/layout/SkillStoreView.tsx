import { DatabaseOutlined, FileTextOutlined, LineChartOutlined, SearchOutlined, ToolOutlined, WarningOutlined } from '@ant-design/icons'
import { message, Spin, Tabs } from 'antd'
import { useCallback, useEffect, useState } from 'react'

import type { SkillCard } from '@/constant/layout'
import { querySkillList, updateSkillInfo, updateSkillStatus } from '@/service/api/skill'
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

/** Icon mapping for each card color */
const iconMap: Record<string, React.ReactNode> = {
  c1: <DatabaseOutlined style={{ fontSize: 20, color: '#fff' }} />,
  c2: <LineChartOutlined style={{ fontSize: 20, color: '#fff' }} />,
  c3: <LineChartOutlined style={{ fontSize: 20, color: '#fff' }} />,
  c4: <ToolOutlined style={{ fontSize: 20, color: '#fff' }} />,
  c5: <FileTextOutlined style={{ fontSize: 20, color: '#fff' }} />,
  c6: <WarningOutlined style={{ fontSize: 20, color: '#fff' }} />,
}

/** Gradient for each card color */
const colorGradients: Record<string, string> = {
  c1: 'linear-gradient(135deg, #5b7cf7, #6d8dfa)',
  c2: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
  c3: 'linear-gradient(135deg, #10b981, #34d399)',
  c4: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  c5: 'linear-gradient(135deg, #ec4899, #f472b6)',
  c6: 'linear-gradient(135deg, #ef4444, #f87171)',
}

const colorShadows: Record<string, string> = {
  c1: '0 3px 10px rgba(91,124,247,0.3)',
  c2: '0 3px 10px rgba(139,92,246,0.3)',
  c3: '0 3px 10px rgba(16,185,129,0.3)',
  c4: '0 3px 10px rgba(245,158,11,0.3)',
  c5: '0 3px 10px rgba(236,72,153,0.3)',
  c6: '0 3px 10px rgba(239,68,68,0.3)',
}

const tagStyles: Record<string, { bg: string; color: string }> = {
  builtin: { bg: 'rgba(16,185,129,0.08)', color: '#059669' },
  custom: { bg: 'rgba(91,124,247,0.08)', color: 'var(--accent)' },
  plugin: { bg: 'rgba(139,92,246,0.08)', color: 'var(--accent-2)' },
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

  const filteredCards = searchText
    ? tabCards.filter(
        (c) =>
          c.title.includes(searchText) ||
          c.description.includes(searchText) ||
          c.tagLabel.includes(searchText),
      )
    : tabCards

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

  // 广场卡片右上角「添加」：调修改技能接口，添加后在「我的技能」Tab 展示
  const handleAddSkill = useCallback(
    (card: SkillCard) => {
      if (myIds.includes(card.key)) return
      // TODO: 后端提供添加参数后在此补充（接口仍为修改技能接口）
      updateSkillInfo({ skillId: card.key }).catch(() => {})
      const next = [...myIds, card.key]
      setMyIds(next)
      localStorage.setItem(MY_SKILLS_KEY, JSON.stringify(next))
      message.success('已添加到我的技能')
    },
    [myIds],
  )

  // 取消添加：同样走修改技能接口（后续参数由后端提供）
  const handleRemoveSkill = useCallback(
    (card: SkillCard) => {
      if (!myIds.includes(card.key)) return
      // TODO: 后端提供移除参数后在此补充（接口仍为修改技能接口）
      updateSkillInfo({ skillId: card.key }).catch(() => {})
      const next = myIds.filter((id) => id !== card.key)
      setMyIds(next)
      localStorage.setItem(MY_SKILLS_KEY, JSON.stringify(next))
      message.success('已从我的技能移除')
    },
    [myIds],
  )

  return (
    <div className="skill-store-view" style={{ display: 'flex' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
        技能商店
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div className="ss-search-field">
          <SearchOutlined style={{ fontSize: 15, color: 'var(--ink-4)' }} />
          <input
            type="text"
            placeholder="搜索技能名称、类型..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs：广场 / 我的技能 */}
      <Tabs
        activeKey={tab}
        items={[
          { key: 'plaza', label: '广场' },
          { key: 'mine', label: '我的技能' },
        ]}
        onChange={(k) => setTab(k as 'plaza' | 'mine')}
      />

      {/* Card Grid */}
      <Spin spinning={loading}>
        {!loading && filteredCards.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-4)' }}>
            暂无技能
          </div>
        ) : (
          <div className="ss-grid">
            {filteredCards.map((card) => {
              const tagStyle = tagStyles[card.tag] || tagStyles.custom
              return (
                <div key={card.key} className="ss-card" style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(card)}>
                  <div className="ss-card-head">
                    <div
                      className="ss-card-icon"
                      style={{
                        background: colorGradients[card.color],
                        boxShadow: colorShadows[card.color],
                      }}
                    >
                      {iconMap[card.color]}
                    </div>
                    <div>
                      <div className="ss-card-title">{card.title}</div>
                      <div className="ss-card-desc">{card.description}</div>
                    </div>
                    {/* 广场 Tab：添加/已添加（点已添加可取消）；我的技能 Tab：移除 */}
                    {tab === 'plaza' ? (
                      <button
                        type="button"
                        className="ss-card-use"
                        style={
                          myIds.includes(card.key)
                            ? { marginLeft: 'auto', flexShrink: 0 }
                            : {
                                marginLeft: 'auto',
                                flexShrink: 0,
                                background: 'var(--accent)',
                                color: '#fff',
                                boxShadow: '0 2px 8px rgba(91,124,247,0.3)',
                              }
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          if (myIds.includes(card.key)) {
                            handleRemoveSkill(card)
                          } else {
                            handleAddSkill(card)
                          }
                        }}
                      >
                        {myIds.includes(card.key) ? '已添加' : '添加'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ss-card-use"
                        style={{
                          marginLeft: 'auto',
                          flexShrink: 0,
                          background: '#ef4444',
                          color: '#fff',
                          boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveSkill(card)
                        }}
                      >
                        移除
                      </button>
                    )}
                  </div>
                  <div className="ss-card-footer">
                    <span
                      className="ss-card-tag"
                      style={{ background: tagStyle.bg, color: tagStyle.color }}
                    >
                      {card.tagLabel}
                    </span>
                    <button
                      type="button"
                      className="ss-card-use"
                      style={
                        card.enabled
                          ? {
                              background: 'var(--accent)',
                              color: '#fff',
                              boxShadow: '0 2px 8px rgba(91,124,247,0.3)',
                            }
                          : {}
                      }
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleEnable(card)
                      }}
                    >
                      {card.enabled ? '已启用' : '启用'}
                    </button>
                  </div>
                </div>
              )
            })}
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
