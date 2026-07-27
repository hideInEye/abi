import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Splitter } from 'antd';
import { Group } from '@/components/stateful/group/Group';
import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';
import { filterByCreateTime } from '@/utils/date';

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

  function handleGroupId(gId: string) {
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
    setDrawerTitle('编辑数据语义');
    setChinaname(data.bizName);
    setEnglishname(data.techName);
    setDescribe(data.remark);
    setDownSelectVal(data.relViewId);
    setDownSelectLabel(data.viewName);
    setEditObj(data);
  }

  function handleSearch() {
    const keyword = searchValue.trim();
    setTableSchemaList([]);
    fetchTableSchemaList(100, groupId, keyword);
  }

  function handleReset() {
    setSearchValue('');
    setDateRange(null);
    setTableSchemaList([]);
    fetchTableSchemaList(100, groupId);
  }

  function handleAdd() {
    setDrawerTitle('新增数据语义');
    setTableModalOpen(true);
  }

  // 前端按创建时间过滤（数据语义列表含 createTime 字段）
  const filteredList = useMemo(
    () => filterByCreateTime((tableSchemaList as any[]) || [], dateRange),
    [tableSchemaList, dateRange]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Splitter style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* v5 Tree Panel — left sidebar */}
        <Splitter.Panel defaultSize={280} min={200} max={400} resizable>
          <div className="abi-group-sidebar" style={{ height: '100%' }}>
            <Group config={SCHEMA_GROUP_CONFIG} onGroupId={handleGroupId} />
          </div>
        </Splitter.Panel>

        {/* Right content area */}
        <Splitter.Panel>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%' }}>
            {/* Searchbar */}
            <section className="abi-searchbar">
              <SearchFilterBar
                searchPlaceholder="请输入数据语义名称"
                searchValue={searchValue}
                onQuery={handleSearch}
                onReset={handleReset}
                onSearchChange={setSearchValue}
                filters={
                  <SearchFilterField label="时间范围">
                    <DeferredRangePicker
                      allowClear
                      className="abi-field-input"
                      format="YYYY-MM-DD"
                      getPopupContainer={getFilterPopupContainer}
                      placeholder={['开始时间', '结束时间']}
                      value={dateRange}
                      onChange={(dates) => setDateRange(dates)}
                    />
                  </SearchFilterField>
                }
              />
            </section>

            {/* v5 Data Area */}
            <section className="abi-data-area">
              <SemanticsTableList
                deleteTable={deleteTable}
                editTable={editTable}
                tableSchemaList={filteredList}
                toolbarLeft={
                  <AButton
                    type="primary"
                    className="btn-accent-gradient"
                    onClick={handleAdd}
                    disabled={!groupId}
                  >
                    <PlusOutlined />新增数据语义
                  </AButton>
                }
              />
            </section>
          </div>
        </Splitter.Panel>
      </Splitter>

      <SemanticsTable updateTableList={updateTableList} />
    </div>
  );
}
