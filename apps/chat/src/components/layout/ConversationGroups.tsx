import { PlusOutlined, RightOutlined } from '@ant-design/icons'
import { useCallback, useState } from 'react'

import { conversationGroups } from '@/constant/layout'

type ConversationGroupsProps = {
  collapsed: boolean
}

export function ConversationGroups({ collapsed }: ConversationGroupsProps) {
  /* 7. Default collapsed: all groups start as false */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(conversationGroups.map((g) => [g.key, false])),
  )

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  if (collapsed) return null

  return (
    <div className="mb-2">
      {/* Section title: 对话分组 */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        <span>对话分组</span>
        <span
          className="cursor-pointer transition-all duration-150"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--accent-soft)',
            color: '#333',
            fontWeight: 700,
          }}
          title="新建分组"
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--accent)'
            ;(e.currentTarget as HTMLElement).style.color = '#fff'
            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(91,124,247,0.3)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'
            ;(e.currentTarget as HTMLElement).style.color = '#333'
            ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
          }}
        >
          <PlusOutlined style={{ fontSize: 12, fontWeight: 700 }} />
        </span>
      </div>

      {/* Groups */}
      {conversationGroups.map((group) => {
        const isOpen = openGroups[group.key] ?? false
        return (
          <div key={group.key} className="mb-0.5">
            <div
              className="conv-group-label"
              onClick={() => toggleGroup(group.key)}
            >
              <RightOutlined
                className="transition-transform duration-200"
                style={{
                  fontSize: 12,
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  opacity: 0.5,
                  padding: 4,
                  cursor: 'pointer',
                }}
              />
              <span>{group.label}</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--ink-4)',
                  background: 'rgba(130,140,200,0.1)',
                  padding: '1px 6px',
                  borderRadius: 8,
                  fontFamily: 'var(--mono)',
                }}
              >
                {group.items.length}
              </span>
            </div>

            <div
              style={{
                maxHeight: isOpen ? 400 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-2 cursor-pointer transition-colors duration-150"
                  style={{
                    padding: '8px 12px 8px 34px',
                    borderRadius: 'var(--r-xs)',
                    fontSize: 12.5,
                    color: 'var(--ink-3)',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(130,140,200,0.08)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--ink)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--ink-3)'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: 20,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--ink-4)',
                    }}
                  />
                  <span className="truncate flex-1">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
