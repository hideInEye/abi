import { useParams, useRouterState } from '@tanstack/react-router'

import ConversationAnalysis from '@/pages/conversation-analysis'
import type { ChatRouterContext } from '@/router/context'

function getSafeRouteContext(context: unknown): ChatRouterContext {
  if (!context || typeof context !== 'object') return {}
  return context as ChatRouterContext
}

export function ConversationRoutePage() {
  const { conversationId } = useParams({ strict: false })
  const { spaceId } = useRouterState({
    select: (state) => getSafeRouteContext(state.context),
  })

  return <ConversationAnalysis spaceId={spaceId} chatId={conversationId} hideSidebar />
}
