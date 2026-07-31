import type { RefObject } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface NavItem {
  /** 对应用户消息锚点 human-msg-${order}（与 MessageList 的 item.order 一致，可为数字或临时字符串 id） */
  order: number | string
  /** 用于预览列表展示的问题文本 */
  text: string
}

interface MessageNavRailProps {
  items: NavItem[]
  /** 会话滚动容器 */
  containerRef: RefObject<HTMLDivElement>
}

// 注入一次全局样式：预览面板 / 导航条内滚动条隐藏 + 预览项样式
const STYLE_ID = 'message-nav-rail-style'
const STYLE_CSS = `
.mnr-scroll { scrollbar-width: none; -ms-overflow-style: none; }
.mnr-scroll::-webkit-scrollbar { width: 0; height: 0; display: none; }
.mnr-preview-item {
  padding: 6px 10px;
  font-size: 12.5px;
  line-height: 1.45;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background-color .12s, color .12s;
}
`
function useInjectStyle() {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById(STYLE_ID)) return
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = STYLE_CSS
    document.head.appendChild(el)
  }, [])
}

const ACCENT = '#3470f6'

const MessageNavRail = ({ items, containerRef }: MessageNavRailProps) => {
  useInjectStyle()
  const [activeOrder, setActiveOrder] = useState<number | string | undefined>(items[0]?.order)
  const [hovered, setHovered] = useState(false)
  const [hoverOrder, setHoverOrder] = useState<number | string | null>(null)

  // 点击定位后短时锁定 active，避免平滑滚动途中高亮抖动
  const lockRef = useRef(false)
  const lockTimerRef = useRef<number>()
  const closeTimerRef = useRef<number>()

  // 计算当前视口内“刚滚过顶部”的锚点为 active
  const computeActive = useCallback(() => {
    const container = containerRef.current
    if (!container || items.length === 0) return
    const cTop = container.getBoundingClientRect().top
    const threshold = 120 // 容器顶部往下 120px 内视为当前
    let active = items[0].order
    for (const it of items) {
      const el = document.getElementById(`human-msg-${it.order}`)
      if (!el) continue
      const top = el.getBoundingClientRect().top - cTop
      if (top - threshold <= 0) active = it.order
      else break
    }
    setActiveOrder(active)
  }, [containerRef, items])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let raf = 0
    const onScroll = () => {
      if (lockRef.current || raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        computeActive()
      })
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => computeActive()) : null
    ro?.observe(container)
    computeActive()
    return () => {
      container.removeEventListener('scroll', onScroll)
      ro?.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [containerRef, computeActive])

  useEffect(() => () => {
    window.clearTimeout(lockTimerRef.current)
    window.clearTimeout(closeTimerRef.current)
  }, [])

  const scrollTo = (order: number | string) => {
    const el = document.getElementById(`human-msg-${order}`)
    if (!el) return
    setActiveOrder(order)
    lockRef.current = true
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.clearTimeout(lockTimerRef.current)
    lockTimerRef.current = window.setTimeout(() => {
      lockRef.current = false
      computeActive()
    }, 600)
  }

  const openPreview = () => {
    window.clearTimeout(closeTimerRef.current)
    setHovered(true)
  }
  const scheduleClose = () => {
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => {
      setHovered(false)
      setHoverOrder(null)
    }, 200)
  }

  // 单轮对话不展示
  if (items.length < 2) return null

  return (
    <div
      style={{
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
      }}
      onMouseEnter={openPreview}
      onMouseLeave={scheduleClose}
    >
      {/* 左侧：问题预览列表 */}
      {hovered && (
        <div
          style={{
            marginRight: 10,
            width: 240,
            background: '#fff',
            border: '1px solid #eef0f4',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
            padding: 6,
          }}
        >
          <div className="mnr-scroll" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {items.map((it) => {
              const active = it.order === activeOrder
              const isHover = it.order === hoverOrder
              return (
                <div
                  key={it.order}
                  className="mnr-preview-item"
                  title={it.text}
                  onClick={() => scrollTo(it.order)}
                  onMouseEnter={() => setHoverOrder(it.order)}
                  onMouseLeave={() => setHoverOrder(null)}
                  style={{
                    color: active ? ACCENT : '#4b5563',
                    fontWeight: active ? 600 : 400,
                    background: isHover ? '#f0f5ff' : 'transparent',
                  }}
                >
                  {it.text || '（空）'}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 右侧：横杠导航条 */}
      <div
        className="mnr-scroll"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6,
          maxHeight: '40vh',
          overflowY: 'auto',
          padding: '4px 2px',
        }}
      >
        {items.map((it) => {
          const active = it.order === activeOrder
          const isHover = it.order === hoverOrder
          return (
            <div
              key={it.order}
              onClick={() => scrollTo(it.order)}
              onMouseEnter={() => setHoverOrder(it.order)}
              onMouseLeave={() => setHoverOrder(null)}
              style={{
                width: active || isHover ? 18 : 14,
                height: 2,
                borderRadius: 2,
                flexShrink: 0,
                cursor: 'pointer',
                background: active ? ACCENT : '#b7bdc9',
                opacity: hovered ? 1 : active ? 0.9 : 0.35,
                transition: 'width .15s, opacity .15s, background-color .15s',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default MessageNavRail
