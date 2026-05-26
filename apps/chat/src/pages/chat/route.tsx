import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { Layout } from 'antd'
import type { MenuProps } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  middleMenus,
  SIDER_COLLAPSED_WIDTH,
  SIDER_WIDTH,
} from '@/constant/layout'
import { BrandHeader } from '@/components/layout/BrandHeader'
import { CreateConversationButton } from '@/components/layout/CreateConversationButton'
import { SidebarHistoryTopics } from '@/components/layout/SidebarHistoryTopics'
import { SpaceSelector } from '@/components/layout/SpaceSelector'
import { UserProfileCard } from '@/components/layout/UserProfileCard'
import { WorkbenchMenuList } from '@/components/layout/WorkbenchMenuList'
import { getCurrentUserName } from '@/utils/layout'

const { Content, Sider } = Layout
const appLogoUrl = new URL('../../assets/imgs/home_logo.png', import.meta.url).href

export const Route = createFileRoute('/chat')({
  component: ChatWorkbenchLayout,
})

function ChatWorkbenchLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const [collapsed, setCollapsed] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const userName = useMemo(() => getCurrentUserName(), [])
  const pageTitle = useMemo(() => {
    if (pathname.startsWith('/chat/task')) {
      return 'ABI - 对话'
    }
    if (pathname.startsWith('/chat/history')) {
      return 'ABI - 历史话题'
    }
    return 'ABI - 对话工作台'
  }, [pathname])

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((previousCollapsed) => !previousCollapsed)
  }, [])

  const handleMiddleMenuClick = useCallback<MenuProps['onClick']>(() => {
    // 中部菜单暂为占位项，当前版本只实现对话详情流程。
  }, [])

  const handleSpaceChanged = useCallback(() => {
    setHistoryRefreshKey((key) => key + 1)
  }, [])

  return (
    <Layout className="h-[100dvh] overflow-hidden bg-[#f5f6f7]">
      <Sider
        collapsible
        collapsed={collapsed}
        width={SIDER_WIDTH}
        collapsedWidth={SIDER_COLLAPSED_WIDTH}
        trigger={null}
        className="!h-[100dvh] !bg-[#f7f7f4] border-r border-[#eceef2]"
      >
        <div className="h-full min-h-0 flex flex-col">
          <BrandHeader collapsed={collapsed} logoSrc={appLogoUrl} onToggleCollapse={handleToggleCollapse} />

          <CreateConversationButton collapsed={collapsed} onCreated={() => setHistoryRefreshKey((key) => key + 1)} />

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2.5 py-3">
            <WorkbenchMenuList collapsed={collapsed} items={middleMenus} onClick={handleMiddleMenuClick} selectable={false} />
            <SidebarHistoryTopics collapsed={collapsed} refreshKey={historyRefreshKey} />
          </div>

          <div className="shrink-0 border-t border-[#eceee8] p-2.5 bg-[#f7f7f4]">
            <SpaceSelector collapsed={collapsed} onSpaceChanged={handleSpaceChanged} />
            <UserProfileCard collapsed={collapsed} userName={userName} />
          </div>
        </div>
      </Sider>

      <Layout className="min-w-0">
        <Content className="h-full min-h-0 overflow-hidden bg-[#f7f8fa]">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
