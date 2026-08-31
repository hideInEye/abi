import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { WidgetMessage } from './history'
import {
  checkSharePassword,
  ensureSession,
  fetchAssistantInfo,
  fetchHistory,
  sendChatStream,
  type ProjectType,
  type WidgetAssistantInfo,
  type WidgetSemanticNode,
  type WidgetSemanticSelection,
  type WidgetSession,
} from './service'
import './index.css'

export interface ChatWidgetProps {
  /** 分享码（免登录凭证） */
  shareCode: string
  /** 网关前缀，空串表示同源 */
  apiBase: string
  /** page：分享路由页整页面板；float：第三方嵌入右侧悬浮面板 */
  mode?: 'page' | 'float'
  /** 外层（分享页）已完成校验并拿到 appId 时传入，跳过 widget 内部校验/密码表单 */
  verifiedAppId?: string
  /** 外层校验时后端返回的项目类型（自主助手=react / 工作流助手=workflow），随 verifiedAppId 透传 */
  verifiedType?: ProjectType
  /** float 形态下的关闭回调 */
  onClose?: () => void
}

type Phase = 'checking' | 'password' | 'loading' | 'ready' | 'error'

function getNow(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ── 内联图标（不依赖 antd，与大屏 AiChatPanel 同款 feather 线稿） ── */
const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const IconDatabase = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
)

const IconFolder = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const IconFolderOpen = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
  </svg>
)

const IconFile = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const IconChevronRight = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const IconArrowDown = (
  <svg viewBox="0 0 24 24" {...iconProps}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

/** 助手分享对话悬浮框：无 store 依赖的纯组件，分享页与第三方嵌入共用；视觉对齐大屏对话面板 */
const ChatWidget = ({ shareCode, apiBase, mode = 'page', verifiedAppId, verifiedType, onClose }: ChatWidgetProps) => {
  const cfg = useMemo(() => ({ shareCode, apiBase }), [shareCode, apiBase])

  const [phase, setPhase] = useState<Phase>(verifiedAppId ? 'loading' : 'checking')
  const [appId, setAppId] = useState(verifiedAppId || '')
  const [info, setInfo] = useState<WidgetAssistantInfo | null>(null)
  const [messages, setMessages] = useState<WidgetMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // 数据语义（助手绑定的语义叶子，随 getProjectInfo 一并下发）
  const [semanticTree, setSemanticTree] = useState<WidgetSemanticNode[]>([])
  const [selectedSemantic, setSelectedSemantic] = useState<WidgetSemanticSelection | null>(null)
  const [expandedSemGroups, setExpandedSemGroups] = useState<Set<string>>(new Set())
  const [semDropdownOpen, setSemDropdownOpen] = useState(false)

  const sessionRef = useRef<WidgetSession | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const semSelectorRef = useRef<HTMLDivElement>(null)
  const didInit = useRef(false)

  // 加载助手信息 + 会话 + 历史（type 为统一接口 getProjectInfo/{type}/{id} 的类型段）
  const load = useCallback(
    async (id: string, type: ProjectType = 'react') => {
      setAppId(id)
      setPhase('loading')
      const assistantInfo = await fetchAssistantInfo(cfg, id, type)
      setInfo(assistantInfo)
      // 数据语义随助手详情（getProjectInfo）一并下发；后端未加字段时为空列表，下拉显示“暂无数据语义”
      setSemanticTree(assistantInfo?.semantics ?? [])
      const session = await ensureSession(cfg, id)
      sessionRef.current = session
      if (session) {
        setMessages(await fetchHistory(cfg, session.convUid))
      }
      setPhase('ready')
    },
    [cfg],
  )

  // 进入先探测分享是否需要密码（密码传空串）
  const initCheck = useCallback(async () => {
    setPhase('checking')
    const res = await checkSharePassword(cfg, '').catch(() => null)
    if (!res || !res.appId) {
      setErrorMsg('获取分享信息失败')
      setPhase('error')
      return
    }
    if (res.passwordFlag) {
      setPhase('password')
      return
    }
    await load(res.appId, res.type)
  }, [cfg, load])

  useEffect(() => {
    // 守卫：StrictMode 重挂载不重复初始化（避免重复建会话）
    if (didInit.current) return
    didInit.current = true
    if (verifiedAppId) void load(verifiedAppId, verifiedType)
    else void initCheck()
  }, [verifiedAppId, verifiedType, load, initCheck])

  // 卸载时中断进行中的流式请求，避免向已卸载组件写状态
  useEffect(() => () => abortRef.current?.abort(), [])

  // 新消息自动滚动到底部
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, phase])

  // 语义下拉打开时：点击面板外部收起
  useEffect(() => {
    if (!semDropdownOpen) return
    const onDown = (e: PointerEvent) => {
      if (semSelectorRef.current && !semSelectorRef.current.contains(e.target as Node)) {
        setSemDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [semDropdownOpen])

  const handlePasswordSubmit = async () => {
    if (!password) {
      setPasswordError('请输入密码')
      return
    }
    const res = await checkSharePassword(cfg, password).catch(() => null)
    if (res?.result && res.appId) {
      setPasswordError('')
      await load(res.appId, res.type)
    } else {
      setPasswordError('密码错误')
    }
  }

  // 流式更新最后一条 AI 消息内容（含 streaming 态）
  const updateLastAi = (content: string, streaming = false) => {
    setMessages((prev) => {
      const copy = [...prev]
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === 'ai') {
          copy[i] = { ...copy[i], content, streaming }
          break
        }
      }
      return copy
    })
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending || phase !== 'ready') return
    let session = sessionRef.current
    if (!session) {
      session = await ensureSession(cfg, appId)
      if (!session) {
        setErrorMsg('创建会话失败，请稍后重试')
        return
      }
      sessionRef.current = session
    }
    setInput('')
    setSending(true)
    setMessages((prev) => [
      ...prev,
      { role: 'human', content: text, time: getNow() },
      { role: 'ai', content: '', time: getNow(), streaming: true },
    ])
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    sendChatStream(
      cfg,
      session,
      text,
      appId,
      controller.signal,
      {
        onDelta: (full) => updateLastAi(full, true),
        onDone: (full) => {
          updateLastAi(full || '无数据返回')
          setSending(false)
        },
        onError: () => {
          // 主动停止（AbortError）保留已生成内容，其余异常提示重试
          updateLastAi((controller.signal.aborted && '已停止生成') || '请求异常，请稍后重试')
          setSending(false)
        },
      },
      selectedSemantic,
    )
  }

  const handleStop = () => {
    abortRef.current?.abort()
  }

  // 展开/收起语义分组节点（数据已全量返回，无需懒加载）
  const toggleSemGroup = (nodeId: string) => {
    setExpandedSemGroups((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  // 按住头部拖拽面板：首次拖拽时把 CSS 定位切换为显式 left/top，之后跟随指针
  const handleDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    panel.style.position = 'fixed'
    panel.style.transform = 'none'
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
    const onMove = (ev: PointerEvent) => {
      const left = Math.min(Math.max(rect.left + ev.clientX - startX, 0), window.innerWidth - 80)
      const top = Math.min(Math.max(rect.top + ev.clientY - startY, 0), window.innerHeight - 48)
      panel.style.left = `${left}px`
      panel.style.top = `${top}px`
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /** 递归渲染语义节点（与大屏同款：分组仅展开/收起，叶子可选中） */
  const renderSemNode = (node: WidgetSemanticNode, depth: number): React.ReactNode => {
    const indent = { paddingLeft: 8 + depth * 16 }
    if (node.type === 'schema') {
      const isSel = selectedSemantic?.schemaId === node.schemaId
      return (
        <div
          key={node.id}
          className={`abi-cw-sem-leaf${isSel ? ' selected' : ''}`}
          style={indent}
          title={node.techName || node.name}
          onClick={() => {
            setSelectedSemantic({ name: node.name, schemaId: node.schemaId, groupName: node.groupName })
            setSemDropdownOpen(false)
          }}
        >
          <span className="abi-cw-sem-leaf-icon">{IconFile}</span>
          <span className="abi-cw-sem-leaf-name">{node.name}</span>
        </div>
      )
    }
    const children = Array.isArray(node.children) ? node.children : []
    if (children.length === 0) {
      return (
        <div key={node.id} className="abi-cw-sem-group-node is-empty" style={indent}>
          <span className="abi-cw-sem-group-icon is-empty">{IconFolder}</span>
          <span className="abi-cw-sem-group-name">{node.name}</span>
        </div>
      )
    }
    const nodeId = String(node.id)
    const isExpanded = expandedSemGroups.has(nodeId)
    const childCount = typeof node.count === 'number' ? node.count : children.length
    return (
      <div key={node.id} className="abi-cw-sem-group">
        <div className="abi-cw-sem-group-node" style={indent} onClick={() => toggleSemGroup(nodeId)}>
          <span className="abi-cw-sem-group-icon">{isExpanded ? IconFolderOpen : IconFolder}</span>
          <span className="abi-cw-sem-group-name">{node.name}</span>
          {childCount > 0 && <span className="abi-cw-sem-group-count">{childCount}</span>}
          <span className={`abi-cw-sem-chevron${isExpanded ? ' open' : ''}`}>{IconChevronRight}</span>
        </div>
        {isExpanded && children.map((child) => renderSemNode(child, depth + 1))}
      </div>
    )
  }

  const welcomeTitle = `欢迎使用${info?.name ? ` ${info.name} ` : ''}智能问答`
  const welcomeDesc = info?.prologue || info?.description || '请输入问题，开始对话'

  return (
    <div className={`abi-cw-root ${mode === 'float' ? 'abi-cw-float' : 'abi-cw-page'}`}>
      <div className="abi-cw-panel" ref={panelRef}>
        <div className="abi-cw-header" onPointerDown={handleDragStart}>
          <div className="abi-cw-header-logo">A</div>
          <span className="abi-cw-header-name" title={info?.name || '助手'}>
            AI {info?.name ? `· ${info.name}` : '智能问答'}
          </span>
          {mode === 'float' && onClose && (
            <button type="button" className="abi-cw-action-btn" onClick={onClose} aria-label="关闭">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="abi-cw-status-bar">
          <div className={`abi-cw-status-dot${sending ? ' loading' : ''}`} />
          <span className="abi-cw-status-text">{sending ? '正在思考中...' : ''}</span>
        </div>

        <div className="abi-cw-body" ref={bodyRef}>
          {phase === 'checking' || phase === 'loading' ? (
            <div className="abi-cw-status">
              <div className="abi-cw-spinner" />
              <span>加载中...</span>
            </div>
          ) : phase === 'error' ? (
            <div className="abi-cw-status">
              <span>{errorMsg || '加载失败'}</span>
              <button type="button" className="abi-cw-btn-primary" onClick={() => void initCheck()}>
                重试
              </button>
            </div>
          ) : phase === 'password' ? (
            <div className="abi-cw-status">
              <div className="abi-cw-password">
                <span className="abi-cw-password-title">该分享需要密码访问</span>
                <input
                  type="password"
                  placeholder="请输入访问密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handlePasswordSubmit()
                  }}
                />
                <span className="abi-cw-password-error">{passwordError}</span>
                <button type="button" className="abi-cw-btn-primary" onClick={() => void handlePasswordSubmit()}>
                  确认
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="abi-cw-welcome">
              <div className="abi-cw-welcome-title">{welcomeTitle}</div>
              <div className="abi-cw-welcome-desc">{welcomeDesc}</div>
              {info && info.recQuestions.length > 0 && (
                <div className="abi-cw-rec-list">
                  {info.recQuestions.slice(0, 5).map((q) => (
                    <button key={q} type="button" className="abi-cw-rec-item" onClick={() => setInput(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`abi-cw-msg abi-cw-msg-${m.role}`}>
                <div className="abi-cw-msg-bubble">
                  {m.content || (m.streaming ? '正在生成...' : '')}
                  {m.streaming && m.content && <span className="abi-cw-cursor" />}
                </div>
                {m.time && <span className="abi-cw-msg-time">{m.time}</span>}
              </div>
            ))
          )}
        </div>

        <div className="abi-cw-footer">
          <div className="abi-cw-input-box">
            <textarea
              className="abi-cw-input"
              rows={2}
              placeholder="请输入问题，获取结果"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
            />
            <div className="abi-cw-input-toolbar">
              {/* 数据语义选择（与大屏同款：分组树，仅叶子可选） */}
              <div className="abi-cw-sem-selector" ref={semSelectorRef}>
                <button
                  type="button"
                  className={`abi-cw-sem-trigger${semDropdownOpen ? ' active' : ''}`}
                  title="选择数据语义"
                  onClick={() => setSemDropdownOpen((v) => !v)}
                >
                  <span className="abi-cw-sem-trigger-icon">{IconDatabase}</span>
                  <span className="abi-cw-sem-trigger-name">{selectedSemantic?.name || '数据语义'}</span>
                  <span className={`abi-cw-sem-trigger-arrow${semDropdownOpen ? ' open' : ''}`}>{IconArrowDown}</span>
                </button>
                {semDropdownOpen && (
                  <div className="abi-cw-sem-popover">
                    <div className="abi-cw-sem-tree">
                      {semanticTree.length === 0 ? (
                        <div className="abi-cw-sem-empty">暂无数据语义</div>
                      ) : (
                        semanticTree.map((node) => renderSemNode(node, 0))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {sending ? (
                <button type="button" className="abi-cw-stop" onClick={handleStop} aria-label="停止生成">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  className="abi-cw-send"
                  disabled={!input.trim()}
                  onClick={() => void handleSend()}
                  aria-label="发送"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="abi-cw-disclaimer">AI 生成的内容仅供参考，请注意甄别信息准确性</div>
        </div>
      </div>
    </div>
  )
}

export default ChatWidget
