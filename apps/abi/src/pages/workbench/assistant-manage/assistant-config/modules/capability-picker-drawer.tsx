import { SearchOutlined } from '@ant-design/icons'
import { Checkbox, Empty, Input, Spin, Tabs } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { tableSemanticsGroupList } from '@/service/api/table-semantics'
import type { TableSemanticsGroupType } from '@/service/api/table-semantics'
import { buildGroupPath, buildGroupTree } from '@/pages/workbench/data-preparation/data-table-meaning/utils/helper'
import React from 'react'

import { GroupTreeNav, PickerToolRow } from './tool-picker-drawer'

/**
 * 通用能力选择抽屉（数据语义 / 技能）
 * 按需加载：打开抽屉后才请求；有分组的 tab 先拉分组再按分组懒加载列表；全部结果按 tab+分组 缓存
 */

// groupPath：所属分组的层级路径（形如「父组 / 子组」），用于已选项处标注归属分组
export type PickerOption = { id: string; name: string; description?: string; groupPath?: string }

export interface PickerTabConfig {
  key: string
  label: string
  /** 配置后展示左侧分组目录（tableSemanticsGroupList 按该类型拉取），fetchList 会带上 groupId */
  groupType?: TableSemanticsGroupType
  /** 拉取列表并归一化为 PickerOption（id 需带业务前缀避免跨类冲突） */
  fetchList: (ctx: { spaceId: number; groupId?: string }) => Promise<PickerOption[]>
}

interface PickerGroup {
  groupId: string
  groupName: string
  parentId?: string
}

interface Props {
  open: boolean
  title: string
  icon?: React.ReactNode
  tabs: PickerTabConfig[]
  spaceId?: number | string
  selectedIds: Set<string>
  onToggle: (id: string, checked: boolean) => void
  onBatchToggle: (ids: string[], checked: boolean) => void
  /** 列表加载完成后回传选项元数据（可选，用于父组件展示已选项名称） */
  onOptionsLoaded?: (options: PickerOption[]) => void
  onClose: () => void
}

const CapabilityPickerDrawer: React.FC<Props> = ({ open, title, icon, tabs, spaceId, selectedIds, onToggle, onBatchToggle, onOptionsLoaded, onClose }) => {
  const [activeTabKey, setActiveTabKey] = useState<string>(tabs[0]?.key ?? '')
  const [keyword, setKeyword] = useState('')

  // ── 分组：按 tab 缓存 ──
  const [groupsByTab, setGroupsByTab] = useState<Record<string, PickerGroup[]>>({})
  const [activeGroupByTab, setActiveGroupByTab] = useState<Record<string, string>>({})
  const [loadingGroups, setLoadingGroups] = useState(false)
  const groupsLoadedRef = useRef<Record<string, boolean>>({})

  // ── 列表：按 tab+分组 缓存 ──
  const [listByKey, setListByKey] = useState<Record<string, PickerOption[]>>({})
  const [loadingList, setLoadingList] = useState(false)
  const listCacheRef = useRef<Record<string, PickerOption[]>>({})

  const cacheKey = (tabKey: string, groupId?: string) => `${tabKey}|${groupId ?? ''}`

  // 空间切换后清空缓存，避免展示上个空间的数据
  useEffect(() => {
    groupsLoadedRef.current = {}
    listCacheRef.current = {}
    setGroupsByTab({})
    setActiveGroupByTab({})
    setListByKey({})
  }, [spaceId])

  /** 加载某个 tab 的分组列表，仅首次 */
  async function loadGroups(tab: PickerTabConfig) {
    if (!tab.groupType || groupsLoadedRef.current[tab.key] || !spaceId) return
    setLoadingGroups(true)
    try {
      const res: any = await tableSemanticsGroupList({
        groupType: tab.groupType,
        pageNum: 1,
        pageSize: 60,
        spaceId: Number(spaceId),
      })
      const list: any[] = Array.isArray(res?.data) ? res.data : []
      const groups = list.map((g) => ({ groupId: String(g.groupId), groupName: g.groupName || '-', parentId: String(g.parentId ?? '0') }))
      setGroupsByTab((prev) => ({ ...prev, [tab.key]: groups }))
      groupsLoadedRef.current[tab.key] = true
      // 默认选中树结构的第一个顶级分组（与「正常分组」一致，不直接取平铺数组首项）
      const firstRoot = buildGroupTree(groups, '0', true)[0]
      if (firstRoot) {
        setActiveGroupByTab((prev) => ({ ...prev, [tab.key]: String(firstRoot.groupId) }))
        loadList(tab, String(firstRoot.groupId), groups)
      }
    } catch {
      setGroupsByTab((prev) => ({ ...prev, [tab.key]: [] }))
    } finally {
      setLoadingGroups(false)
    }
  }

  /** 加载列表，命中缓存则跳过请求；groupsForPath 用于在异步中拿到最新分组以计算层级路径 */
  async function loadList(tab: PickerTabConfig, groupId?: string, groupsForPath?: PickerGroup[]) {
    if (!spaceId) return
    if (tab.groupType && !groupId) return
    const key = cacheKey(tab.key, groupId)
    if (listCacheRef.current[key]) return
    setLoadingList(true)
    try {
      const raw = await tab.fetchList({ groupId, spaceId: Number(spaceId) })
      // 有分组的 tab 给每个选项打上层级路径，供已选项标注归属分组
      const groupPath = tab.groupType && groupId ? buildGroupPath(groupsForPath ?? groupsByTab[tab.key] ?? [], groupId) : ''
      const options = groupPath ? raw.map((o) => ({ ...o, groupPath })) : raw
      listCacheRef.current[key] = options
      setListByKey((prev) => ({ ...prev, [key]: options }))
      onOptionsLoaded?.(options)
    } catch {
      listCacheRef.current[key] = []
      setListByKey((prev) => ({ ...prev, [key]: [] }))
    } finally {
      setLoadingList(false)
    }
  }

  // 打开抽屉 / 切换 tab 时按需加载
  useEffect(() => {
    if (!open) return
    const tab = tabs.find((t) => t.key === activeTabKey)
    if (!tab) return
    if (tab.groupType) {
      if (groupsLoadedRef.current[tab.key]) {
        loadList(tab, activeGroupByTab[tab.key])
      } else {
        loadGroups(tab)
      }
    } else {
      loadList(tab)
    }
  }, [open, activeTabKey, spaceId])

  const activeTab = tabs.find((t) => t.key === activeTabKey)
  const hasGroups = !!activeTab?.groupType
  const activeGroupId = activeGroupByTab[activeTabKey] ?? ''
  // useMemo 稳定引用，避免每次渲染生成新数组导致 GroupTreeNav 展开态 effect 抖动
  const groups = useMemo(() => groupsByTab[activeTabKey] ?? [], [groupsByTab, activeTabKey])

  const handleGroupClick = (groupId: string) => {
    setActiveGroupByTab((prev) => ({ ...prev, [activeTabKey]: groupId }))
    if (activeTab) loadList(activeTab, groupId)
  }

  const kw = keyword.trim().toLowerCase()
  const currentList = listByKey[cacheKey(activeTabKey, hasGroups ? activeGroupId : undefined)] ?? []
  const filteredList = kw ? currentList.filter((t) => t.name.toLowerCase().includes(kw)) : currentList

  const allChecked = filteredList.length > 0 && filteredList.every((t) => selectedIds.has(t.id))
  const checkedCount = filteredList.filter((t) => selectedIds.has(t.id)).length
  const indeterminate = checkedCount > 0 && checkedCount < filteredList.length

  const showTabs = tabs.length > 1

  return (
    <CommonDrawer
      destroyOnClose={false}
      icon={icon}
      open={open}
      placement="right"
      title={title}
      width={620}
      onClose={onClose}
    >
      {showTabs && (
        <Tabs
          activeKey={activeTabKey}
          className="capability-picker-tabs"
          items={tabs.map((t) => ({ key: t.key, label: t.label }))}
          onChange={(key) => {
            setActiveTabKey(key)
            setKeyword('')
          }}
        />
      )}
      <div style={{ display: 'flex', gap: 12, height: showTabs ? 'calc(100% - 62px)' : '100%' }}>
        {/* 左：分组目录 */}
        {hasGroups && (
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
              {groups.length === 0 && !loadingGroups ? (
                <div style={{ color: '#bfbfbf', fontSize: 12, padding: '8px' }}>暂无分组</div>
              ) : (
                <GroupTreeNav activeGroupId={activeGroupId} groups={groups} onSelect={handleGroupClick} />
              )}
            </Spin>
          </div>
        )}

        {/* 右：列表 */}
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0 }}>
          <Input
            allowClear
            placeholder="搜索名称"
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
              disabled={filteredList.length === 0}
              indeterminate={indeterminate}
              onChange={(e) =>
                onBatchToggle(
                  filteredList.map((t) => t.id),
                  e.target.checked,
                )
              }
            />
            <span style={{ color: '#595959', fontSize: 12, fontWeight: 600 }}>全选</span>
            <span style={{ color: '#bfbfbf', fontSize: 11 }}>({filteredList.length})</span>
            <span style={{ color: '#8fa0b5', fontSize: 11, marginLeft: 'auto' }}>已选 {checkedCount} 项</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Spin spinning={loadingList}>
              {filteredList.length === 0 && !loadingList ? (
                <Empty description={kw ? '无匹配结果' : '暂无数据'} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 48 }} />
              ) : (
                filteredList.map((item) => (
                  <PickerToolRow
                    key={item.id}
                    description={item.description}
                    name={item.name}
                    selected={selectedIds.has(item.id)}
                    onToggle={() => onToggle(item.id, !selectedIds.has(item.id))}
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

export default CapabilityPickerDrawer
