import React, { useRef, useState } from 'react';

import type { GroupHandle } from '@/components/stateful/group/Group.tsx';
import { Group } from '@/components/stateful/group/Group.tsx';
import { GroupContentGate } from '@/components/stateful/group/GroupContentGate.tsx';
import { SearchFilterBar } from '@/components/SearchFilterBar';

import { QuestionModal } from './components/QuestionModal.tsx';
import { QuestionTable } from './components/QuestionTable.tsx';
import { useQuestionManagement } from './hooks/useQuestionManagement.ts';

export const Component: React.FC = () => {
  const {
    editingGroup,
    getTableData,
    groupId,
    handleAdd,
    handleDelete,
    handleEdit,
    handleSave,
    handleSearch,
    isModalOpen,
    isReset,
    mode,
    searchValue,
    setGroupId,
    setIsModalOpen,
    tableData,
    pagination,
    setPagination
  } = useQuestionManagement();

  const groupRef = useRef<GroupHandle>(null);
  const [hasGroups, setHasGroups] = useState<boolean | null>(null);
  
  useEffect(()=>{
    getTableData(searchValue,{...pagination})
  },[pagination.pageNum, groupId, pagination.pageSize]);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Tree Panel — left sidebar */}
      <div className="abi-group-sidebar">
        <Group
          config={{
            button: '添加问题语义组',
            inputLabel: '问题语义组名称',
            inputPlaceholder: '请输入问题语义组名称',
            modalAddTitle: '新增问题语义组',
            modalEditTitle: '编辑问题语义组',
            panelTitle: '数据目录',
            rule: [[{ message: '请输入问题语义组名称', required: true }]],
            type: 'question'
          }}
          onGroupId={id => { setGroupId(id); }}
          onGroupsChange={setHasGroups}
          ref={groupRef}
        />
      </div>

      {/* Right content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <GroupContentGate hasGroups={hasGroups} onCreateGroup={() => groupRef.current?.openAddModal()}>
        {/* v5 Searchbar */}
        <section className="abi-searchbar">
          <SearchFilterBar
            searchPlaceholder="请输入问题名称"
            searchValue={searchValue}
            onQuery={() => handleSearch(searchValue)}
            onSearchChange={handleSearch}
          />
        </section>

        {/* v5 Data Area */}
        <section className="abi-data-area">
          <div className="abi-toolbar">
            <div className="abi-toolbar-left">
              <AButton
                type="primary"
                className="btn-accent-gradient"
                onClick={handleAdd}
                disabled={!groupId}
              >
                + 新增问题
              </AButton>
            </div>
          </div>
          <QuestionTable
            dataSource={tableData}
            onDelete={handleDelete}
            onEdit={handleEdit}
            pagination={pagination}
            setPagination={setPagination}
          />
        </section>
        </GroupContentGate>
      </div>

      <QuestionModal
        editingGroup={editingGroup}
        isModalOpen={isModalOpen}
        isReset={isReset}
        mode={mode}
        setIsModalOpen={setIsModalOpen}
        onSave={handleSave}
      />
    </div>
  );
};
