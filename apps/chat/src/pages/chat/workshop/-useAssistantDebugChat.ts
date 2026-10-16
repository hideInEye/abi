import { useCallback, useEffect, useRef, useState } from 'react'

import { interruptExploreItem, settleExploreItem } from '@/components/conversation/exploration-mode/exploreProcessTimeline'
import { createApp } from '@/service/api/app'
import { streamExplorePlan } from '@/service/api/conv'
import {
  parseExploreStreamEvent,
  reduceExploreEvent,
} from '@/components/conversation/exploration-mode/exploreStreamReducer'
import { buildMcpSourceVersionFields } from '@/components/conversation/exploration-mode/useExploreConversation'
import type { ExploreItem, ExploreMcpSource } from '@/components/conversation/exploration-mode/types'

interface UseAssistantDebugChatOptions {
  appId?: number | string | null
  spaceId?: number | string | null
  schemaId?: number | null
  chatModelId?: number | null
  embedModelId?: number
  isDebug?: boolean
}

function normalizeIdList(ids?: Array<string | number>): Array<string | number> {
  return Array.from(new Set((ids || []).filter((id) => id !== '' && id !== null && id !== undefined)))
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

/**
 * 助手查看抽屉「调试预览」对话（对齐管理端 useAssistantDebugChat）：
 * 首次发送时创建绑定助手 appId 的调试会话（session/add），
 * 之后走探索模式流式接口（/chat-proxy/api/v2/chat/plan）。
 */
export function useAssistantDebugChat({ appId, spaceId, schemaId, chatModelId, embedModelId = 6, isDebug = false }: UseAssistantDebugChatOptions) {
  const [items, setItems] = useState<ExploreItem[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const convUidRef = useRef<string>('')
  const sessionIdRef = useRef<string>('')

  const resetSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    convUidRef.current = ''
    sessionIdRef.current = ''
    setItems([])
    setLoading(false)
  }, [])

  // 切换助手时重置调试会话，防止沿用上一个助手的会话
  useEffect(() => {
    resetSession()
  }, [appId, resetSession])

  async function ensureSession(): Promise<boolean> {
    if (convUidRef.current && sessionIdRef.current) return true
    if (appId == null || appId === '' || spaceId == null || spaceId === '') return false
    try {
      const res: any = await createApp({
        appId,
        space_id: spaceId,
        title: '助手调试对话',
      })
      const data = res?.data ?? res
      const sessionId = data.chat_id ?? data.sessionId ?? data.session_id ?? data.chatId
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
    setItems((prev) => prev.map((item) => item.status === 'running' ? settleExploreItem(item, 'cancelled', 'user_cancelled') : item))
  }, [])

  const handleSend = useCallback(async (question: string, options?: { skillSourceVersionIds?: string[]; mcpSourceVersionIds?: ExploreMcpSource[] }) => {
    if (loading) return
    const didCreateSession = await ensureSession()
    if (!didCreateSession) {
      setLoading(false)
      return
    }

    const conversationId = convUidRef.current
    const currentSessionId = sessionIdRef.current
    const groupId = appId !== null && appId !== undefined ? { group_id: Number(appId) } : {}

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
    const controller = new AbortController()
    abortRef.current = controller
    const isCurrent = () => abortRef.current === controller && !controller.signal.aborted

    const mcpFields = buildMcpSourceVersionFields(options?.mcpSourceVersionIds)
    const payload = {
      messages: question,
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
        signal: controller.signal,
        async onopen(response) {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: 探索接口请求失败`)
          }
        },
        onmessage(event) {
          if (!isCurrent() || !event.data || event.data.startsWith(':')) return
          const parsed = parseExploreStreamEvent(event.data)
          if (!parsed) return
          updateItem(id, (current) => reduceExploreEvent(current, parsed))
          if (parsed.type === 'done' || parsed.type === 'failed') {
            setLoading(false)
            controller.abort()
            abortRef.current = null
          }
        },
        onclose() {
          if (!isCurrent()) return
          updateItem(id, interruptExploreItem)
          setLoading(false)
          abortRef.current = null
        },
        onerror(err) {
          if (!isCurrent()) throw err
          updateItem(id, (current) => settleExploreItem(current, 'failed', undefined, { message: err?.message || '探索任务执行失败' }))
          setLoading(false)
          abortRef.current = null
          throw err
        },
      })
    } catch (err: any) {
      if (err?.name === 'AbortError' || !isCurrent()) return
      setLoading(false)
      abortRef.current = null
      updateItem(id, (current) => settleExploreItem(current, 'failed', undefined, current.error || { message: err?.message || '探索任务执行失败' }))
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
