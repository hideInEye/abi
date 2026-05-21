import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Button, message } from 'antd'
import { useCallback, useState } from 'react'

import CreateModal from '@/components/conversation-analysis/CreateModal'
import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import { createApp } from '@/service/api/app'
import { newConv } from '@/service/api/conv'

interface CreateConversationButtonProps {
  collapsed: boolean
}

export function CreateConversationButton({ collapsed }: CreateConversationButtonProps) {
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
    [navigate],
  )

  return (
    <>
      <div className="shrink-0 px-2.5 pb-2 pt-3">
        <Button
          block
          icon={<PlusOutlined />}
          onClick={handleOpenCreateModal}
          className="!h-11 !rounded-[12px] !border-0 !bg-[#1f1c19] !text-[15px] !font-semibold !text-white shadow-[0_8px_18px_rgba(31,28,25,0.16)] hover:!bg-[#2a2622]"
        >
          {!collapsed && '新建对话'}
        </Button>
      </div>

      <CreateModal visible={createModalVisible} onClose={handleCreateModalClose} />
    </>
  )
}
