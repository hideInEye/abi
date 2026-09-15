import { useCallback, useEffect, useRef, useState } from 'react'
import { streamExplorePlan } from '@/service/api/conv'
import { addAppSessionApi } from '@/service/api/abi-chat-app'
import { reduceExploreEvent, parseExploreStreamEvent } from './exploreStreamReducer'
import type { ExploreItem, ExploreMcpSource } from './types'

interface UseAssistantDebugChatOptions {
  appId?: number | string | null
  spaceId?: number | string | null
  schemaId?: number | null
  chatModelId?: number | null
  embedModelId?: number
  isDebug: boolean
}

function normalizeIdList(ids?: Array<string | number>): Array<string | number> {
  return Array.from(new Set((ids || []).filter((id) => id !== '' && id !== null && id !== undefined)))
}

function toProtocolKey(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')
}

/**
 * MCP 选中项按协议分流为两类源版本字段，元素形态 {源版本id: 分组namespaceId(s_<groupId>)}；
 * 未知协议归入 sse（与未分流前行为一致）。
 */
function buildMcpSourceVersionFields(sources?: ExploreMcpSource[]) {
  const sse: Array<Record<string, string>> = []
  const streamable: Array<Record<string, string>> = []
  const seen = new Set<string>()
  ;(sources || []).forEach((source) => {
    const id = String(source?.id ?? '')
    if (!id || seen.has(id)) return
    seen.add(id)
    const entry = { [id]: source.namespaceId ?? '' }
    const protocol = toProtocolKey(source.protocol)
    if (protocol === 'streamable' || protocol === 'streamablehttp') streamable.push(entry)
    else sse.push(entry)
  })
  return { sse, streamable }
}

// 与 chat 探索模式一致：从 SOY-REACT_userInfo 读取当前用户ID，缺失时为 0
function getCurrentUserId(): number {
  try {
    const userInfo = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
    return userInfo.userId != null ? Number(userInfo.userId) : 0
  } catch {
    return 0
  }
}

export function useAssistantDebugChat({ appId, spaceId, schemaId, chatModelId, embedModelId = 6, isDebug = false }: UseAssistantDebugChatOptions) {
  const [items, setItems] = useState<ExploreItem[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const convUidRef = useRef<string>('')
  const sessionIdRef = useRef<string>('')

  async function ensureSession(): Promise<boolean> {
    if (convUidRef.current && sessionIdRef.current) return true
    if (appId == null || appId === '' || spaceId == null || spaceId === '') return false
    try {
      const { data, error }: any = await addAppSessionApi({
        appId,
        spaceId,
        userId: getCurrentUserId(),
        title: '助手调试对话'
      })

      if (error || !data) return false
      const sessionId = data.sessionId ?? data.session_id ?? data.chat_id ?? data.chatId
      const convUid = data.conv_uid ?? data.convUid
      if (!sessionId || !convUid) return false
      sessionIdRef.current = String(sessionId)
      convUidRef.current = String(convUid)
      return true
    } catch (_err) {
      return false
    }
  }

  const updateItem = useCallback((id: string, updater: (item: ExploreItem) => ExploreItem) => {
    setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)))
  }, [])

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setItems((prev) => prev.map((item) => (item.status === 'running' ? { ...item, status: 'cancelled', finishReason: 'user_cancelled' } : item)))
  }, [])

  const resetSession = useCallback(() => {
    convUidRef.current = ''
    sessionIdRef.current = ''
    setItems([])
    setLoading(false)
  }, [])

  const handleSend = useCallback(async (question: string, options?: { skillSourceVersionIds?: string[]; mcpSourceVersionIds?: ExploreMcpSource[] }) => {
    const didCreateSession = await ensureSession()
    if (!didCreateSession) {
      setLoading(false)
      return
    }

    const conversationId = convUidRef.current
    const currentSessionId = sessionIdRef.current
    const groupId = appId !== null && appId !== undefined ? { group_id: Number(appId) } : {}

    if (loading) return

    const id = `explore-${Date.now()}`
    const sortOrder = Date.now()
    const item: ExploreItem = {
      id,
      question,
      sortOrder,
      status: 'running',
      tasks: [],
      steps: [],
      createdAt: Date.now(),
    }

    setItems((prev) => [...prev, item])
    setLoading(true)
    abortRef.current = new AbortController()

    const mcpFields = buildMcpSourceVersionFields(options?.mcpSourceVersionIds)
    const payload = {
      messages: question,  // 和 chat 一样，直接传字符串
      app_id: appId ?? 0,
      space_id: spaceId,
      model_setting: {},
      schema_id: schemaId,
      ...(groupId as object),
      knowledge_setting: {},
      conv_id: conversationId,
      session_id: currentSessionId,
      user_id: getCurrentUserId(),
      embed_model_id: embedModelId || 0,
      chat_model_id: chatModelId || 0,
      is_debug: isDebug,
      chat_mode: 'copilot',
      sse_mcp_source_version_ids: mcpFields.sse,
      mcp_streamable_source_version_ids: mcpFields.streamable,
      skills_source_version_ids: normalizeIdList(options?.skillSourceVersionIds),
    }

    try {
      await streamExplorePlan({
        data: payload,
        signal: abortRef.current.signal,
        async onopen(response) {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: 探索接口请求失败`)
          }
        },
        onmessage(event) {
          if (!event.data || event.data.startsWith(':')) return
          const parsed = parseExploreStreamEvent(event.data)
          if (!parsed) return
          updateItem(id, (current) => reduceExploreEvent(current, parsed))
          if (parsed.type === 'done' || parsed.type === 'failed') {
            setLoading(false)
            abortRef.current = null
          }
        },
        onclose() {
          setLoading(false)
          abortRef.current = null
        },
        onerror(err) {
          if (abortRef.current?.signal.aborted) return
          updateItem(id, (current) => ({
            ...current,
            status: 'failed',
            error: {
              message: err?.message || '探索任务执行失败',
            },
          }))
          setLoading(false)
          abortRef.current = null
          throw err
        },
      })
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      setLoading(false)
      abortRef.current = null
      updateItem(id, (current) => ({
        ...current,
        status: current.status === 'failed' ? current.status : 'failed',
        error: current.error || { message: err?.message || '探索任务执行失败' },
      }))
    }
  }, [appId, spaceId, schemaId, chatModelId, embedModelId, isDebug, loading, updateItem])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [])

  return { items, loading, handleSend, stopGenerating, resetSession }
}
