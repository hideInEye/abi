import React from 'react';

import { Group } from '@/components/stateful/group/Group.tsx';

import { TagSearchInput } from './components/SearchInput.tsx';
import { TagTable } from './components/TagTable.tsx';
import TechnicalJargonOperateDrawer from './components/TechnicalJargonOperateDrawer.tsx';
import { useTagManagement } from './hooks/useTagManagement.ts';

/**
 * 行业术语管理页面组件
 * 用于管理特定行业的专业术语和概念定义，支持分组管理
 * 包含术语的增删改查、搜索过滤、分组管理等功能
 * 采用左侧分组面板 + 右侧列表操作的布局结构
 * 支持术语的详细配置和复杂字段定义
 */
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
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard className="flex-col-stretch sm:flex-1-hidden card-wrapper h-full border-0"
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      >
        <AFlex className="gap-6 h-full" style={{ flex: 1, minHeight: 0 }}>
          <Group
            config={{
              button: '添加行业术语组',
              inputLabel: '行业术语组名称',
              inputPlaceholder: '请输入行业术语组名称',
              modalAddTitle: '新增行业术语组',
              modalEditTitle: '编辑行业术语组',
              panelTitle: '行业术语组',
              rule: [
                [
                  { message: '请输入行业术语组名称', required: true },
                  { max: 50, message: '行业术语组名称不能超过50个字符' }
                ]
              ],
              type: 'term'
            }}
            onGroupId={id => {
              setGroupId(id);
            }}
          />

          <div className="w-40% flex-1 flex flex-col min-h-0 h-full overflow-hidden">
            <TagSearchInput
              searchValue={searchValue}
              onAdd={handleAdd}
              onSearch={handleSearch}
              groupId={groupId}
            />
            <TagTable
              dataSource={terms}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
            {isModalOpen ? (
              <TechnicalJargonOperateDrawer
                editingGroup={editingGroup}
                groupId={groupId}
                onClose={handleClose}
                isEdit={!!editingGroup}
              />
            ) : null}
          </div>
        </AFlex>
      </ACard>
    </div>
  );
};
