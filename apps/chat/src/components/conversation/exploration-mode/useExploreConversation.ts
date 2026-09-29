import { message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchConvMaxRound, streamExplorePlan } from '../../../service/api/conv'
import { isApiSuccess } from '../hooks/conversationRequests'

import { parseExploreStreamEvent, reduceExploreEvent } from './exploreStreamReducer'
import type { ExploreItem, ExploreMcpSource, ExploreSendOptions } from './types'

interface UseExploreConversationOptions {
  conv: any
  spaceId?: number
  currentModelId?: string | number
  embedModelId?: string | number
  /** 免登录分享场景注入的 Authorization 头；缺省时 streamExplorePlan 读取登录态，主对话行为不变。 */
  authorization?: string | null
}

function getCurrentUserId(): number {
  try {
    const userInfo = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
    return userInfo.userId != null ? Number(userInfo.userId) : 0
  } catch {
    return 0
  }
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
export function buildMcpSourceVersionFields(sources?: ExploreMcpSource[]) {
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

export function useExploreConversation({ conv, spaceId, currentModelId, embedModelId, authorization }: UseExploreConversationOptions) {
  const [items, setItems] = useState<ExploreItem[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // 切换会话时清空上一会话遗留的实时探索项并中止进行中的流；
  // 历史探索项由会话控制器按会话单独加载，实时项不得跨会话泄漏。
  const convUid = conv?.conv_uid
  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setItems([])
    setLoading(false)
  }, [convUid])

  const updateItem = useCallback((id: string, updater: (item: ExploreItem) => ExploreItem) => {
    setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)))
  }, [])

  const syncPersistedRoundIndex = useCallback(async (id: string) => {
    if (!convUid || authorization) return
    try {
      const response: unknown = await fetchConvMaxRound({ conv_uid: convUid })
      if (!isApiSuccess(response)) return
      const roundIndex = Number((response as Record<string, unknown>).data)
      if (!Number.isSafeInteger(roundIndex) || roundIndex <= 0) return
      updateItem(id, (item) => ({ ...item, roundIndex }))
    } catch {
      // 本次只影响实时卡片的删除资格；重新进入会话后历史 roundIndex 会正常恢复。
    }
  }, [authorization, convUid, updateItem])

  const removeItemsByRounds = useCallback((rounds: number[]) => {
    const roundSet = new Set(rounds)
    setItems((prev) => prev.filter((item) => item.roundIndex === undefined || !roundSet.has(item.roundIndex)))
  }, [])

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    setItems((prev) => prev.map((item) => (item.status === 'running' ? { ...item, status: 'cancelled', finishReason: 'user_cancelled' } : item)))
  }, [])

  const handleSend = useCallback(async (question: string, schemaId: string | number, options?: ExploreSendOptions) => {
    if (!conv?.conv_uid || !conv?.chat_id) {
      message.error('会话未就绪')
      return
    }
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
      messages: question,
      app_id: conv.appId ?? conv.app_id ?? 0,
      space_id: spaceId ?? conv.space_id,
      model_setting: {},
      schema_id: schemaId,
      ...(options?.groupId != null && options.groupId !== '' ? { group_id: options.groupId } : {}),
      knowledge_setting: {},
      conv_id: conv.conv_uid,
      session_id: conv.chat_id,
      user_id: getCurrentUserId(),
      embed_model_id: embedModelId || 0,
      chat_model_id: currentModelId || 0,
      sse_mcp_source_version_ids: mcpFields.sse,
      mcp_streamable_source_version_ids: mcpFields.streamable,
      skills_source_version_ids: normalizeIdList(options?.skillSourceVersionIds),
    }

    try {
      await streamExplorePlan({
        data: payload,
        signal: abortRef.current.signal,
        authorization,
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
            void syncPersistedRoundIndex(id)
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
  }, [conv, currentModelId, embedModelId, loading, spaceId, syncPersistedRoundIndex, updateItem, authorization])

  return {
    items,
    loading,
    handleSend,
    removeItemsByRounds,
    stopGenerating,
  }
}
