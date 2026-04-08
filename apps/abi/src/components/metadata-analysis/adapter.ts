/* eslint-disable complexity */
import type { LineageRelation } from './types'

function normalizeStatus(status?: string | number): '0' | '1' {
  return `${status ?? '0'}` === '1' ? '1' : '0'
}

function normalizeNodeType(value?: string) {
  const raw = `${value || ''}`.trim()
  if (!raw) return 'UNKNOWN'
  const upper = raw.toUpperCase()
  if (upper === 'DATA_SOURCE' || upper === 'DATA_SOURCE'.replace('_', '')) return 'DATA_SOURCE'
  return upper
}

function normalizeRelationType(value?: string) {
  const raw = `${value || ''}`.trim()
  if (!raw) return 'DEPENDENCY'
  if (raw.includes('拆解')) return 'DECOMPOSITION'
  if (raw.includes('派生')) return 'DERIVED'
  if (raw.includes('依赖')) return 'DEPENDENCY'
  if (raw.includes('映射')) return 'MAPPED_TO'

  const normalized = raw.toUpperCase().replace(/[-\s]/g, '_')
  if (normalized === 'DECOMPOSION' || normalized === 'DECOMPOSITION' || normalized === 'DECOMPOSE') {
    return 'DECOMPOSITION'
  }
  if (normalized === 'DERIVE' || normalized === 'DERIVED') return 'DERIVED'
  if (normalized === 'DEPEND' || normalized === 'DEPENDENCY' || normalized === 'DEPENDS_ON') return 'DEPENDENCY'
  if (normalized === 'MAP' || normalized === 'MAPPING' || normalized === 'MAPPED_TO') return 'MAPPED_TO'
  return normalized
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

function parsePhysicalTableNames(rawValue: unknown) {
  const raw = `${rawValue ?? ''}`.trim()
  if (!raw) return []
  return raw
    .split(/[，,]/)
    .map(name => name.trim())
    .filter(Boolean)
}

function toCount(value: unknown): number | string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'number' || typeof value === 'string') return value
  return String(value)
}

function fromRelationRows(rows: any[]): LineageRelation[] {
  return rows.map((item, index) => ({
    create_by: item.create_by ?? item.createBy,
    create_time: item.create_time ?? item.createTime,
    lineage_id: item.lineage_id ?? item.lineageId ?? item.relationId ?? `lineage-${index + 1}`,
    relation_type: normalizeRelationType(item.relation_type ?? item.relationType),
    remark: item.remark ?? '',
    source_node_id: toNodeId(item.source_node_id ?? item.sourceNodeId),
    source_node_count: toCount(item.source_node_count ?? item.sourceNodeCount ?? item.sourceCount ?? item.sourceCountNum ?? item.sourceNode?.count),
    source_node_name: item.source_node_name ?? item.sourceNodeName ?? item.sourceName ?? item.sourceNode?.nodeName ?? item.sourceNode?.name,
    source_node_type: normalizeNodeType(item.source_node_type ?? item.sourceNodeType),
    space_id: item.space_id ?? item.spaceId,
    status: normalizeStatus(item.status),
    target_node_id: toNodeId(item.target_node_id ?? item.targetNodeId),
    target_node_count: toCount(item.target_node_count ?? item.targetNodeCount ?? item.targetCount ?? item.targetCountNum ?? item.targetNode?.count),
    target_node_name: item.target_node_name ?? item.targetNodeName ?? item.targetName ?? item.targetNode?.nodeName ?? item.targetNode?.name,
    target_node_type: normalizeNodeType(item.target_node_type ?? item.targetNodeType),
    update_by: item.update_by ?? item.updateBy,
    update_time: item.update_time ?? item.updateTime
  }))
}

function fromNodeEdgeShape(raw: any): LineageRelation[] {
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : []
  const edges = Array.isArray(raw?.edges) ? raw.edges : []

  const nodeMap = new Map<string, any>()
  nodes.forEach((node: any) => {
    const nodeId = toNodeId(node.nodeId ?? node.id)
    if (`${nodeId}`) nodeMap.set(`${nodeId}`, node)
  })

  const edgeRelations = edges.map((edge: any, index: number) => {
    const sourceId = toNodeId(edge.sourceNodeId ?? edge.source_node_id ?? edge.sourceId)
    const targetId = toNodeId(edge.targetNodeId ?? edge.target_node_id ?? edge.targetId)
    const sourceNode = nodeMap.get(`${sourceId}`)
    const targetNode = nodeMap.get(`${targetId}`)

    return {
      create_by: edge.createBy ?? edge.create_by,
      create_time: edge.createTime ?? edge.create_time,
      lineage_id: edge.relationId ?? edge.lineageId ?? edge.lineage_id ?? edge.id ?? `edge-${index + 1}`,
      relation_type: normalizeRelationType(edge.relationType ?? edge.relation_type),
      remark: edge.remark ?? '',
      source_node_id: sourceId,
      source_node_count: toCount(sourceNode?.count),
      source_node_name: sourceNode?.nodeName ?? sourceNode?.name,
      source_node_type: normalizeNodeType(sourceNode?.nodeType ?? edge.sourceNodeType ?? edge.source_node_type),
      space_id: edge.spaceId ?? edge.space_id ?? raw?.spaceId,
      status: normalizeStatus(edge.status ?? sourceNode?.status ?? targetNode?.status),
      target_node_id: targetId,
      target_node_count: toCount(targetNode?.count),
      target_node_name: targetNode?.nodeName ?? targetNode?.name,
      target_node_type: normalizeNodeType(targetNode?.nodeType ?? edge.targetNodeType ?? edge.target_node_type),
      update_by: edge.updateBy ?? edge.update_by,
      update_time: edge.updateTime ?? edge.update_time
    }
  })

  const tableRelations: LineageRelation[] = []
  nodes.forEach((node: any) => {
    const nodeId = toNodeId(node.nodeId ?? node.id)
    const nodeType = normalizeNodeType(node.nodeType ?? node.type)
    const nodeName = node.nodeName ?? node.name
    const status = normalizeStatus(node.status)
    const tableNames = parsePhysicalTableNames(node.physicalTableName)

    tableNames.forEach((tableName, index) => {
      tableRelations.push({
        lineage_id: `physical-table-${nodeId}-${index}`,
        relation_type: normalizeRelationType('DEPENDENCY'),
        source_node_id: `${nodeId}:table:${index}`,
        source_node_count: 1,
        source_node_name: tableName,
        source_node_type: 'PHYSICAL_TABLE',
        space_id: raw?.spaceId ?? node?.spaceId,
        status,
        target_node_id: nodeId,
        target_node_count: toCount(node?.count),
        target_node_name: nodeName,
        target_node_type: nodeType
      })
    })
  })

  return [...edgeRelations, ...tableRelations]
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
      relation_type: normalizeRelationType('DEPENDENCY'),
      source_node_id: sourceId,
      source_node_count: undefined,
      source_node_name: sourceName,
      source_node_type: normalizeNodeType(sourceType),
      status: '0',
      target_node_id: tableId,
      target_node_count: undefined,
      target_node_name: tableName,
      target_node_type: normalizeNodeType('TABLE_SEMANTIC')
    })
  })

  ;(raw.datasets || []).forEach((dataset: any, index: number) => {
    const datasetId = toNodeId(dataset.viewId ?? `DS_${index}`)
    const datasetName = dataset.viewName || `数据集_${index + 1}`
    const tableId = tableMap.get(dataset.viewId)

    relations.push({
      lineage_id: `legacy-dataset-${index}-${sourceId}`,
      relation_type: normalizeRelationType('DERIVED'),
      source_node_id: tableId || sourceId,
      source_node_count: undefined,
      source_node_name: tableId ? raw.tables?.find((table: any) => table.viewId === dataset.viewId)?.tableName : sourceName,
      source_node_type: normalizeNodeType(tableId ? 'TABLE_SEMANTIC' : sourceType),
      status: '0',
      target_node_id: datasetId,
      target_node_count: undefined,
      target_node_name: datasetName,
      target_node_type: normalizeNodeType('DATASET')
    })
  })

  return relations
}

function fromTreeShape(root: any): LineageRelation[] {
  if (!root || typeof root !== 'object') return []
  const relations: LineageRelation[] = []

  const walk = (parent: any) => {
    const children = Array.isArray(parent?.children) ? parent.children : []
    children.forEach((child: any, index: number) => {
      const parentId = toNodeId(parent?.id ?? parent?.nodeId)
      const childId = toNodeId(child?.id ?? child?.nodeId)
      const parentType = normalizeNodeType(parent?.entityType || parent?.nodeType)
      const childType = normalizeNodeType(child?.entityType || child?.nodeType)

      relations.push({
        lineage_id: child?.relationId ?? child?.lineageId ?? child?.id ?? `${childId}-${parentId}-${index}`,
        relation_type: normalizeRelationType(child?.relationType ?? 'DEPENDENCY'),
        source_node_id: childId,
        source_node_count: undefined,
        source_node_name: child?.name,
        source_node_type: childType,
        status: normalizeStatus(child?.status ?? parent?.status),
        target_node_id: parentId,
        target_node_count: undefined,
        target_node_name: parent?.name,
        target_node_type: parentType
      })

      walk(child)
    })
  }

  walk(root)
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
  if (Array.isArray(parsed?.children) && (parsed?.nodeId !== undefined || parsed?.id !== undefined)) {
    return fromTreeShape(parsed)
  }
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
