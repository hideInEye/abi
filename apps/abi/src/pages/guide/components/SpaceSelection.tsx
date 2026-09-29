import { SearchOutlined } from '@ant-design/icons'
import { Button as AButton, Input as AInput } from 'antd'
import { useEffect, useState } from 'react'

import { deleteSpace, spaceList } from '@/service/api/data-space'
import type { ISpaceItem } from '@/pages/space-list/types'
import { LazyFeatureFallback, RetryableLazy } from '@/components/common/RetryableLazy'
import { SpaceItemCard } from './SpaceItemCard'

const loadSpaceEdit = () => import('@/pages/space-list/components/SpaceEdit').then(module => ({ default: module.SpaceEdit }))

interface SpaceSelectionProps {
  onSelectSpace?: (space: ISpaceItem) => void
  selectedSpaceId?: number
}

export const SpaceSelection = ({ onSelectSpace, selectedSpaceId }: SpaceSelectionProps) => {
  const [spaces, setSpaces] = useState<ISpaceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editSpace, setEditSpace] = useState<ISpaceItem | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const pageSize = 12
  const [total, setTotal] = useState(0)

  const fetchSpaces = async () => {
    setLoading(true)
    try {
      const res = await spaceList({
        isAsc: 'desc',
        orderByColumn: 'spaceId',
        pageNum,
        pageSize,
        spaceName: searchValue || undefined,
      })
      const data = (res as any).response?.data?.rows || []
      const totalCount = (res as any).response?.data?.total || 0
      setSpaces(data)
      setTotal(totalCount)
      
      // 自动选中第一个空间（仅在第一页且没有选中时）
      if (data.length > 0 && !selectedSpaceId && pageNum === 1) {
        onSelectSpace?.(data[0])
      }
    } catch (error) {
      console.error('获取空间列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSpaces()
  }, [pageNum])

  const handleSearch = () => {
    setPageNum(1)
    fetchSpaces()
  }

  const editSpaceHandler = (space: ISpaceItem) => {
    void loadSpaceEdit()
    setDrawerOpen(true)
    setEditSpace(space)
  }

  const handleCreateSpace = () => {
    void loadSpaceEdit()
    setDrawerOpen(true)
    setEditSpace(null)
  }

  const updateSpace = () => {
    fetchSpaces()
  }

  const deleteSpaceHandler = async (space: ISpaceItem) => {
    await deleteSpace([space.spaceId])
    fetchSpaces()
  }

  const handlePageChange = (page: number) => {
    setPageNum(page)
  }

  return (
    <div className="flex flex-col gap-4 p-6" style={{ height: 'calc(100vh - 11.25rem)', overflow: 'hidden' }}>
      {/* 搜索栏 */}
      <div className="flex items-center justify-between">
        <AInput
          placeholder="请输入空间名称"
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 300 }}
        />
        <AButton type="primary" onClick={handleCreateSpace}>
          新建空间
        </AButton>
      </div>

  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
    <div>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {spaces.map((space) => (
          <div
            key={space.spaceId}
            className={selectedSpaceId === space.spaceId ? 'ring-2 ring-blue-500 rounded-[10px] cursor-pointer' : 'cursor-pointer'}
            onClick={() => onSelectSpace?.(space)}
          >
            <SpaceItemCard deleteSpace={deleteSpaceHandler} setEditSpace={editSpaceHandler} space={space} />
          </div>
        ))}
      </section>
      
      {loading && <div className="text-center text-gray-500">加载中...</div>}
      {!loading && spaces.length === 0 && <div className="text-center text-gray-500">暂无空间数据</div>}
    </div>
      {/* 分页 */}
      {total > 0 && (
        <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
          <APagination
            current={pageNum}
            pageSize={pageSize}
            total={total}
            onChange={handlePageChange}
          />
        </div>
      )}
    </div>
      {drawerOpen && (
        <RetryableLazy
          loader={loadSpaceEdit}
          componentProps={{ drawerOpen, editSpace, setDrawerOpen, updateSpace }}
          fallback={<LazyFeatureFallback label="正在加载空间编辑器…" style={{ position: 'fixed', inset: 0, zIndex: 1000, minHeight: '100vh' }} />}
        />
      )}
  </div>
  )
}
