import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Empty, type TableProps } from 'antd';
import { useState } from 'react';

import { DeptSelector } from '@/pages/space/space-user/modules/dept';

import { NewCreateUser } from '../components/NewCreateUser';
import { PermissionManagement } from '../components/PermissionManagement';
import { useSpaceListStore } from '../store';

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
    const newRoleData = roleData.filter(item => item.recordId !== index);
    const newAlreadySelectedKeys = newRoleData.map(item => item.oid);
    setAlreadySelectedKeys(newAlreadySelectedKeys);
    setRoleData(newRoleData);
  };

  const columns: TableProps<TableItem>['columns'] = [
    {
      dataIndex: 'oname',
      key: 'oname',
      title: '用户名',
      render: (text: string, record: any) => (
        <span className="sd-v5-user-name">
          <span className="sd-v5-user-avatar">
            <UserOutlined style={{ fontSize: 12 }} />
          </span>
          {text}
          {record.type === 'special-user' && (
            <span className="sd-v5-creator-badge">创建者</span>
          )}
        </span>
      )
    },
    {
      dataIndex: 'orgName',
      key: 'orgName',
      title: '组织',
      render: (text: string) => (
        <span className="sd-v5-org-name">{text || '-'}</span>
      )
    },
    {
      key: 'roles',
      title: '空间角色',
      render: (_: any) => {
        if (_.roles && _.roles.length > 0) {
          return (
            <div className="sd-v5-role-tags">
              {_.roles.map((item: any, idx: number) => (
                <span key={idx} className="sd-v5-role-tag">{item.roleName}</span>
              ))}
            </div>
          );
        }
        return <span className="sd-v5-role-empty">未分配</span>;
      }
    },
    {
      key: 'action',
      title: '操作',
      width: 200,
      render: (_: any) => (
        <div className="ds-action-group">
          <AButton
            className="abi-action-link"
            disabled={_.type === 'special-user'}
            size="small"
            variant="link"
            onClick={() => {
              setCurrentPermissionItemIndex(_.recordId);
              setPermissionDrawerOpen(true);
              const roleIds = Array.isArray(_.roles) ? _.roles.map((item: any) => item.roleId).slice(0, 1) : [];
              setDefaultPermissionKeys(roleIds);
            }}
          >
            <SafetyOutlined style={{ marginRight: 3, fontSize: 12 }} />分配权限
          </AButton>
          <APopconfirm
            title="提示"
            description="确定删除该用户吗？"
            onConfirm={() => handleDeleteUser(_.recordId)}
            disabled={_.type === 'special-user'}
          >
            <AButton
              className="abi-action-link"
              color="danger"
              disabled={_.type === 'special-user'}
              size="small"
              variant="link"
            >
              <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
            </AButton>
          </APopconfirm>
        </div>
      )
    }
  ];

  function handlePermissionSure(permission: any[]) {
    const newRoleData = roleData.map(item => {
      const Item = item;
      if (item.recordId === currentPermissionItemIndex) {
        Item.roles = permission.slice(0, 1);
      }
      return Item;
    });
    setRoleData(newRoleData);
  }

  const handUserAddSure = (data: any[]) => {
    setRoleData(data);
    setNewCreateUserDrawerOpen(false);
  };

  return (
    <section className="sd-v5-user-mgmt">
      {/* Section header */}
      <div className="sd-v5-user-mgmt-header">
        <div className="sd-v5-form-header">
          <div className="sd-v5-form-header-icon">
            <TeamOutlined />
          </div>
          <div>
            <div className="sd-v5-form-title">用户管理</div>
            <div className="sd-v5-form-desc">管理空间成员及角色权限分配</div>
          </div>
        </div>
        <AButton
          className="btn-accent-gradient"
          onClick={() => {
            setNewCreateUserDrawerOpen(true);
            setDefaultPermissionKeys([]);
          }}
        >
          <PlusOutlined /> 管理用户
        </AButton>
      </div>

      {/* Table */}
      <div className="sd-v5-table-wrapper">
        <ATable
          columns={columns}
          dataSource={roleData}
          pagination={false}
          rowKey="recordId"
          size="middle"
          className="abi-std-table sd-v5-user-table"
          locale={{
            emptyText: (
              <div className="sd-v5-empty">
                <Empty description="暂无空间成员" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            )
          }}
        />
      </div>

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
          defaultUserKeys={roleData.map(item => item.recordId)}
          defaultUserRoles={roleData}
          open={newCreateUserDrawerOpen}
          onCancel={() => setNewCreateUserDrawerOpen(false)}
          onConfirm={handUserAddSure}
        />
      )}
    </section>
  );
};
