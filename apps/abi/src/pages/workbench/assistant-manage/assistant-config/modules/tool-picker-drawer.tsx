import { FolderOpenOutlined, FolderOutlined, RightOutlined, SearchOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Checkbox, Empty, Input, Spin, Tabs, Tooltip } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { queryMcpList } from '@/service/api/pulg'
import { queryToolListApi } from '@/service/api/tool'
import type { ToolItem } from '@/service/api/tool'
import { tableSemanticsGroupList } from '@/service/api/table-semantics'
import { buildGroupPath, buildGroupTree } from '@/pages/workbench/data-preparation/data-table-meaning/utils/helper'
import React from 'react'

/**
 * 扩展能力 - 工具选择抽屉
 * 按需加载：打开抽屉后才请求，MCP 按分组懒加载并缓存，内置工具首次进入 tab 时加载
 */

export type ToolGroupKey = 'mcp' | 'builtin'
// groupPath：所属分组的层级路径（形如「父组 / 子组」），用于已选项处标注归属分组
export type ToolOption = { id: string; name: string; group: ToolGroupKey; description?: string; groupPath?: string }

interface McpGroup {
  groupId: string
  groupName: string
  parentId?: string
}

interface Props {
  open: boolean
  spaceId?: number | string
  selectedToolIds: Set<string>
  onToggle: (id: string, checked: boolean) => void
  onBatchToggle: (ids: string[], checked: boolean) => void
  /** 列表加载完成后回传工具元数据（可选） */
  onToolsLoaded?: (tools: ToolOption[]) => void
  onClose: () => void
}

const ToolPickerDrawer: React.FC<Props> = ({ open, spaceId, selectedToolIds, onToggle, onBatchToggle, onToolsLoaded, onClose }) => {
  const [activeTab, setActiveTab] = useState<ToolGroupKey>('mcp')
  const [keyword, setKeyword] = useState('')

  // ── MCP：分组 + 按分组缓存的工具列表 ──
  const [mcpGroups, setMcpGroups] = useState<McpGroup[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string>('')
  const [mcpToolsByGroup, setMcpToolsByGroup] = useState<Record<string, ToolOption[]>>({})
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [loadingMcpTools, setLoadingMcpTools] = useState(false)
  const mcpGroupsLoadedRef = useRef(false)
  const mcpToolsCacheRef = useRef<Record<string, ToolOption[]>>({})

  // ── 内置工具 ──
  const [builtinTools, setBuiltinTools] = useState<ToolOption[]>([])
  const [loadingBuiltin, setLoadingBuiltin] = useState(false)
  const builtinLoadedRef = useRef(false)

  // 空间切换后清空缓存，避免展示上个空间的数据
  useEffect(() => {
    mcpGroupsLoadedRef.current = false
    mcpToolsCacheRef.current = {}
    builtinLoadedRef.current = false
    setMcpGroups([])
    setMcpToolsByGroup({})
    setBuiltinTools([])
    setActiveGroupId('')
  }, [spaceId])

  /** 加载 MCP 分组列表（groupType=mcp），仅首次 */
  async function loadMcpGroups() {
    if (mcpGroupsLoadedRef.current || !spaceId) return
    setLoadingGroups(true)
    try {
      const res: any = await tableSemanticsGroupList({
        groupType: 'mcp',
        pageNum: 1,
        pageSize: 60,
        spaceId: Number(spaceId),
      })
      const list: any[] = Array.isArray(res?.data) ? res.data : []
      const groups = list.map((g) => ({ groupId: String(g.groupId), groupName: g.groupName || '-', parentId: String(g.parentId ?? '0') }))
      setMcpGroups(groups)
      mcpGroupsLoadedRef.current = true
      // 默认选中树结构的第一个顶级分组（与「正常分组」一致，不直接取平铺数组首项）
      const firstRoot = buildGroupTree(groups, '0', true)[0]
      if (firstRoot) {
        setActiveGroupId(String(firstRoot.groupId))
        loadMcpTools(String(firstRoot.groupId), groups)
      }
    } catch {
      setMcpGroups([])
    } finally {
      setLoadingGroups(false)
    }
  }

  /** 按分组加载 MCP 工具列表，命中缓存则跳过请求；groupsForPath 用于在异步中拿到最新分组以计算层级路径 */
  async function loadMcpTools(groupId: string, groupsForPath?: McpGroup[]) {
    if (!groupId) return
    if (mcpToolsCacheRef.current[groupId]) return
    setLoadingMcpTools(true)
    try {
      const res: any = await queryMcpList({
        pageNo: 1,
        pageSize: 200,
        search: 'blur',
        namespaceId: `s_${groupId}`,
      })
      const payload = res?.response?.data?.data?.data ?? {}
      const items: any[] = payload.pageItems ?? []
      // 当前分组的层级路径，随每个工具下发，供已选项标注归属分组
      const groupPath = buildGroupPath(groupsForPath ?? mcpGroups, groupId)
      const tools: ToolOption[] = items.map((m: any) => ({
        id: `mcp_${m.id}`,
        name: m.name || m.pluginName || '-',
        group: 'mcp' as ToolGroupKey,
        description: m.description || '',
        groupPath,
      }))
      mcpToolsCacheRef.current[groupId] = tools
      setMcpToolsByGroup((prev) => ({ ...prev, [groupId]: tools }))
      onToolsLoaded?.(tools)
    } catch {
      mcpToolsCacheRef.current[groupId] = []
      setMcpToolsByGroup((prev) => ({ ...prev, [groupId]: [] }))
    } finally {
      setLoadingMcpTools(false)
    }
  }

  /** 加载内置工具列表，仅首次 */
  async function loadBuiltinTools() {
    if (builtinLoadedRef.current) return
    setLoadingBuiltin(true)
    try {
      const res: any = await queryToolListApi({})
      const rows = res?.response?.data?.data || res?.data?.data || res?.data || []
      const list: ToolItem[] = Array.isArray(rows) ? rows : []
      const tools: ToolOption[] = list.map((t) => ({
        id: `builtin_${t.toolId}`,
        name: t.toolName || '-',
        group: 'builtin' as ToolGroupKey,
        description: t.description || '',
      }))
      builtinLoadedRef.current = true
      setBuiltinTools(tools)
      onToolsLoaded?.(tools)
    } catch {
      setBuiltinTools([])
    } finally {
      setLoadingBuiltin(false)
    }
  }

  // 打开抽屉 / 切换 tab 时按需加载
  useEffect(() => {
    if (!open) return
    if (activeTab === 'mcp') {
      loadMcpGroups()
    } else {
      loadBuiltinTools()
    }
  }, [open, activeTab, spaceId])

  const handleGroupClick = (groupId: string) => {
    setActiveGroupId(groupId)
    loadMcpTools(groupId)
  }

  const kw = keyword.trim().toLowerCase()
  const currentTools = activeTab === 'mcp' ? (mcpToolsByGroup[activeGroupId] ?? []) : builtinTools
  const filteredTools = kw ? currentTools.filter((t) => t.name.toLowerCase().includes(kw)) : currentTools
  const loadingList = activeTab === 'mcp' ? loadingMcpTools : loadingBuiltin

  const allChecked = filteredTools.length > 0 && filteredTools.every((t) => selectedToolIds.has(t.id))
  const checkedCount = filteredTools.filter((t) => selectedToolIds.has(t.id)).length
  const indeterminate = checkedCount > 0 && checkedCount < filteredTools.length

  return (
    <CommonDrawer
      destroyOnClose={false}
      icon={<ThunderboltOutlined />}
      open={open}
      placement="right"
      title="添加扩展能力"
      width={620}
      onClose={onClose}
    >
      <Tabs
        activeKey={activeTab}
        items={[
          { key: 'mcp', label: 'MCP工具' },
          { key: 'builtin', label: '内置工具' },
        ]}
        size="small"
        onChange={(key) => {
          setActiveTab(key as ToolGroupKey)
          setKeyword('')
        }}
      />
      <div style={{ display: 'flex', gap: 12, height: 'calc(100% - 62px)' }}>
        {/* 左：MCP 分组目录 */}
        {activeTab === 'mcp' && (
          <div
            style={{
              borderRight: '1px solid rgba(130, 140, 200, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              overflow: 'auto',
              paddingRight: 8,
              width: 150,
            }}
          >
            <div style={{ color: '#8fa0b5', fontSize: 12, fontWeight: 600, padding: '4px 8px 8px' }}>分组目录</div>
            <Spin spinning={loadingGroups}>
              {mcpGroups.length === 0 && !loadingGroups ? (
                <div style={{ color: '#bfbfbf', fontSize: 12, padding: '8px' }}>暂无MCP分组</div>
              ) : (
                <GroupTreeNav activeGroupId={activeGroupId} groups={mcpGroups} onSelect={handleGroupClick} />
              )}
            </Spin>
          </div>
        )}

        {/* 右：工具列表 */}
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0 }}>
          <Input
            allowClear
            placeholder="搜索工具名称"
            prefix={<SearchOutlined style={{ color: '#8fa0b5' }} />}
            size="small"
            style={{ borderRadius: 8, marginBottom: 8 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              gap: 8,
              padding: '4px 8px',
              userSelect: 'none',
            }}
          >
            <Checkbox
              checked={allChecked}
              disabled={filteredTools.length === 0}
              indeterminate={indeterminate}
              onChange={(e) =>
                onBatchToggle(
                  filteredTools.map((t) => t.id),
                  e.target.checked,
                )
              }
            />
            <span style={{ color: '#595959', fontSize: 12, fontWeight: 600 }}>全选</span>
            <span style={{ color: '#bfbfbf', fontSize: 11 }}>({filteredTools.length})</span>
            <span style={{ color: '#8fa0b5', fontSize: 11, marginLeft: 'auto' }}>已选 {checkedCount} 项</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Spin spinning={loadingList}>
              {filteredTools.length === 0 && !loadingList ? (
                <Empty description={kw ? '无匹配工具' : activeTab === 'mcp' ? '该分组下暂无MCP工具' : '暂无内置工具'} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 48 }} />
              ) : (
                filteredTools.map((item) => (
                  <PickerToolRow
                    key={item.id}
                    description={item.description}
                    name={item.name}
                    selected={selectedToolIds.has(item.id)}
                    onToggle={() => onToggle(item.id, !selectedToolIds.has(item.id))}
                  />
                ))
              )}
            </Spin>
          </div>
        </div>
      </div>
    </CommonDrawer>
  )
}

// 左侧分组导航项（能力选择抽屉复用）
export const GroupNavItem: React.FC<{ name: string; active: boolean; onClick: () => void }> = ({ active, name, onClick }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? 'linear-gradient(135deg, rgba(91, 124, 247, 0.1) 0%, rgba(112, 145, 250, 0.08) 100%)' : hovered ? 'rgba(91, 124, 247, 0.04)' : 'transparent',
        borderRadius: 8,
        color: active ? '#5b7cf7' : '#3e5068',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        marginBottom: 2,
        overflow: 'hidden',
        padding: '7px 10px',
        textOverflow: 'ellipsis',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
      onClick={onClick}
    >
      {name}
    </div>
  )
}

// 分组目录节点数据（平铺，含 parentId 用于构建层级）
export interface GroupNavData {
  groupId: string
  groupName: string
  parentId?: string
}

// 分组目录单行：与「正常分组」树一致的文件夹图标 + 层级缩进 + 右侧折叠箭头
const GroupTreeNavRow: React.FC<{
  name: string
  depth: number
  active: boolean
  hasChildren: boolean
  expanded: boolean
  onSelect: () => void
  onToggle: () => void
}> = ({ name, depth, active, hasChildren, expanded, onSelect, onToggle }) => {
  const [hovered, setHovered] = useState(false)
  // 图标统一为文件夹语义：含子级且展开为打开文件夹，其余为关闭文件夹（右侧列表才是「文件」）
  const FolderIcon = hasChildren && expanded ? FolderOpenOutlined : FolderOutlined
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        alignItems: 'center',
        background: active
          ? 'linear-gradient(135deg, rgba(91, 124, 247, 0.1) 0%, rgba(112, 145, 250, 0.08) 100%)'
          : hovered
            ? 'rgba(91, 124, 247, 0.04)'
            : 'transparent',
        borderRadius: 8,
        color: active ? '#5b7cf7' : '#3e5068',
        cursor: 'pointer',
        display: 'flex',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        gap: 6,
        marginBottom: 2,
        overflow: 'hidden',
        padding: '7px 8px',
        paddingLeft: 8 + depth * 14,
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
      onClick={() => {
        onSelect()
        // 文件夹节点：点击行同时切换展开/折叠（对齐正常分组树行为）
        if (hasChildren) onToggle()
      }}
    >
      <FolderIcon style={{ color: '#358cf3', flexShrink: 0, fontSize: 15 }} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
      {hasChildren ? (
        <span
          style={{
            alignItems: 'center',
            display: 'flex',
            flexShrink: 0,
            fontSize: 10,
            opacity: 0.5,
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
          onClick={(e) => {
            // 单独点击箭头只切换展开，不改变选中项
            e.stopPropagation()
            onToggle()
          }}
        >
          <RightOutlined />
        </span>
      ) : null}
    </div>
  )
}

// 左侧分组目录：按 parentId 构建层级（与「正常分组」一致），单选导航，点击加载该组列表
export const GroupTreeNav: React.FC<{ groups: GroupNavData[]; activeGroupId: string; onSelect: (groupId: string) => void }> = ({ groups, activeGroupId, onSelect }) => {
  const tree = useMemo(() => buildGroupTree(groups, '0', true), [groups])
  // 默认展开所有含子级的分组，层级一目了然；groups 变化（切分组类型/空间）时重新展开
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    const folderIds = new Set<string>()
    groups.forEach((g) => {
      if (groups.some((c) => String(c.parentId) === String(g.groupId))) folderIds.add(String(g.groupId))
    })
    setExpandedIds(folderIds)
  }, [groups])

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const renderNodes = (nodes: any[], depth: number): React.ReactNode =>
    nodes.map((node) => {
      const id = String(node.groupId)
      const hasChildren = Array.isArray(node.children) && node.children.length > 0
      const expanded = expandedIds.has(id)
      return (
        <React.Fragment key={id}>
          <GroupTreeNavRow
            active={id === activeGroupId}
            depth={depth}
            expanded={expanded}
            hasChildren={hasChildren}
            name={node.groupName}
            onSelect={() => onSelect(id)}
            onToggle={() => toggleExpand(id)}
          />
          {hasChildren && expanded ? renderNodes(node.children, depth + 1) : null}
        </React.Fragment>
      )
    })

  return <>{renderNodes(tree, 0)}</>
}

// 单个工具项行（能力选择抽屉复用）
export const PickerToolRow: React.FC<{ name: string; description?: string; selected: boolean; onToggle: () => void }> = ({ name, description, selected, onToggle }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        alignItems: 'center',
        background: selected ? 'rgba(91, 124, 247, 0.06)' : hovered ? 'rgba(91, 124, 247, 0.04)' : 'transparent',
        borderRadius: 6,
        cursor: 'pointer',
        display: 'flex',
        gap: 10,
        padding: '7px 8px',
        transition: 'all 0.2s ease',
        userSelect: 'none',
      }}
      onClick={onToggle}
    >
      <Checkbox checked={selected} onChange={() => onToggle()} onClick={(e) => e.stopPropagation()} />
      <div
        style={{
          alignItems: 'center',
          background: '#fff7e6',
          borderRadius: 6,
          color: '#fa8c16',
          display: 'flex',
          flexShrink: 0,
          height: 24,
          justifyContent: 'center',
          width: 24,
        }}
      >
        <ThunderboltOutlined style={{ fontSize: 14 }} />
      </div>
      <Tooltip title={name}>
        <span
          style={{
            color: selected ? '#5b7cf7' : '#1a2744',
            flexShrink: 0,
            fontSize: 13,
            fontWeight: selected ? 500 : 400,
            maxWidth: '45%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      </Tooltip>
      {/* 描述：占右侧剩余宽度，单行超出省略号 */}
      {description ? (
        <Tooltip title={description}>
          <span
            style={{
              color: '#8fa0b5',
              flex: 1,
              fontSize: 12,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {description}
          </span>
        </Tooltip>
      ) : null}
    </div>
  )
}

export default ToolPickerDrawer
