import React, { useCallback, useState } from 'react'
import { Splitter } from 'antd'

import { Group } from '@/components/stateful/group/Group.tsx'

import { KnowledgeAtomicMappingDrawer } from './components/KnowledgeAtomicMappingDrawer'
import { KnowledgeOperateDrawer } from './components/KnowledgeOperateDrawer'
import { KnowledgeSearchBar } from './components/KnowledgeSearchBar'
import { KnowledgeTable } from './components/KnowledgeTable'
import { KNOWLEDGE_GROUP_TYPE } from './constants/metricModeling.constants'
import { useKnowledgeExtraction } from './hooks/useKnowledgeExtraction'
import type { KnowledgeGroupItem } from './types/metricModeling.types'

const MetricModeling: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<KnowledgeGroupItem | null>(null)
  const {
    atomicDrawerOpen,
    closeAtomicDrawer,
    closeCustomDrawer,
    customDrawerOpen,
    editingItem,
    handleAddAtomic,
    handleAddCustom,
    handleAtomicMappingSubmit,
    handleDelete,
    handleEdit,
    handleQuery,
    handleReset,
    handleSearchChange,
    handleSubmit,
    loading,
    searchParams,
    tableData
  } = useKnowledgeExtraction(selectedGroup)

  const handleGroupChange = useCallback((groupId: number, groupName?: string) => {
    setSelectedGroup(prev => {
      if (prev?.groupId === groupId && prev?.groupName === (groupName || '')) {
        return prev
      }
      return { groupId, groupName: groupName || '' }
    })
  }, [])

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
                type: KNOWLEDGE_GROUP_TYPE
              }}
              onGroupId={handleGroupChange}
            />
          </div>
        </Splitter.Panel>

        <Splitter.Panel>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%' }}>
            <KnowledgeSearchBar
              addDisabled={!selectedGroup?.groupId}
              searchParams={searchParams}
              onAddAtomic={handleAddAtomic}
              onAddCustom={handleAddCustom}
              onQuery={handleQuery}
              onReset={handleReset}
              onSearchChange={handleSearchChange}
            />
            <section className="abi-data-area">
              <KnowledgeTable
                dataSource={tableData}
                loading={loading}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            </section>
          </div>
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

      <KnowledgeAtomicMappingDrawer
        groupName={selectedGroup?.groupName}
        open={atomicDrawerOpen}
        onClose={closeAtomicDrawer}
        groupId={selectedGroup?.groupId}
        onSubmit={handleAtomicMappingSubmit}
      />
    </div>
  )
}

export const Component = MetricModeling

export default MetricModeling
