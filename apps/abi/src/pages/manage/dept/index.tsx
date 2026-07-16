import { EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { message } from 'antd';
import React, { Suspense } from 'react';

import { enableStatusRecord } from '@/constants/business';
import { addDeptApi, deleteDeptApi, getDeptInfoApi, getDeptListApi, updateDeptApi } from '@/service/api/dept';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';

// Column definitions for picker
const ALL_COLUMNS: ColumnOption[] = [
  { key: 'deptName', label: '机构名称', visible: true },
  { key: 'deptId', label: '机构编号', visible: true },
  { key: 'orderNum', label: '排序', visible: true },
  { key: 'status', label: '状态', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
];

const DeptOperateDrawer = lazy(() => import('./modules/dept-operate-drawer'));

export function Component() {
  const { t } = useTranslation();

  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [searchDeptName, setSearchDeptName] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | undefined>(undefined);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions]);

  const { columnChecks, data, run, setColumnChecks, tableProps } = useTreeTable({
    apiFn: getDeptListApi as any,
    apiParams: {
      deptName: '',
      status: ''
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'deptName',
          key: 'deptName',
          minWidth: 180,
          title: t('page.manage.dept.deptName')
        },
        {
          align: 'center',
          dataIndex: 'deptId',
          key: 'deptId',
          minWidth: 100,
          title: "机构编号"
        },
        {
          align: 'center',
          dataIndex: 'orderNum',
          key: 'orderNum',
          minWidth: 80,
          title: t('page.manage.common.sort')
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          minWidth: 100,
          render: (_: any, record: { status: Api.Common.EnableStatus }) => {
            const label = t(enableStatusRecord[record.status]);
            if (record.status === '0') {
              return <span className="abi-status-tag status-normal">{label}</span>;
            }
            return <span className="abi-status-tag status-disabled">{label}</span>;
          },
          title: t('page.manage.dept.status')
        },
        {
          align: 'center',
          dataIndex: 'createTime',
          key: 'createTime',
          minWidth: 160,
          title: t('page.manage.menu.createTime')
        },
        {
          align: 'center',
          fixed: 'right',
          key: 'operate',
          minWidth: 200,
          render: (_: unknown, record: any) => (
            <div className="ds-action-group">
              <AButton
                className="abi-action-link"
                size="small"
                variant="link"
                onClick={() => edit(record.deptId)}
              >
                <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
              </AButton>
              <AButton
                className="abi-action-link"
                size="small"
                variant="link"
                onClick={() => add(record.deptId)}
              >
                <PlusOutlined style={{ marginRight: 3, fontSize: 12 }} />新增子级
              </AButton>
              <APopconfirm
                title="提示"
                description={t('common.confirmDelete')}
                onConfirm={() => handleDelete(record.deptId)}
              >
                <AButton className="abi-action-link" size="small" variant="link">
                  <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
                </AButton>
              </APopconfirm>
            </div>
          ),
          title: t('common.operate'),
        }
      ] as any,
    rowKey: 'deptId'
  } as any);

  const { checkedRowKeys, editingData, generalPopupOperation, handleAdd, handleEdit, onDeleted, rowSelection } = useTableOperate(
    data as any,
    run,
    // eslint-disable-next-line
    async (res: any, type) => {
      if (type === 'add') {
        const params = {
          ...res
        };
        const addRes: any = await addDeptApi(params);
        if (addRes?.response?.data?.code !== 200) return false;
      } else if (type === 'edit') {
        const params = {
          ...res,
          deptId: editingData.deptId
        };
        const addRes: any = await updateDeptApi(params);
        if (addRes?.response?.data?.code !== 200) return false;
      }
    },
    true
  );

  const filteredColumns = useMemo(() => {
    const cols = tableProps.columns as any[];
    if (!cols) return cols;
    return cols.filter((col: any) => col.key === 'operate' || visibleKeys.has(col.key));
  }, [tableProps.columns, visibleKeys]);

  async function add(parentId: number | string) {
    handleAdd({
      parentId,
      status: '0'
    });
  }

  async function edit(deptId: number) {
    const res = await getDeptInfoApi(deptId);
    handleEdit({
      ...res.data
    });
  }

  async function handleDelete(deptId: number) {
    const res = await deleteDeptApi(deptId);
    if (res.response.data.code !== 200) return false;
    return onDeleted();
  }

  async function handleBatchDelete() {
    if (checkedRowKeys.length === 0) {
      message.warning('请先选择要删除的机构');
      return;
    }
    const promises = checkedRowKeys.map((deptId) => deleteDeptApi(Number(deptId)));
    const results = await Promise.all(promises);
    const allSuccess = results.every((res: any) => res.response.data.code === 200);
    if (allSuccess) {
      message.success('批量删除成功');
      run();
    } else {
      message.error('批量删除部分失败');
    }
  }

  useEffect(() => {
    if (Array.isArray(data)) {
      const curExpandedRowKeys = [] as number[];
      data.forEach(item => {
        curExpandedRowKeys.push(item.deptId);
        if (Array.isArray(item.children)) {
          item.children.forEach((i: any) => {
            curExpandedRowKeys.push(i.deptId);
          });
        }
      });
      setExpandedRowKeys(curExpandedRowKeys);
    }
  }, [data]);

  const handleSearch = () => {
    // Tree table search - update apiParams
    run();
  };

  const handleReset = () => {
    setSearchDeptName('');
    setSearchStatus(undefined);
    run();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Searchbar */}
      <section className="abi-searchbar">
        <div className="abi-search-row">
          <AInput
            allowClear
            placeholder="请输入机构名称"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            value={searchDeptName}
            onChange={(e) => setSearchDeptName(e.target.value)}
            onPressEnter={handleSearch}
            className="abi-field-input"
            style={{ width: '220px' }}
          />
          <ASelect
            allowClear
            placeholder="请选择状态"
            value={searchStatus}
            onChange={(val) => setSearchStatus(val)}
            className="abi-field-input"
            style={{ width: '140px' }}
            options={[
              { label: t('page.manage.common.status.enable'), value: '0' },
              { label: t('page.manage.common.status.disable'), value: '1' }
            ]}
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
      <section className="abi-data-area">
        {/* Toolbar */}
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" onClick={() => add('')}>
              <PlusOutlined />新增机构
            </AButton>
            <AButton danger
              icon={<DeleteOutlined />}
              disabled={checkedRowKeys.length === 0}
              onClick={() => handleBatchDelete()}
            >
              批量删除{checkedRowKeys.length ? `(${checkedRowKeys.length})` : ''}
            </AButton>
          </div>
          <ViewControls
            hideViewToggle
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Table */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div
            className="dept-table-wrapper"
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
                rowSelection={rowSelection}
                scroll={{ x: 'max-content' }}
                size="middle"
                className="abi-std-table"
                expandable={{
                  expandedRowKeys,
                  indentSize: 24,
                  onExpandedRowsChange: keys => setExpandedRowKeys([...keys])
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <Suspense>
        <DeptOperateDrawer {...generalPopupOperation} />
      </Suspense>
    </div>
  );
}
