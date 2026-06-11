import React from 'react';
import { SearchOutlined } from '@ant-design/icons';

import { Group } from '@/components/stateful/group/Group.tsx';

import { useTagManagement } from './hooks/useTagManagement.ts';
import { TagModal } from './module/TagModal.tsx';
import { TagTable } from './module/TagTable.tsx';

/**
 * 标签语义管理页面组件
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

  const [searchValue, setSearchValue] = useState('');

  const getGroupId = (id: number) => {
    setGroupId(id);
  };

  useEffect(() => {
    getTagList({});
  }, [groupId]);

  const onSearch = () => {
    handleSearch(searchValue);
  };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Tree Panel — left sidebar */}
      <div className="abi-group-sidebar">
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
      </div>

      {/* Right content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* v5 Searchbar */}
        <section className="abi-searchbar">
          <div className="abi-search-row">
            <AInput
              allowClear
              placeholder="请输入标签语义名称"
              prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
              value={searchValue}
              onChange={e => { setSearchValue(e.target.value); handleSearch(e.target.value); }}
              onPressEnter={onSearch}
              className="abi-field-input"
              style={{ width: '16rem' }}
            />
            <AButton type="primary" className="btn-accent-gradient" onClick={onSearch}>
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
                + 新增标签语义
              </AButton>
            </div>
          </div>
          <TagTable
            dataSource={tagList}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </section>
      </div>

      {isModalOpen && (
        <TagModal
          editingGroup={editingGroup}
          isModalOpen={isModalOpen}
          onCancel={setIsModalOpen}
          onSave={tagSave}
        />
      )}
    </div>
  );
};
