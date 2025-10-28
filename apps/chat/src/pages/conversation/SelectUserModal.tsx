import React, { useState, useEffect } from 'react';
import { Modal, Input, Tree, Table, Button, Space, message, Spin, Tag } from 'antd';
import { SearchOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { fetchDeptList, fetchUserList } from '../../service/api/abi-system'; 
import type { DataNode } from 'antd/es/tree';
import dayjs from 'dayjs';
import SvgIcon from '../../components/SvgIcon';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedUsers: UserType[]) => void;
  selectedUsers: UserType[];
}

interface UserType {
  userId: number;
  userName: string;
  nickName: string;
  email: string;
  phonenumber: string;
  status: string;
  createTime: string;
  remark: string;
  dept?: {
    deptName: string;
  };
  roles: Array<{
    roleName: string;
  }>;
}

const SelectUserModal: React.FC<Props> = ({
  open,
  onClose,
  onConfirm,
  selectedUsers = []
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>(selectedUsers.map(user => user.userId));
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>();
  const [userData, setUserData] = useState<UserType[]>([]);
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    setSelectedKeys(selectedUsers.map(user => user.userId));
  }, [selectedUsers]);

  // 获取部门列表
  const getDeptList = async () => {
    try {
      setLoading(true);
      const res = await fetchDeptList({});
      if (res.data) {
        // 转换数据结构为树形结构
        const transformData = (data: any[]): DataNode[] => {
          return data.map(item => ({
            title: item.deptName,
            key: item.deptId,
            children: item.children ? transformData(item.children) : undefined
          }));
        };
        
        setTreeData([{
          title: '全部机构',
          key: 'all',
          children: transformData(res.data)
        }]);
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
      message.error('获取部门列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取用户列表
  const getUserList = async (deptId?: string | number) => {
    try {
      setUserLoading(true);
      const res = await fetchUserList({ dept_id: deptId });
      if (res.code === 200) {
        setUserData(res.rows || []);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      getDeptList();
      getUserList(); // 初始加载所有用户
    }
  }, [open]);

  // 当选择部门时获取该部门的用户列表
  useEffect(() => {
    if (selectedDept && selectedDept !== 'all') {
      getUserList(selectedDept);
    } else if (selectedDept === 'all') {
      getUserList(); // 加载所有用户
    }
  }, [selectedDept]);

  // 表格列定义
  const columns: ColumnsType<UserType> = [
    {
      title: '用户名称',
      dataIndex: 'userName',
      key: 'userName',
      width: 120,
    },
    {
      title: '用户昵称',
      dataIndex: 'nickName',
      key: 'nickName',
      width: 120,
    },
    {
      title: '所属部门',
      dataIndex: ['dept', 'deptName'],
      key: 'deptName',
      width: 120,
    },
    {
      title: '手机号码',
      dataIndex: 'phonenumber',
      key: 'phonenumber',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === '0' ? 'success' : 'error'}>
          {status === '0' ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: () => (
        <Space size={0}>
          <Button 
            type="link" 
            className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-lg"
          >
            <SvgIcon localIcon="edit" className="w-4 h-4 text-[#8a8a8a]" />
          </Button>
          <Button 
            type="link" 
            className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-lg"
          >
            <SvgIcon localIcon="star" className="w-4 h-4 text-[#8a8a8a]" />
          </Button>
          <Button 
            type="link" 
            className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-lg"
          >
            <SvgIcon localIcon="share" className="w-4 h-4 text-[#8a8a8a]" />
          </Button>
          <Button 
            type="link" 
            className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-lg"
          >
            <SvgIcon localIcon="copy" className="w-4 h-4 text-[#8a8a8a]" />
          </Button>
          <Button 
            type="link" 
            className="flex items-center justify-center w-8 h-8 hover:bg-gray-100 rounded-lg"
          >
            <SvgIcon localIcon="delete" className="w-4 h-4 text-[#8a8a8a]" />
          </Button>
        </Space>
      )
    }
  ];

  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const handleSelect = (selectedRowKeys: React.Key[]) => {
    setSelectedKeys(selectedRowKeys);
  };

  const handleConfirm = () => {
    const selectedUserData = userData.filter(user => selectedKeys.includes(user.userId));
    onConfirm(selectedUserData);
    onClose();
  };

  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    setSelectedDept(selectedKeys[0] as string);
  };

  // 过滤用户数据
  const filteredUserData = userData.filter(user => 
    user.userName.toLowerCase().includes(searchValue.toLowerCase()) ||
    user.nickName.toLowerCase().includes(searchValue.toLowerCase()) ||
    user.phonenumber.includes(searchValue)
  );

  return (
    <Modal
      title="添加用户"
      open={open}
      width={1200}
      closable={false}
      closeIcon={
        <Button
          icon={<CloseOutlined />}
          type="text"
          onClick={onClose}
        />
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleConfirm}>
            确认
          </Button>
        </div>
      }
    >
      <div className="flex h-[600px]">
        {/* 左侧组织树 */}
        <div className="w-[240px] border-r pr-4">
          <Spin spinning={loading}>
            <Tree
              treeData={treeData}
              defaultExpandAll={true}
              onSelect={handleTreeSelect}
            />
          </Spin>
        </div>

        {/* 右侧用户列表 */}
        <div className="flex-1 pl-4">
          <div className="mb-4">
            <Input
              placeholder="请输入用户名称、昵称、手机号码"
              prefix={<SearchOutlined />}
              value={searchValue}
              onChange={e => handleSearch(e.target.value)}
              allowClear
            />
          </div>

          <Table
            columns={columns}
            dataSource={filteredUserData}
            rowKey="userId"
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys: selectedKeys,
              onChange: handleSelect,
            }}
            pagination={{
              pageSize: 10,
              showQuickJumper: true,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ y: 450 }}
            loading={userLoading}
          />
        </div>
      </div>
    </Modal>
  );
};

export default SelectUserModal; 