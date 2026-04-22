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

  useEffect(() => {
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
      })) as FetchAppListResponse

      const normalizedTopics = normalizeTopicsFromApi(response?.data)
      const nextTopics = normalizedTopics.length ? normalizedTopics : fallbackTopics

      if (mountedRef.current) {
        setHistoryTopics(nextTopics)
      }
    } catch {
      if (mountedRef.current) {
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
    loadHistoryTopics,
  }
}
