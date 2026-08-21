import { useCallback, useRef, useState } from 'react'
import { message } from 'antd'

import { streamExplorePlan } from '../../../service/api/conv'
import { reduceExploreEvent, parseExploreStreamEvent } from './exploreStreamReducer'
import type { ExploreItem, ExploreSendOptions } from './types'

interface UseExploreConversationOptions {
  conv: any
  spaceId?: number
  currentModelId?: string | number
  embedModelId?: string | number
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

export function useExploreConversation({ conv, spaceId, currentModelId, embedModelId }: UseExploreConversationOptions) {
  const [items, setItems] = useState<ExploreItem[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const updateItem = useCallback((id: string, updater: (item: ExploreItem) => ExploreItem) => {
    setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)))
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
      sse_mcp_source_version_ids: normalizeIdList(options?.mcpSourceVersionIds),
      mcp_streamable_source_version_ids: [],
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
  }, [conv, currentModelId, embedModelId, loading, spaceId, updateItem])

  return {
    items,
    loading,
    handleSend,
    stopGenerating,
  }
}
