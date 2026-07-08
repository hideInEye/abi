import { CloseOutlined, DeleteOutlined, DownOutlined, EditOutlined, MoreOutlined, PlusOutlined, PushpinOutlined, SmileOutlined, UpOutlined } from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Dropdown, Input, message, Modal, Popover, Spin } from 'antd'
import type { MenuProps } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useConversationGroups } from '@/hooks/layout/useConversationGroups'
import { useHistoryTopics } from '@/hooks/layout/useHistoryTopics'
import type { SessionGroup } from '@/service/api/app'

type ConversationGroupsProps = {
  collapsed: boolean
  refreshKey?: number
}

export function ConversationGroups({ collapsed, refreshKey }: ConversationGroupsProps) {
  const navigate = useNavigate()

  const { loading, groups, loadGroups, addGroup, editGroup, removeGroup } = useConversationGroups()
  const { historyApps, loadHistoryTopics } = useHistoryTopics()

  const [addModalVisible, setAddModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingGroup, setEditingGroup] = useState<SessionGroup | null>(null)
  const [inputName, setInputName] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    if (!collapsed) {
      loadGroups()
      loadHistoryTopics({ silent: true })
    }
  }, [collapsed, loadGroups, loadHistoryTopics, refreshKey])

  // 分组内会话数量
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

  // 置顶/取消置顶：通过 sortOrder 字段持久化
  const handlePinGroup = useCallback(
    async (group: SessionGroup) => {
      const isPinned = (group.sortOrder ?? 0) > 0
      try {
        let newSortOrder = 0
        if (!isPinned) {
          const maxPinned = groups
            .filter((g) => (g.sortOrder ?? 0) > 0)
            .reduce((max, g) => Math.max(max, g.sortOrder ?? 0), 0)
          newSortOrder = maxPinned + 1
        }
        await editGroup({ groupId: group.groupId, groupName: group.groupName, sortOrder: newSortOrder })
        message.success(isPinned ? '已取消置顶' : '已置顶')
      } catch {
        message.error('操作失败')
      }
    },
    [editGroup, groups],
  )

  const buildGroupMenu = (group: SessionGroup): MenuProps => ({
    items: [
      { key: 'edit', icon: <EditOutlined />, label: '重命名' },
      { key: 'pin', icon: <PushpinOutlined />, label: (group.sortOrder ?? 0) > 0 ? '取消置顶' : '置顶此分组' },
      { type: 'divider' as const },
      { key: 'delete', icon: <DeleteOutlined />, label: '删除此分组', danger: true },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation()
      if (key === 'edit') {
        setEditingGroup(group)
        setInputName(group.groupName)
        setEditModalVisible(true)
      } else if (key === 'pin') {
        handlePinGroup(group)
      } else if (key === 'delete') {
        handleDeleteGroup(group)
      }
    },
  })

  const renderGroupItem = (group: SessionGroup) => {
    const sessions = sessionsByGroupId[group.groupId] || []
    return (
      <div key={group.groupId} className="mb-0.5">
        <div
          className="conv-group-label group flex items-center"
          onClick={() => navigate({ to: '/chat/task/$taskId', params: { taskId: 'new' }, search: { groupId: group.groupId } })}
        >
          <SmileOutlined style={{ fontSize: 13, color: 'var(--ink-4)', paddingLeft: 4 }} />
          <span className="flex-1 truncate" style={{ paddingLeft: 8 }}>
            {group.groupName}
            {(group.sortOrder ?? 0) > 0 && (
              <PushpinOutlined style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4, opacity: 0.8 }} />
            )}
          </span>
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
      </div>
    )
  }

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
        <Popover
          trigger="click"
          placement="rightTop"
          arrow={false}
          open={addModalVisible}
          onOpenChange={(open) => {
            setAddModalVisible(open)
            if (!open) setInputName('')
          }}
          overlayInnerStyle={{ padding: 0, boxShadow: '0 8px 32px rgba(15,23,42,0.12)' }}
          content={(
            <div
              style={{
                width: 360,
                padding: '20px 22px',
                borderRadius: 14,
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>创建分组</span>
                <CloseOutlined
                  style={{ cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14 }}
                  onClick={() => {
                    setAddModalVisible(false)
                    setInputName('')
                  }}
                />
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: '0 0 14px' }}>
                分组功能可将对话集中归类管理，并支持自定义指示，让对话更加自然有序。
              </p>
              <Input
                prefix={<SmileOutlined style={{ color: 'var(--ink-4)' }} />}
                placeholder="请输入分组名称"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                onPressEnter={handleAddGroup}
                maxLength={50}
                autoFocus
                style={{ borderRadius: 10 }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {['风控', '客服', '供应链', '运营'].map((tag) => (
                  <span
                    key={tag}
                    onClick={() => setInputName(tag)}
                    style={{
                      cursor: 'pointer',
                      padding: '5px 12px',
                      fontSize: 12.5,
                      borderRadius: 7,
                      border: '1px solid var(--border)',
                      color: 'var(--ink-2)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--ink-2)'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  style={{
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    color: 'var(--ink-2)',
                    background: '#fff',
                    padding: '5px 14px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--ink-2)'
                  }}
                  onClick={() => {
                    setAddModalVisible(false)
                    setInputName('')
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={!inputName.trim()}
                  onClick={handleAddGroup}
                  style={{
                    borderRadius: 10,
                    padding: '5px 14px',
                    background: !inputName.trim() ? '#e5e7eb' : 'var(--accent)',
                    border: '1px solid',
                    borderColor: !inputName.trim() ? '#e5e7eb' : 'var(--accent)',
                    color: !inputName.trim() ? '#9ca3af' : '#fff',
                    cursor: !inputName.trim() ? 'not-allowed' : 'pointer',
                    boxShadow: 'none',
                  }}
                >
                  确定
                </button>
              </div>
            </div>
          )}
        >
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
        </Popover>
      </div>

      {/* Groups */}
      <Spin spinning={loading} size="small">
        {groups.length > 0 ? (
          (() => {
            const sortedGroups = [...groups].sort((a, b) => {
              const aOrder = a.sortOrder ?? 0
              const bOrder = b.sortOrder ?? 0
              if (aOrder > 0 && bOrder > 0) return aOrder - bOrder
              if (aOrder > 0) return -1
              if (bOrder > 0) return 1
              return 0
            })
            const visibleGroups = sortedGroups.slice(0, 3)
            const hiddenGroups = sortedGroups.slice(3)
            return (
              <>
                {visibleGroups.map((group) => renderGroupItem(group))}
                {hiddenGroups.length > 0 && (
                  <>
                    {moreOpen && hiddenGroups.map((group) => renderGroupItem(group))}
                    <div className="mb-0.5">
                      <div
                        className="conv-group-label group flex items-center"
                        onClick={() => setMoreOpen((prev) => !prev)}
                      >
                        <span style={{ paddingLeft: 4, fontSize: 13, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {moreOpen
                            ? <><UpOutlined style={{ fontSize: 10 }} />收起</>
                            : <><DownOutlined style={{ fontSize: 10 }} />更多</>}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )
          })()
        ) : !loading ? (
          <div className="px-3 py-2 text-center" style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>
            暂无分组，点击上方 + 创建
          </div>
        ) : null}
      </Spin>

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
