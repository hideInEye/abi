import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
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
  panelTitle: '分组目录',
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

  const [searchValue, setSearchValue] = useState('');
  const [dateRange, setDateRange] = useState<any>(null);

  function handleGroupId(gId: number) {
    setGroupId(gId);
    if (gId) {
      fetchTableSchemaList(100, gId);
    } else {
      setTableSchemaList([]);
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

  function handleSearch() {
    const keyword = searchValue.trim();
    const startTime = dateRange?.[0]?.format ? dateRange[0].format('YYYY-MM-DD HH:mm:ss') : undefined;
    const endTime = dateRange?.[1]?.format ? dateRange[1].format('YYYY-MM-DD HH:mm:ss') : undefined;
    setTableSchemaList([]);
    fetchTableSchemaList(100, groupId, keyword, startTime, endTime);
  }

  function handleReset() {
    setSearchValue('');
    setDateRange(null);
    setTableSchemaList([]);
    fetchTableSchemaList(100, groupId);
  }

  function handleAdd() {
    setDrawerTitle('新增表语义');
    setTableModalOpen(true);
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Tree Panel — left sidebar */}
      <div className="abi-group-sidebar">
        <Group config={SCHEMA_GROUP_CONFIG} onGroupId={handleGroupId} />
      </div>

      {/* Right content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* v5 Searchbar */}
        <section className="abi-searchbar">
          <div className="abi-search-row">
            <AInput
              allowClear
              placeholder="请输入表语义名称"
              prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onPressEnter={handleSearch}
              className="abi-field-input"
              style={{ width: '16rem' }}
            />
            <ADatePicker.RangePicker
              placeholder={['开始时间', '结束时间']}
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              className="abi-field-input"
            />
            <AButton type="primary" className="btn-accent-gradient" onClick={handleSearch}>
              <SearchOutlined /> 查询
            </AButton>
            <AButton className="btn-ghost-v5" onClick={handleReset}>
              重置
            </AButton>
          </div>
        </section>

        {/* v5 Data Area */}
        <section className="abi-data-area">
          <SemanticsTableList
            deleteTable={deleteTable}
            editTable={editTable}
            tableSchemaList={tableSchemaList}
            toolbarLeft={
              <AButton
                type="primary"
                className="btn-accent-gradient"
                onClick={handleAdd}
                disabled={!groupId}
              >
                + 新增表语义
              </AButton>
            }
          />
        </section>
      </div>

      <SemanticsTable updateTableList={updateTableList} />
    </div>
  );
}
