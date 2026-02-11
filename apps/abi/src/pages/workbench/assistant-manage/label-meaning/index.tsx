import React from 'react';

import { Group } from '@/components/stateful/group/Group.tsx';

import { useTagManagement } from './hooks/useTagManagement.ts';
import { TagModal } from './module/TagModal.tsx';
import { TagSearch } from './module/TagSearch.tsx';
import { TagTable } from './module/TagTable.tsx';

/**
 * 标签语义管理页面组件
 * 用于管理数据标签的语义信息，支持分组管理
 * 包含标签的增删改查、搜索过滤、分组管理等功能
 * 采用左侧分组面板 + 右侧列表操作的布局结构
 */
export const Component: React.FC = () => {
  const {
    editingGroup,
    getTagList,
    groupId,
    handleAdd,
    handleDelete,
    handleEdit,
    handleSearch,
    isModalOpen,
    setGroupId,
    setIsModalOpen,
    tagList,
    tagSave
  } = useTagManagement();

  const getGroupId = (id: number) => {
    setGroupId(id);
  };

  useEffect(() => {
    getTagList({});
  }, [groupId]);

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard className="flex-col-stretch sm:flex-1-hidden card-wrapper h-full border-0"
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      >
        <AFlex className="gap-6 h-full" style={{ flex: 1, minHeight: 0 }}>
          <Group
            config={{
              button: '添加标签语义组',
              inputLabel: '标签语义组名称',
              inputPlaceholder: '请输入标签语义组名称',
              modalAddTitle: '新增标签语义组',
              modalEditTitle: '编辑标签语义组',
              panelTitle: '标签语义组',
              rule: [
                [
                  { message: '请输入标签语义组名称', required: true },
                  { max: 50, message: '标签语义组名称不能超过50个字符' }
                ]
              ],
              type: 'tag'
            }}
            onGroupId={getGroupId}
          />

          <div className="w-40% flex-1 flex flex-col min-h-0 h-full overflow-hidden">
            <TagSearch
              onAdd={handleAdd}
              onSearch={handleSearch}
              groupId={groupId}
            />
            <TagTable
              dataSource={tagList}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />

            {isModalOpen && (
              <TagModal
                editingGroup={editingGroup}
                isModalOpen={isModalOpen}
                onCancel={setIsModalOpen}
                onSave={tagSave}
              />
            )}
          </div>
        </AFlex>
      </ACard>
    </div>
  );
};
