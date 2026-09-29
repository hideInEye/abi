import { useCallback } from 'react'

import { useChatBootstrap } from '@/resources/chatBootstrap'
import {
  addSessionGroup,
  deleteSessionGroup,
  updateSessionGroup,
} from '@/service/api/app'
import type { AddGroupParams, UpdateGroupParams } from '@/service/api/app'
import { getSpaceId } from '@/utils/runtime'

export function useConversationGroups() {
  const bootstrap = useChatBootstrap()
  const groups = bootstrap.groups.data ?? []
  const loading = bootstrap.groups.status === 'loading'

  /** 加载分组列表 */
  const loadGroups = useCallback(
    (options?: { force?: boolean }) => bootstrap.loadGroups(options),
    [bootstrap.loadGroups],
  )

  /** 新增分组 */
  const addGroup = useCallback(
    async (params: Omit<AddGroupParams, 'spaceId'> & { spaceId?: number }) => {
      const spaceId = params.spaceId ?? getSpaceId()
      await addSessionGroup({ ...params, spaceId })
      bootstrap.invalidateGroups()
      return loadGroups({ force: true })
    },
    [bootstrap.invalidateGroups, loadGroups],
  )

  /** 更新分组 */
  const editGroup = useCallback(
    async (params: UpdateGroupParams) => {
      const spaceId = params.spaceId ?? getSpaceId()
      await updateSessionGroup({ ...params, spaceId })
      bootstrap.invalidateGroups()
      return loadGroups({ force: true })
    },
    [bootstrap.invalidateGroups, loadGroups],
  )

  /** 删除分组 */
  const removeGroup = useCallback(
    async (groupId: string) => {
      await deleteSessionGroup({ groupId })
      bootstrap.invalidateGroups()
      return loadGroups({ force: true })
    },
    [bootstrap.invalidateGroups, loadGroups],
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
