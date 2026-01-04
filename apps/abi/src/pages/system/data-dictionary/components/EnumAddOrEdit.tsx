import { CloseOutlined } from '@ant-design/icons';
import { Form } from 'antd';
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

  return (
    <ADrawer
      closeIcon={null}
      extra={<CloseOutlined onClick={handleCancel} />}
      open={open}
      title={editObj ? '编辑字典枚举' : '添加字典枚举'}
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
        labelCol={{ span: 4 }}
        wrapperCol={{ span: 14 }}
      >
        <AForm.Item
          label="分组名称"
          name="groupName"
        >
          <AInput
            disabled
            placeholder="请输入分组名称"
          />
        </AForm.Item>

        {/* <AForm.Item
          label="分组英文名"
          name="groupNameEn"
        >
          <AInput
            disabled
            placeholder="请输入分组英文名"
          />
        </AForm.Item> */}

        <AForm.Item
          label="字典名称"
          name="dictField"
        >
          <AInput
            disabled
            placeholder="请输入字典名称"
          />
        </AForm.Item>

        <AForm.Item
          label="中文名称"
          name="dictName"
        >
          <AInput
            disabled
            placeholder="请输入中文名称"
          />
        </AForm.Item>        

        <AForm.Item
          label="枚举名称"
          name="dictLabel"
          rules={[
            { message: '请输入枚举名称', required: true },
            { max: 50, message: '枚举名称不能超过50个字符' }
          ]}
        >
          <AInput placeholder="请输入枚举名称" />
        </AForm.Item>

        <AForm.Item
          label="枚举值"
          name="dictValue"
          rules={[
            { message: '请输入枚举值', required: true },
            { max: 50, message: '枚举值不能超过50个字符' }
          ]}
        >
          <AInput placeholder="请输入枚举值" />
        </AForm.Item>
        <AForm.Item
          label="枚举排序"
          name="dictSort"
          rules={[{ message: '请输入枚举排序', required: true }]}
        >
          <AInput placeholder="请输入枚举排序" />
        </AForm.Item>

        <AForm.Item
          label="备注"
          name="remark"
          rules={[
            { max: 500, message: '备注不能超过500个字符' }
          ]}
        >
          <AInput.TextArea
            placeholder="请输入备注"
            rows={3}
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
