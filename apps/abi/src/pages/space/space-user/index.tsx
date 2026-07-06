import { DeleteOutlined, LeftOutlined, PlusOutlined, ReloadOutlined, RightOutlined, SafetyOutlined, SearchOutlined } from '@ant-design/icons';
import { message } from 'antd';

import { getSpaceInfo, updateSpaceInfo } from '@/service/api';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

import { PermissionManagement } from './modules/PermissionManagement';
import { DeptSelector } from './modules/dept';

function getFirstRoleIdList(roles: any[]) {
  if (!Array.isArray(roles)) return [];
  const roleId = roles.find((item: any) => item?.roleId !== undefined && item?.roleId !== null)?.roleId;
  return roleId === undefined || roleId === null ? [] : [roleId];
}

export function Component() {
  const { t } = useTranslation();
  const spaceId = useAppSelector(getSpaceId);

  const [permissionDrawerOpen, setPermissionDrawerOpen] = useState(false);
  const [newCreateUserDrawerOpen, setNewCreateUserDrawerOpen] = useState(false);
  const [currentPermissionItemIndex, setCurrentPermissionItemIndex] = useState<number>(0);
  const [defaultPermissionKeys, setDefaultPermissionKeys] = useState<any[]>([]);
  const [defaultUserKeys, setDefaultUserKeys] = useState<any[]>([]);
  const [defaultUserRoles, setDefaultUserRoles] = useState<any[]>([]);
  const [spaceInfo, setSpaceInfo] = useState<any>({});
  const [searchValue, setSearchValue] = useState('');

  const {
    columnChecks,
    data,
    run,
    searchParams,
    setColumnChecks,
    tableProps,
    updateSearchParams
  } = useTable({
    apiFn: async (params: any) => {
      try {
        const response = await getSpaceInfo(params.spaceId);
        if (response?.data?.owners) {
          const userList = JSON.parse(response.data.owners);
          // 前端搜索过滤
          const keyword = params.oname?.trim();
          const filtered = keyword
            ? userList.filter((u: any) => (u.oname || '').includes(keyword))
            : userList;
          return {
            data: filtered,
            total: filtered.length
          };
        }
        return { data: [], total: 0 };
      } catch {
        message.error('获取空间信息失败');
        return { data: [], total: 0 };
      }
    },
    apiParams: {
      pageNum: 1,
      pageSize: 100000,
      spaceId
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'oname',
          key: 'oname',
          minWidth: 140,
          title: '空间成员'
        },
        {
          align: 'center',
          dataIndex: 'otype',
          key: 'otype',
          minWidth: 100,
          render: (_, row) => {
            return row.otype == 1 ? '用户' : '部门';
          },
          title: '成员类型'
        },
        {
          align: 'center',
          dataIndex: 'orgName',
          key: 'orgName',
          minWidth: 140,
          title: t('page.manage.user.organization')
        },
        {
          align: 'center',
          key: 'roles',
          minWidth: 160,
          render: (_, __) => {
            if (_.roles && _.roles.length > 0) {
              return _.roles.map((item: any) => item.roleName).join(',');
            }
            return '-';
          },
          title: '空间角色'
        },
        {
          align: 'center',
          fixed: 'right',
          key: 'operate',
          minWidth: 180,
          render: (_, __) => (
            <div className="ds-action-group">
              <AButton
                className="abi-action-link"
                size="small"
                variant="link"
                disabled={_.type === 'special-user'}
                onClick={() => openDistributeRole(_)}
              >
                <SafetyOutlined style={{ marginRight: 3, fontSize: 12 }} />分配角色
              </AButton>
              <APopconfirm
                title="提示"
                description={t('common.confirmDelete')}
                onConfirm={() => handleDelete(_.recordId)}
              >
                <AButton className="abi-action-link" size="small" variant="link" disabled={_.type === 'special-user'}>
                  <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
                </AButton>
              </APopconfirm>
            </div>
          ),
          title: t('common.operate'),
        }
      ] as any,
    // @ts-expect-error ------------
    rowKey: 'userId',
    transformer: (res: any): any => {
      const { data: records = [], total: totalNum = 0 } = res || {};
      let resRecords = records;
      if (records.items) {
        resRecords = records.items;
      }
      const pageNum = searchParams.current.pageNum || searchParams.current.page || 1;
      const pageSize = searchParams.current.pageSize || searchParams.current.page_size || 10;
      const recordsWithIndex = resRecords.map((item: any, index: number) => {
        return {
          ...item,
          index: (pageNum - 1) * pageSize + index + 1
        };
      });

      return {
        data: recordsWithIndex,
        pageNum: searchParams.current.pageNum,
        pageSize: searchParams.current.pageSize,
        total: totalNum || records.total_count
      };
    }
  });

  const {
    checkedRowKeys,
    onBatchDeleted,
    onDeleted,
    rowSelection,
  } = useTableOperate(
    data as any,
    run,
    async () => {},
    true
  );

  async function handlePermissionSure(permission: any[]) {
    const userData = data.map((item: any) => {
      const Item = item;
      if (item.recordId === currentPermissionItemIndex) {
        Item.roles = permission.slice(0, 1);
      }
      return Item;
    });

    const params = {
      ...spaceInfo,
      owners: JSON.stringify(userData)
    };
    const res = await updateSpaceInfo(params);
    if (res.response.data.code !== 200) {
      message.error(res.response.data.msg || '分配失败');
    } else {
      message.success('分配成功');
      updateSearchParams({ pageNum: 1, pageSize: 100000 });
      getCurSpaceInfo();
    }
  }

  function openAdd() {
    setNewCreateUserDrawerOpen(true);
    const owners = JSON.parse(spaceInfo.owners || '[]');
    const keys = owners.map((i: any) => i.recordId);
    setDefaultUserKeys(keys);
    setDefaultUserRoles(owners);
  }

  async function handUserAddSure(roleData: any) {
    const params = {
      ...spaceInfo,
      owners: JSON.stringify(roleData)
    };
    const res = await updateSpaceInfo(params);
    if (res.response.data.code !== 200) {
      message.error(res.response.data.msg || '分配失败');
    } else {
      message.success('分配成功');
      setNewCreateUserDrawerOpen(false);
      updateSearchParams({ pageNum: 1, pageSize: 100000 });
      getCurSpaceInfo();
    }
  }

  function openDistributeRole(user: any) {
    setCurrentPermissionItemIndex(user.recordId);
    setPermissionDrawerOpen(true);
    setDefaultPermissionKeys(getFirstRoleIdList(user?.roles));
  }

  async function handleDelete(index: number) {
    const owners = JSON.parse(spaceInfo.owners || '[]');
    const filtered = owners.filter((item: any) => item.recordId !== index);

    const params = {
      ...spaceInfo,
      owners: JSON.stringify(filtered)
    };
    const res = await updateSpaceInfo(params);
    if (res.response.data.code !== 200) {
      message.error(res.response.data.msg || '删除失败');
      return false;
    }
    message.success('删除成功');
    getCurSpaceInfo();
    return onDeleted();
  }

  async function handleBatchDelete() {
    if (checkedRowKeys.length === 0) {
      message.warning('请先选择要删除的成员');
      return;
    }
    const owners = JSON.parse(spaceInfo.owners || '[]');
    const filtered = owners.filter((item: any) => !checkedRowKeys.includes(String(item.userId)));
    const params = {
      ...spaceInfo,
      owners: JSON.stringify(filtered)
    };
    const res = await updateSpaceInfo(params);
    if (res.response.data.code !== 200) {
      message.error(res.response.data.msg || '批量删除失败');
    } else {
      message.success('批量删除成功');
      onBatchDeleted();
      getCurSpaceInfo();
    }
  }

  async function getCurSpaceInfo() {
    const res = await getSpaceInfo(spaceId);
    setSpaceInfo(res.data);
  }

  useEffect(() => {
    getCurSpaceInfo();
  }, [spaceId]);

  const handleSearch = () => {
    updateSearchParams({
      pageNum: 1,
      oname: searchValue.trim() || undefined,
    } as any);
  };

  const handleReset = () => {
    setSearchValue('');
    updateSearchParams({
      pageNum: 1,
      oname: undefined,
    } as any);
  };

  const pagination = tableProps.pagination as any;
  const currentPage = searchParams.current?.pageNum || searchParams.current?.page || 1;
  const pageSizeVal = searchParams.current?.pageSize || searchParams.current?.page_size || 10;
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Searchbar */}
      <section className="abi-searchbar">
        <div className="abi-search-row">
          <AInput
            allowClear
            placeholder="请输入成员名称"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
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
      <section className="abi-data-area">
        {/* Toolbar */}
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" onClick={() => openAdd()}>
              <PlusOutlined />管理成员
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
            className="space-user-table-wrapper"
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
                rowKey="userId"
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

      {permissionDrawerOpen && (
        <PermissionManagement
          defaultPermissionKeys={defaultPermissionKeys}
          open={permissionDrawerOpen}
          permissionCancel={() => setPermissionDrawerOpen(false)}
          permissionSure={handlePermissionSure}
          setOpen={setPermissionDrawerOpen}
        />
      )}

      {newCreateUserDrawerOpen && (
        <DeptSelector
          defaultUserKeys={defaultUserKeys}
          defaultUserRoles={defaultUserRoles}
          open={newCreateUserDrawerOpen}
          onCancel={() => setNewCreateUserDrawerOpen(false)}
          onConfirm={handUserAddSure}
        />
      )}
    </div>
  );
}
