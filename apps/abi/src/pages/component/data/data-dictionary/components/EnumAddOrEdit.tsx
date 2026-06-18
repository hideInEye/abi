import { CloseOutlined, OrderedListOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Drawer, Form, Input } from 'antd';
import React, { useEffect } from 'react';

import { useDataPreparationStore } from '../store';
import type { DictionaryEnumItem } from '../types';

interface AddOrEditEnumProps {
  readonly editObj?: DictionaryEnumItem;
  readonly onClose: () => void;
  readonly onSure: (values: any) => void;
  readonly open: boolean;
}

export const AddOrEditEnum: React.FC<AddOrEditEnumProps> = ({ editObj, onClose, onSure, open }) => {
  const [form] = Form.useForm();
  const { enumInfo, groupInfo } = useDataPreparationStore();

  form.setFieldsValue({
    dictField: enumInfo?.dictField,
    dictName: enumInfo?.dictName,
    groupName: groupInfo.groupName,
    groupNameEn: groupInfo.groupNameEn
  });

  const handleCancel = () => {
    onClose();
    form.resetFields();
  };

  const adrawerSure = async () => {
    const values = await form.validateFields();

    if (!values) {
      return;
    }

    const updateParams = {
      ...editObj,
      type: editObj ? 'edit' : 'add',
      ...values
    };

    onSure(updateParams);
    form.resetFields();
  };

  useEffect(() => {
    if (editObj) {
      form.setFieldsValue(editObj);
    } else {
      form.resetFields();
    }
  }, [editObj]);

  const isEdit = !!editObj;
  const title = isEdit ? '编辑字典枚举' : '新增字典枚举';
  const subtitle = isEdit ? `修改 ${editObj?.dictLabel || ''} 的枚举配置` : `为 ${enumInfo?.dictField || ''} 添加枚举值`;

  return (
    <Drawer
      className="ds-operate-drawer"
      closeIcon={null}
      destroyOnClose
      extra={<CloseOutlined onClick={handleCancel} style={{ color: '#768a9f', fontSize: 16 }} />}
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            alignItems: 'center', background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
            borderRadius: 10, boxShadow: '0 4px 12px rgba(91,124,247,0.3)',
            color: '#fff', display: 'flex', fontSize: 18, height: 36, justifyContent: 'center', width: 36,
          }}>
            <OrderedListOutlined />
          </div>
          <div>
            <div style={{ color: '#1a2744', fontSize: 17, fontWeight: 700, letterSpacing: '0.02em' }}>{title}</div>
            <div style={{ color: '#768a9f', fontSize: 12, marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>
      }
      width={700}
      styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 0 } }}
      footer={
        <div style={{ alignItems: 'center', display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '4px 0' }}>
          <Button
            onClick={handleCancel}
            style={{ background: 'transparent', border: '1px solid rgba(130,140,200,0.18)', borderRadius: 8, color: '#5f7490', fontWeight: 500, height: 38, padding: '0 20px' }}
          >
            取消
          </Button>
          <Button
            onClick={adrawerSure}
            style={{
              background: 'linear-gradient(135deg, #5b7cf7, #7091fa)', border: 'none',
              borderRadius: 8, boxShadow: '0 2px 10px rgba(91,124,247,0.3)', fontWeight: 600,
              height: 38, padding: '0 28px',
            }}
            type="primary"
          >
            保存
          </Button>
        </div>
      }
      onClose={onClose}
    >
      <Form form={form} labelCol={{ span: 4 }} wrapperCol={{ span: 18 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flexShrink: 0, padding: '20px 24px 0' }}>
          {/* Section: 上下文信息 */}
          <div style={{
            alignItems: 'center', borderBottom: '1px solid rgba(130,140,200,0.10)',
            display: 'flex', gap: 10, marginBottom: 20, padding: '10px 0',
          }}>
            <div style={{
              alignItems: 'center', background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
              borderRadius: 7, boxShadow: '0 2px 8px rgba(91,124,247,0.25)',
              color: '#fff', display: 'flex', fontSize: 13, height: 26, justifyContent: 'center', width: 26,
            }}>
              <SettingOutlined />
            </div>
            <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>上下文信息</span>
          </div>

          <Form.Item label={<span style={{ color: '#3e5068', fontWeight: 500 }}>分组名称</span>} name="groupName">
            <Input disabled placeholder="请输入分组名称" style={{ background: 'rgba(242,245,252,0.6)' }} />
          </Form.Item>

          <Form.Item label={<span style={{ color: '#3e5068', fontWeight: 500 }}>字典名称</span>} name="dictField">
            <Input disabled placeholder="请输入字典名称" style={{ background: 'rgba(242,245,252,0.6)' }} />
          </Form.Item>

          <Form.Item label={<span style={{ color: '#3e5068', fontWeight: 500 }}>中文名称</span>} name="dictName">
            <Input disabled placeholder="请输入中文名称" style={{ background: 'rgba(242,245,252,0.6)' }} />
          </Form.Item>
        </div>

        {/* Section: 枚举配置 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 24px 24px' }}>
          <div style={{
            alignItems: 'center', borderBottom: '1px solid rgba(130,140,200,0.10)',
            display: 'flex', gap: 10, marginBottom: 20, padding: '10px 0',
          }}>
            <div style={{
              alignItems: 'center', background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
              borderRadius: 7, boxShadow: '0 2px 8px rgba(91,124,247,0.25)',
              color: '#fff', display: 'flex', fontSize: 13, height: 26, justifyContent: 'center', width: 26,
            }}>
              <SettingOutlined />
            </div>
            <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>枚举配置</span>
          </div>

          <Form.Item
            label={<span style={{ color: '#3e5068', fontWeight: 500 }}>枚举名称</span>}
            name="dictLabel"
            rules={[
              { message: '请输入枚举名称', required: true },
              { max: 50, message: '枚举名称不能超过50个字符' }
            ]}
          >
            <Input placeholder="请输入枚举名称，如 启用" />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: '#3e5068', fontWeight: 500 }}>枚举值</span>}
            name="dictValue"
            rules={[
              { message: '请输入枚举值', required: true },
              { max: 50, message: '枚举值不能超过50个字符' }
            ]}
          >
            <Input placeholder="请输入枚举值，如 1" />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: '#3e5068', fontWeight: 500 }}>枚举排序</span>}
            name="dictSort"
            rules={[{ message: '请输入枚举排序', required: true }]}
          >
            <Input placeholder="请输入排序值，数值越小越靠前" />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: '#3e5068', fontWeight: 500 }}>备注</span>}
            name="remark"
            rules={[{ max: 500, message: '备注不能超过500个字符' }]}
          >
            <Input.TextArea
              placeholder="请输入备注信息"
              rows={3}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          {/* Hints */}
          <div style={{
            background: 'rgba(91,124,247,0.04)', border: '1px solid rgba(91,124,247,0.12)',
            borderRadius: 10, padding: '16px 18px', marginTop: 8,
          }}>
            <div style={{ color: '#3e5068', fontSize: 13, lineHeight: '22px' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>枚举配置说明</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#5f7490' }}>
                <li>枚举名称用于前端展示，如「启用」「禁用」</li>
                <li>枚举值为实际存储的数据，如 <code style={{ background: 'rgba(91,124,247,0.08)', borderRadius: 4, color: '#5b7cf7', fontSize: 12, padding: '1px 6px' }}>1</code>、<code style={{ background: 'rgba(91,124,247,0.08)', borderRadius: 4, color: '#5b7cf7', fontSize: 12, padding: '1px 6px' }}>0</code></li>
                <li>排序值决定枚举在列表中的显示顺序</li>
              </ul>
            </div>
          </div>
        </div>
      </Form>
    </Drawer>
  );
};
