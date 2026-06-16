import { ClearOutlined, CopyOutlined, DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Dropdown, message, Modal, Spin, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'

import CreateModal from '@/components/conversation-analysis/CreateModal'
import SaveDrawer from '@/components/conversation/SaveDrawer'
import { CHAT_MODE } from '@/constant'
import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import { useHistoryTopics } from '@/hooks/layout/useHistoryTopics'
import { deleteApp, updateApp } from '@/service/api/app'
import { clearConvHistory, deleteConv, fetchConvList } from '@/service/api/conv'
import { getSpaceId } from '@/utils'

type SidebarHistoryTopicsProps = {
  collapsed: boolean
  refreshKey: number
}

function getActiveTaskId(pathname: string) {
  const match = pathname.match(/^\/chat\/task\/([^/?#]+)/)
  return match?.[1] ?? ''
}

export function SidebarHistoryTopics({ collapsed, refreshKey }: SidebarHistoryTopicsProps) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeTaskId = useMemo(() => getActiveTaskId(pathname), [pathname])
  const { historyLoading, historyTopics, historyApps, loadHistoryTopics } = useHistoryTopics()
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createModalIsEdit, setCreateModalIsEdit] = useState(false)
  const [createModalInitialValues, setCreateModalInitialValues] = useState<any>()
  const [saveVisible, setSaveVisible] = useState(false)
  const [saveData, setSaveData] = useState<any>({})

  useEffect(() => {
    if (!collapsed) {
      loadHistoryTopics()
    }
  }, [collapsed, loadHistoryTopics, refreshKey])

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
        if (isEdit) {
          await updateApp(formValue)
          await loadHistoryTopics()
        }

        setCreateModalVisible(false)
        setCreateModalIsEdit(false)
        setCreateModalInitialValues(undefined)
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

  const buildMenu = (chatId: string): MenuProps => ({
    items: [
      { key: 'edit', icon: <EditOutlined />, label: '编辑' },
      { key: 'save', icon: <CopyOutlined />, label: '另存' },
      { key: 'clear', icon: <ClearOutlined />, label: '清空' },
      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      if (key === 'edit') return handleEditTopic(chatId)
      if (key === 'save') return handleSaveTopic(chatId)
      if (key === 'clear') return handleClearTopic(chatId)
      if (key === 'delete') {
        handleDeleteTopic(chatId)
      }
    },
  })

  if (collapsed) {
    return null
  }

  return (
    <>
      <section className="mt-4 px-1">
        <div
          className="flex items-center justify-between px-3 pb-2"
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          <span>最近对话</span>
        </div>

        <Spin spinning={historyLoading}>
          <div className="flex flex-col gap-0.5">
            {historyTopics.length ? (
              historyTopics.map((topic) => {
                const isActive = topic.chatId === activeTaskId

                return (
                  <div
                    key={topic.chatId}
                    role="button"
                    tabIndex={0}
                    className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-left"
                    style={{
                      padding: '8px 12px',
                      background: isActive ? 'var(--accent-soft)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--ink-2)',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: 12.5,
                      transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
                    }}
                    onClick={() => handleSelectTopic(topic.chatId)}
                    onKeyDown={(event) => event.key === 'Enter' && handleSelectTopic(topic.chatId)}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        ;(e.currentTarget as HTMLElement).style.background = 'rgba(130,140,200,0.08)'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--ink)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--ink-2)'
                      }
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{topic.title}</span>
                    <Dropdown
                      trigger={['click']}
                      menu={buildMenu(topic.chatId)}
                      placement="bottomRight"
                    >
                      <span
                        className="shrink-0 px-1 py-1 transition-opacity"
                        style={{
                          opacity: isActive ? 1 : 0,
                          color: 'var(--ink-3)',
                        }}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                        }}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLElement).closest('.group')?.querySelectorAll('[class*="opacity-0"]').forEach((el) => {
                            ;(el as HTMLElement).style.opacity = '1'
                          })
                        }}
                      >
                        <MoreOutlined style={{ fontSize: 14 }} />
                      </span>
                    </Dropdown>
                  </div>
                )
              })
            ) : historyLoading ? null : (
              <div className="px-3 py-4 text-center" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                暂无最近对话
              </div>
            )}
          </div>
        </Spin>
      </section>

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
