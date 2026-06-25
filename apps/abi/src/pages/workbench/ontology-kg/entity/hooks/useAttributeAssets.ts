import { message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { OntologyEntityAttribute, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'
import { queryDimensionList } from '@/service/api/dimension-modeling'
import { queryKnowledgeIndicators } from '@/service/api/knowledge-extraction'
import { queryTag } from '@/service/api/tag-meaning'

import type { AttributeAsset } from '../types'

type SupportedAttributeType = Exclude<OntologyEntityAttribute['attributeType'], 'field'>

type UnknownRecord = Record<string, unknown>

interface AttributeAssetResponse {
  data?: unknown
  list?: unknown
  records?: unknown
  response?: {
    data?: unknown
  }
}

interface UseAttributeAssetsResult {
  assets: AttributeAsset[]
  clearAssets: () => void
  loadAssets: (attributeType: SupportedAttributeType, groupId: number) => Promise<void>
  loading: boolean
}

function getPathValue(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined
    return (value as UnknownRecord)[key]
  }, source)
}

function getAssetRows(response: AttributeAssetResponse): unknown[] {
  const paths = [
    'records',
    'list',
    'rows',
    'data.records',
    'data.list',
    'data.rows',
    'data',
    'response.data.records',
    'response.data.list',
    'response.data.rows',
    'response.data.data.records',
    'response.data.data.list',
    'response.data.data.rows',
    'response.data.data',
  ]
  for (const path of paths) {
    const value = getPathValue(response, path)
    if (Array.isArray(value)) return value
  }
  return []
}

function pickValue(source: UnknownRecord, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = source[key]
    if (value === null || value === undefined) continue
    if (typeof value === 'string' && !value.trim()) continue
    return value
  }
  return undefined
}

function pickText(source: UnknownRecord, keys: readonly string[]): string {
  const value = pickValue(source, keys)
  return value === undefined ? '' : String(value).trim()
}

function normalizeAsset(item: unknown, attributeType: SupportedAttributeType): AttributeAsset | null {
  if (!item || typeof item !== 'object') return null
  const source = item as UnknownRecord
  const id = pickText(source, attributeType === 'dimension' ? ['dimId', 'dimensionId', 'id'] : attributeType === 'indicator' ? ['indId', 'indicatorId', 'id'] : ['tagId', 'id'])
  const attributeCode = pickText(
    source,
    attributeType === 'dimension'
      ? ['techName', 'englishName', 'dimCode', 'dimId', 'dimensionId', 'id']
      : attributeType === 'indicator'
        ? ['indicatorCode', 'indCode', 'techName', 'indId', 'indicatorId', 'id']
        : ['engName', 'tagCode', 'tagId', 'id'],
  )
  if (!id || !attributeCode) return null
  const attributeName = pickText(
    source,
    attributeType === 'dimension'
      ? ['bizName', 'zhName', 'dimName', 'name']
      : attributeType === 'indicator'
        ? ['bizName', 'indicatorName', 'indName', 'name']
        : ['tagName', 'bizName', 'name'],
  )
  const dataType = pickValue(source, ['dataType', 'fieldType', 'tfieldType', 'type'])
  const remark = pickText(source, ['remark', 'description', 'bizDesc', 'businessDefinition'])
  const relateDictId = source.relateDictId ?? source.dictId
  return {
    attributeCode,
    attributeName: attributeName || attributeCode,
    ...(dataType === undefined ? {} : { dataType }),
    id,
    ...(typeof relateDictId === 'number' || typeof relateDictId === 'string' ? { relateDictId } : {}),
    ...(remark ? { remark } : {}),
  }
}

export function useAttributeAssets(spaceId: OntologyNetworkId): UseAttributeAssetsResult {
  const [assets, setAssets] = useState<AttributeAsset[]>([])
  const [loading, setLoading] = useState(false)
  const requestSequence = useRef(0)

  const clearAssets = useCallback((): void => {
    requestSequence.current += 1
    setAssets([])
    setLoading(false)
  }, [])

  useEffect(
    () => () => {
      requestSequence.current += 1
    },
    [],
  )

  const loadAssets = useCallback(
    async (attributeType: SupportedAttributeType, groupId: number): Promise<void> => {
      requestSequence.current += 1
      const requestId = requestSequence.current
      if (!groupId) {
        setAssets([])
        setLoading(false)
        return
      }
      setLoading(true)
      setAssets([])
      try {
        // The legacy asset APIs are typed as number-only, but ontology IDs can be Long strings.
        // This assertion preserves the runtime value instead of coercing it through Number().
        const requestSpaceId = spaceId as Parameters<typeof queryTag>[0]['spaceId']
        let response: AttributeAssetResponse
        if (attributeType === 'label') {
          const result = await queryTag({ groupId, spaceId: requestSpaceId })
          response = result as AttributeAssetResponse
        } else if (attributeType === 'dimension') {
          const result = await queryDimensionList({ groupId, pageNum: 1, pageSize: 1000, spaceId: requestSpaceId })
          response = result as AttributeAssetResponse
        } else {
          const result = await queryKnowledgeIndicators({ groupId, pageNum: 1, pageSize: 1000, spaceId: requestSpaceId })
          response = result as AttributeAssetResponse
        }
        if (requestId === requestSequence.current) setAssets(getAssetRows(response).map((item) => normalizeAsset(item, attributeType)).filter((asset): asset is AttributeAsset => asset !== null))
      } catch {
        if (requestId === requestSequence.current) message.error('资产加载失败，请稍后重试')
      } finally {
        if (requestId === requestSequence.current) setLoading(false)
      }
    },
    [spaceId],
  )

  return { assets, clearAssets, loading, loadAssets }
}
