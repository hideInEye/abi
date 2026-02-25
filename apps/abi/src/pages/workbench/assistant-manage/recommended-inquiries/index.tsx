import React from 'react';

import { Group } from '@/components/stateful/group/Group.tsx';

import { QuestionModal } from './components/QuestionModal.tsx';
import { QuestionSearchInput } from './components/QuestionSearchInput.tsx';
import { QuestionTable } from './components/QuestionTable.tsx';
import { useQuestionManagement } from './hooks/useQuestionManagement.ts';

/** 推荐问题管理页面组件 用于管理 AI 助手的推荐询问问题，支持分组管理 包含问题的增删改查、搜索过滤、分组管理等功能 采用左侧分组面板 + 右侧列表操作的布局结构 */
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
  
  useEffect(()=>{
    getTableData(searchValue,{...pagination})
  },[pagination.pageNum, groupId, pagination.pageSize]);

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard className="flex-col-stretch sm:flex-1-hidden card-wrapper h-full border-0"
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      >
        <AFlex className="gap-6 h-full" style={{ flex: 1, minHeight: 0 }}>
          <Group
            config={{
              button: '添加问题语义组',
              inputLabel: '问题语义组名称',
              inputPlaceholder: '请输入问题语义组名称',
              modalAddTitle: '新增问题语义组',
              modalEditTitle: '编辑问题语义组',
              panelTitle: '问题语义组',
              rule: [[{ message: '请输入问题语义组名称', required: true }]],
              type: 'question'
            }}
            onGroupId={id => {
              setGroupId(id);
            }}
          />

          <div className="w-40% flex-1 flex flex-col min-h-0 h-full overflow-hidden">
            <QuestionSearchInput
              searchValue={searchValue}
              onAdd={handleAdd}
              onSearch={handleSearch}
              groupId={groupId}
            />
            <QuestionTable
              dataSource={tableData}
              onDelete={handleDelete}
              onEdit={handleEdit}
              pagination={pagination}
              setPagination={setPagination}
            />
            <QuestionModal
              editingGroup={editingGroup}
              isModalOpen={isModalOpen}
              isReset={isReset}
              mode={mode}
              setIsModalOpen={setIsModalOpen}
              onSave={handleSave}
            />
          </div>
        </AFlex>
      </ACard>
    </div>
  );
};
