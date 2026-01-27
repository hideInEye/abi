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
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard className="flex-col-stretch sm:flex-1-hidden card-wrapper">
        <AFlex className="gap-6">
          <ASpace direction="vertical" className='min-w-100px w-100'>
            <AInput
              placeholder="请输入表语义组检索"
              onChange={e => searchGroupSchema(e)}
            />
            <SemanticsGroup
              groupName={groupSearchValue}
              onDefaultGroupUpdate={onDefaultGroupUpdate}
            />
          </ASpace>

          <div className="w-40% flex-1">
            <ASpace className="flex justify-between">
              <AInput
                placeholder="请输入表语义检索"
                onChange={e => searchTableSchema(e)}
              />
              <AButton
                color="primary"
                icon={<PlusOutlined />}
                variant="outlined"
                onClick={() => {
                  setDrawerTitle('新增表语义');
                  setTableModalOpen(true);
                }}
                disabled={!groupId}
              >
                新增表语义
              </AButton>
            </ASpace>

            <SemanticsTableList
              deleteTable={deleteTable}
              editTable={editTable}
              tableSchemaList={tableSchemaList}
            />
          </div>
        </AFlex>
        <SemanticsTable updateTableList={updateTableList} />
      </ACard>
    </div>
  );
}
