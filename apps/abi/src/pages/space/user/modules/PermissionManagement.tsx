import { CloseOutlined, SafetyOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

import { querySpaceRoleList } from '@/service/api/space';
import { getSpaceRoleMenuByRoleIdApi } from '@/service/api/space-role';
import { message } from 'antd';

import './PermissionManagement.scss';

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
      <div className="perm-footer-v5">
        <AButton
          className="btn-ghost-v5"
          onClick={cancel}
        >
          {t('page.login.common.cancel')}
        </AButton>
        <AButton
          className="btn-accent-gradient"
          onClick={sure}
        >
          <SafetyOutlined style={{ marginRight: 6 }} />确认分配
        </AButton>
      </div>
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
      className="perm-drawer-v5"
      closeIcon={null}
      extra={<CloseOutlined className="perm-close-icon" onClick={cancel} />}
      footer={PermissionManagementFooter(sure, cancel)}
      open={open}
      title={
        <div className="perm-title-v5">
          <SafetyOutlined className="perm-title-icon" />
          <span>{t('page.manage.user.assigningRole')}</span>
        </div>
      }
      width={960}
      onClose={() => setOpen(false)}
    >
      <div className="perm-container-v5">
        {/* 左侧：角色列表 */}
        <div className="perm-panel-v5 perm-panel-left">
          <div className="perm-panel-header">
            <div className="perm-panel-title">角色列表</div>
            <div className="perm-panel-subtitle">选择要分配的角色</div>
          </div>
          <div className="perm-panel-body">
            <ACheckbox.Group
              className="perm-role-group"
              style={{ width: '100%' }}
              value={alreadySelectedPermission}
              onChange={handlePermissionChange}
            >
              {permissionList.map(item => {
                const isSelected = alreadySelectedPermission.includes(item.roleId);
                return (
                  <div
                    key={item.roleId}
                    className={`perm-role-card ${isSelected ? 'perm-role-selected' : ''}`}
                  >
                    <ACheckbox value={item.roleId}>
                      <div className="perm-role-content">
                        <div className="perm-role-name">{item.roleName}</div>
                        <div className="perm-role-desc">{item.remark || '暂无描述'}</div>
                      </div>
                    </ACheckbox>
                  </div>
                );
              })}
            </ACheckbox.Group>
          </div>
        </div>

        {/* 右侧：选中角色的空间菜单 */}
        <div className="perm-panel-v5 perm-panel-right">
          <div className="perm-panel-header">
            <div className="perm-panel-title">已分配的空间菜单</div>
            <div className="perm-panel-subtitle">
              {alreadySelectedPermission.length > 0
                ? `已选择 ${alreadySelectedPermission.length} 个角色`
                : '请先选择角色'}
            </div>
          </div>
          <div className="perm-panel-body">
            <ASpin spinning={loading}>
              {alreadySelectedPermission.length === 0 ? (
                <div className="perm-empty-state">
                  <SafetyOutlined className="perm-empty-icon" />
                  <div className="perm-empty-text">请先选择角色</div>
                </div>
              ) : (
                <div className="perm-menu-list">
                  {alreadySelectedPermission.map(roleId => {
                    const role = permissionList.find(r => r.roleId === roleId);
                    const menus = roleMenuMap[roleId];
                    const secondLevelMenus = menus ? getSecondLevelMenus(menus) : [];
                    return (
                      <div
                        key={roleId}
                        className="perm-menu-section"
                      >
                        <div className="perm-menu-header">
                          <span className="perm-menu-role-name">{role?.roleName}</span>
                          <span className="perm-menu-count">{secondLevelMenus.length} 项</span>
                        </div>
                        {secondLevelMenus.length > 0 ? (
                          <div className="perm-menu-tags">
                            {secondLevelMenus.map((menuName, index) => (
                              <span
                                key={`${roleId}-${index}`}
                                className="perm-menu-tag"
                              >
                                {menuName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="perm-menu-empty">暂无菜单权限</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ASpin>
          </div>
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
