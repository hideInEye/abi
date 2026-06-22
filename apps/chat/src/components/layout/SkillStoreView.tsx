import { DatabaseOutlined, FileTextOutlined, LineChartOutlined, SearchOutlined, ToolOutlined, WarningOutlined } from '@ant-design/icons'
import { useCallback, useState } from 'react'

import { skillStoreCards, type SkillCard } from '@/constant/layout'

type SkillStoreViewProps = {
  onBack?: () => void
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

export function SkillStoreView({ onBack }: SkillStoreViewProps) {
  const [searchText, setSearchText] = useState('')
  const [cards, setCards] = useState<SkillCard[]>(skillStoreCards)

  const filteredCards = searchText
    ? cards.filter(
        (c) =>
          c.title.includes(searchText) ||
          c.description.includes(searchText) ||
          c.tagLabel.includes(searchText),
      )
    : cards

  const handleToggleEnable = useCallback((key: string) => {
    setCards((prev) =>
      prev.map((c) => (c.key === key ? { ...c, enabled: !c.enabled } : c)),
    )
  }, [])

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

      {/* Card Grid */}
      <div className="ss-grid">
        {filteredCards.map((card) => {
          const tagStyle = tagStyles[card.tag] || tagStyles.custom
          return (
            <div key={card.key} className="ss-card">
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
                  onClick={() => handleToggleEnable(card.key)}
                >
                  {card.enabled ? '已启用' : '启用'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
