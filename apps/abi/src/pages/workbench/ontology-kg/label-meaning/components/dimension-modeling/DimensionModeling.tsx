import React, { useCallback, useState } from 'react'

import { Group } from '@/components/stateful/group/Group.tsx'

import { DimensionOperateDrawer } from './components/DimensionOperateDrawer'
import { DimensionSearchBar } from './components/DimensionSearchBar'
import { DimensionTable } from './components/DimensionTable'
import { HierarchyModal } from './components/dimensionOperateDrawer/HierarchyModal'
import { DIMENSION_GROUP_TYPE } from './constants/dimensionModeling.constants'
import { useDimensionModeling } from './hooks/useDimensionModeling'
import type { DimensionGroup } from './types/dimensionModeling.types'

const DimensionModeling: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<DimensionGroup | null>(null)
  const {
    closeDrawer,
    closeHierarchyModal,
    drawerOpen,
    editingItem,
    handleAdd,
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

  return (
    <div className="h-full min-h-0 flex-col-stretch overflow-hidden lt-sm:overflow-auto">
      <AFlex
        className="h-full gap-6"
        style={{ flex: 1, minHeight: 0 }}
      >
        <div className="abi-group-sidebar">
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
          />
        </div>

        <div className="h-full min-h-0 w-40% flex flex-col flex-1 overflow-hidden">
          <DimensionSearchBar
            addDisabled={!selectedGroup?.groupId}
            searchParams={searchParams}
            onAdd={handleAdd}
            onQuery={handleQuery}
            onReset={handleReset}
            onSearchChange={handleSearchChange}
          />
          <DimensionTable
            dataSource={tableData}
            loading={loading}
            pagination={pagination}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onHierarchy={openHierarchyModal}
            onPaginationChange={handlePaginationChange}
          />
        </div>
      </AFlex>

      <DimensionOperateDrawer
        editingItem={editingItem}
        groupId={selectedGroup?.groupId}
        groupName={selectedGroup?.groupName}
        open={drawerOpen}
        onClose={closeDrawer}
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
