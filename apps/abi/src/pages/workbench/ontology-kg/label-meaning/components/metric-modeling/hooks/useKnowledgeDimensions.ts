import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { queryDimensionList } from '@/service/api/dimension-modeling'
import { tableSemanticsGroupList } from '@/service/api/table-semantics'

import { formatMappedDimensionOptionTitle } from '../utils/knowledgeOperateDrawer.utils'
import { getKnowledgeSpaceId } from '../utils/space'

type UnknownRecord = Record<string, unknown>

export interface KnowledgeDimensionOption {
  groupId: string
  groupName: string
  key: string
  techName: string
  title: string
}

function getPathValue(source: unknown, path: string) {
  return path
    .split('.')
    .reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as UnknownRecord)[key] : undefined), source)
}

function normalizeRows(response: unknown): unknown[] {
  for (const path of [
    '',
    'rows',
    'list',
    'data.rows',
    'data.list',
    'data',
    'response.data.data.rows',
    'response.data.rows',
    'response.data.data'
  ]) {
    const value = path ? getPathValue(response, path) : response
    if (Array.isArray(value)) return value
  }
  return []
}

function pickText(item: unknown, keys: string[]) {
  const source = item as UnknownRecord
  for (const key of keys) {
    const value = String(source?.[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

export function useKnowledgeDimensions(enabled = true) {
  const [options, setOptions] = useState<KnowledgeDimensionOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const load = useCallback(async () => {
    requestId.current += 1
    const currentRequestId = requestId.current
    setLoading(true)
    setError(false)
    try {
      const groups = normalizeRows(
        await tableSemanticsGroupList({
          groupType: 'ontology-dimension',
          pageNum: 1,
          pageSize: 1000,
          spaceId: getKnowledgeSpaceId()
        })
      )
        .map(item => ({ groupId: pickText(item, ['groupId', 'id']), groupName: pickText(item, ['groupName', 'name']) }))
        .filter(item => item.groupId && item.groupName)

      const rowsByGroup = await Promise.all(
        groups.map(async group => ({
          group,
          rows: normalizeRows(
            await queryDimensionList({
              groupId: group.groupId,
              pageNum: 1,
              pageSize: 1000,
              spaceId: getKnowledgeSpaceId()
            })
          )
        }))
      )
      if (currentRequestId !== requestId.current) return
      setOptions(
        rowsByGroup.flatMap(
          ({ group, rows }) =>
            rows
              .map(item => {
                const key = pickText(item, ['dimId', 'id', 'dimensionId'])
                if (!key) return null
                const bizName = pickText(item, ['bizName', 'zhName', 'dimName'])
                const techName = pickText(item, ['techName', 'englishName', 'dimCode'])
                return {
                  ...group,
                  key,
                  techName,
                  title: formatMappedDimensionOptionTitle({ bizName, fallback: key, techName })
                }
              })
              .filter(Boolean) as KnowledgeDimensionOption[]
        )
      )
    } catch {
      if (currentRequestId === requestId.current) {
        setOptions([])
        setError(true)
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) load()
    return () => {
      requestId.current += 1
    }
  }, [enabled, load])

  const treeData = useMemo(() => {
    const groups = new Map<string, { children: Array<{ isLeaf: true; title: string; value: string }>; title: string }>()
    options.forEach(option => {
      const group = groups.get(option.groupId) || { children: [], title: option.groupName }
      group.children.push({ isLeaf: true, title: option.title, value: option.key })
      groups.set(option.groupId, group)
    })
    return Array.from(groups.entries()).map(([groupId, group]) => ({
      ...group,
      selectable: false,
      value: `group-${groupId}`
    }))
  }, [options])

  return { error, loading, options, retry: load, treeData }
}
