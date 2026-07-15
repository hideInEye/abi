import {
  ApartmentOutlined,
  AppstoreOutlined,
  CloseOutlined,
  DownOutlined,
  FilterOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MinusOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { Checkbox, Popover, Select, Spin, Tooltip, message } from 'antd'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAppSelector } from '@/hooks/business/useStore'
import type { OntologyGraphEdge, OntologyGraphNode, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'
import { getSpaceId } from '@/store/slice/app'

import GraphDetailPanel from './components/GraphDetailPanel'
import OntologyGraphCanvas from './components/OntologyGraphCanvas'
import { useOntologyGraph } from './hooks/useOntologyGraph'
import styles from './index.module.css'
import type { GraphQueryValues, GraphSelection } from './types'
import { filterGraphData, splitGraphByDegree } from './utils/graph'

const INITIAL_QUERY: GraphQueryValues = { degree: 2, relationKeyword: '' }
const NAME_SEARCH_DEBOUNCE_MS = 400

export const Component: React.FC = () => {
  const spaceId = useAppSelector(getSpaceId)
  const { entities, filtersLoaded, graphData, loading, queryGraph, relations } = useOntologyGraph(spaceId)
  const [queryValues, setQueryValues] = useState<GraphQueryValues>(INITIAL_QUERY)
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([])
  const [selectedRelations, setSelectedRelations] = useState<string[]>([])
  const [selection, setSelection] = useState<GraphSelection | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false)
  const [isolatedExpanded, setIsolatedExpanded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const canvasRootRef = useRef<HTMLDivElement | null>(null)
  const nameSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggleFullscreen = useCallback(async (): Promise<void> => {
    const root = canvasRootRef.current
    if (!root) return
    try {
      if (document.fullscreenElement === root) {
        await document.exitFullscreen()
      } else {
        await root.requestFullscreen()
      }
    } catch (error) {
      console.error('[GraphExplorer] fullscreen operation failed', error)
    }
  }, [])

  useEffect(() => {
    const handleChange = (): void => {
      setIsFullscreen(document.fullscreenElement === canvasRootRef.current)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  const entityIds = useMemo(() => (entities.length > 0 ? entities.map((entity) => String(entity.id)) : graphData.nodes.map((node) => String(node.id))), [entities, graphData.nodes])
  const relationNames = useMemo(
    () => Array.from(new Set(relations.length > 0 ? relations.map((relation) => relation.relation) : graphData.edges.map((edge) => edge.relation))).sort(),
    [graphData.edges, relations],
  )
  const entityNameMap = useMemo(() => new Map(graphData.nodes.map((node) => [String(node.id), node.entityName])), [graphData.nodes])
  const hasFilterOptions = entities.length > 0 || relations.length > 0
  const allEntitiesSelected = entityIds.length > 0 && selectedEntityIds.length === entityIds.length
  const allRelationsSelected = relationNames.length > 0 && selectedRelations.length === relationNames.length
  const entitySelectionIndeterminate = selectedEntityIds.length > 0 && selectedEntityIds.length < entityIds.length
  const relationSelectionIndeterminate = selectedRelations.length > 0 && selectedRelations.length < relationNames.length

  useEffect(() => {
    setSelectedEntityIds(entityIds)
    setSelectedRelations(relationNames)
    setSelection(null)
  }, [entityIds, relationNames])

  useEffect(() => {
    return () => {
      if (nameSearchTimerRef.current) clearTimeout(nameSearchTimerRef.current)
    }
  }, [])

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

  const clearNameSearchTimer = useCallback((): void => {
    if (!nameSearchTimerRef.current) return
    clearTimeout(nameSearchTimerRef.current)
    nameSearchTimerRef.current = null
  }, [])

  const runGraphQuery = useCallback(
    (values: GraphQueryValues): void => {
      clearNameSearchTimer()
      void queryGraph({ ...values, degree: values.degree ?? INITIAL_QUERY.degree })
    },
    [clearNameSearchTimer, queryGraph],
  )

  const handleQuery = useCallback((): void => {
    runGraphQuery(queryValues)
  }, [queryValues, runGraphQuery])

  const handleResetQuery = useCallback((): void => {
    clearNameSearchTimer()
    setQueryValues(INITIAL_QUERY)
    setSelection(null)
    setDetailOpen(false)
    void queryGraph(INITIAL_QUERY)
  }, [clearNameSearchTimer, queryGraph])

  const handleAdvancedQuery = useCallback((): void => {
    setAdvancedSearchOpen(false)
    handleQuery()
  }, [handleQuery])

  const handleAdvancedReset = useCallback((): void => {
    setAdvancedSearchOpen(false)
    handleResetQuery()
  }, [handleResetQuery])

  const handleNameSearchChange = useCallback(
    (value: string): void => {
      const nextQuery = { ...queryValues, relationKeyword: value }
      setQueryValues(nextQuery)
      clearNameSearchTimer()
      if (!filtersLoaded) return
      nameSearchTimerRef.current = setTimeout(() => {
        nameSearchTimerRef.current = null
        void queryGraph({ ...nextQuery, degree: nextQuery.degree ?? INITIAL_QUERY.degree })
      }, NAME_SEARCH_DEBOUNCE_MS)
    },
    [clearNameSearchTimer, filtersLoaded, queryGraph, queryValues],
  )

  const handleToggleAllEntities = useCallback(
    (checked: boolean): void => {
      setSelectedEntityIds(checked ? entityIds : [])
    },
    [entityIds],
  )

  const handleToggleAllRelations = useCallback(
    (checked: boolean): void => {
      setSelectedRelations(checked ? relationNames : [])
    },
    [relationNames],
  )

  const handleSelect = useCallback((nextSelection: GraphSelection): void => {
    setSelection(nextSelection)
    setDetailOpen(true)
  }, [])

  const handleSetStartEntity = useCallback(
    (node: OntologyGraphNode): void => {
      updateQuery({ startEntityId: node.id })
      message.success({ content: `已设置开始节点：${node.entityName}`, getContainer: () => canvasRootRef.current || document.body })
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
      clearNameSearchTimer()
      setQueryValues(nextQuery)
      setSelection(null)
      setDetailOpen(false)
      void queryGraph(nextQuery)
    },
    [clearNameSearchTimer, queryGraph, queryValues],
  )

  const handleCloseDetails = useCallback((): void => {
    setDetailOpen(false)
  }, [])

  const adjustDegree = useCallback(
    (step: number): void => {
      const currentDegree = queryValues.degree ?? INITIAL_QUERY.degree
      updateQuery({ degree: Math.min(5, Math.max(1, currentDegree! + step)) })
    },
    [queryValues.degree, updateQuery],
  )

  const filterContent = (
    <div className={styles.filterPanel}>
      <div className={styles.filterHeader}>
        <span className={styles.filterTitle}>图谱筛选</span>
        <AButton className={styles.filterCloseBtn} icon={<CloseOutlined />} type="text" onClick={() => setFilterOpen(false)} />
      </div>
      <div className={styles.filterBody}>
        <div className={styles.filterSection}>
          <div className={styles.filterSectionLabel}>
            <Checkbox
              checked={allEntitiesSelected}
              disabled={entityIds.length === 0}
              indeterminate={entitySelectionIndeterminate}
              onChange={(event) => handleToggleAllEntities(event.target.checked)}
            >
              实体筛选
            </Checkbox>
          </div>
          <Checkbox.Group
            className={styles.filterCheckboxGroup}
            options={entities.map((entity) => ({
              label: (
                <span className={styles.filterCheckboxItem}>
                  <span className={styles.entityDot} style={{ backgroundColor: entity.color || '#5B7CF7' }} />
                  <span>{entity.entityName}</span>
                </span>
              ),
              value: String(entity.id),
            }))}
            value={selectedEntityIds}
            onChange={(values) => setSelectedEntityIds(values.map(String))}
          />
        </div>

        <div className={styles.filterDivider} />

        <div className={styles.filterSection}>
          <div className={styles.filterSectionLabel}>
            <Checkbox
              checked={allRelationsSelected}
              disabled={relationNames.length === 0}
              indeterminate={relationSelectionIndeterminate}
              onChange={(event) => handleToggleAllRelations(event.target.checked)}
            >
              关系筛选
            </Checkbox>
          </div>
          <Checkbox.Group
            className={styles.filterCheckboxGroup}
            options={relationNames.map((relation) => ({
              label: (
                <span className={styles.filterCheckboxItem}>
                  <span className={styles.entityDot} style={{ backgroundColor: '#F59E0B' }} />
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
  )

  const labelOptions = useMemo(() => {
    const labelMap = new Map<string, string>()
    for (const entity of entities) {
      if (entity.labelId != null && !labelMap.has(String(entity.labelId))) {
        labelMap.set(String(entity.labelId), String(entity.labelType))
      }
    }
    return Array.from(labelMap.entries()).map(([id,name]) => {
      return({ label: name, value: id })
    })
  }, [entities])

  const advancedSearchContent = (
    <div className={styles.advancedSearchPanel}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <label className="flex flex-col gap-2 text-12px font-500">
          <span>开始节点</span>
          <Select
            allowClear
            fieldNames={{ label: 'entityName', value: 'id' }}
            getPopupContainer={(trigger) => trigger.closest('.ant-popover-inner') as HTMLElement || trigger.parentNode as HTMLElement}
            options={entities}
            placeholder="全部"
            showSearch
            value={queryValues.startEntityId}
            optionFilterProp="entityName"
            onChange={(value: OntologyNetworkId | undefined) => updateQuery({ startEntityId: value })}
          />
        </label>
        <label className="flex flex-col gap-2 text-12px font-500">
          <span>结束节点</span>
          <Select
            allowClear
            fieldNames={{ label: 'entityName', value: 'id' }}
            getPopupContainer={(trigger) => trigger.closest('.ant-popover-inner') as HTMLElement || trigger.parentNode as HTMLElement}
            options={entities}
            placeholder="全部"
            showSearch
            value={queryValues.endEntityId}
            optionFilterProp="entityName"
            onChange={(value: OntologyNetworkId | undefined) => updateQuery({ endEntityId: value })}
          />
        </label>
        <label className="flex flex-col gap-2 text-12px font-500">
          <span>标签类型</span>
          <Select
            allowClear
            getPopupContainer={(trigger) => trigger.closest('.ant-popover-inner') as HTMLElement || trigger.parentNode as HTMLElement}
            options={labelOptions}
            placeholder="全部"
            showSearch
            value={queryValues.labelType}
            optionFilterProp="label"
            onChange={(value: OntologyNetworkId | undefined) => updateQuery({ labelType: value })}
          />
        </label>
        <div className="flex flex-col gap-2 text-12px font-500">
          <span>关系跳数</span>
          <div className="flex items-center gap-2">
            <AButton className={styles.degreeBtn} onClick={() => adjustDegree(-1)}>
              <MinusOutlined />
            </AButton>
            <div className={styles.degreeDisplay}>{queryValues.degree ?? INITIAL_QUERY.degree}</div>
            <AButton className={styles.degreeBtn} onClick={() => adjustDegree(1)}>
              <PlusOutlined />
            </AButton>
          </div>
        </div>
        <div className="flex items-end justify-end gap-3 col-span-2">
          <AButton className={styles.advancedResetBtn} icon={<ReloadOutlined />} onClick={handleAdvancedReset}>
            重置
          </AButton>
          <AButton className={styles.advancedQueryBtn} type="primary" onClick={handleAdvancedQuery}>
            <SearchOutlined /> 查询
          </AButton>
        </div>
      </div>
    </div>
  )

  return (
    <div ref={canvasRootRef} className={`${styles.canvasRoot} ${isFullscreen ? styles.fullscreen : ''}`}>
      {/* ── 画布主体 ── */}
      <div className={styles.canvasArea}>
        <OntologyGraphCanvas
          backgroundColor="transparent"
          degreeMap={splitGraph.degreeMap}
          emptyDescription={
            splitGraph.connectedEdges.length === 0
              ? `当前筛选结果暂无关系。已筛选 ${filteredGraph.nodes.length} 个实体，但没有匹配到符合条件的关系。`
              : filtersLoaded && !hasFilterOptions
                ? '暂无可探索的实体或关系'
                : undefined
          }
          edges={splitGraph.connectedEdges}
          isFullscreen={isFullscreen}
          nodes={splitGraph.connectedNodes}
          selection={selection}
          onSelect={handleSelect}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>

      {/* ── 顶部工具栏 ── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarRight}>
          <div className={styles.searchCapsule}>
            <AInput
              allowClear
              placeholder="搜索关系名称..."
              prefix={<SearchOutlined />}
              value={queryValues.relationKeyword}
              onChange={(event) => handleNameSearchChange(event.target.value)}
              onPressEnter={handleQuery}
            />
          </div>
          <Popover content={filterContent} getPopupContainer={() => canvasRootRef.current || document.body} open={filterOpen} placement="bottomRight" trigger="click" onOpenChange={setFilterOpen}>
            <Tooltip getPopupContainer={() => canvasRootRef.current || document.body} title="图谱筛选">
              <AButton className={styles.toolbarBtn} icon={<AppstoreOutlined />} type="text" />
            </Tooltip>
          </Popover>
          <Popover
            content={advancedSearchContent}
            getPopupContainer={() => canvasRootRef.current || document.body}
            open={advancedSearchOpen}
            placement="bottomRight"
            trigger="click"
            onOpenChange={setAdvancedSearchOpen}
          >
            <Tooltip getPopupContainer={() => canvasRootRef.current || document.body} title="高级搜索">
              <AButton className={styles.toolbarBtn} icon={<FilterOutlined />} type="text" />
            </Tooltip>
          </Popover>
        </div>
      </div>

      {/* ── 未关联实体面板 ── */}
      {splitGraph.isolatedNodes.length > 0 && (
        <div className={styles.isolatedPanel}>
          <button
            className={styles.isolatedToggle}
            type="button"
            onClick={() => setIsolatedExpanded((value) => !value)}
          >
            <span className={styles.isolatedToggleLabel}>
              <ApartmentOutlined style={{ marginRight: 8 }} />
              未关联实体 {splitGraph.isolatedNodes.length} 个
            </span>
            <span className={styles.isolatedToggleAction}>
              {isolatedExpanded ? '收起' : '展开'}
              {isolatedExpanded ? <UpOutlined /> : <DownOutlined />}
            </span>
          </button>
          {isolatedExpanded && (
            <div className={styles.isolatedGrid}>
              {splitGraph.isolatedNodes.map((node) => (
                <div key={String(node.id)} className={styles.isolatedCard}>
                  <div className={styles.isolatedCardName}>
                    <span className={styles.entityDot} style={{ backgroundColor: node.color || '#5B7CF7', color: node.color || '#5B7CF7' }} />
                    <span>{node.entityName}</span>
                  </div>
                  <div className={styles.isolatedCardActions}>
                    <AButton size="small" type="link" onClick={() => handleSetStartEntity(node)}>
                      设为起点
                    </AButton>
                    <AButton size="small" type="link" onClick={() => handleViewIsolatedNode(node)}>
                      详情
                    </AButton>
                    <AButton size="small" type="link" onClick={() => handleRequeryIsolatedNode(node)}>
                      查询
                    </AButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 加载状态 ── */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <Spin />
        </div>
      )}

      {/* ── 详情面板 ── */}
      <GraphDetailPanel edge={selectedEdge} entityNameMap={entityNameMap} getContainer={() => canvasRootRef.current || document.body} node={selectedNode} open={detailOpen} onClose={handleCloseDetails} />
    </div>
  )
}

export default Component
