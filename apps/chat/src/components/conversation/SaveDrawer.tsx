import React, { useState, useEffect } from 'react';
import { Drawer, Input, message, Form } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { saveAsApp } from '../../service/api/app';
import { saveAsConv } from '../../service/api/conv';
import { fetchRecommendQuestions } from '../../service/api/conv';

const defaultSwitchStatesConfig: Record<string, boolean> = {
  'intent_detection': true,
  'sql_generation': true,
  'exception_guidance': true,
  'db_intent_clarify': true,
  'db_data_summary': true,
  'dim_indicator_query_rewrite': true,
  'analysis_intent_clarify': true,
  'analysis_data_summary': true,
  'analysis_query_rewrite': true,
  'predict_intent_clarify': true,
  'predict_data_summary': true,
  'predict_query_rewrite': true,
  'excel_analysis': true,
  'excel_output': true,
  'dashboard_intent_clarify': false,
  'dashboard_analysis': false,
};

interface Props {
  open: boolean;
  onClose: (refresh?: boolean, payload?: any) => void;
  conv: any;
}

const SaveDrawer: React.FC<Props> = ({ open, onClose, conv }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const buildChatConfigForCopy = async () => {
    try {
      const parsed = JSON.parse(conv?.chat_config || '{}');
      const prompts = Array.isArray(parsed?.prompts) ? parsed.prompts : [];
      if (prompts.length > 0) {
        return conv?.chat_config;
      }
    } catch (e) {
      // ignore
    }

    const recommendRes = await fetchRecommendQuestions({});
    const list = recommendRes.data || [];
    const promptsWithStatus = list.map((p: any) => {
      const sub = p?.sub_chat_scene;
      const def = sub ? defaultSwitchStatesConfig[sub] : undefined;
      if (def === undefined) return p;
      return { ...p, status: def ? '1' : '0' };
    });
    return JSON.stringify({ prompts: promptsWithStatus });
  };

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
    if (name.length > 20) {
      message.error('名称不能超过20个字符');
      return;
    }
    if (description && description.length > 50) {
      message.error('描述不能超过50个字符');
      return;
    }

    try {
      setLoading(true);
      const chat_config = await buildChatConfigForCopy();
      // 先另存为 app
      const appRes = await saveAsApp({
        ...conv,
        biz_name: name,
        remark: description,
        chat_config,
      });
      if (appRes.data) {
        const convRes = await saveAsConv({
          ...conv,
          chat_id: appRes.data.chat_id,
          biz_name: name,
          remark: description,
          chat_config,
        });
        message.success('保存成功');
        setName('');
        setDescription('');
        onClose(true, {
          newApp: {
            ...appRes.data,
            dbName: conv?.dbName,
            modelName: conv?.modelName
          },
          newConv: convRes?.data
        });
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
          <span className="text-lg font-medium">另存为对话</span>
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
          <Form>
            <Form.Item
              validateStatus={name.length > 20 ? 'error' : ''}
              help={name.length > 20 ? '名称不能超过20个字符' : ''}>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="请输入对话名称"
                status={name.length > 20 ? 'error' : ''}
                disabled={loading}
              />
            </Form.Item>
          </Form>
        </div>
        <div>
          <div className="mb-2">描述</div>
          <Form>
            <Form.Item
              validateStatus={description.length > 50 ? 'error' : ''}
              help={description.length > 50 ? '描述不能超过50个字符' : ''}
            >
              <Input.TextArea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="请输入对话描述"
                status={description.length > 50 ? 'error' : ''}
                rows={4}
                disabled={loading}
              />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Drawer>
  );
};

export default SaveDrawer; 