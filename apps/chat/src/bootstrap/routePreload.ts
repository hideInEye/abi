type InitialChatRoute =
  | 'chat-group'
  | 'chat-skill'
  | 'chat-task'
  | 'chat-workshop'
  | null

export function resolveInitialChatRoute(hash: string): InitialChatRoute {
  const path = hash.replace(/^#/, '').split(/[?]/, 1)[0]
  if (path.startsWith('/chat/group/')) return 'chat-group'
  if (path.startsWith('/chat/skill')) return 'chat-skill'
  if (path.startsWith('/chat/workshop')) return 'chat-workshop'
  if (
    path === '/chat'
    || path === '/chat/'
    || path.startsWith('/chat/task/')
    || path.startsWith('/chat/conversation')
    || path.startsWith('/chat/history')
  ) {
    return 'chat-task'
  }
  return null
}

const loadChatShell = () => import('../pages/chat/route.tsx?tsr-split=component')

export function preloadInitialChatRoute(hash: string): Promise<unknown[]> {
  const route = resolveInitialChatRoute(hash)
  if (!route) return Promise.resolve([])

  const loaders: Array<() => Promise<unknown>> = []
  if (route.startsWith('chat-')) loaders.push(loadChatShell)

  if (route === 'chat-task') {
    loaders.push(() => import('../pages/chat/task/$taskId.tsx?tsr-split=component'))
  } else if (route === 'chat-group') {
    loaders.push(() => import('../pages/chat/group/$groupId.tsx?tsr-split=component'))
  } else if (route === 'chat-skill') {
    loaders.push(() => import('../pages/chat/skill/index.tsx?tsr-split=component'))
  } else if (route === 'chat-workshop') {
    loaders.push(() => import('../pages/chat/workshop/index.tsx?tsr-split=component'))
  }

  return Promise.all(loaders.map(loader => loader()))
}
