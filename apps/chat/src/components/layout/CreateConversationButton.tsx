import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { message } from 'antd'
import { useCallback, useState } from 'react'

import CreateModal from '@/components/conversation-analysis/CreateModal'
import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import { createApp } from '@/service/api/app'
import { newConv } from '@/service/api/conv'

interface CreateConversationButtonProps {
  collapsed: boolean
  onCreated?: () => void
  onToggleCollapse: () => void
}

/** SVG: sidebar panel icon with chevron (matches reference) */
function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="15 9 12 12 15 15" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <polyline points="12 9 15 12 12 15" />
    </svg>
  )
}

export function CreateConversationButton({ collapsed, onCreated, onToggleCollapse }: CreateConversationButtonProps) {
  const navigate = useNavigate()
  const [createModalVisible, setCreateModalVisible] = useState(false)

  const handleOpenCreateModal = useCallback(() => {
    setCreateModalVisible(true)
  }, [])

  const handleCreateModalClose = useCallback(
    async (formValue?: any) => {
      if (!formValue) {
        setCreateModalVisible(false)
        return Promise.resolve()
      }

      try {
        const createAppRes = await createApp(formValue)
        const createdApp = createAppRes?.data
        if (!createdApp?.chat_id) {
          throw new Error('chat_id missing')
        }

        await newConv(createdApp)

        const taskId = String(createdApp.chat_id)
        localStorage.setItem('chatId', taskId)
        setCreateModalVisible(false)
        onCreated?.()

        navigate({
          to: TASK_DETAIL_ROUTE,
          params: { taskId },
        })
        return Promise.resolve()
      } catch (error) {
        message.error('创建失败')
        return Promise.reject(error)
      }
    },
    [navigate, onCreated],
  )

  return (
    <>
      <div className="shrink-0 flex items-center gap-2 mx-4 mb-3">
        <button
          type="button"
          className="new-chat-capsule-btn"
          onClick={handleOpenCreateModal}
          style={{ padding: collapsed ? '10px 0' : '10px 18px' }}
        >
          <PlusOutlined style={{ fontSize: 14, fontWeight: 600 }} />
          {!collapsed && '新建对话'}
        </button>
        <button
          type="button"
          className="collapse-sidebar-btn"
          onClick={onToggleCollapse}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? <ExpandIcon /> : <CollapseIcon />}
        </button>
      </div>

      <CreateModal visible={createModalVisible} onClose={handleCreateModalClose} />
    </>
  )
}
