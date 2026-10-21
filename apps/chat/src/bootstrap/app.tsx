import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '../App'
import '../index.css'
import { syncBootParamsFromUrl } from '../router/syncBootParams'
import { initializeChatSessionSpace } from './sessionSpace'
import { isChatBusinessPage, startChatSessionSync } from './sessionSync'

let root: ReturnType<typeof createRoot> | null = null
let stopSessionSync: (() => void) | undefined

export async function mountChatApp() {
  const bootParams = syncBootParamsFromUrl()
  stopSessionSync?.()
  stopSessionSync = startChatSessionSync()
  if (isChatBusinessPage()) await initializeChatSessionSpace(bootParams?.spaceId)

  const container = document.getElementById('root')
  if (!container) throw new Error('未找到 Chat 根节点 #root')

  root ??= createRoot(container)
  const spaceId = Number(localStorage.getItem('spaceId')) || undefined

  root.render(
    <StrictMode>
      <App spaceId={spaceId} />
    </StrictMode>,
  )
}
