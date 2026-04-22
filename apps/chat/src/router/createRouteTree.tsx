import { Outlet, createRootRoute, createRoute, redirect } from '@tanstack/react-router'

import ChatWorkbenchLayout  from '@/layouts'
import { ConversationRoutePage } from '@/routes/ConversationRoutePage'

import {
  CHAT_LAYOUT_PATH,
  CONVERSATION_DETAIL_PATH,
  CONVERSATION_PATH,
  DEFAULT_REDIRECT_PATH,
  ROOT_PATH,
} from './paths'

function RouterRootOutlet() {
  return <Outlet />
}

function createRootRedirectRoute(rootRoute: ReturnType<typeof createRootRoute>) {
  return createRoute({
    getParentRoute: () => rootRoute,
    path: ROOT_PATH,
    beforeLoad: () => {
      throw redirect({ to: DEFAULT_REDIRECT_PATH })
    },
  })
}

function createChatLayoutRoute(rootRoute: ReturnType<typeof createRootRoute>) {
  return createRoute({
    getParentRoute: () => rootRoute,
    path: CHAT_LAYOUT_PATH,
    component: ChatWorkbenchLayout,
  })
}

function createConversationRoute(chatLayoutRoute: ReturnType<typeof createRoute>) {
  return createRoute({
    getParentRoute: () => chatLayoutRoute,
    path: CONVERSATION_PATH,
    component: ConversationRoutePage,
  })
}

function createConversationDetailRoute(chatLayoutRoute: ReturnType<typeof createRoute>) {
  return createRoute({
    getParentRoute: () => chatLayoutRoute,
    path: CONVERSATION_DETAIL_PATH,
    component: ConversationRoutePage,
  })
}

export function createAppRouteTree() {
  const rootRoute = createRootRoute({
    component: RouterRootOutlet,
  })

  const rootRedirectRoute = createRootRedirectRoute(rootRoute)
  const chatLayoutRoute = createChatLayoutRoute(rootRoute)
  const conversationRoute = createConversationRoute(chatLayoutRoute)
  const conversationDetailRoute = createConversationDetailRoute(chatLayoutRoute)

  return rootRoute.addChildren([
    rootRedirectRoute,
    chatLayoutRoute.addChildren([conversationRoute, conversationDetailRoute]),
  ])
}
