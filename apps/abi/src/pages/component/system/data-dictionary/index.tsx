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
        className="flex-col-stretch sm:flex-1-hidden card-wrapper h-full"
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      >
        <AFlex className="gap-6 h-full" style={{ flex: 1, minHeight: 0 }}>
          <DictionaryGroup onGroupId={setGroupId} />

          <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
            <ASpace className="mb-3 flex justify-between">
              <AInput
                placeholder="请输入字典名称"
                value={searchValue}
                onChange={e => handleSearch(e.target.value)}
                style={{ width: 200 }}
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
