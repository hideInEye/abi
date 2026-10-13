import { useMemo, useState } from 'react'
import { Drawer, Dropdown, Spin } from 'antd'
import { CloseOutlined } from '@ant-design/icons'

import styles from './HistoryDrawer.module.css'
import type { WidgetSessionItem } from './service'

export interface HistoryDrawerProps {
  open: boolean
  loading?: boolean
  sessions: WidgetSessionItem[]
  activeSessionId?: string
  getContainer: () => HTMLElement
  onSelect: (item: WidgetSessionItem) => void
  /** 重命名；返回 false 时保留行内编辑态 */
  onRename: (item: WidgetSessionItem, title: string) => Promise<boolean> | boolean
  onToggleTop: (item: WidgetSessionItem) => void
  onDelete: (item: WidgetSessionItem) => void
  onClose: () => void
}

/* 线宽图标（同悬浮窗头部风格：strokeWidth 2 + 圆角线帽）：竖三点/重命名/置顶/删除 */
const IconRowMore = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
)
const IconRename = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)
const IconTop = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 4h6l-1 6 3 3v2H7v-2l3-3Z" />
    <line x1="12" y1="15" x2="12" y2="21" />
  </svg>
)
const IconDelete = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
)

const DAY = 86400000
type GroupKey = 'today' | 'yesterday' | 'week' | 'older'
const GROUP_LABELS: [GroupKey, string][] = [
  ['today', '今天'],
  ['yesterday', '昨天'],
  ['week', '7天内'],
  ['older', '更早'],
]

/** 按更新时间归组；缺失时间归“更早” */
function groupOf(ts: number | undefined, todayStart: number): GroupKey {
  if (!ts) return 'older'
  if (ts >= todayStart) return 'today'
  if (ts >= todayStart - DAY) return 'yesterday'
  if (ts >= todayStart - 6 * DAY) return 'week'
  return 'older'
}

/** 历史对话抽屉：与外观自定义弹窗同款形态（右锚向左侧拉开、渐变玻璃标题栏、同宽度规则）；透明遮罩点左侧可关闭；按时间分组 + 行内 ... 操作 */
export default function HistoryDrawer({ open, loading, sessions, activeSessionId, getContainer, onSelect, onRename, onToggleTop, onDelete, onClose }: HistoryDrawerProps) {
  // 行 ... 菜单开合（同刻仅一个）、行内重命名态
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  // 置顶（sortOrder>0）排最前且值大靠前，其余按更新时间倒序；再按时间分组（同主对话侧栏口径）
  const groups = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      const sa = a.sortOrder ?? 0
      const sb = b.sortOrder ?? 0
      if ((sa > 0) !== (sb > 0)) return sb - sa
      if (sa > 0 && sa !== sb) return sb - sa
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
    })
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    return GROUP_LABELS.map(([key, label]) => ({
      key,
      label,
      items: sorted.filter((s) => groupOf(s.updatedAt, todayStart) === key),
    })).filter((g) => g.items.length > 0)
  }, [sessions])

  const closeMenus = () => {
    setMenuSessionId(null)
  }

  /* 确认重命名：回车/失焦提交；空标题或未改动视为取消，不发请求 */
  const submitRename = async (item: WidgetSessionItem) => {
    const title = renameDraft.trim()
    if (!title || title === item.title) {
      setRenamingId(null)
      setRenameDraft('')
      return
    }
    const ok = await onRename(item, title)
    if (ok !== false) {
      // 先清草稿：卸载触发的失焦再进这里时按空标题走取消，避免重复提交
      setRenamingId(null)
      setRenameDraft('')
    }
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameDraft('')
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      /* 遮罩透明（css 里置透明）：视觉无遮罩，但点左侧对话区可关闭（同微信侧栏点外收起） */
      getContainer={getContainer}
      /* 抽屉嵌在面板内：根节点绝对定位 + top 偏移标题栏高度（同 .abi-cw-header 52px）；同微信侧栏，高度占满悬浮窗不含标题栏 */
      rootStyle={{ position: 'absolute', top: 52 }}
      /* 向左侧拉开：右锚定、打开时向左展开；小屏按面板 40% 比例、放大/大屏被固定值 420 截顶（min 取小），窄面板不显宽 */
      placement="right"
      width="min(40%, 420px)"
      /* 同 abi CommonDrawer：关闭按钮放 extra，不用 antd 默认 closable */
      closable={false}
      closeIcon={null}
      title={<div className={styles.drawerTitle}>历史对话</div>}
      extra={<CloseOutlined className={styles.drawerClose} onClick={onClose} />}
      rootClassName={styles.drawer}
      styles={{ body: { padding: 0, overflowY: 'auto' } }}
    >
      {loading ? (
        <div className={styles.status}>
          <Spin size="small" />
        </div>
      ) : sessions.length === 0 ? (
        <div className={styles.status}>暂无历史对话</div>
      ) : (
        <div className={styles.groups}>
          {groups.map((g) => (
            <section key={g.key}>
              <div className={styles.groupLabel}>{g.label}</div>
              <ul className={styles.list}>
                {g.items.map((s) => (
                  <li key={s.sessionId} className={`${styles.row}${s.sessionId === activeSessionId ? ` ${styles.rowActive}` : ''}`}>
                    {renamingId === s.sessionId ? (
                      /* 行内重命名：输入框占满整行，回车/失焦提交、Esc 取消，不带确认勾 */
                      <input
                        className={styles.renameInput}
                        autoFocus
                        maxLength={40}
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => void submitRename(s)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void submitRename(s)
                          if (e.key === 'Escape') cancelRename()
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className={styles.item}
                        title={s.title}
                        onClick={() => onSelect(s)}
                      >
                        {s.title}
                      </button>
                    )}
                    {renamingId !== s.sessionId && (
                      <Dropdown
                        trigger={['click']}
                        placement="bottomRight"
                        open={menuSessionId === s.sessionId}
                        onOpenChange={(o) => {
                          setMenuSessionId(o ? s.sessionId : null)
                        }}
                        getPopupContainer={getContainer}
                        overlayClassName="abi-cw-menu"
                        dropdownRender={() => (
                          <div className="abi-cw-menu-panel">
                            <button
                              type="button"
                              className="abi-cw-menu-item"
                              onClick={() => {
                                closeMenus()
                                setRenamingId(s.sessionId)
                                setRenameDraft(s.title)
                              }}
                            >
                              {IconRename}
                              <span>重命名</span>
                            </button>
                            <button
                              type="button"
                              className="abi-cw-menu-item"
                              onClick={() => {
                                closeMenus()
                                onToggleTop(s)
                              }}
                            >
                              {IconTop}
                              <span>{(s.sortOrder ?? 0) > 0 ? '取消置顶' : '置顶'}</span>
                            </button>
                            <button
                              type="button"
                              className="abi-cw-menu-item abi-cw-menu-item-danger"
                              onClick={() => {
                                closeMenus()
                                onDelete(s)
                              }}
                            >
                              {IconDelete}
                              <span>删除</span>
                            </button>
                          </div>
                        )}
                      >
                        <button
                          type="button"
                          className={`${styles.rowMore}${menuSessionId === s.sessionId ? ` ${styles.rowMoreOpen}` : ''}`}
                          aria-label="更多操作"
                        >
                          {IconRowMore}
                        </button>
                      </Dropdown>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Drawer>
  )
}
