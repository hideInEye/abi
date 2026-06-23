import React from 'react';
import { SearchOutlined } from '@ant-design/icons';

import { Group } from '@/components/stateful/group/Group.tsx';

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
            panelTitle: '分组目录',
            rule: [[{ message: '请输入问题语义组名称', required: true }]],
            type: 'question'
          }}
          onGroupId={id => { setGroupId(id); }}
        />
      </div>

      {/* Right content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* v5 Searchbar */}
        <section className="abi-searchbar">
          <div className="abi-search-row">
            <AInput
              allowClear
              placeholder="请输入问题名称"
              prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
              value={searchValue}
              onChange={e => handleSearch(e.target.value)}
              className="abi-field-input"
              style={{ width: '16rem' }}
            />
            <AButton type="primary" className="btn-accent-gradient" onClick={() => handleSearch(searchValue)}>
              <SearchOutlined /> 查询
            </AButton>
          </div>
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
