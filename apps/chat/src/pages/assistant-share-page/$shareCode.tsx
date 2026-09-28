import { createFileRoute } from '@tanstack/react-router'

import { AssistantSharePageView } from '@/components/chat-widget/AssistantSharePanel'

// 兼容既有引用：dashboard_share_page 从本模块导入 AssistantSharePageView
export { AssistantSharePageView }

function AssistantSharePage() {
  const { shareCode } = Route.useParams()
  const { embed } = Route.useSearch()
  return <AssistantSharePageView shareCode={shareCode} embed={embed} />
}

export const Route = createFileRoute('/assistant-share-page/$shareCode')({
  component: AssistantSharePage,
  // embed=1 时以可嵌入悬浮对话框（铺满 iframe）形态渲染，供第三方系统 iframe 直嵌
  // TanStack 默认 JSON 解析 search，?embed=1 会解析为数字 1，故数字/字符串/布尔均需兼容
  validateSearch: (search: Record<string, unknown>): { embed?: boolean } => ({
    embed: search.embed === 1 || search.embed === '1' || search.embed === 'true' || search.embed === true,
  }),
})
