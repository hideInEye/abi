import { DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Dropdown, message } from 'antd';
import React, { Suspense } from 'react';

import { enableStatusRecord } from '@/constants/business';
import { addDeptApi, deleteDeptApi, getDeptInfoApi, getDeptListApi, updateDeptApi } from '@/service/api/dept';

const DeptOperateDrawer = lazy(() => import('./modules/dept-operate-drawer'));

export function Component() {
  const { t } = useTranslation();

  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [searchDeptName, setSearchDeptName] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | undefined>(undefined);

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
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'delete',
                      danger: true,
                      label: (
                        <APopconfirm
                          title="提示"
                          description={t('common.confirmDelete')}
                          onConfirm={() => handleDelete(record.deptId)}
                        >
                          <span><DeleteOutlined style={{ marginRight: 4 }} />删除</span>
                        </APopconfirm>
                      ),
                    },
                  ],
                }}
              >
                <AButton className="abi-action-link" size="small" variant="link">
                  更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
                </AButton>
              </Dropdown>
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
            <AButton
              className="btn-ghost-v5"
              disabled={checkedRowKeys.length === 0}
              onClick={() => handleBatchDelete()}
            >
              批量删除
            </AButton>
          </div>
        </div>

        {/* Table */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
                columns={tableProps.columns as any}
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
