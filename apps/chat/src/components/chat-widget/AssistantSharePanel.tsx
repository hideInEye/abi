import ChatWidget from '@/components/chat-widget/ChatWidget'

/** 助手分享页视图：ChatWidget 内部按 shareCode 探测 getProjectInfo/{type} 完成入口校验与加载，
 * 此层仅按 embed 决定铺满 iframe 还是整页面板。
 * embed=true：第三方系统通过 iframe 直嵌，对话框铺满 iframe（宿主自行控制悬浮定位与尺寸）。 */
export function AssistantSharePageView({ shareCode, embed = false }: { shareCode: string; embed?: boolean }) {
  const apiBase = String(window.APP_CONFIG?.VITE_BASE_API ?? '')

  return embed ? (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <ChatWidget shareCode={shareCode} apiBase={apiBase} mode="embed" />
    </div>
  ) : (
    <ChatWidget shareCode={shareCode} apiBase={apiBase} mode="page" />
  )
}
