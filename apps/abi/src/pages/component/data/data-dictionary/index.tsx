import { SearchOutlined } from '@ant-design/icons';
import React, { useState } from 'react';

import { DictionaryGroup } from './components/DictionaryGroup';
import { DictionaryModal } from './components/DictionaryModal';
import { TableDictionary } from './components/DictionaryTable';
import { EnumDrawer } from './components/EnumDrawer';
import { useDictionaryGroup } from './hooks/useDictionaryGroup';
import { useEnumDrawer } from './hooks/useEnumDrawer';

export const Component: React.FC = () => {
  const [groupId, setGroupId] = useState<any>(null);

  const {
    current,
    dictionaryDataSource,
    editObj,
    handleAdd,
    handleClose,
    handleDelete,
    handleEdit,
    handleSearch,
    handleSure,
    handleUpdateStatus,
    modalOpen,
    searchValue,
    setCurrent
  } = useDictionaryGroup(groupId);

  const { close: closeEnumDrawer, enumerationModalOpen, open: openEnumDrawer } = useEnumDrawer();

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Tree Panel — left sidebar */}
      <div className="abi-group-sidebar">
        <DictionaryGroup onGroupId={setGroupId} />
      </div>

      {/* Right content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* v5 Searchbar */}
        <section className="abi-searchbar">
          <div className="abi-search-row">
            <AInput
              allowClear
              placeholder="请输入字典名称"
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
                + 新增字典
              </AButton>
            </div>
          </div>
          <TableDictionary
            current={current}
            dataSource={dictionaryDataSource}
            onDelete={handleDelete}
            onDiff={openEnumDrawer}
            onEdit={handleEdit}
            onPageChange={setCurrent}
            onStatusChange={handleUpdateStatus}
          />
        </section>
      </div>

      <DictionaryModal
        editObj={editObj}
        open={modalOpen}
        onClose={handleClose}
        onSure={handleSure}
      />

      {enumerationModalOpen && (
        <EnumDrawer
          close={closeEnumDrawer}
          enumerationModalOpen={enumerationModalOpen}
        />
      )}
    </div>
  );
};
