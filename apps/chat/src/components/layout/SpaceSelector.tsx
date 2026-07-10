import { CheckOutlined, DownOutlined, MessageOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Dropdown, Empty, Spin, message } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { fetchSpaceList } from '@/service/api/space'
import { getSpaceId } from '@/utils'
import type { SpaceInfo } from '@/types/layout'

const ALL_SPACE_PAGE_SIZE = 100000
const SPACE_ID_STORAGE_KEY = 'spaceId'
const SPACE_NAME_STORAGE_KEY = 'spaceName'

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

type SpaceListResponse = {
  rows?: unknown
  data?: unknown
  response?: {
    data?: {
      rows?: unknown
    }
  }
}

function normalizeSpaceList(response: SpaceListResponse): SpaceInfo[] {
  const rawList = [
    response?.rows,
    (response?.data as any)?.rows,
    response?.response?.data?.rows,
    response?.data,
  ].find((item) => Array.isArray(item))

  if (!Array.isArray(rawList)) return []

  return rawList
    .map((item: any): SpaceInfo | null => {
      const spaceId = Number(item?.spaceId)
      const spaceName = String(item?.spaceName ?? '').trim()
      if (!Number.isFinite(spaceId) || spaceId <= 0 || !spaceName) return null
      return {
        spaceId,
        spaceName,
        remark: typeof item?.remark === 'string' ? item.remark.trim() : '',
        userCount: Number(item?.userCount) || 0,
        chatCount: Number(item?.chatCount) || 0,
      }
    })
    .filter((item): item is SpaceInfo => Boolean(item))
}

export function SpaceSelector({ collapsed, onSpaceChanged }: SpaceSelectorProps) {
  const navigate = useNavigate()
  const loadedRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [spaceList, setSpaceList] = useState<SpaceInfo[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState<number>(() => getSpaceId())

  const currentSpace = useMemo(
    () => spaceList.find((space) => space.spaceId === selectedSpaceId),
    [selectedSpaceId, spaceList],
  )

  const [searchValue, setSearchValue] = useState('')
  const filteredSpaceList = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase()
    if (!keyword) return spaceList
    return spaceList.filter((space) => space.spaceName.toLowerCase().includes(keyword))
  }, [searchValue, spaceList])

  const loadAllSpaces = useCallback(async () => {
    setLoading(true)
    try {
      const response = (await fetchSpaceList({
        isAsc: 'desc',
        orderByColumn: 'spaceId',
        pageNum: 1,
        pageSize: ALL_SPACE_PAGE_SIZE,
      })) as SpaceListResponse

      const nextSpaceList = normalizeSpaceList(response)
      setSpaceList(nextSpaceList)

      if (!nextSpaceList.length) return

      const currentSpaceId = getSpaceId()
      const hasCurrent = nextSpaceList.some((space) => space.spaceId === currentSpaceId)
      if (hasCurrent) {
        setSelectedSpaceId(currentSpaceId)
        return
      }

      setSelectedSpaceId(nextSpaceList[0].spaceId)
    } catch {
      message.error('加载空间列表失败')
      setSpaceList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    void loadAllSpaces()
  }, [loadAllSpaces])

  const handleSelectSpace = useCallback(
    async (space: SpaceInfo) => {
      if (!space?.spaceId) return

      localStorage.setItem(SPACE_ID_STORAGE_KEY, String(space.spaceId))
      localStorage.setItem(SPACE_NAME_STORAGE_KEY, space.spaceName)
      localStorage.removeItem('chatId')

      setSelectedSpaceId(space.spaceId)
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
        {collapsed ? getSpaceInitial(currentSpace?.spaceName || '') : getSpaceInitial(currentSpace?.spaceName || '')}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate" style={{ fontSize: 12.5, fontWeight: 700 }}>
            {currentSpace?.spaceName || '选择空间'}
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
        onOpenChange={setOpen}
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
                {filteredSpaceList.length ? (
                  filteredSpaceList.map((space) => {
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
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无空间" className="!my-2" />
                )}
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
