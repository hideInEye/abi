import { CloseOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

import { querySpaceRoleList } from '@/service/api/space';
import { getSpaceRoleMenuByRoleIdApi } from '@/service/api/space-role';
import { message } from 'antd';

interface PermissionItem {
  admin: false;
  createBy: null;
  dataScope: string;
  dataSource: number;
  delFlag: string;
  deptCheckStrictly: false;
  deptIds: null;
  flag: false;
  menuCheckStrictly: false;
  menuIds: null;
  permissions: null;
  remark: null;
  roleId: number;
  roleKey: string;
  roleName: string;
  roleSort: number;
}

interface MenuTreeItem {
  id: number;
  label: string;
  children?: MenuTreeItem[];
}

interface PermissionManagementProps {
  defaultPermissionKeys: any[];
  open: boolean;
  permissionCancel: () => void;
  permissionSure: (permission: any[]) => void;
  setOpen: (open: boolean) => void;
}

export const PermissionManagement: FC<PermissionManagementProps> = ({
  defaultPermissionKeys,
  open,
  permissionCancel,
  permissionSure,
  setOpen
}) => {
  const { t } = useTranslation();
  const [permissionList, setPermissionList] = useState<PermissionItem[]>([]);
  const [alreadySelectedPermission, setAlreadySelectedPermission] = useState<any[]>(defaultPermissionKeys);
  const [roleMenuMap, setRoleMenuMap] = useState<Record<number, MenuTreeItem[]>>({});
  const [loading, setLoading] = useState(false);

  function handlePermissionChange(value: any[]) {
    setAlreadySelectedPermission(value);
    // 加载新选中角色的菜单
    value.forEach(roleId => {
      if (!roleMenuMap[roleId]) {
        loadRoleMenu(roleId);
      }
    });
  }

  async function getSpaceRoleList() {
    const { data } = await querySpaceRoleList();
    setPermissionList(data);
  }

  async function loadRoleMenu(roleId: number) {
    try {
      setLoading(true);
      const res: any = await getSpaceRoleMenuByRoleIdApi(roleId);
      if (res?.response?.data?.menus) {
        setRoleMenuMap(prev => ({
          ...prev,
          [roleId]: res.response.data.menus
        }));
      }
    } catch (error) {
      console.error('Failed to load role menu:', error);
    } finally {
      setLoading(false);
    }
  }

  // 获取二级菜单（只展示子菜单）
  function getSecondLevelMenus(menus: MenuTreeItem[]): string[] {
    const secondLevelMenus: string[] = [];
    menus?.forEach(menu => {
      if (menu.children && menu.children.length > 0) {
        menu.children.forEach(child => {
          secondLevelMenus.push(child.label);
        });
      }
    });
    return secondLevelMenus;
  }

  function PermissionManagementFooter(sure: () => void, cancel: () => void) {
    return (
      <AFlex
        className="gap-6 py-6"
        justify="flex-end"
      >
        <AButton
          type="default"
          onClick={cancel}
        >
          {t('page.login.common.cancel')}
        </AButton>
        <AButton
          type="primary"
          onClick={sure}
        >
          确认
        </AButton>
      </AFlex>
    );
  }

  useEffect(() => {
    getSpaceRoleList();
  }, []);

  useEffect(() => {
    if (open && alreadySelectedPermission.length > 0) {
      alreadySelectedPermission.forEach(roleId => {
        if (!roleMenuMap[roleId]) {
          loadRoleMenu(roleId);
        }
      });
    }
  }, [open, alreadySelectedPermission]);

  const sure = () => {
    if (alreadySelectedPermission.length === 0) {
      message.warning('未选择空间角色权限');
      return;
    }

    const spaceRole = alreadySelectedPermission.map(key => {
      const role = permissionList.find((item: any) => item.roleId === key);
      if (role) {
        return {
          roleId: role.roleId,
          roleName: role.roleName
        };
      }
      return null;
    });

    permissionSure(spaceRole);
    setAlreadySelectedPermission([]);
    setOpen(false);
  };

  const cancel = () => {
    permissionCancel();
    setOpen(false);
    setAlreadySelectedPermission([]);
  };

  return (
    <ADrawer
      closeIcon={null}
      extra={<CloseOutlined onClick={cancel} />}
      footer={PermissionManagementFooter(sure, cancel)}
      open={open}
      title={t('page.manage.user.assigningRole')}
      width={900}
      onClose={() => setOpen(false)}
    >
      <div className="flex gap-4 h-full">
        {/* 左侧：角色列表 */}
        <div className="w-2/5 border border-gray-2 rd-2 border-solid p-4">
          <div className="mb-4 text-base font-medium">角色列表</div>
          <ACheckbox.Group
            className="flex flex-col gap-3"
            style={{ width: '100%' }}
            value={alreadySelectedPermission}
            onChange={handlePermissionChange}
          >
            {permissionList.map(item => (
              <ACheckbox
                key={item.roleId}
                value={item.roleId}
              >
                <div className="flex flex-col">
                  <p className="text-sm font-medium">{item.roleName}</p>
                  <p className="text-xs text-gray-5">{item.remark || '暂无描述'}</p>
                </div>
              </ACheckbox>
            ))}
          </ACheckbox.Group>
        </div>

        {/* 右侧：选中角色的空间菜单 */}
        <div className="w-3/5 border border-gray-2 rd-2 border-solid p-4">
          <div className="mb-4 text-base font-medium">已分配的空间菜单</div>
          <ASpin spinning={loading}>
            <div className="max-h-[500px] overflow-y-auto">
              {alreadySelectedPermission.length === 0 ? (
                <div className="text-center text-gray-5 py-8">请先选择角色</div>
              ) : (
                alreadySelectedPermission.map(roleId => {
                  const role = permissionList.find(r => r.roleId === roleId);
                  const menus = roleMenuMap[roleId];
                  const secondLevelMenus = menus ? getSecondLevelMenus(menus) : [];
                  
                  return (
                    <div
                      key={roleId}
                      className="mb-6"
                    >
                      <div className="mb-3">
                        <span className="text-sm font-medium text-primary">{role?.roleName}</span>
                      </div>
                      {secondLevelMenus.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {secondLevelMenus.map((menuName, index) => (
                            <ATag
                              key={`${roleId}-${index}`}
                              color="blue"
                            >
                              {menuName}
                            </ATag>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-5 pl-4">暂无菜单权限</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ASpin>
        </div>
      </div>
    </ADrawer>
  );
};

PermissionManagement.propTypes = {
  defaultPermissionKeys: PropTypes.array.isRequired,
  open: PropTypes.bool.isRequired,
  permissionCancel: PropTypes.func.isRequired,
  permissionSure: PropTypes.func.isRequired,
  setOpen: PropTypes.func.isRequired
};
