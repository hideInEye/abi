import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'

import { TASK_DETAIL_ROUTE } from '@/constant/layout'

interface CreateConversationButtonProps {
  collapsed: boolean
  onCreated?: () => void
}

export function CreateConversationButton({ collapsed, onCreated }: CreateConversationButtonProps) {
  const navigate = useNavigate()

  const handleCreateNewChat = useCallback(async () => {
    // 先完成路由跳转再触发重新挂载，避免 Outlet 在旧 routeChatId 下先 remount
    // 导致 getAppList 非静默拉取后把 curConv 恢复成上一个会话，从而闪回旧页面
    await navigate({
      to: TASK_DETAIL_ROUTE,
      params: { taskId: 'new' },
    })
    onCreated?.()
  }, [navigate, onCreated])

  return (
    <div className="shrink-0 flex items-center mx-4 mb-3">
      <button
        type="button"
        className="new-chat-primary-btn"
        onClick={handleCreateNewChat}
        style={{ padding: collapsed ? '10px 0' : '10px 18px' }}
      >
        <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 14 14" width="14">
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </svg>
        {!collapsed && '新建对话'}
      </button>
    </div>
  )
}
