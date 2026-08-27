import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { WidgetMessage } from './history'
import {
  checkSharePassword,
  ensureSession,
  fetchAssistantInfo,
  fetchHistory,
  sendChatStream,
  type WidgetAssistantInfo,
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
  /** float 形态下的关闭回调 */
  onClose?: () => void
}

type Phase = 'checking' | 'password' | 'loading' | 'ready' | 'error'

function getNow(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 助手分享对话悬浮框：无 store 依赖的纯组件，分享页与第三方嵌入共用 */
const ChatWidget = ({ shareCode, apiBase, mode = 'page', verifiedAppId, onClose }: ChatWidgetProps) => {
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

  const sessionRef = useRef<WidgetSession | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const didInit = useRef(false)

  // 加载助手信息 + 会话 + 历史
  const load = useCallback(
    async (id: string) => {
      setAppId(id)
      setPhase('loading')
      const assistantInfo = await fetchAssistantInfo(cfg, id)
      setInfo(assistantInfo)
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
    await load(res.appId)
  }, [cfg, load])

  useEffect(() => {
    // 守卫：StrictMode 重挂载不重复初始化（避免重复建会话）
    if (didInit.current) return
    didInit.current = true
    if (verifiedAppId) void load(verifiedAppId)
    else void initCheck()
  }, [verifiedAppId, load, initCheck])

  // 卸载时中断进行中的流式请求，避免向已卸载组件写状态
  useEffect(() => () => abortRef.current?.abort(), [])

  // 新消息自动滚动到底部
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, phase])

  const handlePasswordSubmit = async () => {
    if (!password) {
      setPasswordError('请输入密码')
      return
    }
    const res = await checkSharePassword(cfg, password).catch(() => null)
    if (res?.result && res.appId) {
      setPasswordError('')
      await load(res.appId)
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
    sendChatStream(cfg, session, text, appId, controller.signal, {
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
    })
  }

  const handleStop = () => {
    abortRef.current?.abort()
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

  const welcomeTitle = `欢迎使用${info?.name ? ` ${info.name} ` : ''}智能问答`
  const welcomeDesc = info?.prologue || info?.description || '请输入问题，开始对话'

  return (
    <div className={`abi-cw-root ${mode === 'float' ? 'abi-cw-float' : 'abi-cw-page'}`}>
      <div className="abi-cw-panel" ref={panelRef}>
        <div className="abi-cw-header" onPointerDown={handleDragStart}>
          <span className="abi-cw-header-logo">AI</span>
          <span className="abi-cw-header-name" title={info?.name || '助手'}>
            {info?.name || '助手'}
          </span>
          {mode === 'float' && onClose && (
            <button type="button" className="abi-cw-close" onClick={onClose} aria-label="关闭">
              ×
            </button>
          )}
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
                {m.time && <span className="abi-cw-msg-time">{m.time}</span>}
                <div className="abi-cw-msg-bubble">
                  {m.content || (m.streaming ? '正在生成...' : '')}
                  {m.streaming && m.content && <span className="abi-cw-cursor" />}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="abi-cw-footer">
          <div className="abi-cw-input-box">
            <textarea
              className="abi-cw-input"
              rows={1}
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
            <div className="abi-cw-input-actions">
              {sending ? (
                <button type="button" className="abi-cw-send abi-cw-stop" onClick={handleStop} aria-label="停止生成">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="7" y="7" width="10" height="10" rx="2" />
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
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.4 20.4l17.8-8.4L3.4 3.6l-.4 6.8 12 1.6-12 1.6z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="abi-cw-disclaimer">AI 生成的内容仅供参考，请注意甄别信息准确性</div>
      </div>
    </div>
  )
}

export default ChatWidget
