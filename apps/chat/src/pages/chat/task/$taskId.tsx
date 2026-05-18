import { createFileRoute, useParams, useRouterState } from '@tanstack/react-router'

import ConversationAnalysis from '@/components/conversation-analysis'
import type { ChatRouterContext } from '@/router/context'

export const Route = createFileRoute('/chat/task/$taskId')({
  component: TaskPage,
})

function getSafeRouteContext(context: unknown): ChatRouterContext {
  if (!context || typeof context !== 'object') return {}
  return context as ChatRouterContext
}

function TaskPage() {
  const { taskId, conversationId } = useParams({ strict: false })
  const { spaceId } = useRouterState({
    select: (state) => getSafeRouteContext(state.context),
  })
  const chatId = taskId || conversationId

  return <ConversationAnalysis spaceId={spaceId} chatId={chatId} hideSidebar />
}
