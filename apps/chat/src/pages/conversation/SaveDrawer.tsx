import React, { useState, useEffect } from 'react';
import { Drawer, Input, message } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { saveAsApp } from '../../service/api/app';
import { saveAsConv } from '../../service/api/conv';

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  conv: any;
}

const SaveDrawer: React.FC<Props> = ({ open, onClose, conv }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // 监听抽屉打开状态,关闭时清空表单
  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!name) {
      message.error('请输入对话名称');
      return;
    }

    try {
      setLoading(true);
      // 先另存为 app
      const appRes = await saveAsApp({
        ...conv,
        biz_name: name,
        remark: description
      });

      // 再另存为 conv
      if (appRes.data) {
        await saveAsConv({
          ...conv,
          chat_id: appRes.data.chat_id,
          biz_name: name,
          remark: description
        });
        message.success('保存成功');
        setName('');
        setDescription('');
        onClose(true);
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title={
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium">另存对话</span>
          <CloseOutlined 
            className="cursor-pointer hover:opacity-70" 
            onClick={onClose}
          />
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={500}
      closable={false}
      styles={{
        body: {
          padding: '24px',
        },
        header: {
          padding: '16px 24px',
          borderBottom: '1px solid #f0f0f0'
        }
      }}
      footer={
        <div className="flex justify-end gap-2 px-6">
          <button 
            className="px-4 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
            onClick={onClose}
            disabled={loading}
          >
            取消
          </button>
          <button 
            className="px-4 py-1 bg-[#2E6CF6] text-white rounded hover:opacity-90 disabled:opacity-50"
            onClick={handleSave}
            disabled={loading}
          >
            确定
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <div className="mb-2">名称</div>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="请输入对话名称"
            disabled={loading}
          />
        </div>
        <div>
          <div className="mb-2">描述</div>
          <Input.TextArea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="请输入对话描述"
            rows={4}
            disabled={loading}
          />
        </div>
      </div>
    </Drawer>
  );
};

export default SaveDrawer; 