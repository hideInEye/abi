import type { LineageRelation } from './types'

function normalizeStatus(status?: string | number): '0' | '1' {
  return `${status ?? '0'}` === '1' ? '1' : '0'
}

function toNodeId(value: unknown): string | number {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseMaybeJson(raw: unknown) {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function fromRelationRows(rows: any[]): LineageRelation[] {
  return rows.map((item, index) => ({
    create_by: item.create_by ?? item.createBy,
    create_time: item.create_time ?? item.createTime,
    lineage_id: item.lineage_id ?? item.lineageId ?? item.relationId ?? `lineage-${index + 1}`,
    relation_type: item.relation_type ?? item.relationType ?? 'DEPENDENCY',
    remark: item.remark ?? '',
    source_node_id: toNodeId(item.source_node_id ?? item.sourceNodeId),
    source_node_name: item.source_node_name ?? item.sourceNodeName ?? item.sourceName,
    source_node_type: item.source_node_type ?? item.sourceNodeType ?? 'DATA_SOURCE',
    space_id: item.space_id ?? item.spaceId,
    status: normalizeStatus(item.status),
    target_node_id: toNodeId(item.target_node_id ?? item.targetNodeId),
    target_node_name: item.target_node_name ?? item.targetNodeName ?? item.targetName,
    target_node_type: item.target_node_type ?? item.targetNodeType ?? 'DATASET',
    update_by: item.update_by ?? item.updateBy,
    update_time: item.update_time ?? item.updateTime
  }))
}

function fromNodeEdgeShape(raw: any): LineageRelation[] {
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : []
  const edges = Array.isArray(raw?.edges) ? raw.edges : []
  if (!edges.length) return []

  const nodeMap = new Map<string, any>()
  nodes.forEach(node => {
    const nodeId = toNodeId(node.nodeId ?? node.id)
    if (`${nodeId}`) nodeMap.set(`${nodeId}`, node)
  })

  return edges.map((edge, index) => {
    const sourceId = toNodeId(edge.sourceNodeId ?? edge.source_node_id ?? edge.sourceId)
    const targetId = toNodeId(edge.targetNodeId ?? edge.target_node_id ?? edge.targetId)
    const sourceNode = nodeMap.get(`${sourceId}`)
    const targetNode = nodeMap.get(`${targetId}`)

    return {
      create_by: edge.createBy ?? edge.create_by,
      create_time: edge.createTime ?? edge.create_time,
      lineage_id: edge.relationId ?? edge.lineageId ?? edge.lineage_id ?? edge.id ?? `edge-${index + 1}`,
      relation_type: edge.relationType ?? edge.relation_type ?? 'DEPENDENCY',
      remark: edge.remark ?? '',
      source_node_id: sourceId,
      source_node_name: sourceNode?.nodeName ?? sourceNode?.name,
      source_node_type: sourceNode?.nodeType ?? edge.sourceNodeType ?? edge.source_node_type ?? 'UNKNOWN',
      space_id: edge.spaceId ?? edge.space_id ?? raw?.spaceId,
      status: normalizeStatus(edge.status ?? sourceNode?.status ?? targetNode?.status),
      target_node_id: targetId,
      target_node_name: targetNode?.nodeName ?? targetNode?.name,
      target_node_type: targetNode?.nodeType ?? edge.targetNodeType ?? edge.target_node_type ?? 'UNKNOWN',
      update_by: edge.updateBy ?? edge.update_by,
      update_time: edge.updateTime ?? edge.update_time
    }
  })
}

function fromLegacyShape(raw: any): LineageRelation[] {
  if (!raw || typeof raw !== 'object') return []

  const sourceId = toNodeId(raw.sourceId)
  const sourceType = raw.sourceType || 'DATA_SOURCE'
  const sourceName = raw.sourceName || '数据源'

  const relations: LineageRelation[] = []
  const tableMap = new Map<string, string>()

  ;(raw.tables || []).forEach((table: any, index: number) => {
    const tableName = table.tableName || `表_${index + 1}`
    const tableId = table.tableId || `T_${sourceId}_${index}`
    tableMap.set(table.viewId, tableId)
    relations.push({
      lineage_id: `legacy-table-${index}-${sourceId}`,
      relation_type: 'DEPENDENCY',
      source_node_id: sourceId,
      source_node_name: sourceName,
      source_node_type: sourceType,
      status: '0',
      target_node_id: tableId,
      target_node_name: tableName,
      target_node_type: 'TABLE_SEMANTIC'
    })
  })

  ;(raw.datasets || []).forEach((dataset: any, index: number) => {
    const datasetId = toNodeId(dataset.viewId ?? `DS_${index}`)
    const datasetName = dataset.viewName || `数据集_${index + 1}`
    const tableId = tableMap.get(dataset.viewId)

    relations.push({
      lineage_id: `legacy-dataset-${index}-${sourceId}`,
      relation_type: 'DERIVED',
      source_node_id: tableId || sourceId,
      source_node_name: tableId ? raw.tables?.find((table: any) => table.viewId === dataset.viewId)?.tableName : sourceName,
      source_node_type: tableId ? 'TABLE_SEMANTIC' : sourceType,
      status: '0',
      target_node_id: datasetId,
      target_node_name: datasetName,
      target_node_type: 'DATASET'
    })
  })

  return relations
}

export function normalizeRelations(raw: any): LineageRelation[] {
  const parsed = parseMaybeJson(raw)
  if (!parsed) return []

  if (Array.isArray(parsed)) return fromRelationRows(parsed)

  // 新接口统一返回：{ success, Code, errMsg, data: { nodes, edges } } 或 data 为 JSON string
  if (parsed?.data !== undefined) {
    const parsedData = parseMaybeJson(parsed.data)
    if (Array.isArray(parsedData?.nodes) || Array.isArray(parsedData?.edges)) {
      return fromNodeEdgeShape(parsedData)
    }
    if (Array.isArray(parsedData)) return fromRelationRows(parsedData)
  }

  if (Array.isArray(parsed?.nodes) || Array.isArray(parsed?.edges)) return fromNodeEdgeShape(parsed)
  if (Array.isArray(parsed?.list)) return fromRelationRows(parsed.list)
  if (Array.isArray(parsed?.rows)) return fromRelationRows(parsed.rows)
  return fromLegacyShape(parsed)
}

export function buildNodeDetail(relations: LineageRelation[], nodeId: string | number, nodeType: string) {
  const inboundRelations = relations.filter(
    item => `${item.target_node_id}` === `${nodeId}` && item.target_node_type === nodeType
  )
  const outboundRelations = relations.filter(
    item => `${item.source_node_id}` === `${nodeId}` && item.source_node_type === nodeType
  )

  return {
    inCount: inboundRelations.length,
    inboundRelations,
    outCount: outboundRelations.length,
    outboundRelations
  }
}
