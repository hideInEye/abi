import { CheckOutlined, DownOutlined, MessageOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Button, Dropdown, Empty, Spin } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  abortChatSpacePage,
  loadChatSpacePage,
  mergeChatSpacePages,
} from '@/resources/spaceListResource'
import { getSpaceId } from '@/utils/runtime'
import type { SpaceInfo } from '@/types/layout'

const SPACE_ID_STORAGE_KEY = 'spaceId'
const SPACE_NAME_STORAGE_KEY = 'spaceName'
const CHAT_ID_STORAGE_KEY = 'chatId'

const SPACE_AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg, #6366f1, #5b7cf7)', shadow: 'rgba(91,124,247,0.35)' },
  { bg: 'linear-gradient(135deg, #a855f7, #8b5cf6)', shadow: 'rgba(139,92,246,0.35)' },
  { bg: 'linear-gradient(135deg, #10b981, #059669)', shadow: 'rgba(16,185,129,0.35)' },
  { bg: 'linear-gradient(135deg, #f59e0b, #f97316)', shadow: 'rgba(245,158,11,0.35)' },
  { bg: 'linear-gradient(135deg, #ec4899, #f43f5e)', shadow: 'rgba(236,72,153,0.35)' },
  { bg: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', shadow: 'rgba(6,182,212,0.35)' },
]

// 按列表顺序取色，保证相邻空间不撞色
function getSpaceColorByIndex(index: number) {
  const len = SPACE_AVATAR_COLORS.length
  return SPACE_AVATAR_COLORS[((index % len) + len) % len]
}

function getSpaceInitial(name: string) {
  const trimmed = (name || '').trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

type SpaceSelectorProps = {
  collapsed: boolean
  onSpaceChanged?: (space: SpaceInfo) => void
}

export function SpaceSelector({ collapsed, onSpaceChanged }: SpaceSelectorProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [spaceList, setSpaceList] = useState<SpaceInfo[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<number>(() => getSpaceId())
  const [selectedSpaceName, setSelectedSpaceName] = useState(() => localStorage.getItem(SPACE_NAME_STORAGE_KEY) || '')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const requestRef = useRef<{ page: number; run: number; search: string } | null>(null)
  const requestRunRef = useRef(0)
  const selectedSpaceRef = useRef(selectedSpaceId)
  selectedSpaceRef.current = selectedSpaceId

  useEffect(() => {
    const syncPersistedSpace = () => {
      const spaceId = getSpaceId()
      if (!spaceId) return
      const spaceName = localStorage.getItem(SPACE_NAME_STORAGE_KEY) || ''
      setSelectedSpaceName(spaceName)
      if (spaceId === selectedSpaceRef.current) return

      selectedSpaceRef.current = spaceId
      setSelectedSpaceId(spaceId)
      localStorage.removeItem(CHAT_ID_STORAGE_KEY)
      window.dispatchEvent(new CustomEvent('space-change', { detail: { spaceId, spaceName } }))
      onSpaceChanged?.({ spaceId, spaceName })
      void navigate({ to: '/chat' })
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === SPACE_ID_STORAGE_KEY || event.key === SPACE_NAME_STORAGE_KEY) syncPersistedSpace()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncPersistedSpace()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', syncPersistedSpace)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', syncPersistedSpace)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [navigate, onSpaceChanged])

  const currentSpace = useMemo(
    () => spaceList.find((space) => space.spaceId === selectedSpaceId),
    [selectedSpaceId, spaceList],
  )

  const [searchValue, setSearchValue] = useState('')

  const loadSpaces = useCallback(async (nextPage: number, search: string, replace: boolean) => {
    const run = ++requestRunRef.current
    const previous = requestRef.current
    if (previous && (previous.page !== nextPage || previous.search !== search)) {
      abortChatSpacePage(previous.page, previous.search)
    }
    requestRef.current = { page: nextPage, run, search }
    setLoading(true)
    setLoadError('')
    try {
      const result = await loadChatSpacePage(nextPage, search)
      if (requestRunRef.current !== run) return
      setSpaceList(current => mergeChatSpacePages(current, result.rows, replace))
      setPage(result.pageNum)
      setHasMore(result.hasMore)

      if (!result.rows.length) return

      const currentSpaceId = getSpaceId()
      const hasCurrent = result.rows.some((space) => space.spaceId === currentSpaceId)
      if (hasCurrent) {
        setSelectedSpaceId(currentSpaceId)
        return
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError' && requestRunRef.current === run) {
        setLoadError('空间列表加载失败，请重试')
      }
    } finally {
      if (requestRunRef.current === run) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      void loadSpaces(1, searchValue.trim(), true)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [loadSpaces, open, searchValue])

  useEffect(() => () => {
    const active = requestRef.current
    if (active) abortChatSpacePage(active.page, active.search)
  }, [])

  const handleSelectSpace = useCallback(
    async (space: SpaceInfo) => {
      if (!space?.spaceId) return

      localStorage.setItem(SPACE_ID_STORAGE_KEY, String(space.spaceId))
      localStorage.setItem(SPACE_NAME_STORAGE_KEY, space.spaceName)
      localStorage.removeItem('chatId')

      setSelectedSpaceId(space.spaceId)
      setSelectedSpaceName(space.spaceName)
      setOpen(false)

      window.dispatchEvent(
        new CustomEvent('space-change', {
          detail: { spaceId: space.spaceId, spaceName: space.spaceName },
        }),
      )

      onSpaceChanged?.(space)
      await navigate({ to: '/chat' })
    },
    [navigate, onSpaceChanged],
  )

  const currentIndex = spaceList.findIndex((space) => space.spaceId === selectedSpaceId)
  const currentColor = getSpaceColorByIndex(Math.max(currentIndex, 0))
  const triggerNode = (
    <div
      className="space-switcher-glass"
      style={{ cursor: 'pointer' }}
    >
      <span
        className="space-picker-avatar space-picker-avatar--sm"
        style={{ background: currentColor.bg }}
      >
        {getSpaceInitial(currentSpace?.spaceName || selectedSpaceName)}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate" style={{ fontSize: 12.5, fontWeight: 700 }}>
            {currentSpace?.spaceName || selectedSpaceName || '选择空间'}
          </span>
          <DownOutlined
            className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`}
            style={{ fontSize: 10, color: 'var(--ink-4)' }}
          />
        </>
      )}
    </div>
  )

  return (
    <div className="space-switcher-wrap">
      <Dropdown
        trigger={['click']}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setSearchValue('')
        }}
        placement="bottomRight"
        dropdownRender={() => (
          <div className="space-picker-panel">
            <div className="space-picker-top">
              <div className="space-picker-header">
                <span className="space-picker-title">选择工作空间</span>
                <span className="space-picker-count">{spaceList.length} 个空间</span>
              </div>
              <div className="space-picker-search">
                <SearchOutlined className="space-picker-search-icon" />
                <input
                  className="space-picker-search-input"
                  placeholder="搜索空间..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </div>
            </div>
            <Spin spinning={loading}>
              <div className="space-picker-list">
                {spaceList.length ? (
                  spaceList.map((space) => {
                    const isActive = space.spaceId === selectedSpaceId
                    const realIndex = spaceList.findIndex((s) => s.spaceId === space.spaceId)
                    const color = getSpaceColorByIndex(realIndex >= 0 ? realIndex : 0)
                    return (
                      <button
                        type="button"
                        key={space.spaceId}
                        className={`space-picker-item ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelectSpace(space)}
                      >
                        <span
                          className="space-picker-avatar"
                          style={{ background: color.bg, boxShadow: `0 4px 10px ${color.shadow}` }}
                        >
                          {getSpaceInitial(space.spaceName)}
                        </span>
                        <span className="space-picker-item-main">
                          <span className="space-picker-item-name">{space.spaceName}</span>
                          <span className="space-picker-item-desc">
                            {space.remark?.trim() || '空间暂无描述'}
                          </span>
                          <span className="space-picker-item-meta">
                            <TeamOutlined />
                            <span>{space.userCount ?? 0} 成员</span>
                            <MessageOutlined style={{ marginLeft: 10 }} />
                            <span>{space.chatCount ?? 0} 对话</span>
                          </span>
                        </span>
                        {isActive ? (
                          <span className="space-picker-check">
                            <CheckOutlined />
                          </span>
                        ) : null}
                      </button>
                    )
                  })
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loadError || '暂无空间'} className="!my-2" />
                )}
                {loadError ? (
                  <Button block size="small" onClick={() => void loadSpaces(1, searchValue.trim(), true)}>重新加载</Button>
                ) : hasMore ? (
                  <Button block loading={loading} size="small" onClick={() => void loadSpaces(page + 1, searchValue.trim(), false)}>加载更多</Button>
                ) : null}
              </div>
            </Spin>
          </div>
        )}
      >
        {triggerNode}
      </Dropdown>
    </div>
  )
}
