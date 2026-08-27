import { createFileRoute } from '@tanstack/react-router'

import { AssistantSharePageView } from '../assistant-share-page/$shareCode'

/** 后端分享链接统一为哈希路径 dashboard_share_page/{code}，直接在后端路径上渲染（不重定向，URL 保持不变） */
export const Route = createFileRoute('/dashboard_share_page/$shareCode')({
  component: AssistantSharePage,
})

function AssistantSharePage() {
  const { shareCode } = Route.useParams()
  return <AssistantSharePageView shareCode={shareCode} />
}
