import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Suspense } from 'react';

import { enableStatusRecord } from '@/constants/business';
import { fetchGetGroupList } from '@/service/api';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';

const GroupOperateDrawer = lazy(() => import('./modules/group-operate-drawer'));

// Column definitions for picker
const ALL_COLUMNS: ColumnOption[] = [
  { key: 'deptName', label: '组织名称', visible: true },
  { key: 'status', label: '状态', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
];

export function Component() {
  const { t } = useTranslation();
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS);
  const [searchDeptName, setSearchDeptName] = useState('');

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions]);

  const { columnChecks, data, run, setColumnChecks, tableProps, updateSearchParams } = useTable({
    apiFn: fetchGetGroupList,
    apiParams: {
      current: 1,
      keyword: null,
      size: 10
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'deptName',
          key: 'deptName',
          minWidth: 100,
          title: '组织名称'
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (status: Api.Common.EnableStatus) => t(enableStatusRecord[status]),
          title: '状态',
          width: 100
        },
        {
          align: 'center',
          dataIndex: 'createTime',
          key: 'createTime',
          minWidth: 200,
          title: '创建时间'
        },
        {
          align: 'center',
          key: 'operate',
          minWidth: 220,
          render: (_: unknown, record: any) => (
            <div className="ds-action-group">
              <AButton
                className="abi-action-link"
                size="small"
                variant="link"
                onClick={() => edit(record.id)}
              >
                <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
              </AButton>
              <AButton
                className="abi-action-link"
                size="small"
                variant="link"
                onClick={() => handleAdd({ parentId: record.id } as any)}
              >
                <PlusOutlined style={{ marginRight: 3, fontSize: 12 }} />新增子级
              </AButton>
              <APopconfirm
                title={t('common.confirmDelete')}
                onConfirm={() => handleDelete(record.id)}
              >
                <AButton className="abi-action-link" size="small" variant="link" danger>
                  <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
                </AButton>
              </APopconfirm>
            </div>
          ),
          title: t('common.operate'),
          width: 220
        }
      ] as any,
    rowKey: 'deptId'
  });

  // Filter columns by visibility (always keep operate column)
  const filteredColumns = useMemo(() => {
    const cols = tableProps.columns as any[];
    if (!cols) return cols;
    return cols.filter((col: any) => col.key === 'operate' || visibleKeys.has(col.key));
  }, [tableProps.columns, visibleKeys]);

  const {
    checkedRowKeys,
    editingData,
    generalPopupOperation,
    handleAdd,
    handleEdit,
    onDeleted
  } = useTableOperate(data, run, async (res, type) => {
    if (type === 'add') {
      console.log(res);
    } else {
      console.log(res);
    }
  });

  function edit(id: number) {
    handleEdit(id);
  }
  function handleDelete(_id?: number) {
    onDeleted();
  }

  const handleSearch = () => {
    updateSearchParams({
      current: 1,
      keyword: searchDeptName.trim() || null,
    } as any);
  };

  const handleReset = () => {
    setSearchDeptName('');
    updateSearchParams({
      current: 1,
      keyword: null,
    } as any);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Searchbar */}
      <section className="abi-searchbar">
        <div className="abi-search-row">
          <AInput
            allowClear
            placeholder="请输入部门名称"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            value={searchDeptName}
            onChange={(e) => setSearchDeptName(e.target.value)}
            onPressEnter={handleSearch}
            className="abi-field-input"
            style={{ width: '220px' }}
          />
          <AButton type="primary" className="btn-accent-gradient" onClick={handleSearch}>
            <SearchOutlined /> 查询
          </AButton>
          <AButton className="btn-ghost-v5" onClick={handleReset}>
            <ReloadOutlined /> 重置
          </AButton>
        </div>
      </section>

      {/* Data Area */}
      <section className="abi-data-area" style={{ paddingBottom: '16px' }}>
        {/* Toolbar */}
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" onClick={() => handleAdd()}>
              <PlusOutlined />新增机构
            </AButton>
          </div>
          <ViewControls
            hideViewToggle
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Table */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div
            style={{
              border: '1px solid rgba(130,140,200,0.18)',
              borderRadius: '12px',
              overflow: 'hidden',
              flex: 1,
              minHeight: 0,
            }}
          >
            <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
              <ATable
                columns={filteredColumns as any}
                dataSource={tableProps.dataSource}
                loading={tableProps.loading}
                pagination={false}
                rowKey="deptId"
                scroll={{ x: 'max-content' }}
                size="middle"
                className="abi-std-table"
              />
            </div>
          </div>
        </div>
      </section>

      <Suspense>
        <GroupOperateDrawer
          {...generalPopupOperation}
          rowId={editingData?.id || -1}
        />
      </Suspense>
    </div>
  );
}
