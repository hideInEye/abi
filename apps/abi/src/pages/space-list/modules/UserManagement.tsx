import { SearchOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';

import { NewCreateUser } from '../components/NewCreateUser';
import { PermissionManagement } from '../components/PermissionManagement';
import { useSpaceListStore } from '../store';
import { DeptSelector } from '@/pages/space/user/modules/dept';

interface TableItem {
  dept: string;
  permissions: any[];
  roles: string;
  userName: string;
}

export const UserManagement = () => {
  const [permissionDrawerOpen, setPermissionDrawerOpen] = useState(false);
  const [newCreateUserDrawerOpen, setNewCreateUserDrawerOpen] = useState(false);
  const [currentPermissionItemIndex, setCurrentPermissionItemIndex] = useState<number>(0);
  const { alreadySelectedKeys, roleData, setAlreadySelectedKeys, setRoleData } = useSpaceListStore();
  const [defaultPermissionKeys, setDefaultPermissionKeys] = useState<any[]>([]);

  const handleDeleteUser = (index: number) => {
    const newRoleData = roleData.filter(item=>item.recordId!==index)
    const newAlreadySelectedKeys = newRoleData.map(item=>item.oid)
    setAlreadySelectedKeys(newAlreadySelectedKeys);
    setRoleData(newRoleData);
  };

  const columns: TableProps<TableItem>['columns'] = [
    {
      dataIndex: 'oname',
      key: 'oname',
      title: '用户名'
    },
    {
      dataIndex: 'orgName',
      key: 'orgName',
      title: '组织'
    },
    {
      key: 'roles',
      render: _ => {
        if (_.roles && _.roles.length > 0) {
          return _.roles.map((item: any) => item.roleName).join(',');
        }
        return '-';
      },
      title: '空间角色'
    },
    {
      key: 'action',
      render: (_, __, index) => (
        <ASpace size="middle">
          <AButton
            color="primary"
            disabled={_.type === 'special-user'}
            size="small"
            type="text"
            variant="link"
            onClick={() => {
              setCurrentPermissionItemIndex(_.recordId);
              setPermissionDrawerOpen(true);
              const roleIds = _.roles.map((item: any) => item.roleId);
              setDefaultPermissionKeys(roleIds);
            }}
          >
            分配权限
          </AButton>
          <AButton
            color="danger"
            disabled={_.type === 'special-user'}
            size="small"
            type="text"
            variant="link"
            onClick={() => {
              handleDeleteUser(_.recordId);
            }}
          >
            删除用户
          </AButton>
        </ASpace>
      ),
      title: '操作'
    }
  ];

  function handlePermissionSure(permission: any[]) {
    const  newRoleData = roleData.map(item=>{
      const Item = item
      if(item.recordId === currentPermissionItemIndex) {
        Item.roles = permission
      }
      return Item
    })
    setRoleData(newRoleData);
  }

  const handUserAddSure = (data :any[]) =>{
    setRoleData(data)
    setNewCreateUserDrawerOpen(false)
  }

  return (
    <section>
      <div className="my4 flex items-center justify-end">
        <AButton
          type="primary"
          onClick={() => {
            setNewCreateUserDrawerOpen(true);
            setDefaultPermissionKeys([]);
          }}
        >
          新建用户
        </AButton>
      </div>
      <ATable
        columns={columns}
        dataSource={roleData}
      />
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
        // <NewCreateUser
        //   open={newCreateUserDrawerOpen}
        //   setOpen={setNewCreateUserDrawerOpen}
        // />
         <DeptSelector
            defaultUserKeys={roleData.map(item=>item.recordId)}
            defaultUserRoles={roleData}
            open={newCreateUserDrawerOpen}
            onCancel={() => setNewCreateUserDrawerOpen(false)}
            onConfirm={handUserAddSure}
          />
      )}
    </section>
  );
};
