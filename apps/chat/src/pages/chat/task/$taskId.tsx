import { createFileRoute, useParams, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import ConversationAnalysis from '@/components/conversation-analysis'
import type { ChatRouterContext } from '@/router/context'

export const Route = createFileRoute('/chat/task/$taskId')({
  // 助手卡片入口经 search 携带 appId：只跳转不创建会话，
  // 欢迎页展示该助手开场引导，首次发送时才创建绑定会话。
  validateSearch: (search: Record<string, unknown>): { appId?: string } => ({
    appId: typeof search.appId === 'string' && search.appId ? search.appId : undefined,
  }),
  component: TaskPage,
})

function getSafeRouteContext(context: unknown): ChatRouterContext {
  if (!context || typeof context !== 'object') return {}
  return context as ChatRouterContext
}

function TaskPage() {
  const { taskId, conversationId } = useParams({ strict: false })
  const { appId } = Route.useSearch()
  const { spaceId } = useRouterState({
    select: (state) => getSafeRouteContext(state.context),
  })
  const chatId = taskId || conversationId

  // 悬浮窗 SDK 样式调试：仅欢迎页挂载；base 用 /api 走 vite 代理保持同源
  useEffect(() => {
    if (chatId !== 'new') return
    const el = document.createElement('abi-assistant')
    el.setAttribute('share-code', 'rkh7lyn8')
    el.setAttribute('base', '/api')
    document.body.appendChild(el)
    return () => el.remove()
  }, [chatId])

  return <ConversationAnalysis spaceId={spaceId} chatId={chatId} hideSidebar pendingAssistantId={appId} />
}
