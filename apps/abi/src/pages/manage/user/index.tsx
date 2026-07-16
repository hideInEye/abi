import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  KeyOutlined,
  LeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignTopOutlined
} from '@ant-design/icons';
import { Dropdown, message } from 'antd';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { Key } from 'react';
import { Suspense } from 'react';

import { fetchAddUser, fetchDelUser, fetchGetUserList, fetchUpdateUser } from '@/service/api';
import { getUserInfoApi, importUserApi, updateUserStatusAPi } from '@/service/api/user';
import { getAuthorization, getUserId } from '@/service/request/shared';
import { encrypt } from '@/utils/jsencrypt';
import { getServiceBaseURL } from '@/utils/service';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';

import GroupTree from './modules/group-tree';
import ImportModal from './modules/import-modal';
import ResetPassword from './modules/reset-password';
import UserOperateDrawer from './modules/user-operate-drawer';

const isHttpProxy = import.meta.env.DEV && import.meta.env.VITE_HTTP_PROXY === 'Y';
const { apiURL } = getServiceBaseURL(import.meta.env, isHttpProxy);

function getFirstRoleId(roleIds: any) {
  return Array.isArray(roleIds) ? roleIds[0] : roleIds;
}

function normalizeRoleIds(roleIds: any) {
  const roleId = getFirstRoleId(roleIds);
  return roleId === undefined || roleId === null || roleId === '' ? [] : [roleId];
}

// Column definitions for picker
const ALL_COLUMNS: ColumnOption[] = [
  { key: 'userId', label: '序号', visible: true },
  { key: 'userName', label: '用户名', visible: true },
  { key: 'nickName', label: '昵称', visible: true },
  { key: 'dept', label: '部门', visible: true },
  { key: 'phonenumber', label: '手机号', visible: true },
  { key: 'status', label: '用户状态', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
];

export function Component() {
  const { t } = useTranslation();
  const [selectedKeys, setSelectedKeys] = useState<Key[]>();
  const [userId, setUserId] = useState(0);
  const [visible, setVisible] = useState(false);
  const [searchUserName, setSearchUserName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | undefined>(undefined);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions]);

  const { columnChecks, data, run, searchParams, setColumnChecks, tableProps, updateSearchParams } = useTable(
    {
      apiFn: fetchGetUserList as any,
      apiParams: {
        deptId: '',
        pageNum: 1,
        pageSize: 10,
        params: {
          beginTime: '',
          endTime: ''
        },
        phonenumber: '',
        status: '',
        userName: ''
      },
      columns: () =>
        [
          {
            align: 'center',
            dataIndex: 'userId',
            key: 'userId',
            minWidth: 80,
            render: (_: unknown, record: any, index: any) => {
              const current = searchParams?.current?.pageNum || 1;
              const pageSize = searchParams?.current?.pageSize || 10;
              return (current - 1) * pageSize + index + 1;
            },
            title: t('page.manage.user.userId')
          },
          {
            align: 'center',
            dataIndex: 'userName',
            key: 'userName',
            minWidth: 100,
            title: t('page.manage.user.userName')
          },
          {
            align: 'center',
            dataIndex: 'nickName',
            key: 'nickName',
            minWidth: 100,
            title: t('page.manage.user.nickName')
          },
          {
            align: 'center',
            dataIndex: 'dept',
            key: 'dept',
            minWidth: 100,
            render: (dept: any) => dept?.deptName,
            title: t('page.manage.user.dept')
          },
          {
            align: 'center',
            dataIndex: 'phonenumber',
            key: 'phonenumber',
            minWidth: 120,
            title: t('page.manage.user.userPhone')
          },
          {
            align: 'center',
            dataIndex: 'status',
            key: 'status',
            minWidth: 100,
            render: (_: unknown, record: any) => (
              <APopconfirm
                cancelText={t('common.cancel')}
                okText={t('common.confirm')}
                title={
                  record.status === '0' ? t('page.manage.user.isDisabledUser') : t('page.manage.user.isEnableUser')
                }
                onConfirm={async () => {
                  const newStatus = record.status === '0' ? '1' : '0';
                  const params = {
                    status: newStatus,
                    userId: record.userId
                  };
                  const res = await updateUserStatusAPi(params);
                  if (res.response.data.code !== 200) {
                    message.error(res.response.data.msg || '更新失败');
                  } else {
                    message.success('更新成功');
                  }
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
            title: '用户状态'
          },
          {
            align: 'center',
            dataIndex: 'createTime',
            key: 'createTime',
            minWidth: 160,
            title: t('page.manage.common.createTime')
          },
          {
            align: 'center',
            fixed: 'right',
            key: 'operate',
            minWidth: 180,
            render: (_: unknown, record: any) => (
              <div className="ds-action-group">
                <AButton
                  className="abi-action-link"
                  size="small"
                  variant="link"
                  onClick={() => edit(record.userId)}
                >
                  <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
                </AButton>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'resetPassword',
                        label: (
                          <span onClick={() => setUserId(record.userId)}>
                            <KeyOutlined style={{ marginRight: 4 }} />重置密码
                          </span>
                        ),
                      },
                      { type: 'divider' },
                      {
                        key: 'delete',
                        danger: true,
                        label: (
                          <APopconfirm
                            title="提示"
                            description={t('common.confirmDelete')}
                            onConfirm={() => handleDelete(record.userId)}
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
      // @ts-expect-error ------------
      rowKey: 'userId'
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
    (..._args: any[]) => run(false),
    // eslint-disable-next-line
    async (res: any, type) => {
      const params = { ...res };
      params.roleIds = normalizeRoleIds(res.roleIds);
      if (type === 'add') {
        params.password = encrypt(res.password);
        const resData = await fetchAddUser(params);
        if (resData.response.data.code !== 200) return false;
      } else {
        const resData = await fetchUpdateUser({ ...params, userId: editingData.userId });
        if (resData.response.data.code !== 200) return false;
      }
    },
    true
  );

  async function edit(row: number) {
    const res: any = await getUserInfoApi(row);
    handleEdit({
      ...res.data.data,
      postIds: res?.data?.postIds || [],
      roleIds: getFirstRoleId(res?.data?.roleIds || [])
    });
  }

  async function handleDelete(id: number) {
    const resData = await fetchDelUser(id);
    if (resData.response.data.code !== 200) return false;
    return onDeleted();
  }

  async function handExport() {
    downLoad(
      '/system/user/export',
      {
        ...searchParams.current,
        userIds: checkedRowKeys
      },
      t('page.manage.user.title')
    );
  }

  async function downLoad(url: string, params: any, fileName: string) {
    try {
      const response: AxiosResponse<Blob> = await axios.post(url, params, {
        baseURL: apiURL,
        headers: {
          apifoxToken: 'XL299LiMEDZ0H5h3A29PxwQXdMJqWyY2',
          Authorization: getAuthorization(),
          'Content-Type': 'application/json',
          userId: getUserId()
        },
        responseType: 'blob'
      });

      const contentDisposition = response.headers['content-disposition'];
      const extractedFileName = contentDisposition
        ? decodeURIComponent(
          contentDisposition.split(';')[1].split('=')[1].replace(/"/g, '')
        )
        : fileName || '';

      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/octet-stream'
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', extractedFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('下载失败:', error);
    }
  }

  const handleClose = (refresh?: boolean) => {
    if (refresh) {
      run();
    }
    setUserId(0);
  };

  async function deleteBatch() {
    const resData = await fetchDelUser(checkedRowKeys.join(','));
    if (resData.response.data.code !== 200) return false;
    return onBatchDeleted();
  }

  const handleImport = async (file: File, updateExisting: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('updateSupport', String(updateExisting));
    importUserApi(formData);
  };

  useEffect(() => {
    if (Array.isArray(selectedKeys) && selectedKeys.length > 0) {
      updateSearchParams({
        ...searchParams.current,
        deptId: selectedKeys[0],
        pageNum: 1
      });
    }
  }, [selectedKeys]);

  const handleSearch = () => {
    updateSearchParams({
      pageNum: 1,
      userName: searchUserName.trim() || undefined,
      phonenumber: searchPhone.trim() || undefined,
      status: searchStatus || undefined,
    } as any);
  };

  const handleReset = () => {
    setSearchUserName('');
    setSearchPhone('');
    setSearchStatus(undefined);
    updateSearchParams({
      pageNum: 1,
      userName: undefined,
      phonenumber: undefined,
      status: undefined,
    } as any);
  };

  const pagination = tableProps.pagination as any;
  const currentPage = searchParams.current?.pageNum || 1;
  const pageSizeVal = searchParams.current?.pageSize || 10;
  const totalCount = pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSizeVal) || 1;
  const [jumpValue, setJumpValue] = useState('');

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
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden', gap: '16px' }}>
      {/* Left: Group Tree */}
      <GroupTree
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
      />

      {/* Right: Data area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Searchbar */}
        <section className="abi-searchbar">
          <div className="abi-search-row">
            <AInput
              allowClear
              placeholder="请输入用户名"
              prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
              value={searchUserName}
              onChange={(e) => setSearchUserName(e.target.value)}
              onPressEnter={handleSearch}
              className="abi-field-input"
              style={{ width: '180px' }}
            />
            <AInput
              allowClear
              placeholder="请输入手机号"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onPressEnter={handleSearch}
              className="abi-field-input"
              style={{ width: '180px' }}
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
              <AButton className="btn-accent-gradient" onClick={() => handleAdd()}>
                <PlusOutlined />新增用户
              </AButton>
              <AButton danger
                icon={<DeleteOutlined />}
                disabled={checkedRowKeys.length === 0}
                onClick={() => deleteBatch()}
              >
                批量删除{checkedRowKeys.length ? `(${checkedRowKeys.length})` : ''}
              </AButton>
              <AButton
                className="btn-ghost-v5"
                onClick={() => setVisible(true)}
              >
                <VerticalAlignTopOutlined style={{ marginRight: 4 }} />导入
              </AButton>
              <AButton
                className="btn-ghost-v5"
                onClick={handExport}
              >
                <VerticalAlignBottomOutlined style={{ marginRight: 4 }} />导出
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
              className="user-table-wrapper"
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
                  rowKey="userId"
                  rowSelection={rowSelection}
                  scroll={{ x: 'max-content' }}
                  size="middle"
                  className="abi-std-table user-table"
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
      </div>

      <Suspense>
        <UserOperateDrawer {...generalPopupOperation} />
      </Suspense>

      {userId ? (
        <ResetPassword
          userId={userId}
          onClose={handleClose}
        />
      ) : null}

      <ImportModal
        visible={visible}
        onClose={() => setVisible(false)}
        onImport={handleImport}
        onLoadTel={() => downLoad('/system/user/importTemplate', {}, '用户列表模板')}
      />
    </div>
  );
}
