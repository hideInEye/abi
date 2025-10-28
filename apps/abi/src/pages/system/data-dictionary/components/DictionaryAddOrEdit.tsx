import { Button as AButton, Drawer as ADrawer, Flex as AFlex, Form as AForm, Input as AInput, Form } from 'antd';
import React, { useEffect } from 'react';

interface AddOrEditDictionaryProps {
  readonly editObj?: any;
  readonly onClose: () => void;
  readonly onSure: (values: any) => void;
  readonly open: boolean;
}

export const AddOrEditDictionary: React.FC<AddOrEditDictionaryProps> = ({ editObj, onClose, onSure, open }) => {
  const [form] = Form.useForm();

  const handleCancel = () => {
    onClose();
    form.resetFields();
  };

  const adrawerSure = async () => {
    const values = await form.validateFields();
    if (values) {
      onSure(values);
      form.resetFields();
    }
  };

  useEffect(() => {
    if (editObj) {
      form.setFieldsValue(editObj);
    } else {
      form.resetFields();
    }
  }, [editObj]);

  return (
    <ADrawer
      open={open}
      title={editObj ? '编辑字典' : '添加字典'}
      width={700}
      footer={
        <Footer
          onCancel={handleCancel}
          onSure={adrawerSure}
        />
      }
      onClose={onClose}
    >
      <AForm
        form={form}
        layout="vertical"
      >
        <AForm.Item
          label="英文名称"
          name="dictField"
          rules={[
            { message: '请输入英文名称', required: true },
            { max: 30, message: '长度不能超过20个字符' },
            {
              message: '请输入英文字符，以下划线分割',
              pattern: /^[\u4E00-\u9FA5a-zA-Z_]+$/
            }
          ]}
        >
          <AInput placeholder="请输入英文名称" />
        </AForm.Item>

        <AForm.Item
          label="中文名称"
          name="dictName"
          rules={[
            { message: '请输入中文名称', required: true },
            { max: 20, message: '长度不能超过20个字符' }
          ]}
        >
          <AInput placeholder="请输入中文名称" />
        </AForm.Item>

        <AForm.Item
          label="字典描述"
          name="remark"
        >
          <AInput.TextArea
            placeholder="请输入字典描述信息"
            rows={4}
          />
        </AForm.Item>
      </AForm>
    </ADrawer>
  );
};

function Footer({ onCancel, onSure }: { readonly onCancel: () => void; readonly onSure: () => void }) {
  return (
    <AFlex
      className="justify-end"
      gap={10}
    >
      <AButton onClick={onCancel}>取消</AButton>
      <AButton
        type="primary"
        onClick={onSure}
      >
        确定
      </AButton>
    </AFlex>
  );
}
