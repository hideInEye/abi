import { useCallback, useMemo } from 'react'

import { fallbackTopics } from '@/constant/layout'
import { useChatBootstrap, useChatConversations } from '@/resources/chatBootstrap'
import type { TopicItem } from '@/types/layout'
import { normalizeTopicsFromApi } from '@/utils/layout'

export function useHistoryTopics() {
  const bootstrap = useChatBootstrap()
  const conversations = useChatConversations()
  const historyApps = conversations.data ?? []
  // 已加载的空列表同样是有效数据；后续刷新保留旧内容，不再给侧栏加加载遮罩。
  const historyLoading = conversations.data === undefined
    && (conversations.status === 'idle' || conversations.status === 'loading')
  const historyTopics = useMemo<TopicItem[]>(() => {
    const normalized = normalizeTopicsFromApi(historyApps)
    return normalized.length ? normalized : fallbackTopics
  }, [historyApps])

  const loadHistoryTopics = useCallback(
    (options?: { force?: boolean }) => bootstrap.loadConversations({ force: options?.force }),
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
