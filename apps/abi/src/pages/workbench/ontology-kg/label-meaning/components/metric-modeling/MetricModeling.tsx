import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeleteOutlined, DownOutlined } from '@ant-design/icons'
import { Dropdown, Popconfirm, Splitter } from 'antd'
import type { MenuProps } from 'antd'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'
import type { GroupHandle } from '@/components/stateful/group/Group.tsx'
import { Group } from '@/components/stateful/group/Group.tsx'
import { GroupContentGate } from '@/components/stateful/group/GroupContentGate.tsx'
import { useOntologyViewControls } from '@/pages/workbench/ontology-kg/hooks/useOntologyViewControls'
import { filterByCreateTime } from '@/utils/date'

import { KnowledgeAtomicMappingDrawer } from './components/KnowledgeAtomicMappingDrawer'
import { KnowledgeOperateDrawer } from './components/KnowledgeOperateDrawer'
import { KnowledgeSearchBar } from './components/KnowledgeSearchBar'
import { KnowledgeTable } from './components/KnowledgeTable'
import { KNOWLEDGE_GROUP_TYPE } from './constants/metricModeling.constants'
import { useKnowledgeExtraction } from './hooks/useKnowledgeExtraction'
import type { KnowledgeGroupItem } from './types/metricModeling.types'

const KNOWLEDGE_COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'bizName', label: '指标名称', visible: true },
  { key: 'indicatorCode', label: '指标编码', visible: true },
  { key: 'indicatorClass', label: '指标类型', visible: true },
  { key: 'qualityLevel', label: '质量等级', visible: true },
  { key: 'status', label: '状态', visible: true },
]

const MetricModeling: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<KnowledgeGroupItem | null>(null)
  const groupRef = useRef<GroupHandle>(null)
  const [hasGroups, setHasGroups] = useState<boolean | null>(null)
  const { columnOptions, handleColumnToggle, setViewMode, viewMode, visibleColumnKeys } = useOntologyViewControls(KNOWLEDGE_COLUMN_OPTIONS)
  const {
    atomicDrawerOpen,
    closeAtomicDrawer,
    closeCustomDrawer,
    customDrawerOpen,
    editingItem,
    handleAddAtomic,
    handleAddCustom,
    handleAtomicMappingSubmit,
    handleBatchDelete,
    handleDelete,
    handleEdit,
    handleQuery,
    handleReset,
    handleSearchChange,
    handleSubmit,
    loading,
    pagination,
    searchParams,
    selectedRowKeys,
    setSelectedRowKeys,
    tableData,
  } = useKnowledgeExtraction(selectedGroup)

  const [dateRange, setDateRange] = useState<any>(null)
  const [fePage, setFePage] = useState(1)
  const [fePageSize, setFePageSize] = useState(10)
  const filteredData = useMemo(() => filterByCreateTime(tableData as any[], dateRange, 'createTime'), [tableData, dateRange])
  const pagedData = useMemo(() => {
    const start = (fePage - 1) * fePageSize
    return filteredData.slice(start, start + fePageSize)
  }, [filteredData, fePage, fePageSize])
  useEffect(() => {
    setFePage(1)
  }, [dateRange, tableData])
  const handleFePageChange = useCallback((pageNum: number, pageSize: number) => {
    setFePage(pageNum)
    setFePageSize(pageSize)
  }, [])

  const handleGroupChange = useCallback((groupId: string, groupName?: string) => {
    setSelectedGroup({ groupId, groupName: groupName || '' })
  }, [])
  const handleViewModeChange = useCallback((mode: 'list' | 'card') => {
    setSelectedRowKeys([])
    setViewMode(mode)
  }, [setSelectedRowKeys, setViewMode])

  const canCreateCustom = tableData.length > 0 || pagination.total > 0

  const addMenus = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'atomic',
        label: (
          <div className="py-1">
            <div className="text-sm font-semibold">原子指标映射</div>
            <div className="mt-1 text-xs text-gray-400">配置来源字段并生成原子指标</div>
          </div>
        ),
      },
      {
        disabled: !canCreateCustom,
        key: 'custom',
        label: (
          <div className="py-1">
            <div className="text-sm font-semibold">指标自定义</div>
            <div className="mt-1 text-xs text-gray-400">创建派生指标或衍生指标</div>
          </div>
        ),
      },
    ],
    [canCreateCustom],
  )

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'atomic') {
      handleAddAtomic()
      return
    }
    if (!canCreateCustom) {
      return
    }
    handleAddCustom()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Splitter style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Splitter.Panel defaultSize={280} min={200} max={400} resizable>
          <div className="abi-group-sidebar" style={{ height: '100%' }}>
            <Group
              config={{
                button: '添加指标组',
                inputLabel: '指标组名称',
                inputPlaceholder: '请输入分组名称',
                modalAddTitle: '新增指标组',
                modalEditTitle: '编辑指标组',
                panelTitle: '指标组',
                rule: [[{ message: '请输入指标组名称', required: true }]],
                type: KNOWLEDGE_GROUP_TYPE,
              }}
              onGroupId={handleGroupChange}
              onGroupsChange={setHasGroups}
              ref={groupRef}
            />
          </div>
        </Splitter.Panel>

        <Splitter.Panel style={{ minWidth: 0, overflow: 'hidden' }}>
          <GroupContentGate hasGroups={hasGroups} onCreateGroup={() => groupRef.current?.openAddModal()}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%' }}>
            <KnowledgeSearchBar
              searchParams={searchParams}
              onDateRangeChange={setDateRange}
              onQuery={handleQuery}
              onReset={handleReset}
              onSearchChange={handleSearchChange}
            />
            <section className="abi-data-area">
              <div className="abi-toolbar">
                <div className="abi-toolbar-left">
                  <Dropdown.Button
                    className="ml-auto btn-accent-dropdown"
                    disabled={!selectedGroup?.groupId}
                    icon={<DownOutlined />}
                    menu={{ items: addMenus, onClick: handleMenuClick }}
                    type="primary"
                    onClick={handleAddAtomic}
                    placement="bottom"
                  >
                    + 新增指标
                  </Dropdown.Button>
                  <Popconfirm
                    cancelText="取消"
                    description={`确定删除选中的 ${selectedRowKeys.length} 条指标吗？`}
                    disabled={!selectedRowKeys.length}
                    okText="确定"
                    title="提示"
                    onConfirm={handleBatchDelete}
                  >
                    <AButton danger disabled={!selectedRowKeys.length} icon={<DeleteOutlined />}>
                      批量删除{selectedRowKeys.length ? `(${selectedRowKeys.length})` : ''}
                    </AButton>
                  </Popconfirm>
                </div>
                <ViewControls columns={columnOptions} viewMode={viewMode} onColumnToggle={handleColumnToggle} onViewModeChange={handleViewModeChange} />
              </div>
              <KnowledgeTable
                dataSource={pagedData}
                loading={loading}
                pagination={{ pageNum: fePage, pageSize: fePageSize, total: filteredData.length }}
                viewMode={viewMode}
                visibleColumnKeys={visibleColumnKeys}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onPaginationChange={handleFePageChange}
                onSelectedRowKeysChange={setSelectedRowKeys}
                selectedRowKeys={selectedRowKeys}
              />
            </section>
          </div>
          </GroupContentGate>
        </Splitter.Panel>
      </Splitter>

      <KnowledgeOperateDrawer
        editingItem={editingItem}
        existingItems={tableData}
        groupId={selectedGroup?.groupId}
        groupName={selectedGroup?.groupName}
        open={customDrawerOpen}
        onClose={closeCustomDrawer}
        onSubmit={handleSubmit}
      />

      <KnowledgeAtomicMappingDrawer groupName={selectedGroup?.groupName} open={atomicDrawerOpen} onClose={closeAtomicDrawer} groupId={selectedGroup?.groupId} onSubmit={handleAtomicMappingSubmit} />
    </div>
  )
}

export const Component = MetricModeling

export default MetricModeling
