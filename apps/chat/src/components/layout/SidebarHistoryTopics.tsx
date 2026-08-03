import { DeleteOutlined, EditOutlined, FolderOutlined, MoreOutlined, PlusOutlined, ProfileOutlined, PushpinFilled, PushpinOutlined, StarOutlined } from '@ant-design/icons'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Button, Checkbox, ConfigProvider, Drawer, Dropdown, Input, message, Modal, Spin } from 'antd'
import type { MenuProps } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import CreateModal from '@/components/conversation-analysis/CreateModal'
import EditSessionModal from '@/components/conversation-analysis/EditSessionModal'
import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import { useConversationGroups } from '@/hooks/layout/useConversationGroups'
import { useHistoryTopics } from '@/hooks/layout/useHistoryTopics'
import { deleteBatchSession, deleteSession, moveSessionToGroup, updateApp } from '@/service/api/app'
import { fetchIsFavorite, fetchOperateNew } from '@/service/api/abi-system'
import { getSpaceId } from '@/utils'

type SidebarHistoryTopicsProps = {
  collapsed: boolean
  refreshKey: number
  /** 当应用工坊/技能商店视图激活时，抑制会话列表的选中高亮 */
  suppressActive?: boolean
}

function getActiveTaskId(pathname: string) {
  const match = pathname.match(/^\/chat\/task\/([^/?#]+)/)
  return match?.[1] ?? ''
}

export function SidebarHistoryTopics({ collapsed, refreshKey, suppressActive = false }: SidebarHistoryTopicsProps) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeTaskId = useMemo(
    () => (suppressActive ? '' : getActiveTaskId(pathname)),
    [pathname, suppressActive],
  )
  const { historyLoading, historyTopics, historyApps, loadHistoryTopics, removeTopicById } = useHistoryTopics()
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createModalIsEdit, setCreateModalIsEdit] = useState(false)
  const [createModalInitialValues, setCreateModalInitialValues] = useState<any>()
  const [editVisible, setEditVisible] = useState(false)
  const [editItem, setEditItem] = useState<any>()
  const [newGroupModalVisible, setNewGroupModalVisible] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [pendingMoveChatId, setPendingMoveChatId] = useState<string | null>(null)
  // 批量管理：列表内联勾选模式
  const [batchMode, setBatchMode] = useState(false)
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([])
  const [batchDeleting, setBatchDeleting] = useState(false)
  // 收藏状态：记录已收藏的对话 chatId，用于菜单文案「收藏对话/取消收藏」
  const [favoriteChatIds, setFavoriteChatIds] = useState<Set<string>>(new Set())

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
    const filtered = historyTopics.filter((topic) => !groupedChatIds.has(topic.chatId))
    // 置顶（sortOrder>0）排到最前，值越大越靠前；未置顶保持后端返回顺序（稳定排序）
    return [...filtered].sort((a, b) => {
      const sa = a.sortOrder ?? 0
      const sb = b.sortOrder ?? 0
      const ta = sa > 0 ? 1 : 0
      const tb = sb > 0 ? 1 : 0
      if (ta !== tb) return tb - ta
      if (ta === 1) return sb - sa
      return 0
    })
  }, [historyTopics, historyApps])

  // 当前处于置顶状态（sortOrder>0）的会话集合，用于菜单文案与列表图钉标记
  const toppedChatIds = useMemo(
    () => new Set(ungroupedTopics.filter((topic) => (topic.sortOrder ?? 0) > 0).map((topic) => topic.chatId)),
    [ungroupedTopics],
  )

  const findAppByChatId = useCallback(
    (chatId: string) => historyApps.find((app) => String(app.chat_id) === String(chatId)),
    [historyApps],
  )

  // 批量管理会话列表：与侧边栏一致（未分组会话），并携带 convUid 供批量删除
  const batchSessions = useMemo(
    () =>
      ungroupedTopics.map((topic) => {
        const app = findAppByChatId(topic.chatId)
        return {
          chatId: topic.chatId,
          convUid: app?.conv_uid as string | undefined,
          title: topic.title,
        }
      }),
    [ungroupedTopics, findAppByChatId],
  )

  const batchSelectedSet = useMemo(() => new Set(batchSelectedIds), [batchSelectedIds])
  const batchAllChecked =
    ungroupedTopics.length > 0 && batchSelectedIds.length === ungroupedTopics.length
  const batchIndeterminate =
    batchSelectedIds.length > 0 && batchSelectedIds.length < ungroupedTopics.length

  const enterBatchMode = useCallback(() => {
    setBatchMode(true)
    setBatchSelectedIds([])
  }, [])

  const exitBatchMode = useCallback(() => {
    setBatchMode(false)
    setBatchSelectedIds([])
  }, [])

  const toggleBatchSelect = useCallback((chatId: string) => {
    setBatchSelectedIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId],
    )
  }, [])

  const toggleBatchSelectAll = useCallback(
    (checked: boolean) => {
      setBatchSelectedIds(checked ? ungroupedTopics.map((t) => t.chatId) : [])
    },
    [ungroupedTopics],
  )

  // 批量删除：按对话ID（convUid）删除，成功后本地移除并同步当前会话
  const handleBatchDelete = useCallback(() => {
    if (!batchSelectedIds.length) {
      message.warning('请选择要删除的对话')
      return
    }
    const selected = new Set(batchSelectedIds)
    const convUids = batchSessions
      .filter((s) => selected.has(s.chatId) && s.convUid)
      .map((s) => String(s.convUid))
    if (!convUids.length) {
      message.warning('所选对话暂无可删除的会话记录')
      return
    }
    Modal.confirm({
      title: '确认删除对话',
      content: `是否确认删除选中的 ${batchSelectedIds.length} 个对话？删除后无法恢复。`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setBatchDeleting(true)
        try {
          await deleteBatchSession({ convUids })
          message.success('删除成功')
          const deletedIds = [...batchSelectedIds]
          deletedIds.forEach((id) => removeTopicById(id))
          if (deletedIds.includes(activeTaskId)) {
            navigate({ to: TASK_DETAIL_ROUTE, params: { taskId: 'new' } })
          }
          exitBatchMode()
        } catch {
          message.error('删除失败')
        } finally {
          setBatchDeleting(false)
        }
      },
    })
  }, [batchSelectedIds, batchSessions, removeTopicById, activeTaskId, navigate, exitBatchMode])

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
            await deleteSession({ sessionId: app.chat_id, convUid: app.conv_uid })
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

  // 收藏对话：切换收藏状态（addOrRemove 由后端切换）
  const handleFavoriteTopic = useCallback(
    async (chatId: string) => {
      const app = findAppByChatId(chatId)
      if (!app) {
        message.warning('未找到对话')
        return
      }
      try {
        const res: any = await fetchOperateNew({ favorId: app.chat_id })
        if (res?.code !== 200) {
          message.error(res?.message || res?.msg || '收藏失败，请稍后再试')
          return
        }
        const favorited = Number(res?.data?.favoriteStatus) === 1
        setFavoriteChatIds((prev) => {
          const next = new Set(prev)
          if (favorited) next.add(String(chatId))
          else next.delete(String(chatId))
          return next
        })
        message.success(res?.msg || (favorited ? '收藏成功' : '取消收藏成功'))
      } catch {
        message.error('收藏失败，请稍后再试')
      }
    },
    [findAppByChatId],
  )

  // 打开对话菜单时查询收藏状态，用于动态显示「收藏对话/取消收藏」
  const handleTopicMenuOpenChange = useCallback(
    async (open: boolean, chatId: string) => {
      if (!open) return
      const app = findAppByChatId(chatId)
      if (!app) return
      try {
        const res: any = await fetchIsFavorite({ favorId: app.chat_id })
        const favorited = Number(res?.data?.favoriteStatus) === 1
        setFavoriteChatIds((prev) => {
          const next = new Set(prev)
          if (favorited) next.add(String(chatId))
          else next.delete(String(chatId))
          return next
        })
      } catch {
        // 查询失败时保持默认文案，不打断菜单打开
      }
    },
    [findAppByChatId],
  )

  // 置顶 / 取消置顶：复用 updateApp（session/update）传 sortOrder，置顶取当前最大 sortOrder+1，取消置 0
  const handleToggleTop = useCallback(
    async (chatId: string) => {
      const app = findAppByChatId(chatId)
      if (!app) {
        message.warning('未找到对话')
        return
      }
      const currentlyTop = toppedChatIds.has(chatId)
      const maxSortOrder = ungroupedTopics.reduce((max, topic) => Math.max(max, topic.sortOrder ?? 0), 0)
      try {
        await updateApp({
          sessionId: app.chat_id,
          title: app.title || app.biz_name || '',
          sortOrder: currentlyTop ? 0 : maxSortOrder + 1,
        })
        message.success(currentlyTop ? '已取消置顶' : '已置顶')
        await loadHistoryTopics({ silent: true })
      } catch {
        message.error('操作失败')
      }
    },
    [findAppByChatId, toppedChatIds, ungroupedTopics, loadHistoryTopics],
  )

  const buildMenu = (chatId: string): MenuProps => {
    const topped = toppedChatIds.has(chatId)
    const favorited = favoriteChatIds.has(chatId)
    return {
    items: [
      { key: 'edit', icon: <EditOutlined />, label: '重命名' },
      { key: 'favorite', icon: <StarOutlined />, label: favorited ? '取消收藏' : '收藏对话' },
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
      { key: 'top', icon: <PushpinOutlined />, label: topped ? '取消置顶' : '置顶对话' },
      { type: 'divider' as const },
      { key: 'batch-manage', icon: <ProfileOutlined />, label: '批量管理' },
      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      if (key === 'edit') return handleEditTopic(chatId)
      if (key === 'favorite') return handleFavoriteTopic(chatId)
      if (key === 'top') return handleToggleTop(chatId)
      if (key === 'batch-manage') return enterBatchMode()
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
    }
  }

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
                // 仅选中项显示「...」菜单，非选中项（含 hover）不可弹出下拉框
                const showMenu = isActive

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
                    onKeyDown={(event) =>
                      event.key === 'Enter' && handleSelectTopic(topic.chatId)
                    }
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
                    {toppedChatIds.has(topic.chatId) && (
                      <PushpinFilled
                        className="shrink-0"
                        style={{ fontSize: 11, color: 'var(--accent)' }}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">{topic.title}</span>
                    <Dropdown
                      trigger={['click']}
                      menu={buildMenu(topic.chatId)}
                      placement="bottomRight"
                      onOpenChange={(open) => handleTopicMenuOpenChange(open, topic.chatId)}
                    >
                      <span
                        className="shrink-0 px-1 py-1 transition-opacity"
                        style={{
                          opacity: showMenu ? 1 : 0,
                          pointerEvents: showMenu ? 'auto' : 'none',
                          color: 'var(--ink-3)',
                        }}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
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

      {/* 对话批量管理：左侧弹出抽屉 */}
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#5b7cf7',
            colorError: '#ef4444',
            borderRadius: 10,
          },
        }}
      >
        <Drawer
          open={batchMode}
          placement="left"
          width={380}
          onClose={exitBatchMode}
          closable={false}
          maskClosable={true}
          styles={{
            content: { background: '#FBFCFF' },
            body: { padding: 0, display: 'flex', flexDirection: 'column', background: '#FBFCFF' },
            header: { display: 'none' },
            footer: { padding: '16px 24px', borderTop: '1px solid var(--border)', background: '#FBFCFF' },
          }}
          footer={
            <div className="flex items-center justify-between gap-2">
              <Button style={{ borderRadius: 10 }} onClick={exitBatchMode}>
                取消
              </Button>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                已选{batchSelectedIds.length}/{ungroupedTopics.length}
              </span>
              <Button
                danger
                type="primary"
                loading={batchDeleting}
                disabled={!batchSelectedIds.length}
                style={{ borderRadius: 10 }}
                onClick={handleBatchDelete}
              >
                删除
              </Button>
            </div>
          }
        >
          <div
            className="flex items-center justify-between"
            style={{ padding: '20px 24px 12px' }}
          >
            <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink)' }}>对话批量管理</span>
            <span className="flex items-center gap-2" style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              全选
              <Checkbox
                checked={batchAllChecked}
                indeterminate={batchIndeterminate}
                disabled={!ungroupedTopics.length}
                onChange={(e) => toggleBatchSelectAll(e.target.checked)}
              />
            </span>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ padding: '4px 16px' }}>
            {ungroupedTopics.length ? (
              ungroupedTopics.map((topic) => {
                const isSelected = batchSelectedSet.has(topic.chatId)
                return (
                  <div
                    key={topic.chatId}
                    role="button"
                    tabIndex={0}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg"
                    style={{
                      padding: '11px 12px',
                      background: isSelected ? 'var(--accent-soft)' : 'transparent',
                      transition: 'background 0.15s var(--ease)',
                    }}
                    onClick={() => toggleBatchSelect(topic.chatId)}
                    onKeyDown={(event) =>
                      event.key === 'Enter' && toggleBatchSelect(topic.chatId)
                    }
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLElement).style.background = 'rgba(130,140,200,0.08)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    <span
                      className="min-w-0 flex-1 truncate"
                      style={{
                        fontSize: 14,
                        color: 'var(--ink)',
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    >
                      {topic.title}
                    </span>
                    <span className="shrink-0" onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleBatchSelect(topic.chatId)}
                      />
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="py-10 text-center" style={{ fontSize: 14, color: 'var(--ink-4)' }}>
                暂无对话
              </div>
            )}
          </div>
        </Drawer>
      </ConfigProvider>

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
