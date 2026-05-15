import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

import type { ChatRouterContext } from '@/router/context'

export const Route = createRootRouteWithContext<ChatRouterContext>()({
  component: RootRouteComponent,
})

function RootRouteComponent() {
  return <Outlet />
}
