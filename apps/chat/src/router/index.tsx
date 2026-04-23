import { createHashHistory, createRouter } from '@tanstack/react-router'

import { routeTree } from '@/routeTree.gen'

function createRouterHistory() {
  return createHashHistory()
}

export function createAppRouter() {
  return createRouter({
    routeTree,
    history: createRouterHistory(),
    basepath: '/',
  })
}

export type AppRouter = ReturnType<typeof createAppRouter>

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }
}

export type { ChatRouterContext } from '@/router/context'
