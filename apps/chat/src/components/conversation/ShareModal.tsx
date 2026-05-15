import React, { useState } from 'react';
import { Drawer, Input, Select, Radio, DatePicker, Button, Space, message } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import SelectUserModal from './SelectUserModal';

interface Props {
  open: boolean;
  onClose: () => void;
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

const ShareModal: React.FC<Props> = ({ open, onClose }) => {
  const [selectedUsers, setSelectedUsers] = useState<UserType[]>([]);
  const [permission, setPermission] = useState<string>('edit');
  const [authType, setAuthType] = useState<'none' | 'password' | 'token'>('none');
  const [shareLink, setShareLink] = useState<string>('https://demo.dataease.cn/#/de-link/wFEH6kmP');
  const [selectUserModalVisible, setSelectUserModalVisible] = useState(false);

  // 权限选项
  const permissions = [
    { label: '可编辑', value: 'edit' },
    { label: '可查看/下载', value: 'viewDownload' },
    { label: '仅查看', value: 'view' },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    message.success('复制成功');
  };

  const handleSelectUsers = (users: UserType[]) => {
    setSelectedUsers(users);
  };

  const handleRemoveUser = (userId: number) => {
    setSelectedUsers(selectedUsers.filter(user => user.userId !== userId));
  };

  return (
    <>
      <Drawer
        title="分享对话"
        placement="right"
        onClose={onClose}
        open={open}
        width={600}
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            type="text"
            onClick={() => onClose()}
          />
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" onClick={handleCopyLink}>
              复制链接
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* 选择用户 */}
          <div className="flex">
            <div className="w-[90px] flex-shrink-0">选择用户</div>
            <div className="flex-1">
              <div 
                className="border rounded flex items-center cursor-pointer hover:border-blue-400"
                onClick={() => setSelectUserModalVisible(true)}
              >
                <div className="flex-1 min-h-[32px] px-3 py-1 flex items-center flex-wrap gap-1">
                  {selectedUsers.map(user => (
                    <span
                      key={user.userId}
                      className="inline-flex items-center gap-1 bg-gray-100 px-1 rounded text-sm"
                      onClick={e => e.stopPropagation()}
                    >
                      {user.userName}
                      <CloseOutlined
                        className="cursor-pointer hover:text-blue-500 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveUser(user.userId);
                        }}
                      />
                    </span>
                  ))}
                  {selectedUsers.length === 0 && (
                    <span className="text-gray-400">请选择用户</span>
                  )}
                </div>
                <div className="px-3 py-1 border-l flex items-center hover:bg-gray-50">
                  <PlusOutlined className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* 开通权限 */}
          <div className="flex">
            <div className="w-[90px] flex-shrink-0">开通权限</div>
            <div className="flex-1">
              <Select
                value={permission}
                onChange={setPermission}
                options={permissions}
                className="w-full"
              />
            </div>
          </div>

          {/* 失效日期 */}
          <div className="flex">
            <div className="w-[90px] flex-shrink-0">失效日期</div>
            <div className="flex-1">
              <DatePicker className="w-full" placeholder="选择失效日期" />
            </div>
          </div>

          {/* 认证方式 */}
          <div className="flex">
            <div className="w-[90px] flex-shrink-0">认证方式</div>
            <div className="flex-1">
              <Radio.Group value={authType} onChange={e => setAuthType(e.target.value)}>
                <Space>
                  <Radio value="none">无</Radio>
                  <Radio value="password">加密</Radio>
                  <Radio value="token">token</Radio>
                </Space>
              </Radio.Group>
            </div>
          </div>

          {/* 分享链接 */}
          <div className="flex">
            <div className="w-[90px] flex-shrink-0">分享链接</div>
            <div className="flex-1">
              <Input value={shareLink} readOnly className="w-full" />
            </div>
          </div>
        </div>
      </Drawer>

      <SelectUserModal
        open={selectUserModalVisible}
        onClose={() => setSelectUserModalVisible(false)}
        onConfirm={handleSelectUsers}
        selectedUsers={selectedUsers}
      />
    </>
  );
};

export default ShareModal;