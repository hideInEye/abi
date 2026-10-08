import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * 过渡兼容：后端分享链接历史路径 dashboard_share_page/{code}，检测到后直接替换为新路径 share_url/{code}。
 * TODO: 后端切换为 share_url 返回后删除本文件（routeTree 中对应条目由插件自动重新生成）
 */
export const Route = createFileRoute('/dashboard_share_page/$shareCode')({
  // 与 share_url 路由一致的 search 解析，保证 embed 参数在重定向中正确透传
  validateSearch: (search: Record<string, unknown>): { embed?: boolean } => ({
    embed: search.embed === 1 || search.embed === '1' || search.embed === 'true' || search.embed === true,
  }),
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: '/share_url/$shareCode',
      params: { shareCode: params.shareCode },
      search: location.search,
      replace: true,
    })
  },
})
