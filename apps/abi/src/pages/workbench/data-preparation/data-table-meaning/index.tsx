import { PlusOutlined } from '@ant-design/icons';

import { SemanticsTableList } from './components/semantics-table-list';
import { useSemanticsTable } from './hook/useSemanticsTable';
import { SemanticsGroup } from './modules/semantics-group';
import { SemanticsTable } from './modules/semantics-table';
import { useTableStore } from './store/useTableStore';

export function Component() {
  const {
    groupId,
    setChinaname,
    setDescribe,
    setDownSelectLabel,
    setDownSelectVal,
    setDrawerTitle,
    setEditObj,
    setEnglishname,
    setTableModalOpen
  } = useTableStore();

  const { deleteTable, fetchTableSchemaList, setTableSchemaList, tableSchemaList } = useSemanticsTable();

  function onDefaultGroupUpdate(data: any) {
    if (typeof data === 'object') {
      fetchTableSchemaList(100, data.groupId);
    }
  }

  function updateTableList() {
    fetchTableSchemaList(100, groupId);
  }

  function editTable(data: any) {
    setTableModalOpen(true);
    setDrawerTitle('编辑表语义');
    setChinaname(data.bizName);
    setEnglishname(data.techName);
    setDescribe(data.remark);
    setDownSelectVal(data.relViewId);
    setDownSelectLabel(data.viewName);
    setEditObj(data);
  }

  function searchTableSchema(e: any) {
    setTableSchemaList([]);
    fetchTableSchemaList(100, groupId, e.target.value);
  }

  const [groupSearchValue, setGroupSearchValue] = useState('');

  function searchGroupSchema(e: any) {
    setGroupSearchValue(e.target.value);
  }

  return (
    <div className="flex gap-4 p-6 h-full">
      {/* 左侧分组树 */}
      <div className="w-[280px] flex flex-col border-r pr-4">
            <AInput
              placeholder="请输入表语义组检索"
              onChange={e => searchGroupSchema(e)}
              className="mb-4"
            />
          <div className="flex-1 overflow-auto">
            <SemanticsGroup
              groupName={groupSearchValue}
              onDefaultGroupUpdate={onDefaultGroupUpdate}
            />
         </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
              <AInput
                placeholder="请输入表语义检索"
                onChange={e => searchTableSchema(e)}
                style={{ width: 200 }}
              />
              <AButton
              type="primary"
                onClick={() => {
                  setDrawerTitle('新增表语义');
                  setTableModalOpen(true);
                }}
                disabled={!groupId}
              >
                新增表语义
              </AButton>
            </div>

            <SemanticsTableList
              deleteTable={deleteTable}
              editTable={editTable}
              tableSchemaList={tableSchemaList}
            />
          </div>
        <SemanticsTable updateTableList={updateTableList} />
    </div>
  );
}
