import React from 'react'

import { Group } from '@/components/stateful/group/Group.tsx'
import PageTitle from '@/components/stateless/common/PageTitle'

import { KnowledgeAtomicMappingDrawer } from './components/KnowledgeAtomicMappingDrawer'
import { KnowledgeOperateDrawer } from './components/KnowledgeOperateDrawer'
import { KnowledgeSearchBar } from './components/KnowledgeSearchBar'
import { KnowledgeTable } from './components/KnowledgeTable'
import { KNOWLEDGE_GROUP_TYPE } from './constants'
import { useKnowledgeExtraction } from './hooks/useKnowledgeExtraction'
import type { KnowledgeGroupItem } from './types'

export const Component: React.FC = () => {
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

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard
        className="h-full flex-col-stretch sm:flex-1-hidden border-0 card-wrapper"
        styles={{ body: { display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden' } }}
      >
        <PageTitle style={{ paddingBottom: '0.5rem' }} />
        <AFlex
          className="h-full gap-6"
          style={{ flex: 1, minHeight: 0 }}
        >
          <div style={{ borderRight: '0.0625rem solid #d9d9d9', paddingRight: '1rem' }}>
            <Group
              config={{
                button: '添加知识提取组',
                inputLabel: '知识提取组名称',
                inputPlaceholder: '请输入分组名称',
                modalAddTitle: '新增知识提取组',
                modalEditTitle: '编辑知识提取组',
                panelTitle: '知识提取组',
                rule: [[{ message: '请输入分组名称', required: true }]],
                type: KNOWLEDGE_GROUP_TYPE
              }}
              onGroupId={(groupId, groupName) => {
                setSelectedGroup(prev => {
                  if (prev?.groupId === groupId && prev?.groupName === (groupName || '')) {
                    return prev
                  }
                  return { groupId, groupName: groupName || '' }
                })
              }}
            />
          </div>
          <div className="h-full min-h-0 w-40% flex flex-col flex-1 overflow-hidden">
            <KnowledgeSearchBar
              addDisabled={!selectedGroup?.groupId}
              searchParams={searchParams}
              onAddAtomic={handleAddAtomic}
              onAddCustom={handleAddCustom}
              onQuery={handleQuery}
              onReset={handleReset}
              onSearchChange={handleSearchChange}
            />
            <KnowledgeTable
              dataSource={tableData}
              loading={loading}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </div>
        </AFlex>
      </ACard>

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
