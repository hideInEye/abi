import {
  DeleteOutlined,
  EditOutlined,
  LeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined} from '@ant-design/icons';
import { message } from 'antd';
import { Suspense } from 'react';

import {
  addSpaceRoleApi,
  assignDataPermissionForSpaceRoleApi,
  deleteSpaceRoleApi,
  getSpaceRoleInfoApi,
  getSpaceRoleListApi,
  getSpaceRoleMenuByRoleIdApi,
  updateSpaceRoleApi,
  updateSpaceRoleStatusAPi
} from '@/service/api/space-role';
import { getServiceBaseURL } from '@/utils/service';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import { useRouter } from '~/packages/simple-router/src/hooks/useRouter';

const RoleOperateDrawer = lazy(() => import('./modules/role-operate-drawer'));
const RolePermissionDrawer = lazy(() => import('./modules/role-permission-drawer'));

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { apiURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

// Column definitions for picker
const ALL_COLUMNS: ColumnOption[] = [
  { key: 'roleId', label: '序号', visible: true },
  { key: 'roleName', label: '角色名称', visible: true },
  { key: 'roleKey', label: '权限标识', visible: true },
  { key: 'roleSort', label: '排序', visible: true },
  { key: 'status', label: '状态', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
];

export function Component() {
  const { t } = useTranslation();

  const [visible, setVisible] = useState(false);
  const [roleId, setRoleId] = useState<number>(0);
  const router = useRouter();
  const [jumpValue, setJumpValue] = useState('');

  // Inline search state
  const [searchRoleName, setSearchRoleName] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | undefined>(undefined);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions]);

  const statusOptions = [
    { label: t('page.manage.common.status.enable'), value: '0' },
    { label: t('page.manage.common.status.disable'), value: '1' }
  ];

  const { columnChecks, data, run, searchParams, setColumnChecks, tableProps, updateSearchParams } = useTable({
    apiFn: getSpaceRoleListApi as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      roleKey: '',
      roleName: '',
      status: ''
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'roleId',
          key: 'roleId',
          title: t('page.manage.role.order'),
          width: 80
        },
        {
          align: 'center',
          dataIndex: 'roleName',
          key: 'roleName',
          title: t('page.manage.role.roleName'),
          minWidth: 140
        },
        {
          align: 'center',
          dataIndex: 'roleKey',
          key: 'roleKey',
          title: t('page.manage.role.permission'),
          minWidth: 120
        },
        {
          align: 'center',
          dataIndex: 'roleSort',
          key: 'roleSort',
          title: t('page.manage.role.roleSort'),
          minWidth: 80
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (_: unknown, record: any) => (
            <APopconfirm
              cancelText={t('common.cancel')}
              okText={t('common.confirm')}
              title={record.status === '0' ? t('page.manage.role.isDisabledRole') : t('page.manage.role.isEnableRole')}
              onConfirm={async () => {
                const newStatus = record.status === '0' ? '1' : '0';
                const params = {
                  roleId: record.roleId,
                  status: newStatus
                };
                const res = await updateSpaceRoleStatusAPi(params);
                if (res.response.data.code !== 200) {
                  message.error(res.response.data.msg || '更新失败');
                }
                message.success('更新成功');
                await run(false);
              }}
            >
              <ASwitch
                checked={record.status === '0'}
                loading={tableProps.loading}
                onChange={() => { }}
              />
            </APopconfirm>
          ),
          title: t('page.manage.role.status'),
          width: 160
        },
        {
          align: 'center',
          dataIndex: 'createTime',
          key: 'createTime',
          title: t('page.manage.role.createTime'),
          minWidth: 160
        },
        {
          align: 'center',
          fixed: 'right',
          key: 'operate',
          minWidth: 160,
          render: (_: unknown, record: any) => {
            if (record.roleName === '超级管理员') {
              return null;
            }
            return (
              <div className="ds-action-group">
                <AButton className="abi-action-link" size="small" variant="link" onClick={() => edit(record.roleId)}>
                  <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
                </AButton>
                <APopconfirm
                  title={t('common.confirmDelete')}
                  onConfirm={() => handleDelete(record.roleId)}
                >
                  <AButton className="abi-action-link" size="small" variant="link">
                    <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
                  </AButton>
                </APopconfirm>
              </div>
            );
          },
          title: t('common.operate'),
          width: 160
        }
      ] as any,
    // @ts-expect-error ------------
    rowKey: 'roleId'
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
    onBatchDeleted,
    onDeleted,
    rowSelection
  } = useTableOperate(
    data as any,
    run,
    // eslint-disable-next-line
    async (res, type) => {
      if (type === 'add') {
        const resData = await addSpaceRoleApi(res);
        if (resData.response.data.code !== 200) return false;
      } else {
        const resData = await updateSpaceRoleApi({ ...editingData, ...res });
        if (resData.response.data.code !== 200) return false;
      }
    },
    true
  );

  async function add() {
    handleAdd({
      status: '0'
    });
  }

  async function handleDelete(id: number) {
    const resData = await deleteSpaceRoleApi(id);
    if (resData.response.data.code !== 200) return false;
    return onDeleted();
  }

  function edit(id: number) {
    Promise.all([getSpaceRoleInfoApi(id), getSpaceRoleMenuByRoleIdApi(id)])
      .then((res: any) => {
        const [roleInfo, ruleMenus] = res;
        // 检查是否有访问权限
        const roleRes = roleInfo?.response?.data;
        if (roleRes?.code !== 200) {
          message.error(roleRes?.msg || '没有访问权限，请联系管理员授权');
          return;
        }
        const values = {
          ...roleInfo.data,
          menuIds: ruleMenus?.response?.data?.checkedKeys ?? []
        };
        handleEdit(values);
      })
      .catch(() => {
        message.error('没有访问权限，请联系管理员授权');
      });
  }

  async function deleteBatch() {
    if (checkedRowKeys.length === 0) {
      message.warning('请先选择要删除的角色');
      return;
    }
    const resData = await deleteSpaceRoleApi(checkedRowKeys.join(','));
    if (resData.response.data.code !== 200) return false;
    return onBatchDeleted();
  }

  async function handDataPermissionSubmit(params: any) {
    const res = await assignDataPermissionForSpaceRoleApi(params);
    if (res.response.data.code === 200) {
      message.success('分配数据权限成功');
      setVisible(false);
    } else {
      message.error(res.response.data.msg || '分配数据权限失败');
    }
  }

  const handleSearch = () => {
    updateSearchParams({
      pageNum: 1,
      roleName: searchRoleName.trim() || '',
      status: searchStatus ?? ''
    } as any);
  };

  const handleReset = () => {
    setSearchRoleName('');
    setSearchStatus(undefined);
    updateSearchParams({
      pageNum: 1,
      roleName: '',
      roleKey: '',
      status: ''
    } as any);
  };

  // Pagination logic
  const pagination = tableProps.pagination as any;
  const currentPage = searchParams.current?.pageNum || searchParams.current?.page || 1;
  const pageSizeVal = searchParams.current?.pageSize || searchParams.current?.page_size || 10;
  const totalCount = pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSizeVal) || 1;

  const handlePageSizeChange = (value: number) => {
    pagination?.onChange?.(1, value);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      pagination?.onChange?.(page, pageSizeVal);
    }
  };

  const handlePrev = () => { if (currentPage > 1) handlePageChange(currentPage - 1); };
  const handleNext = () => { if (currentPage < totalPages) handlePageChange(currentPage + 1); };

  const handleJump = () => {
    const page = parseInt(jumpValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
      setJumpValue('');
    }
  };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, '...');
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      pages.push('...', totalPages);
    }
    return pages.map((page, idx) => {
      if (page === '...') return <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">...</span>;
      const isActive = page === currentPage;
      return (
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => handlePageChange(page as number)}>
          {page}
        </span>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }} className="lt-sm:overflow-auto">
      {/* Searchbar */}
      <section className="abi-searchbar">
        <div className="abi-search-row">
          <AInput
            allowClear
            placeholder={t('page.manage.role.form.roleName')}
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            value={searchRoleName}
            onChange={(e) => setSearchRoleName(e.target.value)}
            onPressEnter={handleSearch}
            className="abi-field-input"
            style={{ width: '220px' }}
          />
          <ASelect
            allowClear
            placeholder={t('page.manage.menu.form.menuStatus')}
            value={searchStatus}
            onChange={(val) => setSearchStatus(val)}
            options={statusOptions}
            className="abi-field-input"
            style={{ width: '160px' }}
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
            <AButton className="btn-accent-gradient" onClick={() => add()}>
              <PlusOutlined />新增角色
            </AButton>
            <AButton danger
              icon={<DeleteOutlined />}
              disabled={checkedRowKeys.length === 0}
              onClick={deleteBatch}
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

        {/* Table + Pagination */}
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
                rowKey="roleId"
                rowSelection={rowSelection}
                scroll={{ x: 'max-content' }}
                size="middle"
                className="abi-std-table"
              />
            </div>
          </div>

          {/* Pagination */}
          <div className="data-source-pagination">
            <span className="total-text">共 {totalCount} 条</span>
            <div className="pagination-controls">
              <ASelect
                value={pageSizeVal}
                onChange={handlePageSizeChange}
                options={[
                  { label: '10条/页', value: 10 },
                  { label: '15条/页', value: 15 },
                  { label: '20条/页', value: 20 },
                  { label: '25条/页', value: 25 },
                  { label: '30条/页', value: 30 },
                ]}
                className="page-size-select"
              />
              <button className="page-btn" disabled={currentPage === 1} onClick={handlePrev}>
                <LeftOutlined />
              </button>
              {renderPageNumbers()}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={handleNext}>
                <RightOutlined />
              </button>
              <span className="quick-jumper">
                前往
                <AInput
                  className="jump-input"
                  style={{ width: 48, textAlign: 'center' }}
                  value={jumpValue}
                  onChange={(e) => setJumpValue(e.target.value)}
                  onPressEnter={handleJump}
                />
                页
              </span>
            </div>
          </div>
        </div>
      </section>

      <Suspense>
        <RoleOperateDrawer
          {...generalPopupOperation}
          rowId={editingData?.id || -1}
        />
      </Suspense>

      <RolePermissionDrawer
        roleId={roleId}
        visible={visible}
        onClose={() => setVisible(false)}
        onSubmit={handDataPermissionSubmit}
      />
    </div>
  );
}
