import { useCallback, useEffect, useRef, useState } from 'react'

import { CHAT_MODE } from '@/constant'
import { fallbackTopics } from '@/constant/layout'
import { fetchAppList } from '@/service/api/app'
import type { TopicItem } from '@/types/layout'
import { getCurrentUser, normalizeTopicsFromApi } from '@/utils/layout'
import { getSpaceId } from '@/utils'

type FetchAppListResponse = {
  data?: unknown
}

export function useHistoryTopics() {
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyTopics, setHistoryTopics] = useState<TopicItem[]>(fallbackTopics)
  const [historyApps, setHistoryApps] = useState<any[]>([])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadHistoryTopics = useCallback(async (options?: { silent?: boolean }) => {
    if (!mountedRef.current) return
    // 防止并发重复调用
    if (loadingRef.current) return
    loadingRef.current = true
    if (!options?.silent) setHistoryLoading(true)

    try {
      const user = getCurrentUser()
      const response = (await fetchAppList({
        chat_mode: CHAT_MODE,
        space_id: getSpaceId(),
        create_by: user.userName,
        _t: Date.now(),
      })) as FetchAppListResponse
      const rawApps = Array.isArray(response?.data) ? response.data : []
      const normalizedTopics = normalizeTopicsFromApi(rawApps)
      const nextTopics = normalizedTopics.length ? normalizedTopics : fallbackTopics

      if (mountedRef.current) {
        setHistoryApps(rawApps)
        setHistoryTopics(nextTopics)
      }
    } catch {
      if (mountedRef.current) {
        setHistoryApps([])
        setHistoryTopics(fallbackTopics)
      }
    } finally {
      loadingRef.current = false
      if (mountedRef.current) {
        setHistoryLoading(false)
      }
    }
  }, [])

  // 乐观删除：立即从本地列表中移除，不等待服务端响应
  const removeTopicById = useCallback((chatId: string) => {
    setHistoryApps((prev) => prev.filter((app) => String(app.chat_id) !== String(chatId)))
    setHistoryTopics((prev) => {
      const next = prev.filter((t) => String(t.chatId) !== String(chatId))
      return next.length ? next : fallbackTopics
    })
  }, [])

  return {
    historyLoading,
    historyTopics,
    historyApps,
    loadHistoryTopics,
    removeTopicById,
  }
}
