import { PlusOutlined } from '@ant-design/icons';
import PageTitle from '@/components/stateless/common/PageTitle';
import { Group } from '@/components/stateful/group/Group';

import { SemanticsTableList } from './components/semantics-table-list';
import { useSemanticsTable } from './hook/useSemanticsTable';
import { SemanticsTable } from './modules/semantics-table';
import { useTableStore } from './store/useTableStore';

const SCHEMA_GROUP_CONFIG = {
  button: '新增分组',
  inputLabel: '组名称',
  inputPlaceholder: '搜索分组',
  modalAddTitle: '新增组',
  modalEditTitle: '编辑组',
  panelTitle: '文件夹',
  rule: [[{ message: '组名称未填写', required: true }], []],
  type: 'shema' as const,
};

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
    setGroupId,
    setTableModalOpen
  } = useTableStore();

  const { deleteTable, fetchTableSchemaList, setTableSchemaList, tableSchemaList } = useSemanticsTable();

  function handleGroupId(gId: number) {
    setGroupId(gId);
    fetchTableSchemaList(100, gId);
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

  return (
    <div className="flex flex-col p-6 h-full">
      <PageTitle style={{ paddingBottom: '0.5rem' }} />
    <div className="flex gap-6 flex-1">
      {/* 左侧分组树 */}
      <div className="flex flex-col" style={{ borderRight: '0.0625rem solid #d9d9d9', paddingRight: '1rem' }}>
        <Group config={SCHEMA_GROUP_CONFIG} onGroupId={handleGroupId} />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
              <AInput
                placeholder="请输入表语义检索"
                onChange={e => searchTableSchema(e)}
                style={{ width: 200, fontWeight: 400, fontSize: '0.875rem', color: '#333333' }}
              />
              <AButton
              type="primary"
                onClick={() => {
                  setDrawerTitle('新增表语义');
                  setTableModalOpen(true);
                }}
                disabled={!groupId}
              >
                新增
              </AButton>
            </div>

            <SemanticsTableList
              deleteTable={deleteTable}
              editTable={editTable}
              tableSchemaList={tableSchemaList}
            />
          </div>
        </div>
        <SemanticsTable updateTableList={updateTableList} />
    </div>
  );
}
