import { DeleteOutlined, EditOutlined, FolderOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Dropdown, Input, message, Modal, Spin } from 'antd'
import type { MenuProps } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import CreateModal from '@/components/conversation-analysis/CreateModal'
import EditSessionModal from '@/components/conversation-analysis/EditSessionModal'
import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import { useConversationGroups } from '@/hooks/layout/useConversationGroups'
import { useHistoryTopics } from '@/hooks/layout/useHistoryTopics'
import { deleteSession, deleteMessage, moveSessionToGroup, updateApp } from '@/service/api/app'
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
  const { historyLoading, historyTopics, historyApps, loadHistoryTopics, removeTopicById } = useHistoryTopics()
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createModalIsEdit, setCreateModalIsEdit] = useState(false)
  const [createModalInitialValues, setCreateModalInitialValues] = useState<any>()
  const [editVisible, setEditVisible] = useState(false)
  const [editItem, setEditItem] = useState<any>()
  const [newGroupModalVisible, setNewGroupModalVisible] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [pendingMoveChatId, setPendingMoveChatId] = useState<string | null>(null)

  const { groups, loadGroups, addGroup } = useConversationGroups()

  const initialLoadDone = useRef(false)

  useEffect(() => {
    if (!collapsed) {
      // 首次加载显示 loading，后续 refreshKey 触发的刷新静默加载
      const silent = initialLoadDone.current
      loadHistoryTopics({ silent })
      initialLoadDone.current = true
      // 同时加载分组列表（用于移动到分组子菜单）
      loadGroups()
    }
  }, [collapsed, loadHistoryTopics, loadGroups, refreshKey])

  // 过滤掉已归属分组的会话，避免与分组内重复高亮
  // 判断标准：groupId 存在且不为无效值才算有分组
  const ungroupedTopics = useMemo(() => {
    const invalidGroupIds = new Set([null, undefined, '', '0', 0, 'null'])
    const groupedChatIds = new Set(
      historyApps
        .filter((app) => {
          const gid = app.groupId ?? app.group_id
          return !invalidGroupIds.has(gid)
        })
        .map((app) => String(app.chat_id)),
    )
    return historyTopics.filter((topic) => !groupedChatIds.has(topic.chatId))
  }, [historyTopics, historyApps])

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
      setEditItem(app)
      setEditVisible(true)
    },
    [findAppByChatId],
  )

  const handleEditOk = useCallback(
    async (values: { sessionId: string | number; title: string }) => {
      await updateApp(values)
      message.success('更新成功')
      await loadHistoryTopics()
    },
    [loadHistoryTopics],
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
            await Promise.all([
              deleteSession({ sessionId: app.chat_id }),
              deleteMessage({ convUid: app.conv_uid }),
            ])
            message.success('删除对话成功')
            // 乐观删除：立即从本地列表移除，不依赖重新拉取
            removeTopicById(chatId)
            // 如果删除的是当前正在查看的对话，跳转到欢迎页
            if (chatId === activeTaskId) {
              navigate({ to: TASK_DETAIL_ROUTE, params: { taskId: 'new' } })
            }
          } catch {
            message.error('删除对话失败')
          }
        },
      })
    },
    [findAppByChatId, removeTopicById, activeTaskId, navigate],
  )

  // 移动会话到指定分组
  const handleMoveToGroup = useCallback(
    async (chatId: string, groupId: string) => {
      const app = findAppByChatId(chatId)
      if (!app) {
        message.warning('未找到对话')
        return
      }
      try {
        await moveSessionToGroup({ sessionId: app.chat_id, groupId, title: app.title || app.biz_name || '' })
        message.success('已移动到分组')
        await Promise.all([loadGroups(), loadHistoryTopics({ silent: true })])
        // 通知父组件刷新 refreshKey，让 ConversationGroups 也同步更新
        window.dispatchEvent(new Event('conversation-created'))
      } catch {
        message.error('移动失败')
      }
    },
    [findAppByChatId, loadGroups, loadHistoryTopics],
  )

  // 新建分组并移动
  const handleCreateGroupAndMove = useCallback(async () => {
    if (!newGroupName.trim()) {
      message.warning('请输入分组名称')
      return
    }
    try {
      await addGroup({ groupName: newGroupName.trim() })
      // 如果有待移动的会话，获取最新的分组列表后移动
      if (pendingMoveChatId) {
        const spaceId = getSpaceId()
        const { fetchSessionGroupList } = await import('@/service/api/app')
        const res: any = await fetchSessionGroupList({ spaceId: spaceId || undefined })
        const list = Array.isArray(res?.data) ? res.data : []
        const newGroup = list.find((g: any) => g.groupName === newGroupName.trim())
        if (newGroup) {
          await handleMoveToGroup(pendingMoveChatId, newGroup.groupId)
        }
      }
      message.success('新建分组成功')
      setNewGroupModalVisible(false)
      setNewGroupName('')
      setPendingMoveChatId(null)
    } catch {
      message.error('新建分组失败')
    }
  }, [newGroupName, pendingMoveChatId, addGroup, handleMoveToGroup])

  const buildMenu = (chatId: string): MenuProps => ({
    items: [
      { key: 'edit', icon: <EditOutlined />, label: '重命名' },
      {
        key: 'move-to-group',
        icon: <FolderOutlined />,
        label: '移动到分组',
        children: [
          ...groups.map((g) => ({
            key: `move-group-${g.groupId}`,
            label: g.groupName,
          })),
          ...(groups.length ? [{ type: 'divider' as const }] : []),
          {
            key: 'new-group-for-move',
            icon: <PlusOutlined />,
            label: '新建分组',
          },
        ],
      },
      { type: 'divider' as const },
      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      if (key === 'edit') return handleEditTopic(chatId)
      if (key === 'delete') return handleDeleteTopic(chatId)
      // 移动到已有分组
      if (key.startsWith('move-group-')) {
        const groupId = key.replace('move-group-', '')
        handleMoveToGroup(chatId, groupId)
        return
      }
      // 新建分组并移动
      if (key === 'new-group-for-move') {
        setPendingMoveChatId(chatId)
        setNewGroupName('')
        setNewGroupModalVisible(true)
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
            {ungroupedTopics.length ? (
              ungroupedTopics.map((topic) => {
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

      <EditSessionModal
        visible={editVisible}
        initialValues={editItem}
        onClose={() => setEditVisible(false)}
        onOk={handleEditOk}
      />
      <CreateModal
        visible={createModalVisible}
        onClose={handleCreateModalClose}
        isEdit={createModalIsEdit}
        initialValues={createModalInitialValues}
      />

      {/* 新建分组弹窗（从移动菜单触发） */}
      <Modal
        title="新建分组"
        open={newGroupModalVisible}
        onOk={handleCreateGroupAndMove}
        onCancel={() => {
          setNewGroupModalVisible(false)
          setNewGroupName('')
          setPendingMoveChatId(null)
        }}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Input
          placeholder="请输入分组名称"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onPressEnter={handleCreateGroupAndMove}
          maxLength={50}
          autoFocus
        />
      </Modal>
    </>
  )
}
