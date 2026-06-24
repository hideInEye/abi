import { message } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { getOntologyNetworkRecords } from '@/pages/workbench/ontology-kg/shared-network-types'
import type { OntologyEntity, OntologyNetworkId, OntologyRelation } from '@/pages/workbench/ontology-kg/shared-network-types'
import { createOntologyRelation, deleteOntologyRelation, queryOntologyEntityList, queryOntologyRelationList, updateOntologyRelation } from '@/service/api/ontology-network'

import type { RelationFormValues, RelationPagination, RelationSearchValues } from '../types'

const INITIAL_SEARCH: RelationSearchValues = { relation: '' }
const INITIAL_PAGINATION: RelationPagination = { pageNum: 1, pageSize: 10, total: 0 }

interface UseRelationManagementResult {
  deleteRelation: (id: OntologyNetworkId) => Promise<void>
  draftSearchValues: RelationSearchValues
  entityNameMap: Map<string, string>
  entities: OntologyEntity[]
  loading: boolean
  pagination: RelationPagination
  refresh: () => Promise<void>
  relations: OntologyRelation[]
  resetSearch: () => void
  saveRelation: (values: RelationFormValues, editingRelation?: OntologyRelation) => Promise<void>
  searchValues: RelationSearchValues
  setDraftSearchValues: Dispatch<SetStateAction<RelationSearchValues>>
  setPage: (pageNum: number, pageSize?: number) => void
  submitSearch: () => void
}

export function useRelationManagement(spaceId: OntologyNetworkId): UseRelationManagementResult {
  const [entities, setEntities] = useState<OntologyEntity[]>([])
  const [relations, setRelations] = useState<OntologyRelation[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState<RelationPagination>(INITIAL_PAGINATION)
  const [draftSearchValues, setDraftSearchValues] = useState<RelationSearchValues>(INITIAL_SEARCH)
  const [searchValues, setSearchValues] = useState<RelationSearchValues>(INITIAL_SEARCH)
  const entityRequestRef = useRef(0)
  const relationRequestRef = useRef(0)

  const entityNameMap = useMemo(() => new Map(entities.map((entity) => [String(entity.id), entity.entityName])), [entities])

  const loadEntities = useCallback(async (): Promise<void> => {
    const requestId = entityRequestRef.current + 1
    entityRequestRef.current = requestId
    try {
      const { data } = await queryOntologyEntityList({ pageNum: 1, pageSize: 1000, spaceId })
      if (requestId !== entityRequestRef.current) return
      setEntities(data?.records ?? [])
    } catch {
      if (requestId === entityRequestRef.current) message.error('实体列表加载失败，请稍后重试')
    }
  }, [spaceId])

  const loadRelations = useCallback(
    async (nextSearchValues: RelationSearchValues, nextPagination: RelationPagination): Promise<void> => {
      const requestId = relationRequestRef.current + 1
      relationRequestRef.current = requestId
      setLoading(true)
      try {
        const { data } = await queryOntologyRelationList({
          endEntityId: nextSearchValues.endEntityId,
          pageNum: nextPagination.pageNum,
          pageSize: nextPagination.pageSize,
          relation: nextSearchValues.relation.trim() || undefined,
          spaceId,
          startEntityId: nextSearchValues.startEntityId,
        })
        if (requestId !== relationRequestRef.current) return
        setRelations(getOntologyNetworkRecords(data))
        setPagination((current) => ({ ...current, pageNum: data?.current ?? current.pageNum, pageSize: data?.size ?? current.pageSize, total: data?.total ?? 0 }))
      } catch {
        if (requestId === relationRequestRef.current) message.error('关系列表加载失败，请稍后重试')
      } finally {
        if (requestId === relationRequestRef.current) setLoading(false)
      }
    },
    [spaceId],
  )

  useEffect(() => {
    loadEntities()
    return () => {
      entityRequestRef.current += 1
    }
  }, [loadEntities])

  useEffect(() => {
    setDraftSearchValues(INITIAL_SEARCH)
    setSearchValues(INITIAL_SEARCH)
    setPagination(INITIAL_PAGINATION)
    loadRelations(INITIAL_SEARCH, INITIAL_PAGINATION)
    return () => {
      relationRequestRef.current += 1
    }
  }, [loadRelations])

  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([loadEntities(), loadRelations(searchValues, pagination)])
  }, [loadEntities, loadRelations, pagination, searchValues])

  const setPage = useCallback(
    (pageNum: number, pageSize?: number): void => {
      const nextPagination = { ...pagination, pageNum, pageSize: pageSize ?? pagination.pageSize }
      setPagination(nextPagination)
      loadRelations(searchValues, nextPagination)
    },
    [loadRelations, pagination, searchValues],
  )

  const submitSearch = useCallback((): void => {
    const nextPagination = { ...pagination, pageNum: 1 }
    setSearchValues(draftSearchValues)
    setPagination(nextPagination)
    loadRelations(draftSearchValues, nextPagination)
  }, [draftSearchValues, loadRelations, pagination])

  const resetSearch = useCallback((): void => {
    const nextPagination = { ...pagination, pageNum: 1 }
    setDraftSearchValues(INITIAL_SEARCH)
    setSearchValues(INITIAL_SEARCH)
    setPagination(nextPagination)
    loadRelations(INITIAL_SEARCH, nextPagination)
  }, [loadRelations, pagination])

  const saveRelation = useCallback(
    async (values: RelationFormValues, editingRelation?: OntologyRelation): Promise<void> => {
      const payload = {
        endEntityId: values.endEntityId,
        inverseFlag: values.inverseFlag,
        relation: values.relation.trim(),
        remark: values.remark?.trim(),
        startEntityId: values.startEntityId,
      }
      if (editingRelation) {
        await updateOntologyRelation({ ...payload, id: editingRelation.id })
      } else {
        await createOntologyRelation({ ...payload, spaceId })
      }
      await refresh()
    },
    [refresh, spaceId],
  )

  const deleteRelation = useCallback(
    async (id: OntologyNetworkId): Promise<void> => {
      const { error } = await deleteOntologyRelation({ id })
      if (error) throw error

      if (relations.length === 1 && pagination.pageNum > 1) {
        const nextPagination = { ...pagination, pageNum: pagination.pageNum - 1 }
        setPagination(nextPagination)
        await loadRelations(searchValues, nextPagination)
        return
      }
      await loadRelations(searchValues, pagination)
    },
    [loadRelations, pagination, relations.length, searchValues],
  )

  return {
    deleteRelation,
    entityNameMap,
    entities,
    loading,
    pagination,
    refresh,
    relations,
    draftSearchValues,
    resetSearch,
    saveRelation,
    searchValues,
    setPage,
    setDraftSearchValues,
    submitSearch,
  }
}
