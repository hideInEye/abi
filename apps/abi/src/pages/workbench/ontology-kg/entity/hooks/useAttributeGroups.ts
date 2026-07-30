import { message } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { OntologyEntityAttribute, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'
import { tableSemanticsGroupList } from '@/service/api/table-semantics'

import { ATTRIBUTE_GROUP_TYPE_BY_ATTRIBUTE, buildAttributeGroupTreeOptions, normalizeAttributeGroupRows } from '../utils/attributeGroups'
import type { AttributeGroup, AttributeGroupTreeOption } from '../utils/attributeGroups'

type SupportedAttributeType = Exclude<OntologyEntityAttribute['attributeType'], 'field'>

interface UseAttributeGroupsResult {
  clearGroups: () => void
  groups: AttributeGroup[]
  hasGroups: boolean
  loadGroups: (attributeType: SupportedAttributeType) => Promise<void>
  loading: boolean
  treeOptions: AttributeGroupTreeOption[]
}

export function useAttributeGroups(spaceId: OntologyNetworkId): UseAttributeGroupsResult {
  const [groups, setGroups] = useState<AttributeGroup[]>([])
  const [loading, setLoading] = useState(false)
  const requestSequence = useRef(0)

  const clearGroups = useCallback((): void => {
    requestSequence.current += 1
    setGroups([])
    setLoading(false)
  }, [])

  useEffect(
    () => () => {
      requestSequence.current += 1
    },
    [],
  )

  const loadGroups = useCallback(
    async (attributeType: SupportedAttributeType): Promise<void> => {
      requestSequence.current += 1
      const requestId = requestSequence.current
      if (!spaceId) {
        setGroups([])
        setLoading(false)
        return
      }

      setLoading(true)
      setGroups([])
      try {
        const requestSpaceId = spaceId as Parameters<typeof tableSemanticsGroupList>[0]['spaceId']
        const response = await tableSemanticsGroupList({
          groupType: ATTRIBUTE_GROUP_TYPE_BY_ATTRIBUTE[attributeType],
          pageNum: 1,
          pageSize: 1000,
          spaceId: requestSpaceId,
        })
        if (requestId === requestSequence.current) setGroups(normalizeAttributeGroupRows(response))
      } catch {
        if (requestId === requestSequence.current) message.error('分组加载失败，请稍后重试')
      } finally {
        if (requestId === requestSequence.current) setLoading(false)
      }
    },
    [spaceId],
  )

  const treeOptions = useMemo(() => buildAttributeGroupTreeOptions(groups), [groups])

  return {
    clearGroups,
    groups,
    hasGroups: groups.length > 0,
    loadGroups,
    loading,
    treeOptions,
  }
}

