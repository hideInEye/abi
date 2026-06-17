import { DeleteOutlined, LeftOutlined, PlusOutlined, ReloadOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { useRoute } from '@sa/simple-router';
import { message } from 'antd';
import { Suspense } from 'react';

import { enableStatusRecord } from '@/constants/business';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';
import {
  assignUserList,
  assignUserSubmit,
  batchCancelAuthorizationApi,
  cancelAuthorizationApi
} from '@/service/api/role';
import {
  assignUserForSPaceRoleSubmit,
  batchCancelSpaceAuthorizationApi,
  cancelSpaceAuthorizationApi
} from '@/service/api/space-role';

const RoleAuthOperateDrawer = lazy(() => import('./modules/role-auth-operate-drawer'));

// Column definitions for picker
const ALL_COLUMNS: ColumnOption[] = [
  { key: 'index', label: '序号', visible: true },
  { key: 'userName', label: '用户名称', visible: true },
  { key: 'nickName', label: '用户昵称', visible: true },
  { key: 'email', label: '邮箱', visible: true },
  { key: 'phonenumber', label: '手机号码', visible: true },
  { key: 'status', label: '状态', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
];

export function Component() {
  const route = useRoute();
  const { id } = route.params;

  const { t } = useTranslation();

  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const [visible, setVisible] = useState(false);
  const [searchUserName, setSearchUserName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [jumpValue, setJumpValue] = useState('');
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS);
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const curType = query.get('type');

  // Column toggle logic
  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions]);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => (c.key === key ? { ...c, visible } : c)));
  };

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps, updateSearchParams, searchParams } = useTable({
    apiFn: assignUserList as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      phonenumber: '',
      roleId: id,
      userName: ''
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'index',
          key: 'index',
          title: t('page.manage.role.order'),
          width: 80
        },
        {
          align: 'center',
          dataIndex: 'userName',
          key: 'userName',
          title: t('page.manage.user.userName'),
          minWidth: 120
        },
        {
          align: 'center',
          dataIndex: 'nickName',
          key: 'nickName',
          title: t('page.manage.user.nickName'),
          minWidth: 120
        },
        {
          align: 'center',
          dataIndex: 'email',
          key: 'email',
          title: t('page.manage.common.email'),
          minWidth: 150
        },
        {
          align: 'center',
          dataIndex: 'phonenumber',
          key: 'phonenumber',
          title: t('page.manage.user.phonenumber'),
          minWidth: 130
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (_: any, record: { status: Api.Common.EnableStatus }) => {
            const label = t(enableStatusRecord[record.status]);
            if (record.status === '0') {
              return <ATag color="success">{label}</ATag>;
            }
            return <ATag color="error">{label}</ATag>;
          },
          title: t('page.manage.role.status'),
          width: 100
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
          minWidth: 100,
          render: (_: unknown, record: any) => {
            if (record.roleName === '超级管理员') {
              return null;
            }
            return (
              <div className="ds-action-group">
                <APopconfirm
                  title="取消授权"
                  description="确定取消该用户的授权吗？"
                  onConfirm={() => handleDelete(record.userId)}
                >
                  <AButton className="abi-action-link" size="small" variant="link" danger>
                    <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />取消授权
                  </AButton>
                </APopconfirm>
              </div>
            );
          },
          title: t('common.operate'),
          width: 100
        }
      ] as any,
    // @ts-expect-error ------------
    rowKey: 'userId'
  });

  // Filter columns by visibility (always keep operate column)
  const filteredColumns = useMemo(() => {
    const cols = tableProps.columns as any[];
    if (!cols) return cols;
    return cols.filter((col: any) => col.key === 'operate' || visibleKeys.has(col.key));
  }, [tableProps.columns, visibleKeys]);

  const { checkedRowKeys, onBatchDeleted, onDeleted, rowSelection } = useTableOperate(
    data as any,
    run,
    // eslint-disable-next-line
    async (res, type) => { }
  );

  async function handleDelete(userId: number) {
    const params = {
      roleId: id,
      userId
    };
    let res: any = '';
    if (curType === 'space') {
      res = await cancelSpaceAuthorizationApi(params);
    } else {
      res = await cancelAuthorizationApi(params);
    }
    if (res.response.data.code !== 200) return false;
    return onDeleted();
  }

  async function handleBatchDelete() {
    if (checkedRowKeys.length === 0) {
      message.warning('请先选择要取消授权的用户');
      return;
    }
    const params = {
      roleId: id,
      userIds: checkedRowKeys.join(',')
    };
    let res: any = '';
    if (curType === 'space') {
      res = await batchCancelSpaceAuthorizationApi(params);
    } else {
      res = await batchCancelAuthorizationApi(params);
    }
    if (res.response.data.code !== 200) return false;
    return onBatchDeleted();
  }

  async function handSelectuserSubmit(keys: []) {
    const params = {
      roleId: id,
      userIds: keys.join(',')
    };

    let res: any = '';
    if (curType === 'space') {
      res = await assignUserForSPaceRoleSubmit(params);
    } else {
      res = await assignUserSubmit(params);
    }
    if (res.response.data.code === 200) {
      message.success('添加用户成功');
      run();
      setVisible(false);
    } else {
      message.error(res.response.data.msg || '分配数据权限失败');
    }
  }

  // Search handlers
  const handleSearch = () => {
    updateSearchParams({
      pageNum: 1,
      userName: searchUserName.trim() || '',
      phonenumber: searchPhone.trim() || ''
    } as any);
  };

  const handleReset = () => {
    setSearchUserName('');
    setSearchPhone('');
    updateSearchParams({
      pageNum: 1,
      userName: '',
      phonenumber: ''
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
            placeholder={t('page.manage.user.form.userName')}
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            value={searchUserName}
            onChange={(e) => setSearchUserName(e.target.value)}
            onPressEnter={handleSearch}
            className="abi-field-input"
            style={{ width: '200px' }}
          />
          <AInput
            allowClear
            placeholder={t('page.manage.user.form.phonenumber')}
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            onPressEnter={handleSearch}
            className="abi-field-input"
            style={{ width: '200px' }}
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
            <AButton className="btn-accent-gradient" onClick={() => setVisible(true)}>
              <PlusOutlined />{t('page.manage.role.addUser')}
            </AButton>
            <AButton
              className="btn-ghost-v5"
              disabled={checkedRowKeys.length === 0}
              onClick={handleBatchDelete}
            >
              批量取消授权
            </AButton>
          </div>
          <ViewControls
            hideViewToggle
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Table */}
          <div
            style={{
              border: '1px solid rgba(130,140,200,0.18)',
              borderRadius: '12px',
              overflow: 'hidden',
              flex: 1,
              minHeight: 0
            }}
          >
            <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
              <ATable
                scroll={scrollConfig}
                size="middle"
                className="abi-std-table role-auth-table"
                {...tableProps}
                columns={filteredColumns as any}
                rowKey="userId"
                rowSelection={rowSelection}
                pagination={false}
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
        <RoleAuthOperateDrawer
          roleId={id}
          visible={visible}
          onClose={() => setVisible(false)}
          onSubmit={handSelectuserSubmit}
        />
      </Suspense>
    </div>
  );
}
