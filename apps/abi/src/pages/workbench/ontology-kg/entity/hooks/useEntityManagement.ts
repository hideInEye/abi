import { message } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getOntologyNetworkRecords } from '@/pages/workbench/ontology-kg/shared-network-types'
import type { OntologyEntity, OntologyLabel, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'
import { createOntologyEntity, deleteOntologyEntity, queryOntologyEntityList, queryOntologyLabels, updateOntologyEntity } from '@/service/api/ontology-network'

import type { EntityFormValues, EntityPagination, EntitySearchValues } from '../types'

const INITIAL_SEARCH: EntitySearchValues = { entityCode: '', entityName: '' }
const INITIAL_PAGINATION: EntityPagination = { pageNum: 1, pageSize: 10, total: 0 }

interface UseEntityManagementResult {
  deleteEntity: (id: OntologyNetworkId) => Promise<void>
  entities: OntologyEntity[]
  labels: OntologyLabel[]
  loading: boolean
  pagination: EntityPagination
  refresh: () => Promise<void>
  resetSearch: () => void
  saveEntity: (values: EntityFormValues, editingEntity?: OntologyEntity) => Promise<void>
  searchValues: EntitySearchValues
  setPage: (pageNum: number, pageSize?: number) => void
  setSearchValues: (values: EntitySearchValues) => void
}

export function useEntityManagement(spaceId: OntologyNetworkId): UseEntityManagementResult {
  const [entities, setEntities] = useState<OntologyEntity[]>([])
  const [labels, setLabels] = useState<OntologyLabel[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState(INITIAL_PAGINATION)
  const [searchValues, setSearchValues] = useState(INITIAL_SEARCH)
  const entityRequestSequence = useRef(0)
  const labelRequestSequence = useRef(0)

  const labelMap = useMemo(() => new Map(labels.map((label) => [String(label.id), label.bizName])), [labels])

  const loadLabels = useCallback(async (): Promise<void> => {
    labelRequestSequence.current += 1
    const requestId = labelRequestSequence.current
    try {
      const { data } = await queryOntologyLabels({ spaceId, type: 'RECOMMENDED' })
      if (requestId === labelRequestSequence.current) setLabels(data ?? [])
    } catch {
      if (requestId === labelRequestSequence.current) message.error('标签类型加载失败，请稍后重试')
    }
  }, [spaceId])

  const loadEntities = useCallback(async (): Promise<void> => {
    entityRequestSequence.current += 1
    const requestId = entityRequestSequence.current
    setLoading(true)
    try {
      const { data } = await queryOntologyEntityList({
        entityCode: searchValues.entityCode.trim() || undefined,
        entityName: searchValues.entityName.trim() || undefined,
        labelId: searchValues.labelId,
        pageNum: pagination.pageNum,
        pageSize: pagination.pageSize,
        spaceId,
      })
      if (requestId !== entityRequestSequence.current) return
      setEntities(getOntologyNetworkRecords(data))
      setPagination((current) => ({ ...current, pageNum: data?.current ?? current.pageNum, pageSize: data?.size ?? current.pageSize, total: data?.total ?? 0 }))
    } catch {
      if (requestId === entityRequestSequence.current) message.error('实体列表加载失败，请稍后重试')
    } finally {
      if (requestId === entityRequestSequence.current) setLoading(false)
    }
  }, [pagination.pageNum, pagination.pageSize, searchValues, spaceId])

  useEffect(() => {
    loadLabels()
    return () => {
      labelRequestSequence.current += 1
    }
  }, [loadLabels])

  useEffect(() => {
    loadEntities()
    return () => {
      entityRequestSequence.current += 1
    }
  }, [loadEntities])

  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([loadEntities(), loadLabels()])
  }, [loadEntities, loadLabels])

  const setPage = useCallback((pageNum: number, pageSize?: number): void => {
    entityRequestSequence.current += 1
    setPagination((current) => ({ ...current, pageNum, pageSize: pageSize ?? current.pageSize }))
  }, [])

  const resetSearch = useCallback((): void => {
    entityRequestSequence.current += 1
    setSearchValues(INITIAL_SEARCH)
    setPagination((current) => ({ ...current, pageNum: 1 }))
  }, [])

  const updateSearchValues = useCallback((values: EntitySearchValues): void => {
    entityRequestSequence.current += 1
    setSearchValues(values)
  }, [])

  const saveEntity = useCallback(
    async (values: EntityFormValues, editingEntity?: OntologyEntity): Promise<void> => {
      if (editingEntity) {
        await updateOntologyEntity({ color: values.color, id: editingEntity.id, remark: values.remark?.trim(), spaceId })
      } else {
        const selection = Array.isArray(values.labelSelection) ? values.labelSelection[0] : values.labelSelection
        const labelBizName = labelMap.get(String(selection)) ?? String(selection).trim()
        await createOntologyEntity({
          color: values.color,
          entityCode: values.entityCode.trim(),
          entityName: values.entityName.trim(),
          labelBizName,
          remark: values.remark?.trim(),
          spaceId,
        })
      }
      await refresh()
    },
    [labelMap, refresh, spaceId],
  )

  const deleteEntity = useCallback(
    async (id: OntologyNetworkId): Promise<void> => {
      const { error } = await deleteOntologyEntity({ id })
      if (error) throw error

      entityRequestSequence.current += 1
      if (entities.length === 1 && pagination.pageNum > 1) {
        setPagination((current) => ({ ...current, pageNum: current.pageNum - 1 }))
        return
      }
      await loadEntities()
    },
    [entities.length, loadEntities, pagination.pageNum],
  )

  return {
    deleteEntity,
    entities,
    labels,
    loading,
    pagination,
    refresh,
    resetSearch,
    saveEntity,
    searchValues,
    setPage,
    setSearchValues: updateSearchValues,
  }
}
