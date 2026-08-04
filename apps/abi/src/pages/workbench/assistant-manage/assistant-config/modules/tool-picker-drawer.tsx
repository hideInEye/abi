import { SearchOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Checkbox, Empty, Input, Spin, Tabs, Tooltip } from 'antd'
import { useEffect, useRef, useState } from 'react'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { queryMcpList } from '@/service/api/pulg'
import { queryToolListApi } from '@/service/api/tool'
import type { ToolItem } from '@/service/api/tool'
import { tableSemanticsGroupList } from '@/service/api/table-semantics'
import React from 'react'

/**
 * 扩展能力 - 工具选择抽屉
 * 按需加载：打开抽屉后才请求，MCP 按分组懒加载并缓存，内置工具首次进入 tab 时加载
 */

export type ToolGroupKey = 'mcp' | 'builtin'
export type ToolOption = { id: string; name: string; group: ToolGroupKey; description?: string }

interface McpGroup {
  groupId: string
  groupName: string
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
      const groups = list.map((g) => ({ groupId: String(g.groupId), groupName: g.groupName || '-' }))
      setMcpGroups(groups)
      mcpGroupsLoadedRef.current = true
      if (groups.length > 0) {
        setActiveGroupId(groups[0].groupId)
        loadMcpTools(groups[0].groupId)
      }
    } catch {
      setMcpGroups([])
    } finally {
      setLoadingGroups(false)
    }
  }

  /** 按分组加载 MCP 工具列表，命中缓存则跳过请求 */
  async function loadMcpTools(groupId: string) {
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
      const tools: ToolOption[] = items.map((m: any) => ({
        id: `mcp_${m.id}`,
        name: m.name || m.pluginName || '-',
        group: 'mcp' as ToolGroupKey,
        description: m.description || '',
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
                mcpGroups.map((g) => (
                  <GroupNavItem key={g.groupId} active={g.groupId === activeGroupId} name={g.groupName} onClick={() => handleGroupClick(g.groupId)} />
                ))
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
