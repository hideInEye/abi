import { ApartmentOutlined, BranchesOutlined, DownOutlined, MinusOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, UpOutlined } from '@ant-design/icons'
import { Checkbox, Select, Spin, message } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import leftOnlineIcon from '@/assets/svg-icon/left_online.svg'
import { useAppSelector } from '@/hooks/business/useStore'
import type { OntologyGraphEdge, OntologyGraphNode, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'
import { getSpaceId } from '@/store/slice/app'

import GraphDetailPanel from './components/GraphDetailPanel'
import OntologyGraphCanvas from './components/OntologyGraphCanvas'
import { useOntologyGraph } from './hooks/useOntologyGraph'
import type { GraphQueryValues, GraphSelection } from './types'
import { filterGraphData, splitGraphByDegree } from './utils/graph'

const INITIAL_QUERY: GraphQueryValues = { degree: 2, relationKeyword: '' }
const RELATION_COLORS = ['#CF6042', '#F0A12B', '#7C5BEF', '#4DBB83', '#4A90E2', '#D94FB5']

function getRelationColor(relation: string): string {
  const hash = relation.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return RELATION_COLORS[hash % RELATION_COLORS.length]
}

export const Component: React.FC = () => {
  const spaceId = useAppSelector(getSpaceId)
  const { entities, filtersLoaded, graphData, loading, queryGraph, relations } = useOntologyGraph(spaceId)
  const [queryValues, setQueryValues] = useState<GraphQueryValues>(INITIAL_QUERY)
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([])
  const [selectedRelations, setSelectedRelations] = useState<string[]>([])
  const [selection, setSelection] = useState<GraphSelection | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [filterCollapsed, setFilterCollapsed] = useState(false)
  const [isolatedExpanded, setIsolatedExpanded] = useState(false)

  const entityIds = useMemo(() => (entities.length > 0 ? entities.map((entity) => String(entity.id)) : graphData.nodes.map((node) => String(node.id))), [entities, graphData.nodes])
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
  const splitGraph = useMemo(() => splitGraphByDegree(filteredGraph), [filteredGraph])

  useEffect(() => {
    setIsolatedExpanded(false)
  }, [filteredGraph])

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
    queryGraph({ ...queryValues, degree: queryValues.degree ?? INITIAL_QUERY.degree })
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

  const handleSetStartEntity = useCallback(
    (node: OntologyGraphNode): void => {
      updateQuery({ startEntityId: node.id })
      message.success(`已设置开始节点：${node.entityName}`)
    },
    [updateQuery],
  )

  const handleViewIsolatedNode = useCallback((node: OntologyGraphNode): void => {
    setSelection({ id: String(node.id), type: 'node' })
    setDetailOpen(true)
  }, [])

  const handleRequeryIsolatedNode = useCallback(
    (node: OntologyGraphNode): void => {
      const nextQuery = { ...queryValues, degree: queryValues.degree ?? INITIAL_QUERY.degree, startEntityId: node.id }
      setQueryValues(nextQuery)
      setSelection(null)
      setDetailOpen(false)
      void queryGraph(nextQuery)
    },
    [queryGraph, queryValues],
  )

  const handleCloseDetails = useCallback((): void => {
    setDetailOpen(false)
  }, [])

  const adjustDegree = useCallback(
    (step: number): void => {
      const currentDegree = queryValues.degree ?? INITIAL_QUERY.degree
      updateQuery({ degree: Math.min(5, Math.max(1, currentDegree + step)) })
    },
    [queryValues.degree, updateQuery],
  )

  const handleFilterToggleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    setFilterCollapsed((value) => !value)
  }, [])

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden" style={{ background: 'var(--abi-card-bg)' }}>
      <section className="relative flex min-h-0 w-full flex-1 overflow-hidden border border-slate-200 bg-transparent">
        <aside className={`h-full min-h-500px shrink-0 overflow-hidden border-r border-slate-200 transition-all duration-200 ${filterCollapsed ? 'w-48px' : 'w-280px'}`}>
          {filterCollapsed ? (
            <div
              aria-label="展开图谱筛选"
              className="flex h-full w-full cursor-pointer items-center justify-center text-center text-13px font-600 tracking-4px text-slate-500 hover:text-blue-500"
              role="button"
              tabIndex={0}
              style={{ writingMode: 'vertical-rl' }}
              onClick={() => setFilterCollapsed(false)}
              onKeyDown={handleFilterToggleKeyDown}
            >
              图谱筛选
            </div>
          ) : (
            <div className="flex h-full min-h-500px flex-col px-5 py-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="m-0 text-16px font-700 text-slate-900">图谱筛选</h2>
                <AButton icon={<ReloadOutlined />} size="small" onClick={handleResetFilters}>
                  重置
                </AButton>
              </div>
              <div className="min-h-0 flex-1 overflow-auto pr-1">
                <div className="mb-5">
                  <div className="mb-3 flex items-center gap-2 text-13px font-500 text-slate-600">
                    <ApartmentOutlined />
                    <span>实体筛选</span>
                  </div>
                  <Checkbox.Group
                    className="flex flex-col gap-2.5"
                    options={entities.map((entity) => ({
                      label: (
                        <span className="inline-flex items-center gap-2 text-13px text-slate-800">
                          <span className="h-8px w-8px rounded-full" style={{ backgroundColor: entity.color || '#5B7CF7' }} />
                          <span>{entity.entityName}</span>
                        </span>
                      ),
                      value: String(entity.id),
                    }))}
                    value={selectedEntityIds}
                    onChange={(values) => setSelectedEntityIds(values.map(String))}
                  />
                </div>
                <div className="border-t border-slate-200 pt-5">
                  <div className="mb-3 flex items-center gap-2 text-13px font-500 text-slate-600">
                    <BranchesOutlined />
                    <span>关系筛选</span>
                  </div>
                  <Checkbox.Group
                    className="flex flex-col gap-2.5"
                    options={relationNames.map((relation) => ({
                      label: (
                        <span className="inline-flex items-center gap-2 text-13px text-slate-800">
                          <span className="h-8px w-8px rounded-full" style={{ backgroundColor: getRelationColor(relation) }} />
                          <span>{relation}</span>
                        </span>
                      ),
                      value: relation,
                    }))}
                    value={selectedRelations}
                    onChange={(values) => setSelectedRelations(values.map(String))}
                  />
                </div>
              </div>
            </div>
          )}
        </aside>
        {!filterCollapsed && (
          <div
            aria-label="收起图谱筛选"
            className="absolute top-1/2 z-30 flex h-28px w-28px cursor-pointer items-center justify-center transition-transform duration-200 hover:scale-105"
            role="button"
            style={{ left: 280, transform: 'translate(-50%, -50%)' }}
            tabIndex={0}
            onClick={() => setFilterCollapsed(true)}
            onKeyDown={handleFilterToggleKeyDown}
          >
            <img alt="" aria-hidden="true" height={28} src={leftOnlineIcon} width={28} />
          </div>
        )}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
          <header className="relative z-20 border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <label className="flex w-200px flex-col gap-2 text-12px font-500 text-slate-600">
                <span>开始节点</span>
                <Select
                  allowClear
                  className="abi-field-input"
                  fieldNames={{ label: 'entityName', value: 'id' }}
                  options={entities}
                  placeholder="全部"
                  showSearch
                  value={queryValues.startEntityId}
                  optionFilterProp="entityName"
                  onChange={(value: OntologyNetworkId | undefined) => updateQuery({ startEntityId: value })}
                />
              </label>
              <label className="flex w-200px flex-col gap-2 text-12px font-500 text-slate-600">
                <span>结束节点</span>
                <Select
                  allowClear
                  className="abi-field-input"
                  fieldNames={{ label: 'entityName', value: 'id' }}
                  options={entities}
                  placeholder="全部"
                  showSearch
                  value={queryValues.endEntityId}
                  optionFilterProp="entityName"
                  onChange={(value: OntologyNetworkId | undefined) => updateQuery({ endEntityId: value })}
                />
              </label>
              <label className="flex w-210px flex-col gap-2 text-12px font-500 text-slate-600">
                <span>关系名称</span>
                <AInput
                  allowClear
                  className="abi-field-input"
                  placeholder="输入关键词"
                  value={queryValues.relationKeyword}
                  onChange={(event) => updateQuery({ relationKeyword: event.target.value })}
                  onPressEnter={handleQuery}
                />
              </label>
              <div className="flex flex-col gap-2 text-12px font-500 text-slate-600">
                <span>跳数</span>
                <div className="flex items-center gap-2">
                  <AButton className="h-34px w-34px px-0" onClick={() => adjustDegree(-1)}>
                    <MinusOutlined />
                  </AButton>
                  <div className="flex h-34px w-50px items-center justify-center rounded-8px border border-slate-200 bg-[var(--abi-input-bg)] text-15px font-600 text-slate-900">
                    {queryValues.degree ?? INITIAL_QUERY.degree}
                  </div>
                  <AButton className="h-34px w-34px px-0" onClick={() => adjustDegree(1)}>
                    <PlusOutlined />
                  </AButton>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AButton className="btn-accent-gradient" type="primary" onClick={handleQuery}>
                  <SearchOutlined /> 查询
                </AButton>
                <AButton icon={<ReloadOutlined />} onClick={handleResetQuery}>
                  重置
                </AButton>
              </div>
            </div>
          </header>
          <div className="relative min-h-0 flex-1">
            <OntologyGraphCanvas
              degreeMap={splitGraph.degreeMap}
              emptyDescription={
                splitGraph.connectedEdges.length === 0
                  ? `当前筛选结果暂无关系。已筛选 ${filteredGraph.nodes.length} 个实体，但没有匹配到符合条件的关系。`
                  : filtersLoaded && !hasFilterOptions
                    ? '暂无可探索的实体或关系'
                    : undefined
              }
              edges={splitGraph.connectedEdges}
              nodes={splitGraph.connectedNodes}
              selection={selection}
              onSelect={handleSelect}
            />
            {splitGraph.isolatedNodes.length > 0 && (
              <div className="absolute bottom-5 left-5 z-30 max-w-[min(720px,calc(100%-40px))] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur">
                <button
                  className="flex w-full items-center justify-between gap-4 border-0 bg-transparent p-0 text-left text-sm font-600 text-slate-700"
                  type="button"
                  onClick={() => setIsolatedExpanded((value) => !value)}
                >
                  <span>未关联实体 {splitGraph.isolatedNodes.length} 个</span>
                  <span className="flex items-center gap-1 text-blue-600">
                    {isolatedExpanded ? '收起' : '展开查看'}
                    {isolatedExpanded ? <UpOutlined /> : <DownOutlined />}
                  </span>
                </button>
                {isolatedExpanded && (
                  <div className="mt-3 grid max-h-240px grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 overflow-auto">
                    {splitGraph.isolatedNodes.map((node) => (
                      <div key={String(node.id)} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: node.color || '#5B7CF7' }} />
                          <span className="min-w-0 truncate text-sm font-600 text-slate-800">{node.entityName}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <AButton size="small" type="link" onClick={() => handleSetStartEntity(node)}>
                            设为开始节点
                          </AButton>
                          <AButton size="small" type="link" onClick={() => handleViewIsolatedNode(node)}>
                            查看详情
                          </AButton>
                          <AButton size="small" type="link" onClick={() => handleRequeryIsolatedNode(node)}>
                            重新查询关系
                          </AButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
