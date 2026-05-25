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
  onCreated?: () => void
}

export function CreateConversationButton({ collapsed, onCreated }: CreateConversationButtonProps) {
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
      <div className="shrink-0 px-2.5 pb-2 pt-3">
        <Button
          block
          icon={<PlusOutlined />}
          size="small"
          onClick={handleOpenCreateModal}
          className="!h-8 !rounded-[14px] !border-0 !bg-white !text-[16px] !font-medium !text-[#202124] shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:!bg-[#eaf2ff] hover:!text-[#3f7cff] active:!bg-[#deebff] active:!text-[#3267db]"
        >
          {!collapsed && '新建对话'}
        </Button>
      </div>

      <CreateModal visible={createModalVisible} onClose={handleCreateModalClose} />
    </>
  )
}
