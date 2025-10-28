import { CloseOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

import { querySpaceRoleList } from '@/service/api/space';

import type { PermissionItem } from '../types';

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
  const [permissionList, setPermissionList] = useState<PermissionItem[]>([]);
  const [alreadySelectedPermission, setAlreadySelectedPermission] = useState<any[]>(defaultPermissionKeys);

  function handlePermissionChange(value: any[]) {
    setAlreadySelectedPermission(value);
  }

  async function getSpaceRoleList() {
    const { data } = await querySpaceRoleList();
    setPermissionList(data);
  }

  useEffect(() => {
    getSpaceRoleList();
  }, []);

  const sure = () => {
    if (alreadySelectedPermission.length === 0) {
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
      title="权限管理"
      width={900}
      onClose={() => setOpen(false)}
    >
      <div className="border border-gray-2 rd-2 border-solid p-6">
        <ACheckbox.Group
          className="grid grid-cols-1 gap-8"
          style={{ width: '100%' }}
          value={alreadySelectedPermission}
          onChange={handlePermissionChange}
        >
          {permissionList.map(item => (
            <ACheckbox
              key={item.roleId}
              value={item.roleId}
            >
              <div className="flex flex-col pl4">
                <p className="text-base font-bold">{item.roleName}</p>
                <p className="text-sm text-gray-5">{item.remark || '暂无描述'}</p>
              </div>
            </ACheckbox>
          ))}
        </ACheckbox.Group>
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
        取消
      </AButton>
      <AButton
        type="primary"
        onClick={sure}
      >
        完成
      </AButton>
    </AFlex>
  );
}
