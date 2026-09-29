import { createHashHistory, createRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

import { routeTree } from '@/routeTree.gen'

function createRouterHistory() {
  return createHashHistory()
}

function RoutePending() {
  return (
    <div style={{ width: '100%', minHeight: '240px', display: 'grid', placeItems: 'center', color: '#6b7280' }} role="status">
      页面加载中...
    </div>
  )
}

function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <div style={{ width: '100%', minHeight: '240px', display: 'grid', placeItems: 'center', padding: '24px', boxSizing: 'border-box' }} role="alert">
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 8px' }}>页面加载失败</h2>
        <p style={{ margin: '0 0 16px', color: '#6b7280' }}>{error.message}</p>
        <button type="button" onClick={reset}>重新加载页面</button>
      </div>
    </div>
  )
}

export function createAppRouter() {
  return createRouter({
    routeTree,
    history: createRouterHistory(),
    basepath: '/',
    defaultPendingComponent: RoutePending,
    defaultErrorComponent: RouteError,
    defaultPendingMs: 150,
    defaultPendingMinMs: 300,
  })
}

export type AppRouter = ReturnType<typeof createAppRouter>

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }
}

export type { ChatRouterContext } from '@/router/context'
