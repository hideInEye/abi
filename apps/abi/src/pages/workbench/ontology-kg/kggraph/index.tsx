import { LeftOutlined, ReloadOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons'
import { Checkbox, InputNumber, Select, Spin, message } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { useAppSelector } from '@/hooks/business/useStore'
import type { OntologyGraphEdge, OntologyGraphNode, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'
import { getSpaceId } from '@/store/slice/app'

import GraphDetailPanel from './components/GraphDetailPanel'
import OntologyGraphCanvas from './components/OntologyGraphCanvas'
import { useOntologyGraph } from './hooks/useOntologyGraph'
import type { GraphQueryValues, GraphSelection } from './types'
import { filterGraphData } from './utils/graph'

const INITIAL_QUERY: GraphQueryValues = { degree: 2, relationKeyword: '' }

export const Component: React.FC = () => {
  const spaceId = useAppSelector(getSpaceId)
  const { entities, filtersLoaded, graphData, loading, queryGraph, relations } = useOntologyGraph(spaceId)
  const [queryValues, setQueryValues] = useState<GraphQueryValues>(INITIAL_QUERY)
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([])
  const [selectedRelations, setSelectedRelations] = useState<string[]>([])
  const [selection, setSelection] = useState<GraphSelection | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [filterCollapsed, setFilterCollapsed] = useState(false)

  const entityIds = useMemo(
    () => (entities.length > 0 ? entities.map((entity) => String(entity.id)) : graphData.nodes.map((node) => String(node.id))),
    [entities, graphData.nodes],
  )
  const relationNames = useMemo(
    () => Array.from(new Set(relations.length > 0 ? relations.map((relation) => relation.relation) : graphData.edges.map((edge) => edge.relation))).sort(),
    [graphData.edges, relations],
  )
  const entityNameMap = useMemo(() => new Map(graphData.nodes.map((node) => [String(node.id), node.entityName])), [graphData.nodes])
  const hasFilterOptions = entities.length > 0 || relations.length > 0

  useEffect(() => {
    setSelectedEntityIds(entityIds)
    setSelectedRelations(relationNames)
    setSelection(null)
  }, [entityIds, relationNames])

  const filteredGraph = useMemo(() => filterGraphData(graphData, selectedEntityIds, selectedRelations), [graphData, selectedEntityIds, selectedRelations])
  const selectedNode = useMemo<OntologyGraphNode | null>(
    () => (selection?.type === 'node' ? (graphData.nodes.find((node) => String(node.id) === selection.id) ?? null) : null),
    [graphData.nodes, selection],
  )
  const selectedEdge = useMemo<OntologyGraphEdge | null>(
    () => (selection?.type === 'edge' ? (graphData.edges.find((edge) => String(edge.id) === selection.id) ?? null) : null),
    [graphData.edges, selection],
  )

  const updateQuery = useCallback((patch: Partial<GraphQueryValues>): void => {
    setQueryValues((current) => ({ ...current, ...patch }))
  }, [])

  const handleQuery = useCallback((): void => {
    queryGraph(queryValues)
  }, [queryGraph, queryValues])

  const handleResetQuery = useCallback((): void => {
    setQueryValues(INITIAL_QUERY)
    setSelection(null)
    setDetailOpen(false)
    void queryGraph(INITIAL_QUERY)
  }, [queryGraph])

  const handleResetFilters = useCallback((): void => {
    setSelectedEntityIds(entityIds)
    setSelectedRelations(relationNames)
    message.success('筛选已重置')
  }, [entityIds, relationNames])

  const handleSelect = useCallback((nextSelection: GraphSelection): void => {
    setSelection(nextSelection)
    setDetailOpen(true)
  }, [])

  const handleCloseDetails = useCallback((): void => {
    setDetailOpen(false)
  }, [])

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <section className="relative flex min-h-0 w-full flex-1 overflow-hidden bg-slate-50 p-4">
        <aside className={`h-full shrink-0 overflow-hidden transition-all duration-200 ${filterCollapsed ? 'w-0 p-0' : 'w-260px pr-4'}`}>
          <div className="h-full overflow-auto rounded-16px border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="m-0 text-17px font-700 text-slate-800">图谱筛选</h2>
              <AButton icon={<ReloadOutlined />} size="small" type="text" onClick={handleResetFilters}>
                重置
              </AButton>
            </div>
            <div className="mb-6">
              <div className="mb-3 text-15px font-600 text-slate-700">实体筛选</div>
              <Checkbox.Group
                className="flex flex-col gap-3"
                options={entities.map((entity) => ({ label: entity.entityName, value: String(entity.id) }))}
                value={selectedEntityIds}
                onChange={(values) => setSelectedEntityIds(values.map(String))}
              />
            </div>
            <div className="border-t border-slate-100 pt-5">
              <div className="mb-3 text-15px font-600 text-slate-700">关系筛选</div>
              <Checkbox.Group className="flex flex-col gap-3" options={relationNames} value={selectedRelations} onChange={(values) => setSelectedRelations(values.map(String))} />
            </div>
          </div>
        </aside>
        <AButton
          aria-label={filterCollapsed ? '展开图谱筛选' : '收起图谱筛选'}
          className="absolute top-1/2 z-20 !h-42px !w-24px !rounded-full !border-slate-200 !bg-white !p-0 !text-slate-400 shadow-[0_6px_16px_rgba(15,23,42,0.1)] transition-all duration-200"
          icon={filterCollapsed ? <RightOutlined /> : <LeftOutlined />}
          style={{ left: filterCollapsed ? 4 : 252, transform: 'translateY(-50%)' }}
          type="default"
          onClick={() => setFilterCollapsed((value) => !value)}
        />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-16px border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <header className="relative z-20 flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
            <Select
              allowClear
              className="abi-field-input"
              fieldNames={{ label: 'entityName', value: 'id' }}
              options={entities}
              placeholder="开始节点（全部）"
              showSearch
              style={{ width: 190 }}
              value={queryValues.startEntityId}
              optionFilterProp="entityName"
              onChange={(value: OntologyNetworkId | undefined) => updateQuery({ startEntityId: value })}
            />
            <Select
              allowClear
              className="abi-field-input"
              fieldNames={{ label: 'entityName', value: 'id' }}
              options={entities}
              placeholder="结束节点（全部）"
              showSearch
              style={{ width: 190 }}
              value={queryValues.endEntityId}
              optionFilterProp="entityName"
              onChange={(value: OntologyNetworkId | undefined) => updateQuery({ endEntityId: value })}
            />
            <AInput
              allowClear
              className="abi-field-input"
              placeholder="关系名称关键词"
              style={{ width: 190 }}
              value={queryValues.relationKeyword}
              onChange={(event) => updateQuery({ relationKeyword: event.target.value })}
              onPressEnter={handleQuery}
            />
            <InputNumber
              className="abi-field-input"
              max={5}
              min={1}
              placeholder="关系跳数"
              style={{ width: 130 }}
              value={queryValues.degree}
              onChange={(value) => updateQuery({ degree: typeof value === 'number' ? value : 2 })}
            />
            <AButton className="btn-accent-gradient" type="primary" onClick={handleQuery}>
              <SearchOutlined /> 查询
            </AButton>
            <AButton icon={<ReloadOutlined />} onClick={handleResetQuery}>
              重置
            </AButton>
          </header>
          <div className="relative min-h-0 flex-1">
            <OntologyGraphCanvas
              emptyDescription={filtersLoaded && !hasFilterOptions ? '暂无可探索的实体或关系' : undefined}
              edges={filteredGraph.edges}
              nodes={filteredGraph.nodes}
              selection={selection}
              onSelect={handleSelect}
            />
            {loading && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <Spin />
              </div>
            )}
          </div>
        </main>
      </section>
      <GraphDetailPanel edge={selectedEdge} entityNameMap={entityNameMap} node={selectedNode} open={detailOpen} onClose={handleCloseDetails} />
    </div>
  )
}

export default Component
