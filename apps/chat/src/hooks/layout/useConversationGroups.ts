import { useCallback, useEffect, useRef, useState } from 'react'

import {
  addSessionGroup,
  deleteSessionGroup,
  fetchSessionGroupList,
  updateSessionGroup,
} from '@/service/api/app'
import type { AddGroupParams, SessionGroup, UpdateGroupParams } from '@/service/api/app'
import { getSpaceId } from '@/utils'

export function useConversationGroups() {
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<SessionGroup[]>([])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  /** 加载分组列表 */
  const loadGroups = useCallback(async () => {
    if (!mountedRef.current) return
    // 防止并发重复调用
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    try {
      const spaceId = getSpaceId()
      const res: any = await fetchSessionGroupList({ spaceId: spaceId || undefined })
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
      if (mountedRef.current) {
        setGroups(list)
      }
    } catch (err) {
      console.error('加载分组列表失败:', err)
      if (mountedRef.current) {
        setGroups([])
      }
    } finally {
      loadingRef.current = false
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  /** 新增分组 */
  const addGroup = useCallback(
    async (params: Omit<AddGroupParams, 'spaceId'> & { spaceId?: number }) => {
      const spaceId = params.spaceId ?? getSpaceId()
      await addSessionGroup({ ...params, spaceId })
      await loadGroups()
    },
    [loadGroups],
  )

  /** 更新分组 */
  const editGroup = useCallback(
    async (params: UpdateGroupParams) => {
      const spaceId = params.spaceId ?? getSpaceId()
      await updateSessionGroup({ ...params, spaceId })
      await loadGroups()
    },
    [loadGroups],
  )

  /** 删除分组 */
  const removeGroup = useCallback(
    async (groupId: string) => {
      await deleteSessionGroup({ groupId })
      await loadGroups()
    },
    [loadGroups],
  )

  return {
    loading,
    groups,
    loadGroups,
    addGroup,
    editGroup,
    removeGroup,
  }
}
