import { Outlet, createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

import {
  SKILL_STORE_MENU_KEY,
  SIDER_COLLAPSED_WIDTH,
  SIDER_WIDTH,
} from '@/constant/layout'
import { BrandHeader } from '@/components/layout/BrandHeader'
import { CreateConversationButton } from '@/components/layout/CreateConversationButton'
import { SidebarCollapseProvider } from '@/components/layout/SidebarCollapseContext'
import { LazyFeatureFallback, RetryableLazy } from '@/components/performance/RetryableLazy'
import { useAfterFirstPaint } from '@/components/performance/useAfterFirstPaint'
import { ChatBootstrapProvider } from '@/resources/chatBootstrap'
import { getCurrentUserName } from '@/utils/identity'

/** 技能商店 / 应用工坊 独立路由地址 */
const SKILL_STORE_ROUTE = '/chat/skill'
const WORKSHOP_ROUTE = '/chat/workshop'

const loadScheduleTaskDrawer = () => import('@/components/layout/ScheduleTaskDrawer').then(module => ({ default: module.ScheduleTaskDrawer }))
const loadSpaceSelector = () => import('@/components/layout/SpaceSelector').then(module => ({ default: module.SpaceSelector }))
const loadWorkbenchSidebarPanels = () => import('@/components/layout/WorkbenchSidebarPanels')
const appLogoUrl = new URL('../../assets/imgs/home_logo.png', import.meta.url).href

function SidebarPanelsFallback({ collapsed, userName }: { collapsed: boolean; userName: string }) {
  return (
    <>
      <div aria-busy="true" className="flex-1 min-h-0 px-3 py-2">
        {!collapsed && <div className="px-3 py-2 text-xs font-semibold text-slate-400">正在加载工作台…</div>}
        <div className="mt-2 h-9 animate-pulse rounded-lg bg-white/35" />
        <div className="mt-2 h-9 animate-pulse rounded-lg bg-white/30" />
        <div className="mt-6 h-20 animate-pulse rounded-lg bg-white/25" />
      </div>
      <div className="shrink-0 border-t border-slate-200/60 px-4 py-3">
        <div className="user-bar-glass flex items-center justify-center py-2 text-sm font-semibold text-slate-500">
          {collapsed ? userName.trim().charAt(0).toUpperCase() || 'U' : userName}
        </div>
      </div>
    </>
  )
}

export const Route = createFileRoute('/chat')({
  component: ChatWorkbenchLayout,
})

function ChatWorkbenchLayout() {
  return (
    <ChatBootstrapProvider>
      <ChatWorkbenchLayoutContent />
    </ChatBootstrapProvider>
  )
}

function ChatWorkbenchLayoutContent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(false)
  const [newChatNonce, setNewChatNonce] = useState(0)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  // 技能商店 / 应用工坊已改为独立路由，激活态直接由 pathname 派生
  const showSkillStore = pathname.startsWith(SKILL_STORE_ROUTE)
  const showWorkshop = pathname.startsWith(WORKSHOP_ROUTE)
  const chromeReady = useAfterFirstPaint(pathname === '/chat/task/new' ? 1200 : 0)

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

  const handleCreateNewChat = useCallback(() => {
    setNewChatNonce((n) => n + 1)
  }, [])

  return (
    <div
      className="h-[100dvh] min-w-0 overflow-hidden app-bg-decor flex"
      style={{
        background: 'linear-gradient(135deg, var(--bg-1) 0%, var(--bg-2) 45%, var(--bg-3) 100%)',
      }}
    >
      <aside
        id="chat-workbench-sidebar"
        aria-label="对话工作台侧栏"
        className="sidebar-glass h-[100dvh] shrink-0"
        style={{
          flex: `0 0 ${collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH}px`,
          maxWidth: collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH,
          minWidth: collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH,
          width: collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH,
          transition: 'all 0.2s ease',
        }}
      >
        <div className="ant-layout-sider-children h-full">
          <div className="h-full min-h-0 flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
            <BrandHeader collapsed={collapsed} logoSrc={appLogoUrl} />

            <CreateConversationButton
              collapsed={collapsed}
              onCreated={handleCreateNewChat}
            />

            {chromeReady ? (
              <RetryableLazy
                loader={loadWorkbenchSidebarPanels}
                componentProps={{
                  activeKey: showSkillStore ? SKILL_STORE_MENU_KEY : showWorkshop ? 'workshop' : undefined,
                  collapsed,
                  onItemClick: handleNavItemClick,
                  suppressHistoryActive: showSkillStore || showWorkshop,
                  userName,
                }}
                fallback={<SidebarPanelsFallback collapsed={collapsed} userName={userName} />}
              />
            ) : (
              <SidebarPanelsFallback collapsed={collapsed} userName={userName} />
            )}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex flex-1 flex-col" style={{ background: 'transparent' }}>
        <main className="content-glass relative h-full min-h-0 overflow-hidden">
          <div className="chat-space-topright">
            <button
              type="button"
              className="header-schedule-btn"
              onClick={() => setScheduleOpen(true)}
              onFocus={() => void loadScheduleTaskDrawer()}
              onMouseEnter={() => void loadScheduleTaskDrawer()}
            >
              <span aria-hidden="true">◷</span>
              定时任务
            </button>
            {chromeReady ? (
              <RetryableLazy
                loader={loadSpaceSelector}
                componentProps={{ collapsed: false }}
                fallback={<div aria-busy="true" className="space-switcher-wrap"><div className="space-switcher-glass h-9 w-32 animate-pulse" /></div>}
              />
            ) : (
              <div aria-busy="true" className="space-switcher-wrap"><div className="space-switcher-glass h-9 w-32 animate-pulse" /></div>
            )}
            {scheduleOpen && (
              <RetryableLazy
                loader={loadScheduleTaskDrawer}
                componentProps={{ open: scheduleOpen, onClose: () => setScheduleOpen(false) }}
                fallback={<LazyFeatureFallback label="正在加载定时任务…" style={{ position: 'fixed', inset: '0 0 0 auto', zIndex: 1000, width: 480, minHeight: '100vh' }} />}
              />
            )}
          </div>
          <SidebarCollapseProvider value={sidebarCollapseContext}>
            <Fragment key={newChatNonce}>
              <Outlet />
            </Fragment>
          </SidebarCollapseProvider>
        </main>
      </div>
    </div>
  )
}
