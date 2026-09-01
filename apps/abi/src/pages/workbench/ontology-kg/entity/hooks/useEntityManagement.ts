import { message } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getOntologyNetworkRecords } from '@/pages/workbench/ontology-kg/shared-network-types'
import type { OntologyEntity, OntologyLabel, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'
import { createOntologyEntity, deleteOntologyEntity, deleteOntologyEntityBatch, queryOntologyEntityList, queryOntologyLabels, updateOntologyEntity } from '@/service/api/ontology-network'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import type { EntityFormValues, EntityPagination, EntitySearchValues } from '../types'

const INITIAL_SEARCH: EntitySearchValues = { entityCode: '', entityName: '' }
const INITIAL_PAGINATION: EntityPagination = { pageNum: 1, pageSize: 10, total: 0 }

interface UseEntityManagementResult {
  batchDeleteEntities: () => Promise<boolean>
  deleteEntity: (id: OntologyNetworkId) => Promise<void>
  entities: OntologyEntity[]
  labels: OntologyLabel[]
  loading: boolean
  pagination: EntityPagination
  refresh: () => Promise<void>
  resetSearch: () => void
  saveEntity: (values: EntityFormValues, editingEntity?: OntologyEntity) => Promise<void>
  searchValues: EntitySearchValues
  selectedRowKeys: string[]
  setPage: (pageNum: number, pageSize?: number) => void
  setSearchValues: (values: EntitySearchValues) => void
  setSelectedRowKeys: (keys: string[]) => void
}

export function useEntityManagement(spaceId: OntologyNetworkId): UseEntityManagementResult {
  const [entities, setEntities] = useState<OntologyEntity[]>([])
  const [labels, setLabels] = useState<OntologyLabel[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState(INITIAL_PAGINATION)
  const [searchValues, setSearchValues] = useState(INITIAL_SEARCH)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const entityRequestSequence = useRef(0)
  const labelRequestSequence = useRef(0)

  const labelMap = useMemo(() => new Map(labels.map((label) => [String(label.id), label.bizName])), [labels])

  const loadLabels = useCallback(async (): Promise<void> => {
    labelRequestSequence.current += 1
    const requestId = labelRequestSequence.current
    try {
      const result = await queryOntologyLabels({ spaceId, type: 'RECOMMENDED',moduleType:"INDICATOR" })
      assertFlatRequestSuccess(result)
      const { data } = result
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
      const result = await queryOntologyEntityList({
        entityCode: searchValues.entityCode.trim() || undefined,
        entityName: searchValues.entityName.trim() || undefined,
        labelId: searchValues.labelId,
        pageNum: pagination.pageNum,
        pageSize: pagination.pageSize,
        spaceId,
      })
      assertFlatRequestSuccess(result)
      if (requestId !== entityRequestSequence.current) return
      const { data } = result
      setEntities(getOntologyNetworkRecords(data))
      setSelectedRowKeys([])
      setPagination((current) => ({ ...current, total: data?.total ?? 0 }))
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
    setPagination((current) => {
      const nextPageSize = pageSize ?? current.pageSize
      if (current.pageNum === pageNum && current.pageSize === nextPageSize) return current
      entityRequestSequence.current += 1
      return { ...current, pageNum, pageSize: nextPageSize }
    })
  }, [])

  const resetSearch = useCallback((): void => {
    entityRequestSequence.current += 1
    setSearchValues(INITIAL_SEARCH)
    setPagination((current) => ({ ...current, pageNum: 1 }))
  }, [])

  const updateSearchValues = useCallback((values: EntitySearchValues): void => {
    entityRequestSequence.current += 1
    setSearchValues(values)
    setPagination((current) => (current.pageNum === 1 ? current : { ...current, pageNum: 1 }))
  }, [])

  const saveEntity = useCallback(
    async (values: EntityFormValues, editingEntity?: OntologyEntity): Promise<void> => {
      if (editingEntity) {
        const result = await updateOntologyEntity({ color: values.color, id: editingEntity.id, remark: values.remark?.trim(), spaceId })
        assertFlatRequestSuccess(result)
      } else {
        const selection = Array.isArray(values.labelSelection) ? values.labelSelection[0] : values.labelSelection
        const labelBizName = labelMap.get(String(selection)) ?? String(selection).trim()
        const result = await createOntologyEntity({
          color: values.color,
          entityCode: values.entityCode.trim(),
          entityName: values.entityName.trim(),
          labelBizName,
          remark: values.remark?.trim(),
          spaceId,
        })
        assertFlatRequestSuccess(result)
      }
      await refresh()
    },
    [labelMap, refresh, spaceId],
  )

  const deleteEntity = useCallback(
    async (id: OntologyNetworkId): Promise<void> => {
      const result = await deleteOntologyEntity({ id })
      assertFlatRequestSuccess(result)

      entityRequestSequence.current += 1
      if (entities.length === 1 && pagination.pageNum > 1) {
        setPagination((current) => ({ ...current, pageNum: current.pageNum - 1 }))
        return
      }
      await loadEntities()
    },
    [entities.length, loadEntities, pagination.pageNum],
  )

  const batchDeleteEntities = useCallback(async (): Promise<boolean> => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择要删除的实体')
      return false
    }

    const result = await deleteOntologyEntityBatch({ ids: selectedRowKeys })
    assertFlatRequestSuccess(result)

    entityRequestSequence.current += 1
    if (entities.length === selectedRowKeys.length && pagination.pageNum > 1) {
      setPagination((current) => ({ ...current, pageNum: current.pageNum - 1 }))
      return true
    }
    await loadEntities()
    return true
  }, [entities.length, loadEntities, pagination.pageNum, selectedRowKeys])

  return {
    batchDeleteEntities,
    deleteEntity,
    entities,
    labels,
    loading,
    pagination,
    refresh,
    resetSearch,
    saveEntity,
    searchValues,
    selectedRowKeys,
    setPage,
    setSearchValues: updateSearchValues,
    setSelectedRowKeys,
  }
}
