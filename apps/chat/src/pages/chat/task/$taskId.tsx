import { createFileRoute, useParams, useRouterState } from '@tanstack/react-router'
import ConversationAnalysis from '@/components/conversation-analysis'
import type { ChatRouterContext } from '@/router/context'

export const Route = createFileRoute('/chat/task/$taskId')({
  component: TaskPage,
  validateSearch: (search: Record<string, unknown>): { groupId?: string } => ({
    groupId: search.groupId ? String(search.groupId) : undefined,
  }),
})

function getSafeRouteContext(context: unknown): ChatRouterContext {
  if (!context || typeof context !== 'object') return {}
  return context as ChatRouterContext
}

function TaskPage() {
  const { taskId, conversationId } = useParams({ strict: false })
  const { groupId } = Route.useSearch()
  const { spaceId } = useRouterState({
    select: (state) => getSafeRouteContext(state.context),
  })
  const chatId = taskId || conversationId

  return <ConversationAnalysis spaceId={spaceId} chatId={chatId} groupId={groupId} hideSidebar />
}
