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
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard
        className="flex-col-stretch sm:flex-1-hidden card-wrapper h-full border-0"
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      >
        <h1 style={{ fontFamily: 'PingFangSC, PingFang SC', fontWeight: 600, fontSize: '1.125rem', color: '#333333', paddingBottom: '0.5rem' }}>字典管理</h1>
        <AFlex className="gap-6 h-full" style={{ flex: 1, minHeight: 0 }}>
          <div style={{ borderRight: '0.0625rem solid #d9d9d9', paddingRight: '1rem' }}>
            <DictionaryGroup onGroupId={setGroupId} />
          </div>

          <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
            <ASpace className="mb-4 flex justify-between">
              <AInput
                placeholder="请输入字典名称"
                value={searchValue}
                onChange={e => handleSearch(e.target.value)}
                style={{ width: 200, fontFamily: 'PingFangSC, PingFang SC', fontWeight: 400, fontSize: '0.875rem', color: '#333333' }}
              />
              <AButton
                type="primary"
                onClick={handleAdd}
                disabled={!groupId}
              >
                新增
              </AButton>
            </ASpace>

            <TableDictionary
              current={current}
              dataSource={dictionaryDataSource}
              onDelete={handleDelete}
              onDiff={openEnumDrawer}
              onEdit={handleEdit}
              onPageChange={setCurrent}
              onStatusChange={handleUpdateStatus}
            />
          </div>
        </AFlex>

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
      </ACard>
    </div>
  );
};
