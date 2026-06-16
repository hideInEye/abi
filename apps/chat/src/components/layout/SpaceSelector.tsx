import { ApartmentOutlined, CheckOutlined, DownOutlined } from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Button, Dropdown, Empty, Spin, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { fetchSpaceList } from '@/service/api/space'
import { getSpaceId } from '@/utils'
import type { SpaceInfo } from '@/types/layout'

const ALL_SPACE_PAGE_SIZE = 100000
const SPACE_ID_STORAGE_KEY = 'spaceId'
const SPACE_NAME_STORAGE_KEY = 'spaceName'

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
    .map((item: any) => {
      const spaceId = Number(item?.spaceId)
      const spaceName = String(item?.spaceName ?? '').trim()
      if (!Number.isFinite(spaceId) || spaceId <= 0 || !spaceName) return null
      return { spaceId, spaceName }
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
      await navigate({ to: '/chat/' })
    },
    [navigate, onSpaceChanged],
  )

  const triggerNode = (
    <div
      className="space-switcher-glass"
      style={{ cursor: 'pointer' }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--success)',
          boxShadow: '0 0 6px rgba(16,185,129,0.4)',
          flexShrink: 0,
        }}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate" style={{ fontSize: 12.5, fontWeight: 600 }}>
            {currentSpace?.spaceName || '选择空间'}
          </span>
          <DownOutlined
            className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`}
            style={{ fontSize: 10, color: 'var(--ink-4)' }}
          />
        </>
      )}
      {collapsed && <ApartmentOutlined style={{ fontSize: 14 }} />}
    </div>
  )

  return (
    <div className="shrink-0 px-4 pb-2">
      <Dropdown
        trigger={['click']}
        open={open}
        onOpenChange={setOpen}
        placement="topLeft"
        dropdownRender={() => (
          <div
            className="w-[286px] max-w-[calc(100vw-32px)] p-2"
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              boxShadow: 'var(--shadow-m)',
            }}
          >
            <Typography.Text
              className="mb-1 block px-3 py-2"
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}
            >
              空间
            </Typography.Text>
            <Spin spinning={loading}>
              <div className="max-h-[320px] overflow-y-auto pr-1">
                {spaceList.length ? (
                  spaceList.map((space) => {
                    const isActive = space.spaceId === selectedSpaceId
                    return (
                      <button
                        type="button"
                        key={space.spaceId}
                        className="flex w-full items-center justify-between rounded-lg bg-transparent px-3 py-2 text-left transition-colors"
                        style={{
                          fontSize: 12.5,
                          color: isActive ? 'var(--accent)' : 'var(--ink-2)',
                          fontWeight: isActive ? 600 : 400,
                          marginBottom: 2,
                        }}
                        onClick={() => handleSelectSpace(space)}
                        onMouseEnter={(e) => {
                          ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'
                        }}
                        onMouseLeave={(e) => {
                          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                        }}
                      >
                        <span className="truncate">{space.spaceName}</span>
                        {isActive ? <CheckOutlined style={{ fontSize: 12 }} /> : null}
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
