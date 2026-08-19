import { DownOutlined, FolderOpenOutlined, FolderOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Popover, Tree } from 'antd'
import type { TreeDataNode } from 'antd'
import { useCallback, useMemo, useState } from 'react'

interface DataDirectoryDropdownProps {
  /** 平铺分组数组（groupType=assistant），用于构建目录树与统计各分组助手数 */
  groups: any[]
  /** 当前完整助手列表（分组过滤前），用于统计各分组下助手数量 */
  assistants: ReadonlyArray<{ groupId?: string }>
  /** 已选分组 id，'' 表示全部 */
  value: string
  /** 选择分组回调（'' 表示全部） */
  onChange: (groupId: string) => void
}

/** 将平铺分组按 parentId 递归构建成多级树（parentId==='0' 为根；脏数据提升到根级） */
function buildTree(list: any[], parentId = '0'): any[] {
  if (!Array.isArray(list)) return []
  const isRoot = String(parentId) === '0'
  const existing = isRoot ? new Set(list.map((i) => String(i.groupId))) : null
  return list
    .filter(
      (i) =>
        String(i.parentId ?? '0') === String(parentId) ||
        (existing !== null && !existing.has(String(i.parentId ?? '0'))),
    )
    .map((i) => {
      const children = buildTree(list, String(i.groupId))
      return children.length > 0 ? { ...i, children } : { ...i }
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

/**
 * 数据目录下拉：把助手分组目录放到筛选栏，支持按分组筛选助手
 * 默认选中「全部」（展示全部助手）；每个分组显示其下助手数量（仅自身，不含子分组）
 * 面板样式对齐 ABI Group 组件（玻璃态 + 搜索 + 文件夹展开/折叠 + 选中高亮）
 */
export default function DataDirectoryDropdown({ groups, assistants, value, onChange }: DataDirectoryDropdownProps) {
  const [open, setOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])

  // 各分组 id -> 助手数量（仅当前分组自身，不含子分组）
  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const g of groups) {
      const gid = String(g.groupId)
      map[gid] = assistants.filter((a) => a.groupId != null && String(a.groupId) === gid).length
    }
    return map
  }, [groups, assistants])

  // 搜索过滤后的平铺分组
  const filteredGroups = useMemo(() => {
    const keyword = searchText.trim()
    if (!keyword) return groups
    return groups.filter((g: any) => (g.groupName || '').includes(keyword))
  }, [groups, searchText])

  // 递归构建树节点（对齐 Group 组件：蓝色文件夹 + 右侧折叠箭头 + 选中高亮）
  const buildTreeNodes = useCallback(
    (items: any[], currentExpandedKeys: React.Key[]): TreeDataNode[] => {
      return items.map((item) => {
        const hasChildren = item.children && item.children.length > 0
        const nodeKey = String(item.groupId)
        const isExpanded = currentExpandedKeys.includes(nodeKey)
        const count = counts[nodeKey] ?? 0

        const nodeIcon =
          hasChildren && isExpanded ? (
            <FolderOpenOutlined className="ws-datadir-node-icon" />
          ) : (
            <FolderOutlined className="ws-datadir-node-icon" />
          )

        const chevron = hasChildren ? (
          <span className={`ws-datadir-node-chevron ${isExpanded ? 'ws-datadir-node-chevron-open' : ''}`}>
            <RightOutlined />
          </span>
        ) : null

        return {
          title: (
            <span className={`ws-datadir-node-label ${hasChildren ? 'ws-datadir-node-folder' : 'ws-datadir-node-leaf'}`}>
              {nodeIcon}
              <span className="ws-datadir-node-name" title={item.groupName || '-'}>
                {item.groupName || '-'}
              </span>
              {count > 0 && <span className="ws-datadir-node-count">{count}</span>}
              {chevron}
            </span>
          ),
          key: nodeKey,
          children: hasChildren ? buildTreeNodes(item.children, currentExpandedKeys) : undefined,
          isLeaf: !hasChildren,
        }
      })
    },
    [counts],
  )

  const treeData = useMemo(
    () => buildTreeNodes(buildTree(filteredGroups), expandedKeys),
    [filteredGroups, expandedKeys, buildTreeNodes],
  )

  const handleTreeSelect = useCallback(
    (_keys: React.Key[], info: { node: any }) => {
      const nodeKey = String(info.node.key)
      onChange(nodeKey)
      // 文件夹节点：点击同时切换展开/折叠
      if (!info.node.isLeaf) {
        setExpandedKeys((prev) =>
          prev.includes(nodeKey) ? prev.filter((k) => k !== nodeKey) : [...prev, nodeKey],
        )
      }
    },
    [onChange],
  )

  const panel = (
    <div className="ws-datadir-panel">
      <div className="ws-datadir-header">
        <span className="ws-datadir-title">数据目录</span>
      </div>
      <div className="ws-datadir-search">
        <SearchOutlined className="ws-datadir-search-icon" />
        <input
          className="ws-datadir-search-input"
          type="text"
          placeholder="搜索分组"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>
      <div className="ws-datadir-body">
        <div
          className={`ws-datadir-all ${value === '' ? 'ws-datadir-all-active' : ''}`}
          onClick={() => {
            onChange('')
          }}
        >
          <FolderOutlined className="ws-datadir-node-icon" />
          <span className="ws-datadir-node-name">全部</span>
          <span className="ws-datadir-node-count">{assistants.length}</span>
        </div>
        {treeData.length > 0 ? (
          <Tree
            blockNode
            className="ws-datadir-tree"
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            selectedKeys={value ? [value] : []}
            onSelect={handleTreeSelect}
            motion={false}
          />
        ) : (
          <div className="ws-datadir-empty">{searchText ? '无匹配分组' : '暂无助手分组'}</div>
        )}
      </div>
    </div>
  )

  return (
    <Popover content={panel} open={open} placement="bottomLeft" trigger="click" onOpenChange={setOpen}>
      <Button className="ws-filter-btn" icon={<FolderOutlined />}>
        数据目录
        <DownOutlined className={`ws-filter-arrow ${open ? 'ws-filter-arrow-open' : ''}`} />
      </Button>
    </Popover>
  )
}
