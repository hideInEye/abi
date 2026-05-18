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
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyTopics, setHistoryTopics] = useState<TopicItem[]>(fallbackTopics)
  const [historyApps, setHistoryApps] = useState<any[]>([])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadHistoryTopics = useCallback(async () => {
    if (!mountedRef.current) return
    setHistoryLoading(true)

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
      if (mountedRef.current) {
        setHistoryLoading(false)
      }
    }
  }, [])

  return {
    historyLoading,
    historyTopics,
    historyApps,
    loadHistoryTopics,
  }
}
