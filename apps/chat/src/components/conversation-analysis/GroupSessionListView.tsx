import { DeleteOutlined, EditOutlined, FolderOutlined, MoreOutlined, PlusOutlined, SearchOutlined, SmileOutlined } from '@ant-design/icons'
import { Dropdown, Input, message, Modal, Spin, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  addSessionGroup,
  deleteSession,
  deleteSessionGroup,
  fetchAppList,
  fetchSessionGroupList,
  moveSessionToGroup,
  updateApp,
  updateSessionGroup,
} from '@/service/api/app'
import type { SessionGroup } from '@/service/api/app'
import { CHAT_MODE } from '@/constant'
import { getCurrentUser } from '@/utils/layout'
import { getSpaceId } from '@/utils'

interface GroupSessionListViewProps {
  groupId: string
  onOpenSession: (chatId: string) => void
  onGroupDeleted: () => void
  refreshKey?: number
}

const GroupSessionListView: React.FC<GroupSessionListViewProps> = ({
  groupId,
  onOpenSession,
  onGroupDeleted,
  refreshKey = 0,
}) => {
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<SessionGroup | null>(null)
  const [groups, setGroups] = useState<SessionGroup[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [keyword, setKeyword] = useState('')

  const [editVisible, setEditVisible] = useState(false)
  const [editName, setEditName] = useState('')
  const [renameVisible, setRenameVisible] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renamingSession, setRenamingSession] = useState<any>(null)
  const [addGroupVisible, setAddGroupVisible] = useState(false)
  const [addGroupValue, setAddGroupValue] = useState('')
  const [pendingMoveSession, setPendingMoveSession] = useState<any>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const spaceId = getSpaceId()
      const [groupRes, sessionRes] = await Promise.all([
        fetchSessionGroupList({ spaceId: spaceId || undefined }),
        fetchAppList({
          chat_mode: CHAT_MODE,
          space_id: spaceId,
          create_by: getCurrentUser().userName,
        }),
      ])
      const groupList = Array.isArray(groupRes?.data) ? groupRes.data : []
      setGroups(groupList)
      const currentGroup = groupList.find(
        (g: SessionGroup) => String(g.groupId) === String(groupId),
      )
      setGroup(currentGroup || null)

      const allSessions = Array.isArray(sessionRes?.data) ? sessionRes.data : []
      const groupSessions = allSessions.filter(
        (app: any) => String(app.groupId ?? app.group_id) === String(groupId),
      )
      setSessions(groupSessions)
    } catch {
      message.error('加载分组数据失败')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  // 按 title / biz_name 过滤；排序由后端返回顺序（最新优先），保持与侧边栏一致
  const filteredSessions = useMemo(() => {
    if (!keyword.trim()) return sessions
    const lower = keyword.trim().toLowerCase()
    return sessions.filter(
      (s) =>
        (s.title || s.biz_name || '').toLowerCase().includes(lower) ||
        (s.remark || '').toLowerCase().includes(lower),
    )
  }, [sessions, keyword])

  const handleDeleteGroup = useCallback(() => {
    if (!group) return
    Modal.confirm({
      title: '确认删除分组',
      content: `是否确认删除分组「${group.groupName}」？删除后无法恢复。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteSessionGroup({ groupId: group.groupId })
          message.success('删除分组成功')
          onGroupDeleted()
        } catch {
          message.error('删除分组失败')
        }
      },
    })
  }, [group, onGroupDeleted])

  const handleEditGroup = useCallback(async () => {
    if (!group || !editName.trim()) return
    try {
      await updateSessionGroup({ groupId: group.groupId, groupName: editName.trim() })
      message.success('更新分组成功')
      setEditVisible(false)
      loadData()
    } catch {
      message.error('更新分组失败')
    }
  }, [group, editName, loadData])

  const handleRenameSession = useCallback(async () => {
    if (!renamingSession || !renameValue.trim()) return
    try {
      await updateApp({
        sessionId: String(renamingSession.chat_id),
        title: renameValue.trim(),
      })
      message.success('重命名成功')
      setRenameVisible(false)
      setRenameValue('')
      setRenamingSession(null)
      window.dispatchEvent(new Event('conversation-created'))
      loadData()
    } catch {
      message.error('重命名失败')
    }
  }, [renamingSession, renameValue, loadData])

  const handleMoveSession = useCallback(
    async (session: any, targetGroupId: string) => {
      try {
        await moveSessionToGroup({
          sessionId: String(session.chat_id),
          groupId: targetGroupId,
          title: session.title || session.biz_name || '',
        })
        message.success(targetGroupId === '0' ? '已移出本组' : '移动成功')
        await loadData()
        window.dispatchEvent(new Event('conversation-created'))
      } catch {
        message.error('移动失败')
      }
    },
    [loadData],
  )

  const handleDeleteSession = useCallback(
    (session: any) => {
      Modal.confirm({
        title: '确认删除对话',
        content: `是否确认删除对话「${session.title || session.biz_name || '未命名对话'}」？删除后无法恢复。`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            await deleteSession({ sessionId: String(session.chat_id), convUid: session.conv_uid })
            message.success('删除成功')
            window.dispatchEvent(new Event('conversation-created'))
            loadData()
          } catch {
            message.error('删除失败')
          }
        },
      })
    },
    [loadData],
  )

  const handleAddGroupAndMove = useCallback(async () => {
    if (!addGroupValue.trim() || !pendingMoveSession) return
    try {
      const spaceId = getSpaceId()
      const res: any = await addSessionGroup({
        groupName: addGroupValue.trim(),
        spaceId: spaceId || 0,
      })
      const newGroupId = res?.data?.groupId ?? res?.data
      if (newGroupId) {
        await moveSessionToGroup({
          sessionId: String(pendingMoveSession.chat_id),
          groupId: String(newGroupId),
          title: pendingMoveSession.title || pendingMoveSession.biz_name || '',
        })
        message.success('已新增分组并移动')
      }
      setAddGroupVisible(false)
      setAddGroupValue('')
      setPendingMoveSession(null)
      window.dispatchEvent(new Event('conversation-created'))
      loadData()
    } catch {
      message.error('新增分组失败')
    }
  }, [addGroupValue, pendingMoveSession, loadData])

  const buildSessionMenu = (session: any): MenuProps => {
    const otherGroups = groups.filter((g) => String(g.groupId) !== String(groupId))
    return {
      items: [
        { key: 'rename', icon: <EditOutlined />, label: '重命名' },
        {
          key: 'move',
          icon: <FolderOutlined />,
          label: '移动到分组',
          children: [
            ...otherGroups.map((g) => ({
              key: `move-to-${g.groupId}`,
              label: g.groupName,
            })),
            ...(otherGroups.length > 0 ? [{ type: 'divider' as const }] : []),
            { key: 'move-out', icon: <FolderOutlined />, label: '移出本组' },
            { key: 'add-group', icon: <PlusOutlined />, label: '新增分组' },
          ],
        },
        { type: 'divider' as const },
        { key: 'delete', icon: <DeleteOutlined />, label: '删除对话', danger: true },
      ],
      onClick: ({ key, domEvent }) => {
        domEvent.stopPropagation()
        if (key === 'rename') {
          setRenamingSession(session)
          setRenameValue(session.title || session.biz_name || '')
          setRenameVisible(true)
        } else if (key === 'move-out') {
          handleMoveSession(session, '0')
        } else if (key === 'add-group') {
          setPendingMoveSession(session)
          setAddGroupValue('')
          setAddGroupVisible(true)
        } else if (key.startsWith('move-to-')) {
          const targetGroupId = key.replace('move-to-', '')
          handleMoveSession(session, targetGroupId)
        } else if (key === 'delete') {
          handleDeleteSession(session)
        }
      },
    }
  }

  const formatTime = (value?: string) => {
    if (!value) return ''
    const d = dayjs(value)
    return d.isValid() ? d.format('HH:mm') : value
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spin />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: 'var(--ink-3)' }}>
        分组不存在或已被删除
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[53.75rem] w-full mx-auto">
        {/* 分组标题栏 */}
        <div className="pt-6 pb-4">
          <div className="flex items-center" style={{ gap: 0 }}>
            <div className="flex items-center" style={{ gap: 10 }}>
              <SmileOutlined style={{ fontSize: 22, color: 'var(--accent)' }} />
              <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)' }}>
                {group.groupName}
              </span>
            </div>
            <div
              style={{
                width: 1,
                height: 18,
                background: 'var(--border)',
                flexShrink: 0,
                marginLeft: 20,
                marginRight: 12,
              }}
            />
            <div className="flex items-center" style={{ gap: 6 }}>
              <Tooltip title="搜索">
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    color: searchOpen ? 'var(--ink)' : 'var(--ink-3)',
                    background: searchOpen ? 'rgba(130,140,200,0.1)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(130,140,200,0.1)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--ink)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = searchOpen
                      ? 'rgba(130,140,200,0.1)'
                      : 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = searchOpen
                      ? 'var(--ink)'
                      : 'var(--ink-3)'
                  }}
                  onClick={() => setSearchOpen((v) => !v)}
                >
                  <SearchOutlined style={{ fontSize: 15 }} />
                </span>
              </Tooltip>
              <Tooltip title="重命名">
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    color: 'var(--ink-3)',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(130,140,200,0.1)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--ink)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--ink-3)'
                  }}
                  onClick={() => {
                    setEditName(group.groupName)
                    setEditVisible(true)
                  }}
                >
                  <EditOutlined style={{ fontSize: 15 }} />
                </span>
              </Tooltip>
              <Tooltip title="删除分组">
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    color: '#ff4d4f',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,77,79,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                  onClick={handleDeleteGroup}
                >
                  <DeleteOutlined style={{ fontSize: 15 }} />
                </span>
              </Tooltip>
            </div>
          </div>
          {searchOpen && (
            <div className="mt-3">
              <Input
                id="group-search-input"
                autoFocus
                allowClear
                prefix={<SearchOutlined style={{ color: 'var(--ink-3)' }} />}
                placeholder="搜索会话"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ borderRadius: 10, background: '#fff' }}
              />
            </div>
          )}
        </div>

        {/* 会话列表 */}
        <div className="py-4">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--ink-3)' }}>
              {keyword.trim() ? '未找到匹配会话' : '暂无会话'}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredSessions.map((session) => (
                <div
                  key={session.chat_id}
                  className="group/session cursor-pointer transition-all duration-150"
                  style={{
                    padding: '14px 18px',
                    borderRadius: 12,
                    background: '#fff',
                    border: '1px solid var(--border)',
                  }}
                  onClick={() => onOpenSession(String(session.chat_id))}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.boxShadow =
                      '0 2px 8px rgba(15,23,42,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="truncate flex-1 pr-4"
                      style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}
                    >
                      {session.title || session.biz_name || '未命名对话'}
                    </span>
                    <div className="flex items-center shrink-0" style={{ gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                        {formatTime(session.update_time || session.create_time)}
                      </span>
                      <Dropdown
                        trigger={['click']}
                        menu={buildSessionMenu(session)}
                        placement="bottomRight"
                      >
                        <span
                          className="flex items-center justify-center transition-opacity"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 5,
                            cursor: 'pointer',
                            color: 'var(--ink-3)',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLElement).style.background =
                              'rgba(130,140,200,0.1)'
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--ink)'
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--ink-3)'
                          }}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          <MoreOutlined style={{ fontSize: 13 }} />
                        </span>
                      </Dropdown>
                    </div>
                  </div>
                  <div className="truncate" style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                    {session.remark || '暂无会话内容'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit group modal */}
      <Modal
        title="编辑分组"
        open={editVisible}
        onOk={handleEditGroup}
        onCancel={() => {
          setEditVisible(false)
          setEditName('')
        }}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Input
          placeholder="请输入分组名称"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onPressEnter={handleEditGroup}
          maxLength={50}
          autoFocus
        />
      </Modal>

      {/* Rename session modal */}
      <Modal
        title="重命名对话"
        open={renameVisible}
        onOk={handleRenameSession}
        onCancel={() => {
          setRenameVisible(false)
          setRenameValue('')
          setRenamingSession(null)
        }}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Input
          placeholder="请输入对话名称"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={handleRenameSession}
          maxLength={100}
          autoFocus
        />
      </Modal>

      {/* Add group and move modal */}
      <Modal
        title="新增分组"
        open={addGroupVisible}
        onOk={handleAddGroupAndMove}
        onCancel={() => {
          setAddGroupVisible(false)
          setAddGroupValue('')
          setPendingMoveSession(null)
        }}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Input
          placeholder="请输入新分组名称"
          value={addGroupValue}
          onChange={(e) => setAddGroupValue(e.target.value)}
          onPressEnter={handleAddGroupAndMove}
          maxLength={50}
          autoFocus
        />
      </Modal>
    </div>
  )
}

export default GroupSessionListView

