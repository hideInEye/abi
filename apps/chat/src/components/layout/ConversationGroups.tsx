import { DeleteOutlined, EditOutlined, ExportOutlined, FolderOutlined, MoreOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Dropdown, Input, message, Modal, Spin } from 'antd'
import type { MenuProps } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { TASK_DETAIL_ROUTE } from '@/constant/layout'
import { useConversationGroups } from '@/hooks/layout/useConversationGroups'
import { useHistoryTopics } from '@/hooks/layout/useHistoryTopics'
import { moveSessionToGroup } from '@/service/api/app'
import type { SessionGroup } from '@/service/api/app'

type ConversationGroupsProps = {
  collapsed: boolean
  refreshKey?: number
}

function getActiveTaskId(pathname: string) {
  const match = pathname.match(/^\/chat\/task\/([^/?#]+)/)
  return match?.[1] ?? ''
}

export function ConversationGroups({ collapsed, refreshKey }: ConversationGroupsProps) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeTaskId = useMemo(() => getActiveTaskId(pathname), [pathname])

  const { loading, groups, loadGroups, addGroup, editGroup, removeGroup } = useConversationGroups()
  const { historyApps, loadHistoryTopics } = useHistoryTopics()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingGroup, setEditingGroup] = useState<SessionGroup | null>(null)
  const [inputName, setInputName] = useState('')

  useEffect(() => {
    if (!collapsed) {
      loadGroups()
      loadHistoryTopics({ silent: true })
    }
  }, [collapsed, loadGroups, loadHistoryTopics, refreshKey])

  // 按 groupId 将会话分配到各分组（排除无效值）
  const sessionsByGroupId = useMemo(() => {
    const invalidGroupIds = new Set([null, undefined, '', '0', 0, 'null'])
    const map: Record<string, any[]> = {}
    for (const app of historyApps) {
      const gid = app.groupId ?? app.group_id
      if (!invalidGroupIds.has(gid)) {
        const key = String(gid)
        if (!map[key]) map[key] = []
        map[key].push(app)
      }
    }
    return map
  }, [historyApps])

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }, [])

  const handleSelectTopic = useCallback(
    (chatId: string) => {
      if (!chatId) return
      navigate({ to: TASK_DETAIL_ROUTE, params: { taskId: chatId } })
    },
    [navigate],
  )

  // 新建分组
  const handleAddGroup = useCallback(async () => {
    if (!inputName.trim()) {
      message.warning('请输入分组名称')
      return
    }
    try {
      await addGroup({ groupName: inputName.trim() })
      message.success('新建分组成功')
      setAddModalVisible(false)
      setInputName('')
    } catch {
      message.error('新建分组失败')
    }
  }, [inputName, addGroup])

  // 编辑分组
  const handleEditGroup = useCallback(async () => {
    if (!editingGroup) return
    if (!inputName.trim()) {
      message.warning('请输入分组名称')
      return
    }
    try {
      await editGroup({ groupId: editingGroup.groupId, groupName: inputName.trim() })
      message.success('更新分组成功')
      setEditModalVisible(false)
      setEditingGroup(null)
      setInputName('')
    } catch {
      message.error('更新分组失败')
    }
  }, [inputName, editingGroup, editGroup])

  // 删除分组
  const handleDeleteGroup = useCallback(
    (group: SessionGroup) => {
      Modal.confirm({
        title: '确认删除分组',
        content: `是否确认删除分组「${group.groupName}」？删除后无法恢复。`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            await removeGroup(group.groupId)
            message.success('删除分组成功')
          } catch {
            message.error('删除分组失败')
          }
        },
      })
    },
    [removeGroup],
  )

  // 移出分组（groupId 置空）
  const handleMoveOutOfGroup = useCallback(
    async (app: any) => {
      try {
        await moveSessionToGroup({ sessionId: String(app.chat_id), groupId: '0', title: app.title || app.biz_name || '' })
        message.success('已移出分组')
        await loadHistoryTopics({ silent: true })
        window.dispatchEvent(new Event('conversation-created'))
      } catch {
        message.error('移出失败')
      }
    },
    [loadHistoryTopics],
  )

  // 移动到其他分组
  const handleMoveToOtherGroup = useCallback(
    async (app: any, targetGroupId: string) => {
      try {
        await moveSessionToGroup({ sessionId: String(app.chat_id), groupId: targetGroupId, title: app.title || app.biz_name || '' })
        message.success('已移动到分组')
        await loadHistoryTopics({ silent: true })
        window.dispatchEvent(new Event('conversation-created'))
      } catch {
        message.error('移动失败')
      }
    },
    [loadHistoryTopics],
  )

  // 分组内会话的操作菜单
  const buildSessionMenu = (app: any, currentGroupId: string): MenuProps => ({
    items: [
      {
        key: 'move-to-group',
        icon: <FolderOutlined />,
        label: '移动到分组',
        children: [
          ...groups
            .filter((g) => g.groupId !== currentGroupId)
            .map((g) => ({
              key: `move-group-${g.groupId}`,
              label: g.groupName,
            })),
          ...(groups.length > 1 ? [{ type: 'divider' as const }] : []),
          {
            key: 'move-out',
            icon: <ExportOutlined />,
            label: '移出分组',
          },
        ],
      },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      if (key === 'move-out') {
        handleMoveOutOfGroup(app)
      } else if (key.startsWith('move-group-')) {
        const targetGroupId = key.replace('move-group-', '')
        handleMoveToOtherGroup(app, targetGroupId)
      }
    },
  })

  const buildGroupMenu = (group: SessionGroup): MenuProps => ({
    items: [
      { key: 'edit', icon: <EditOutlined />, label: '重命名' },
      { type: 'divider' as const },
      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      if (key === 'edit') {
        setEditingGroup(group)
        setInputName(group.groupName)
        setEditModalVisible(true)
      } else if (key === 'delete') {
        handleDeleteGroup(group)
      }
    },
  })

  if (collapsed) return null

  return (
    <div className="mb-2">
      {/* Section title */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        <span>对话分组</span>
        <span
          className="cursor-pointer transition-all duration-150"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--accent-soft)',
            color: '#333',
            fontWeight: 700,
          }}
          title="新建分组"
          onClick={() => {
            setInputName('')
            setAddModalVisible(true)
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--accent)'
            ;(e.currentTarget as HTMLElement).style.color = '#fff'
            ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 6px rgba(91,124,247,0.3)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'
            ;(e.currentTarget as HTMLElement).style.color = '#333'
            ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
          }}
        >
          <PlusOutlined style={{ fontSize: 12, fontWeight: 700 }} />
        </span>
      </div>

      {/* Groups */}
      <div>
        {groups.length > 0 ? (
          groups.map((group) => {
            const isOpen = openGroups[group.groupId] ?? false
            const sessions = sessionsByGroupId[group.groupId] || []
            return (
              <div key={group.groupId} className="mb-0.5">
                <div
                  className="conv-group-label group flex items-center"
                  onClick={() => toggleGroup(group.groupId)}
                >
                  <RightOutlined
                    className="transition-transform duration-200"
                    style={{
                      fontSize: 12,
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      opacity: 0.5,
                      padding: 4,
                      cursor: 'pointer',
                    }}
                  />
                  <span className="flex-1 truncate">{group.groupName}</span>
                  <span
                    style={{
                      marginRight: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--ink-4)',
                      background: 'rgba(130,140,200,0.1)',
                      padding: '1px 6px',
                      borderRadius: 8,
                    }}
                  >
                    {sessions.length}
                  </span>
                  <Dropdown
                    trigger={['click']}
                    menu={buildGroupMenu(group)}
                    placement="bottomRight"
                  >
                    <span
                      className="shrink-0 px-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--ink-3)' }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                    >
                      <MoreOutlined style={{ fontSize: 12 }} />
                    </span>
                  </Dropdown>
                </div>

                <div
                  style={{
                    maxHeight: isOpen ? 600 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
                  }}
                >
                  {sessions.length > 0 ? (
                    sessions.map((app) => {
                      const chatId = String(app.chat_id)
                      const isActive = chatId === activeTaskId
                      return (
                        <div
                          key={chatId}
                          className="group/session flex items-center gap-2 cursor-pointer transition-colors duration-150"
                          style={{
                            padding: '7px 12px 7px 32px',
                            borderRadius: 'var(--r-xs)',
                            fontSize: 12.5,
                            color: isActive ? 'var(--accent)' : 'var(--ink-3)',
                            fontWeight: isActive ? 600 : 400,
                            background: isActive ? 'var(--accent-soft)' : 'transparent',
                            position: 'relative',
                          }}
                          onClick={() => handleSelectTopic(chatId)}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              ;(e.currentTarget as HTMLElement).style.background = 'rgba(130,140,200,0.08)'
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--ink)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--ink-3)'
                            }
                          }}
                        >
                          <span className="truncate flex-1">{app.title || app.biz_name || '未命名对话'}</span>
                          <Dropdown
                            trigger={['click']}
                            menu={buildSessionMenu(app, group.groupId)}
                            placement="bottomRight"
                          >
                            <span
                              className="shrink-0 px-1 py-1 opacity-0 group-hover/session:opacity-100 transition-opacity"
                              style={{ color: 'var(--ink-3)' }}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                            >
                              <MoreOutlined style={{ fontSize: 12 }} />
                            </span>
                          </Dropdown>
                        </div>
                      )
                    })
                  ) : (
                    <div
                      style={{
                        padding: '6px 12px 6px 32px',
                        fontSize: 11.5,
                        color: 'var(--ink-4)',
                      }}
                    >
                      暂无对话
                    </div>
                  )}
                </div>
              </div>
            )
          })
        ) : !loading ? (
          <div className="px-3 py-2 text-center" style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>
            暂无分组，点击上方 + 创建
          </div>
        ) : null}
      </div>

      {/* 新建分组弹窗 */}
      <Modal
        title="新建分组"
        open={addModalVisible}
        onOk={handleAddGroup}
        onCancel={() => {
          setAddModalVisible(false)
          setInputName('')
        }}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Input
          placeholder="请输入分组名称"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          onPressEnter={handleAddGroup}
          maxLength={50}
          autoFocus
        />
      </Modal>

      {/* 编辑分组弹窗 */}
      <Modal
        title="编辑分组"
        open={editModalVisible}
        onOk={handleEditGroup}
        onCancel={() => {
          setEditModalVisible(false)
          setEditingGroup(null)
          setInputName('')
        }}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Input
          placeholder="请输入分组名称"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          onPressEnter={handleEditGroup}
          maxLength={50}
          autoFocus
        />
      </Modal>
    </div>
  )
}
