import { DeleteOutlined, SafetyOutlined } from '@ant-design/icons';
import { message } from 'antd';

import { getSpaceInfo, updateSpaceInfo } from '@/service/api';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

import { PermissionManagement } from './modules/PermissionManagement';
import { DeptSelector } from './modules/dept';

export function Component() {
  const { t } = useTranslation();
  const spaceId = useAppSelector(getSpaceId);
  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const [permissionDrawerOpen, setPermissionDrawerOpen] = useState(false);
  const [newCreateUserDrawerOpen, setNewCreateUserDrawerOpen] = useState(false);
  const [currentPermissionItemIndex, setCurrentPermissionItemIndex] = useState<number>(0);
  const [defaultPermissionKeys, setDefaultPermissionKeys] = useState<any[]>([]);
  const [defaultUserKeys, setDefaultUserKeys] = useState<any[]>([]);
  const [defaultUserRoles, setDefaultUserRoles] = useState<any[]>([]);
  const [spaceInfo, setSpaceInfo] = useState<any>({});

  const {
    columnChecks,
    data,
    run,
    searchParams,
    searchProps: _searchProps,
    setColumnChecks,
    tableProps,
    updateSearchParams
  } = useTable({
    apiFn: async (params: any) => {
      try {
        // 调用您的 API 方法获取空间信息
        const response = await getSpaceInfo(params.spaceId);
        if (response?.data?.owners) {
          const userList = JSON.parse(response.data.owners);
          return {
            data: userList,
            total: userList.length
          };
        }
        return {
          data: [],
          total: 0
        };
      } catch (error) {
        message.error('获取空间信息失败');
        throw error;
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
          title: '空间成员'
        },
        {
          align: 'center',
          dataIndex: 'otype',
          key: 'otype',
          title: '成员类型',
          render:(_,row)=>{
            const { otype}  = row
            return otype ==1?'用户':'部门'
          }
        },
        {
          align: 'center',
          dataIndex: 'orgName',
          key: 'orgName',
          title: t('page.manage.user.organization')
        },
        {
          key: 'roles',
          render: (_, __, _index) => {
            if (_.roles && _.roles.length > 0) {
              return _.roles.map((item: any) => item.roleName).join(',');
            }
            return '-';
          },
          title: '空间角色'
        },
        {
          align: 'center',
          key: 'operate',
          render: (_, __) => (
            <div className="flex-center gap-8px">
              <ATooltip title={t('page.manage.user.assigningRole')}>
                <AButton
                  className="tex-14px"
                  disabled={_.type === 'special-user'}
                  icon={<SafetyOutlined />}
                  type="text"
                  onClick={() => {
                    openDistributeRole(_);
                  }}
                />
              </ATooltip>

              <APopconfirm
                title={t('common.confirmDelete')}
                onConfirm={() => handleDelete(_.recordId)}
              >
                <ATooltip title={t('page.manage.common.delete')}>
                  <AButton
                    className="text-red"
                    color="danger"
                    disabled={_.type === 'special-user'}
                    icon={<DeleteOutlined />}
                    type="text"
                  />
                </ATooltip>
              </APopconfirm>
            </div>
          ),
          title: t('common.operate'),
          width: 200
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

  const { onDeleted } = useTableOperate(
    data as any,
    run,
    // eslint-disable-next-line
    async (res: any, type) => {

    }
  );

  async function handlePermissionSure(permission: any[]) {
    const userData = data.map(item=>{
      const Item = item;
      if(item.recordId === currentPermissionItemIndex) {
        Item.roles = permission;
      }
      return Item
    })

    // 调用更新空间接口：
    const params = {
      ...spaceInfo,
      owners: JSON.stringify(userData)
    };
    const res = await updateSpaceInfo(params);
    if (res.response.data.code !== 200) {
      message.error(res.response.data.msg || '分配失败');
    } else {
      message.success('分配成功');

      updateSearchParams({
        pageNum: 1,
        pageSize: 100000
      });
      getCurSpaceInfo();
    }
  }

  function openAdd() {
    setNewCreateUserDrawerOpen(true);

    const owners = JSON.parse(spaceInfo.owners);
    console.log('owners:', owners);
    
    const keys = owners.map((i: any) => i.recordId);
    setDefaultUserKeys(keys);
    setDefaultUserRoles(owners);
  }

  async function handUserAddSure(roleData: any) {
    // 调用更新空间接口：
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
      updateSearchParams({
        pageNum: 1,
        pageSize: 100000
      });
      getCurSpaceInfo();
    }
  }

  function openDistributeRole(user: any) {
    const roleIds: any[] = [];
    if (user && Array.isArray(user.roles)) {
      user.roles.forEach((i: any) => {
        roleIds.push(i.roleId);
      });
    }
    setCurrentPermissionItemIndex(user.recordId);
    setPermissionDrawerOpen(true);
    setDefaultPermissionKeys(roleIds);
  }

  async function handleDelete(index: number) {
    const owners = JSON.parse(spaceInfo.owners);
    const data = owners.filter(item=>item.recordId!==index)

    // 调用更新空间接口：
    const params = {
      ...spaceInfo,
      owners: JSON.stringify(data)
    };
    const res = await updateSpaceInfo(params);
    if (res.response.data.code !== 200) {
      message.error(res.response.data.msg || '删除失败');
      return false;
    }
    message.success('删除成功');
    getCurSpaceInfo()
    return onDeleted();
  }

  async function getCurSpaceInfo() {
    const res = await getSpaceInfo(spaceId);
    setSpaceInfo(res.data);
  }

  useEffect(() => {
    getCurSpaceInfo();
  }, [spaceId]);

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        ref={tableWrapperRef}
        title="空间成员列表"
        extra={
          <TableHeaderOperation
            addTitle="管理"
            columns={columnChecks}
            loading={tableProps.loading}
            refresh={run}
            setColumnChecks={setColumnChecks}
            add={() => {
              openAdd();
            }}
          />
        }
      >
        {/* @ts-expect-error ------------ */}
        <ATable
          scroll={scrollConfig}
          size="small"
          {...tableProps}
        />
      </ACard>

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
