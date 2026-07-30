import React, { useCallback, useRef, useState } from 'react'
import { DeleteOutlined } from '@ant-design/icons'
import { Popconfirm, Splitter } from 'antd'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'
import type { GroupHandle } from '@/components/stateful/group/Group.tsx'
import { Group } from '@/components/stateful/group/Group.tsx'
import { GroupContentGate } from '@/components/stateful/group/GroupContentGate.tsx'
import { useOntologyViewControls } from '@/pages/workbench/ontology-kg/hooks/useOntologyViewControls'
import { DimensionOperateDrawer } from './components/DimensionOperateDrawer'
import { DimensionSearchBar } from './components/DimensionSearchBar'
import { DimensionTable } from './components/DimensionTable'
import { HierarchyModal } from './components/dimensionOperateDrawer/HierarchyModal'
import { DIMENSION_GROUP_TYPE } from './constants/dimensionModeling.constants'
import { useDimensionModeling } from './hooks/useDimensionModeling'
import type { DimensionGroup } from './types/dimensionModeling.types'

const DIMENSION_COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'zhName', label: '中文名', visible: true },
  { key: 'englishName', label: '英文名', visible: true },
  { key: 'dimType', label: '维度类型', visible: true },
  { key: 'levelPath', label: '维度路径(目录)', visible: true },
  { key: 'owner', label: '负责人', visible: true },
  { key: 'status', label: '状态', visible: true },
  { key: 'updateTime', label: '更新时间', visible: true },
]

interface Props {
  readonly onGoMetricModeling?: () => void
}

const DimensionModeling: React.FC<Props> = ({ onGoMetricModeling }) => {
  const [selectedGroup, setSelectedGroup] = useState<DimensionGroup | null>(null)
  const groupRef = useRef<GroupHandle>(null)
  const [hasGroups, setHasGroups] = useState<boolean | null>(null)
  const { columnOptions, handleColumnToggle, setViewMode, viewMode, visibleColumnKeys } = useOntologyViewControls(DIMENSION_COLUMN_OPTIONS)
  const {
    closeDrawer,
    closeHierarchyModal,
    drawerOpen,
    editingItem,
    handleAdd,
    handleBatchDelete,
    handleDelete,
    handleEdit,
    handlePaginationChange,
    handleQuery,
    handleReset,
    handleSearchChange,
    handleSubmit,
    hierarchyItems,
    hierarchyLoading,
    hierarchyOpen,
    hierarchyTarget,
    loading,
    openHierarchyModal,
    pagination,
    saveHierarchyConfig,
    searchParams,
    selectedRowKeys,
    setSelectedRowKeys,
    tableData
  } = useDimensionModeling(selectedGroup)

  const handleGroupChange = useCallback((groupId: number, groupName?: string) => {
    setSelectedGroup(prev => {
      if (prev?.groupId === groupId && prev?.groupName === (groupName || '')) {
        return prev
      }
      return { groupId, groupName: groupName || '' }
    })
  }, [])
  const handleViewModeChange = useCallback((mode: 'list' | 'card') => {
    setSelectedRowKeys([])
    setViewMode(mode)
  }, [setSelectedRowKeys, setViewMode])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Splitter style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Splitter.Panel defaultSize={280} min={200} max={400} resizable>
          <div className="abi-group-sidebar" style={{ height: '100%' }}>
            <Group
              config={{
                button: '添加维度组',
                inputLabel: '维度组名称',
                inputPlaceholder: '请输入分组名称',
                modalAddTitle: '新增维度组',
                modalEditTitle: '编辑维度组',
                panelTitle: '维度组',
                rule: [[{ message: '请输入维度组名称', required: true }]],
                type: DIMENSION_GROUP_TYPE
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
            <DimensionSearchBar
              searchParams={searchParams}
              onQuery={handleQuery}
              onReset={handleReset}
              onSearchChange={handleSearchChange}
            />
            <section className="abi-data-area">
              <div className="abi-toolbar">
                <div className="abi-toolbar-left">
                  <AButton
                    type="primary"
                    className="btn-accent-gradient"
                    disabled={!selectedGroup?.groupId}
                    onClick={handleAdd}
                  >
                    + 新增维度
                  </AButton>
                  <Popconfirm
                    cancelText="取消"
                    description={`确定删除选中的 ${selectedRowKeys.length} 条维度吗？`}
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
              <DimensionTable
                dataSource={tableData}
                loading={loading}
                pagination={pagination}
                viewMode={viewMode}
                visibleColumnKeys={visibleColumnKeys}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onHierarchy={openHierarchyModal}
                onPaginationChange={handlePaginationChange}
                onSelectedRowKeysChange={setSelectedRowKeys}
                selectedRowKeys={selectedRowKeys}
              />
            </section>
          </div>
          </GroupContentGate>
        </Splitter.Panel>
      </Splitter>

      <DimensionOperateDrawer
        editingItem={editingItem}
        groupId={selectedGroup?.groupId}
        groupName={selectedGroup?.groupName}
        open={drawerOpen}
        onClose={closeDrawer}
        onGoMetricModeling={onGoMetricModeling}
        onOpenHierarchy={openHierarchyModal}
        onSubmit={handleSubmit}
      />

      <HierarchyModal
        hierarchyItems={hierarchyItems}
        loading={hierarchyLoading}
        open={hierarchyOpen}
        record={hierarchyTarget}
        onCancel={closeHierarchyModal}
        onSave={saveHierarchyConfig}
      />
    </div>
  )
}

export const Component = DimensionModeling

export default DimensionModeling
