/* eslint-disable react/prop-types */
import {
  ApiOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  MessageOutlined,
  RobotOutlined,
  TableOutlined,
  TagsOutlined
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'

import { NODE_TYPE_LABELS } from './constants'
import type { AnalysisMode, LineageRelation, MetadataAnalysisContext } from './types'

interface TreeNode {
  children?: TreeNode[]
  key: string
  name: string
  nodeId: string
  nodeType: string
}

interface Props {
  mode: AnalysisMode
  relations: LineageRelation[]
  rootContext?: MetadataAnalysisContext | null
}

function nodeKey(type: string, id: string | number) {
  return `${type}:${id}`
}

function resolveNodeName(type: string, name?: string) {
  const clean = `${name || ''}`.trim()
  if (clean) return clean
  return NODE_TYPE_LABELS[type] || type
}

function getNodeIcon(nodeType: string) {
  switch (nodeType) {
    case 'DATA_SOURCE':
      return <DatabaseOutlined style={{ color: '#0284c7' }} />
    case 'DATASET':
    case 'TABLE_SEMANTIC':
      return <TableOutlined style={{ color: '#16a34a' }} />
    case 'PHYSICAL_TABLE':
      return <FileTextOutlined style={{ color: '#64748b' }} />
    case 'COPILOT':
    case 'LLM':
      return <RobotOutlined style={{ color: '#7c3aed' }} />
    case 'DICTIONARY':
    case 'LABLE':
      return <TagsOutlined style={{ color: '#ea580c' }} />
    case 'MCP':
      return <ApiOutlined style={{ color: '#0d9488' }} />
    case 'CHAT':
      return <MessageOutlined style={{ color: '#6366f1' }} />
    default:
      return <TableOutlined style={{ color: '#64748b' }} />
  }
}

function buildTreeData(
  relations: LineageRelation[],
  mode: AnalysisMode,
  rootContext?: MetadataAnalysisContext | null
): TreeNode[] {
  if (!relations.length && !rootContext) return []

  const inDegreeMap = new Map<string, number>()
  const inMap = new Map<string, Set<string>>()
  const outMap = new Map<string, Set<string>>()
  const nodeMap = new Map<string, { name: string; nodeId: string; nodeType: string }>()

  const ensureNode = (type: string, id: string | number, name?: string) => {
    const key = nodeKey(type, id)
    if (!nodeMap.has(key)) {
      nodeMap.set(key, {
        name: resolveNodeName(type, name),
        nodeId: `${id}`,
        nodeType: type
      })
    }
    return key
  }

  relations.forEach(item => {
    const sourceKey = ensureNode(item.source_node_type, item.source_node_id, item.source_node_name)
    const targetKey = ensureNode(item.target_node_type, item.target_node_id, item.target_node_name)
    const from = mode === 'impact' ? targetKey : sourceKey
    const to = mode === 'impact' ? sourceKey : targetKey
    if (!outMap.has(from)) outMap.set(from, new Set())
    outMap.get(from)!.add(to)
    if (!inMap.has(to)) inMap.set(to, new Set())
    inMap.get(to)!.add(from)
    inDegreeMap.set(to, (inDegreeMap.get(to) || 0) + 1)
    if (!inDegreeMap.has(from)) inDegreeMap.set(from, inDegreeMap.get(from) || 0)
  })

  const traversalChildrenCache = new Map<string, string[]>()
  const getTraversalChildren = (nodeKeyValue: string) => {
    const cached = traversalChildrenCache.get(nodeKeyValue)
    if (cached) return cached

    const outChildren = Array.from(outMap.get(nodeKeyValue) || [])
    const inChildren = Array.from(inMap.get(nodeKeyValue) || [])
    const children = Array.from(new Set([...outChildren, ...inChildren]))
    traversalChildrenCache.set(nodeKeyValue, children)
    return children
  }

  const resolveRootFromContext = () => {
    if (!rootContext) return undefined

    const hasAnyChildren = Array.from(nodeMap.keys()).some(key => getTraversalChildren(key).length > 0)
    const exactKey = rootContext.nodeId !== undefined
      ? nodeKey(rootContext.nodeType, rootContext.nodeId)
      : undefined

    if (exactKey && nodeMap.has(exactKey)) return exactKey

    const sameTypeKeys = Array.from(nodeMap.keys()).filter(key => key.split(':')[0] === rootContext.nodeType)
    const sameTypeWithChildren = sameTypeKeys.find(key => getTraversalChildren(key).length > 0)
    if (sameTypeWithChildren) return sameTypeWithChildren

    if (!hasAnyChildren) {
      if (sameTypeKeys.length === 1) return sameTypeKeys[0]
      if (exactKey && nodeMap.has(exactKey)) return exactKey
    }

    return undefined
  }

  const resolveRootByStructure = () => {
    const structuralRoots = Array.from(nodeMap.keys()).filter(
      key => (inDegreeMap.get(key) || 0) === 0 && (outMap.get(key)?.size || 0) > 0
    )
    if (structuralRoots.length) return structuralRoots[0]

    const withChildren = Array.from(nodeMap.keys()).find(key => getTraversalChildren(key).length > 0)
    if (withChildren) return withChildren

    return nodeMap.keys().next().value
  }

  const rootKey = resolveRootFromContext() || resolveRootByStructure()

  if (!rootKey) return []

  if (rootContext?.nodeName) {
    const rootNode = nodeMap.get(rootKey)
    if (rootNode && rootNode.nodeType === rootContext.nodeType) {
      rootNode.name = rootContext.nodeName
    }
  }

  const walk = (key: string, visited: Set<string>): TreeNode => {
    const current = nodeMap.get(key)!
    const childrenKeys = getTraversalChildren(key)
    const children: TreeNode[] = []

    childrenKeys.forEach(childKey => {
      if (!visited.has(childKey)) {
        const nextVisited = new Set(visited)
        nextVisited.add(childKey)
        children.push(walk(childKey, nextVisited))
      }
    })

    return {
      children: children.length ? children : undefined,
      key,
      name: current.name,
      nodeId: current.nodeId,
      nodeType: current.nodeType
    }
  }

  return [walk(rootKey, new Set([rootKey]))]
}

function buildFlatData(relations: LineageRelation[]) {
  const nodeMap = new Map<string, TreeNode>()

  relations.forEach(item => {
    const sourceKey = nodeKey(item.source_node_type, item.source_node_id)
    if (!nodeMap.has(sourceKey)) {
      nodeMap.set(sourceKey, {
        key: sourceKey,
        name: resolveNodeName(item.source_node_type, item.source_node_name),
        nodeId: `${item.source_node_id}`,
        nodeType: item.source_node_type
      })
    }

    const targetKey = nodeKey(item.target_node_type, item.target_node_id)
    if (!nodeMap.has(targetKey)) {
      nodeMap.set(targetKey, {
        key: targetKey,
        name: resolveNodeName(item.target_node_type, item.target_node_name),
        nodeId: `${item.target_node_id}`,
        nodeType: item.target_node_type
      })
    }
  })

  return Array.from(nodeMap.values())
}

const LineageTree: React.FC<Props> = ({ mode, relations, rootContext }) => {
  const treeData = useMemo(() => buildTreeData(relations, mode, rootContext), [mode, relations, rootContext])
  const flatData = useMemo(() => buildFlatData(relations), [relations])
  const displayData = treeData.length ? treeData : flatData

  const columns: TableColumnsType<TreeNode> = [
    {
      dataIndex: 'name',
      key: 'name',
      title: '名称',
      width: '70%',
      render: (_: string, row: TreeNode) => (
        <ASpace size={8}>
          {getNodeIcon(row.nodeType)}
          <ATooltip title={row.name}>
            <span className="inline-block max-w-420px overflow-hidden text-ellipsis whitespace-nowrap">
              {row.name}
            </span>
          </ATooltip>
        </ASpace>
      )
    },
    {
      dataIndex: 'nodeType',
      key: 'nodeType',
      title: '类型',
      width: '30%',
      render: (value: string) => NODE_TYPE_LABELS[value] || value
    }
  ]

  if (!displayData.length) {
    return (
      <ACard title="树形图">
        <AEmpty description="暂无关系数据" />
      </ACard>
    )
  }

  return (
    <ACard title="树形图">
      <ATable<TreeNode>
        columns={columns}
        dataSource={displayData}
        expandable={{ defaultExpandAllRows: true }}
        pagination={false}
        rowKey="key"
        size="middle"
      />
    </ACard>
  )
}

export default LineageTree
