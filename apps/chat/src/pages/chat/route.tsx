import { ClockCircleOutlined } from '@ant-design/icons'
import { Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { Layout } from 'antd'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

import {
  SKILL_STORE_MENU_KEY,
  SIDER_COLLAPSED_WIDTH,
  SIDER_WIDTH,
} from '@/constant/layout'
import { BrandHeader } from '@/components/layout/BrandHeader'
import { ConversationGroups } from '@/components/layout/ConversationGroups'
import { CreateConversationButton } from '@/components/layout/CreateConversationButton'
import { ScheduleTaskDrawer } from '@/components/layout/ScheduleTaskDrawer'
import { SidebarCollapseProvider } from '@/components/layout/SidebarCollapseContext'
import { SidebarHistoryTopics } from '@/components/layout/SidebarHistoryTopics'
import { SpaceSelector } from '@/components/layout/SpaceSelector'
import { UserProfileCard } from '@/components/layout/UserProfileCard'
import { WorkbenchMenuList } from '@/components/layout/WorkbenchMenuList'
import { getCurrentUserName } from '@/utils/layout'

/** 技能商店 / 应用工坊 独立路由地址 */
const SKILL_STORE_ROUTE = '/chat/skill'
const WORKSHOP_ROUTE = '/chat/workshop'

const { Content, Sider } = Layout
const appLogoUrl = new URL('../../assets/imgs/home_logo.png', import.meta.url).href

export const Route = createFileRoute('/chat')({
  component: ChatWorkbenchLayout,
})

function ChatWorkbenchLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [newChatNonce, setNewChatNonce] = useState(0)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  // 技能商店 / 应用工坊已改为独立路由，激活态直接由 pathname 派生
  const showSkillStore = pathname.startsWith(SKILL_STORE_ROUTE)
  const showWorkshop = pathname.startsWith(WORKSHOP_ROUTE)

  const userName = useMemo(() => getCurrentUserName(), [])
  const pageTitle = useMemo(() => {
    if (showSkillStore) return 'ABI - 技能商店'
    if (showWorkshop) return 'ABI - 应用工坊'
    if (pathname.startsWith('/chat/task')) {
      return 'ABI - 对话'
    }
    if (pathname.startsWith('/chat/history')) {
      return 'ABI - 历史话题'
    }
    return 'ABI - 对话工作台'
  }, [pathname, showSkillStore, showWorkshop])

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((previousCollapsed) => !previousCollapsed)
  }, [])

  const handleCollapseSidebar = useCallback(() => {
    setCollapsed(true)
  }, [])

  const sidebarCollapseContext = useMemo(
    () => ({
      collapsed,
      toggleSidebar: handleToggleCollapse,
      collapseSidebar: handleCollapseSidebar,
    }),
    [collapsed, handleCollapseSidebar, handleToggleCollapse],
  )

  const handleNavItemClick = useCallback(
    (key: string) => {
      if (key === SKILL_STORE_MENU_KEY) {
        navigate({ to: SKILL_STORE_ROUTE })
      } else if (key === 'workshop') {
        navigate({ to: WORKSHOP_ROUTE })
      }
    },
    [navigate],
  )

  const handleSpaceChanged = useCallback(() => {
    setHistoryRefreshKey((key) => key + 1)
  }, [])

  // 监听会话创建事件，自动刷新侧边栏列表
  useEffect(() => {
    const handleConversationCreated = () => {
      setHistoryRefreshKey((key) => key + 1)
    }
    window.addEventListener('conversation-created', handleConversationCreated)
    return () => {
      window.removeEventListener('conversation-created', handleConversationCreated)
    }
  }, [])

  const handleCreateNewChat = useCallback(() => {
    setNewChatNonce((n) => n + 1)
  }, [])

  return (
    <Layout
      className="h-[100dvh] overflow-hidden app-bg-decor"
      style={{
        background: 'linear-gradient(135deg, var(--bg-1) 0%, var(--bg-2) 45%, var(--bg-3) 100%)',
      }}
    >
      <Sider
        id="chat-workbench-sidebar"
        collapsible
        collapsed={collapsed}
        width={SIDER_WIDTH}
        collapsedWidth={SIDER_COLLAPSED_WIDTH}
        trigger={null}
        className="sidebar-glass !h-[100dvh]"
      >
        <div className="h-full min-h-0 flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
          <BrandHeader collapsed={collapsed} logoSrc={appLogoUrl} />

          <CreateConversationButton
            collapsed={collapsed}
            onCreated={handleCreateNewChat}
          />

          <div className="sidebar-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-2">
            <WorkbenchMenuList
              collapsed={collapsed}
              activeKey={showSkillStore ? SKILL_STORE_MENU_KEY : showWorkshop ? 'workshop' : undefined}
              onItemClick={handleNavItemClick}
            />
            <ConversationGroups collapsed={collapsed} refreshKey={historyRefreshKey} />
            <SidebarHistoryTopics
              collapsed={collapsed}
              refreshKey={historyRefreshKey}
              suppressActive={showSkillStore || showWorkshop}
            />
          </div>

          <div
            className="shrink-0 py-3"
            style={{
              borderTop: '1px solid var(--border-2)',
            }}
          >
            <div className="px-4">
              <UserProfileCard collapsed={collapsed} userName={userName} />
            </div>
          </div>
        </div>
      </Sider>

      <Layout className="min-w-0" style={{ background: 'transparent' }}>
        <Content className="content-glass relative h-full min-h-0 overflow-hidden">
          <div className="chat-space-topright">
            <button
              type="button"
              className="header-schedule-btn"
              onClick={() => setScheduleOpen(true)}
            >
              <ClockCircleOutlined />
              定时任务
            </button>
            <SpaceSelector collapsed={false} onSpaceChanged={handleSpaceChanged} />
            <ScheduleTaskDrawer open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
          </div>
          <SidebarCollapseProvider value={sidebarCollapseContext}>
            <Fragment key={newChatNonce}>
              <Outlet />
            </Fragment>
          </SidebarCollapseProvider>
        </Content>
      </Layout>
    </Layout>
  )
}
