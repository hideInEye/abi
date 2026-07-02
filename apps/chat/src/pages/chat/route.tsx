import { Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import { Layout } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  SKILL_STORE_MENU_KEY,
  SIDER_COLLAPSED_WIDTH,
  SIDER_WIDTH,
} from '@/constant/layout'
import { BrandHeader } from '@/components/layout/BrandHeader'
import { ConversationGroups } from '@/components/layout/ConversationGroups'
import { CreateConversationButton } from '@/components/layout/CreateConversationButton'
import { SidebarHistoryTopics } from '@/components/layout/SidebarHistoryTopics'
import { SkillStoreView } from '@/components/layout/SkillStoreView'
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
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [showSkillStore, setShowSkillStore] = useState(false)
  const prevPathnameRef = useRef(pathname)

  const userName = useMemo(() => getCurrentUserName(), [])
  const pageTitle = useMemo(() => {
    if (showSkillStore) return 'ABI - 技能商店'
    if (pathname.startsWith('/chat/task')) {
      return 'ABI - 对话'
    }
    if (pathname.startsWith('/chat/history')) {
      return 'ABI - 历史话题'
    }
    return 'ABI - 对话工作台'
  }, [pathname, showSkillStore])

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  /* 3. Auto-close skill store when user navigates to a conversation */
  useEffect(() => {
    if (pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = pathname
      if (showSkillStore && pathname.startsWith('/chat/task')) {
        setShowSkillStore(false)
      }
    }
  }, [pathname, showSkillStore])

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((previousCollapsed) => !previousCollapsed)
  }, [])

  const handleNavItemClick = useCallback(
    (key: string) => {
      if (key === SKILL_STORE_MENU_KEY) {
        setShowSkillStore(true)
      } else {
        setShowSkillStore(false)
        /* placeholder for other nav items like 应用工坊 */
      }
    },
    [],
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

  const handleBackFromSkillStore = useCallback(() => {
    setShowSkillStore(false)
  }, [])

  return (
    <Layout
      className="h-[100dvh] overflow-hidden app-bg-decor"
      style={{
        background: 'linear-gradient(135deg, var(--bg-1) 0%, var(--bg-2) 45%, var(--bg-3) 100%)',
      }}
    >
      <Sider
        collapsible
        collapsed={collapsed}
        width={SIDER_WIDTH}
        collapsedWidth={SIDER_COLLAPSED_WIDTH}
        trigger={null}
        className="sidebar-glass !h-[100dvh]"
        style={{
          borderRight: '1px solid var(--glass-border)',
        }}
      >
        <div className="h-full min-h-0 flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
          <BrandHeader collapsed={collapsed} logoSrc={appLogoUrl} onToggleCollapse={handleToggleCollapse} />

          <CreateConversationButton
            collapsed={collapsed}
            onToggleCollapse={handleToggleCollapse}
          />

          <div className="sidebar-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-2">
            <WorkbenchMenuList
              collapsed={collapsed}
              activeKey={showSkillStore ? SKILL_STORE_MENU_KEY : undefined}
              onItemClick={handleNavItemClick}
            />
            <ConversationGroups collapsed={collapsed} refreshKey={historyRefreshKey} />
            <SidebarHistoryTopics collapsed={collapsed} refreshKey={historyRefreshKey} />
          </div>

          <div
            className="shrink-0 py-3"
            style={{
              borderTop: '1px solid var(--border-2)',
            }}
          >
            <SpaceSelector collapsed={collapsed} onSpaceChanged={handleSpaceChanged} />
            <div className="px-4">
              <UserProfileCard collapsed={collapsed} userName={userName} />
            </div>
          </div>
        </div>
      </Sider>

      <Layout className="min-w-0" style={{ background: 'transparent' }}>
        <Content className="content-glass h-full min-h-0 overflow-hidden">
          {showSkillStore ? (
            <SkillStoreView onBack={handleBackFromSkillStore} />
          ) : (
            <Outlet />
          )}
        </Content>
      </Layout>
    </Layout>
  )
}
