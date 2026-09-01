import { message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'

import { getOntologyNetworkRecords } from '@/pages/workbench/ontology-kg/shared-network-types'
import type { OntologyEntity, OntologyGraphData, OntologyNetworkId, OntologyRelation } from '@/pages/workbench/ontology-kg/shared-network-types'
import { queryOntologyEntityList, queryOntologyGraph, queryOntologyRelationList } from '@/service/api/ontology-network'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import type { GraphQueryValues } from '../types'
import { deduplicateEdges, requestGraphWhenAllowed } from '../utils/graph'

interface UseOntologyGraphResult {
  entities: OntologyEntity[]
  filtersLoaded: boolean
  graphData: OntologyGraphData
  loading: boolean
  queryGraph: (values: GraphQueryValues) => Promise<boolean>
  relations: OntologyRelation[]
}

export function useOntologyGraph(spaceId: OntologyNetworkId): UseOntologyGraphResult {
  const [entities, setEntities] = useState<OntologyEntity[]>([])
  const [relations, setRelations] = useState<OntologyRelation[]>([])
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const [graphData, setGraphData] = useState<OntologyGraphData>({ edges: [], nodes: [] })
  const [loading, setLoading] = useState(false)
  const filterRequestRef = useRef(0)
  const graphRequestRef = useRef(0)

  const loadFilters = useCallback(async (): Promise<void> => {
    const requestId = filterRequestRef.current + 1
    filterRequestRef.current = requestId
    setFiltersLoaded(false)
    setEntities([])
    setRelations([])
    setGraphData({ edges: [], nodes: [] })
    try {
      const [entityResult, relationResult] = await Promise.all([
        queryOntologyEntityList({ pageNum: 1, pageSize: 1000, spaceId }),
        queryOntologyRelationList({ pageNum: 1, pageSize: 1000, spaceId }),
      ])
      assertFlatRequestSuccess(entityResult)
      assertFlatRequestSuccess(relationResult)
      if (requestId !== filterRequestRef.current) return
      const { data: entityData } = entityResult
      const { data: relationData } = relationResult
      setEntities(getOntologyNetworkRecords(entityData))
      setRelations(getOntologyNetworkRecords(relationData))
      setFiltersLoaded(true)
    } catch {
      if (requestId === filterRequestRef.current) message.error('图谱筛选项加载失败，请稍后重试')
    }
  }, [spaceId])

  const queryGraph = useCallback(
    async (values: GraphQueryValues): Promise<boolean> => {
      const requestId = graphRequestRef.current + 1
      graphRequestRef.current = requestId
      let succeeded = false
      const requested = await requestGraphWhenAllowed(filtersLoaded, entities, relations, async () => {
        setLoading(true)
        try {
          const result = await queryOntologyGraph({
            degree: values.degree ?? 2,
            endEntityId: values.endEntityId,
            relationKeyword: values.relationKeyword.trim() || undefined,
            spaceId,
            startEntityId: values.startEntityId,
          })
          assertFlatRequestSuccess(result)
          if (requestId !== graphRequestRef.current) return
          const { data } = result
          setGraphData(data ? { edges: deduplicateEdges(data.edges), nodes: data.nodes } : { edges: [], nodes: [] })
          succeeded = true
        } catch {
          if (requestId === graphRequestRef.current) message.error('图谱数据加载失败，请稍后重试')
        } finally {
          if (requestId === graphRequestRef.current) setLoading(false)
        }
      })
      if (!requested) {
        setGraphData({ edges: [], nodes: [] })
        setLoading(false)
      }
      return requested && succeeded
    },
    [entities, filtersLoaded, relations, spaceId],
  )

  useEffect(() => {
    loadFilters()
    return () => {
      filterRequestRef.current += 1
    }
  }, [loadFilters])

  useEffect(() => {
    if (!filtersLoaded) return undefined
    void queryGraph({ degree: 2, relationKeyword: '' })
    return () => {
      graphRequestRef.current += 1
    }
  }, [filtersLoaded, queryGraph])

  return { entities, filtersLoaded, graphData, loading, queryGraph, relations }
}
