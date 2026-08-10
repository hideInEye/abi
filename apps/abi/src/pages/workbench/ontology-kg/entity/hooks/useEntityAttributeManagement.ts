import { message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { OntologyEntity, OntologyEntityAttribute, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'
import { getOntologyEntity, saveOntologyEntityAttributes } from '@/service/api/ontology-network'

import { getEntityAttributeIdentity, isSameEntityAttribute, makeEntityAttributeSaveItems } from '../utils/entity'

interface UseEntityAttributeManagementResult {
  addAttributes: (attributes: OntologyEntityAttribute[]) => boolean
  attributes: OntologyEntityAttribute[]
  detailEntity: OntologyEntity | null
  loadedDetail: boolean
  loadingDetail: boolean
  removeAttribute: (attribute: OntologyEntityAttribute) => void
  saveAttributes: () => Promise<boolean>
  saving: boolean
}

export function useEntityAttributeManagement(entity: OntologyEntity | undefined, open: boolean, spaceId: OntologyNetworkId): UseEntityAttributeManagementResult {
  const [draftAttributes, setDraftAttributes] = useState<OntologyEntityAttribute[]>([])
  const [detailEntity, setDetailEntity] = useState<OntologyEntity | null>(null)
  const [loadedEntityId, setLoadedEntityId] = useState<string>()
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const draftAttributesRef = useRef<OntologyEntityAttribute[]>([])
  const detailRequestSequence = useRef(0)

  const activeEntityId = open && entity ? String(entity.id) : undefined
  const isCurrentDetail = activeEntityId !== undefined && loadedEntityId === activeEntityId

  useEffect(() => {
    detailRequestSequence.current += 1
    const requestId = detailRequestSequence.current
    draftAttributesRef.current = []
    setDraftAttributes([])
    setDetailEntity(null)
    setLoadedEntityId(undefined)
    setLoadingDetail(Boolean(open && entity))
    if (!open || !entity) return undefined

    const loadDetail = async (): Promise<void> => {
      try {
        const { data } = await getOntologyEntity({ id: entity.id })
        if (requestId !== detailRequestSequence.current) return
        const attributes = data?.attributes ?? []
        draftAttributesRef.current = attributes
        setDraftAttributes(attributes)
        setDetailEntity(data?.entity ?? entity)
        setLoadedEntityId(String(entity.id))
      } catch {
        if (requestId === detailRequestSequence.current) message.error('实体属性加载失败，请稍后重试')
      } finally {
        if (requestId === detailRequestSequence.current) setLoadingDetail(false)
      }
    }

    loadDetail()
    return () => {
      if (requestId === detailRequestSequence.current) detailRequestSequence.current += 1
    }
  }, [entity, open])

  const addAttributes = useCallback((attributes: OntologyEntityAttribute[]): boolean => {
    const addedKeys = new Set<string>()
    const hasDuplicate = attributes.some((next) => {
      const key = getEntityAttributeIdentity(next)
      if (addedKeys.has(key)) return true
      addedKeys.add(key)
      return draftAttributesRef.current.some((attribute) => isSameEntityAttribute(attribute, next))
    })
    if (hasDuplicate) return false
    const nextAttributes = [...draftAttributesRef.current, ...attributes]
    draftAttributesRef.current = nextAttributes
    setDraftAttributes(nextAttributes)
    return true
  }, [])

  const removeAttribute = useCallback((attribute: OntologyEntityAttribute): void => {
    const nextAttributes = draftAttributesRef.current.filter((item) => !isSameEntityAttribute(item, attribute))
    draftAttributesRef.current = nextAttributes
    setDraftAttributes(nextAttributes)
  }, [])

  const saveAttributes = useCallback(async (): Promise<boolean> => {
    if (!entity) return false
    if (!isCurrentDetail) {
      message.warning('实体属性尚未加载完成，请稍后再试')
      return false
    }
    setSaving(true)
    try {
      const attributes = makeEntityAttributeSaveItems(draftAttributesRef.current)
      const { data, error } = await saveOntologyEntityAttributes({ attributes, entityId: entity.id, spaceId })
      if (error || data !== true) {
        message.error('属性配置保存失败，请稍后重试')
        return false
      }
      return true
    } catch {
      message.error('属性配置保存失败，请稍后重试')
      return false
    } finally {
      setSaving(false)
    }
  }, [entity, isCurrentDetail, spaceId])

  return {
    addAttributes,
    attributes: isCurrentDetail ? draftAttributes : [],
    detailEntity: isCurrentDetail ? detailEntity : null,
    loadedDetail: isCurrentDetail,
    loadingDetail: Boolean(activeEntityId) && loadingDetail,
    removeAttribute,
    saveAttributes,
    saving,
  }
}
