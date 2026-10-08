import { useCallback, useMemo } from 'react'

import { fallbackTopics } from '@/constant/layout'
import { useChatBootstrap } from '@/resources/chatBootstrap'
import type { TopicItem } from '@/types/layout'
import { normalizeTopicsFromApi } from '@/utils/layout'

export function useHistoryTopics() {
  const bootstrap = useChatBootstrap()
  const historyApps = bootstrap.conversations.data ?? []
  const historyLoading = bootstrap.conversations.status === 'loading'
  const historyTopics = useMemo<TopicItem[]>(() => {
    const normalized = normalizeTopicsFromApi(historyApps)
    return normalized.length ? normalized : fallbackTopics
  }, [historyApps])

  const loadHistoryTopics = useCallback(
    (options?: { force?: boolean; silent?: boolean }) => bootstrap.loadConversations({ force: options?.force }),
    [bootstrap.loadConversations],
  )

  // 乐观删除：立即从本地列表中移除，不等待服务端响应
  const removeTopicById = useCallback((chatId: string) => {
    bootstrap.updateConversations(previous => previous.filter(app => String(app.chat_id) !== String(chatId)))
  }, [bootstrap.updateConversations])

  return {
    historyLoading,
    historyTopics,
    historyApps,
    loadHistoryTopics,
    removeTopicById,
  }
}
