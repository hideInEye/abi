import React, { useRef, useState } from 'react';

import type { GroupHandle } from '@/components/stateful/group/Group.tsx';
import { Group } from '@/components/stateful/group/Group.tsx';
import { GroupContentGate } from '@/components/stateful/group/GroupContentGate.tsx';
import { SearchFilterBar } from '@/components/SearchFilterBar';

import { TagTable } from './components/TagTable.tsx';
import TechnicalJargonOperateDrawer from './components/TechnicalJargonOperateDrawer.tsx';
import { useTagManagement } from './hooks/useTagManagement.ts';

export const Component: React.FC = () => {
  const {
    editingGroup,
    getTerms,
    groupId,
    handleAdd,
    handleDelete,
    handleEdit,
    handleSearch,
    isModalOpen,
    searchValue,
    setGroupId,
    setIsModalOpen,
    terms
  } = useTagManagement();

  const groupRef = useRef<GroupHandle>(null);
  const [hasGroups, setHasGroups] = useState<boolean | null>(null);

  const handleClose = (refresh?: boolean) => {
    if (refresh) {
      getTerms();
    }
    setIsModalOpen(false);
  };

  useEffect(() => {
    setGroupId(groupId!);
    getTerms();
  }, [groupId]);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Tree Panel — left sidebar */}
      <div className="abi-group-sidebar">
        <Group
          config={{
            button: '添加行业术语组',
            inputLabel: '行业术语组名称',
            inputPlaceholder: '请输入行业术语组名称',
            modalAddTitle: '新增行业术语组',
            modalEditTitle: '编辑行业术语组',
            panelTitle: '分组目录',
            rule: [
              [
                { message: '请输入行业术语组名称', required: true },
                { max: 50, message: '行业术语组名称不能超过50个字符' }
              ]
            ],
            type: 'term'
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
            searchPlaceholder="请输入行业术语名称"
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
                + 新增行业术语
              </AButton>
            </div>
          </div>
          <TagTable
            dataSource={terms}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </section>
        </GroupContentGate>
      </div>

      {isModalOpen ? (
        <TechnicalJargonOperateDrawer
          editingGroup={editingGroup}
          groupId={groupId}
          onClose={handleClose}
          isEdit={!!editingGroup}
        />
      ) : null}
    </div>
  );
};
