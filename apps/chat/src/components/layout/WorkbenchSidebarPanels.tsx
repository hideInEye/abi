import { ConversationGroups } from './ConversationGroups'
import { SidebarHistoryTopics } from './SidebarHistoryTopics'
import { UserProfileCard } from './UserProfileCard'
import { WorkbenchMenuList } from './WorkbenchMenuList'

interface WorkbenchSidebarPanelsProps {
  activeKey?: string
  collapsed: boolean
  onItemClick: (key: string) => void
  suppressHistoryActive: boolean
  userName: string
}

export default function WorkbenchSidebarPanels({
  activeKey,
  collapsed,
  onItemClick,
  suppressHistoryActive,
  userName,
}: WorkbenchSidebarPanelsProps) {
  return (
    <>
      <div className="sidebar-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-2">
        <WorkbenchMenuList
          collapsed={collapsed}
          activeKey={activeKey}
          onItemClick={onItemClick}
        />
        <ConversationGroups collapsed={collapsed} />
        <SidebarHistoryTopics
          collapsed={collapsed}
          suppressActive={suppressHistoryActive}
        />
      </div>

      <div
        className="shrink-0 py-3"
        style={{ borderTop: '1px solid var(--border-2)' }}
      >
        <div className="px-4">
          <UserProfileCard collapsed={collapsed} userName={userName} />
        </div>
      </div>
    </>
  )
}
