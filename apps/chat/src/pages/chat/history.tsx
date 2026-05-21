import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { message, Modal } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { CHAT_MODE } from '@/constant'
import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import { HistoryTopicsPanel } from '@/components/layout/HistoryTopicsPanel'
import { useHistoryTopics } from '@/hooks/layout/useHistoryTopics'
import CreateModal from '@/components/conversation-analysis/CreateModal'
import SaveDrawer from '@/components/conversation/SaveDrawer'
import { deleteApp, updateApp } from '@/service/api/app'
import { clearConvHistory, deleteConv, fetchConvList } from '@/service/api/conv'
import { getSpaceId } from '@/utils'

export const Route = createFileRoute('/chat/history')({
  component: HistoryPage,
})

function HistoryPage() {
  const navigate = useNavigate()
  const { historyLoading, historyTopics, historyApps, loadHistoryTopics } = useHistoryTopics()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createModalIsEdit, setCreateModalIsEdit] = useState(false)
  const [createModalInitialValues, setCreateModalInitialValues] = useState<any>()
  const [saveVisible, setSaveVisible] = useState(false)
  const [saveData, setSaveData] = useState<any>({})

  useEffect(() => {
    loadHistoryTopics()
  }, [loadHistoryTopics])

  const filteredTopics = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    if (!keyword) return historyTopics
    return historyTopics.filter((topic) => topic.title.toLowerCase().includes(keyword))
  }, [historyTopics, searchKeyword])

  const findAppByChatId = useCallback(
    (chatId: string) => historyApps.find((app) => String(app.chat_id) === String(chatId)),
    [historyApps],
  )

  const handleSelectTopic = useCallback(
    (taskId: string) => {
      if (!taskId) return
      navigate({
        to: TASK_DETAIL_ROUTE,
        params: { taskId },
      })
    },
    [navigate],
  )

  const handleCreateModalClose = useCallback(
    async (formValue?: any, isEdit?: boolean) => {
      if (!formValue) {
        setCreateModalVisible(false)
        setCreateModalIsEdit(false)
        setCreateModalInitialValues(undefined)
        return Promise.resolve()
      }

      try {
        if (!isEdit) {
          setCreateModalVisible(false)
          setCreateModalIsEdit(false)
          setCreateModalInitialValues(undefined)
          return Promise.resolve()
        }

        await updateApp(formValue)
        setCreateModalVisible(false)
        setCreateModalIsEdit(false)
        setCreateModalInitialValues(undefined)
        await loadHistoryTopics()
        return Promise.resolve()
      } catch (error) {
        message.error('更新失败')
        return Promise.reject(error)
      }
    },
    [loadHistoryTopics],
  )

  const handleEditTopic = useCallback(
    (chatId: string) => {
      const app = findAppByChatId(chatId)
      if (!app) {
        message.warning('未找到对话配置')
        return
      }

      setCreateModalIsEdit(true)
      setCreateModalInitialValues({
        ...app,
        title: app.title || 'AI智能助手',
        biz_name: app.biz_name || 'AI智能助手',
      })
      setCreateModalVisible(true)
    },
    [findAppByChatId],
  )

  const handleSaveTopic = useCallback(
    async (chatId: string) => {
      const app = findAppByChatId(chatId)
      if (!app) {
        message.warning('未找到对话')
        return
      }

      const response = await fetchConvList({
        chat_id: app.chat_id,
        chat_mode: CHAT_MODE,
        space_id: getSpaceId(),
      })
      if (!response?.data?.length) {
        message.warning('暂无可另存的对话内容')
        return
      }

      setSaveData({ ...app, ...response.data[0] })
      setSaveVisible(true)
    },
    [findAppByChatId],
  )

  const handleSaveDrawerClose = useCallback(
    async (refresh?: boolean, payload?: any) => {
      setSaveVisible(false)
      if (!refresh) return

      await loadHistoryTopics()
      const nextTaskId = payload?.newApp?.chat_id
      if (!nextTaskId) return

      navigate({
        to: TASK_DETAIL_ROUTE,
        params: { taskId: String(nextTaskId) },
      })
    },
    [loadHistoryTopics, navigate],
  )

  const handleClearTopic = useCallback(
    (chatId: string) => {
      const app = findAppByChatId(chatId)
      if (!app) {
        message.warning('未找到对话')
        return
      }

      Modal.confirm({
        title: '确认清空对话',
        content: '是否确认清空当前对话？清空后无法恢复。',
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            const response = await fetchConvList({
              chat_id: app.chat_id,
              chat_mode: CHAT_MODE,
              space_id: getSpaceId(),
            })
            if (!response?.data?.length) {
              message.warning('当前没有可清空的会话')
              return
            }

            await clearConvHistory({ conv_uid: response.data[0].conv_uid })
            message.success('对话已清空')
          } catch {
            message.error('清空对话失败')
          }
        },
      })
    },
    [findAppByChatId],
  )

  const handleDeleteTopic = useCallback(
    (chatId: string) => {
      const app = findAppByChatId(chatId)
      if (!app) {
        message.warning('未找到对话')
        return
      }

      Modal.confirm({
        title: '确认删除对话',
        content: '是否确认删除当前对话？删除后无法恢复。',
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            const response = await fetchConvList({
              chat_id: app.chat_id,
              chat_mode: CHAT_MODE,
              space_id: getSpaceId(),
            })
            if (response?.data?.length) {
              await Promise.all(response.data.map((item: any) => deleteConv({ conv_uid: item.conv_uid })))
            }
            await deleteApp({ chat_id: app.chat_id, space_id: getSpaceId() })
            message.success('删除对话成功')
            await loadHistoryTopics()
          } catch {
            message.error('删除对话失败')
          }
        },
      })
    },
    [findAppByChatId, loadHistoryTopics],
  )

  return (
    <>
      <HistoryTopicsPanel
        loading={historyLoading}
        topics={filteredTopics}
        activeConversationId=""
        searchKeyword={searchKeyword}
        onSearchChange={setSearchKeyword}
        onSelectTopic={handleSelectTopic}
        onEditTopic={handleEditTopic}
        onSaveTopic={handleSaveTopic}
        onClearTopic={handleClearTopic}
        onDeleteTopic={handleDeleteTopic}
      />
      <CreateModal
        visible={createModalVisible}
        onClose={handleCreateModalClose}
        isEdit={createModalIsEdit}
        initialValues={createModalInitialValues}
      />
      <SaveDrawer open={saveVisible} onClose={handleSaveDrawerClose} conv={saveData} />
    </>
  )
}
