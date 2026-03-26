import { Button, Form, Input, Modal } from 'antd';
import { useEffect } from 'react';

import { addgroupsub, editGroup } from '@/service/api/data-table-meaning';
import { formattedDate } from '@/utils/date';

import { useTableSemanticsStore } from '../store/useTableSemanticsStore';

export const EditGroup = ({ updateGroupData }: { readonly updateGroupData: () => void }) => {
  const [form] = Form.useForm();
  const { editAddGroup, editGroupItem, groupModalOpen, setGroupModalOpen } = useTableSemanticsStore();

  const handleCancel = () => {
    form.resetFields();
    setGroupModalOpen(false);
  };

  const handleOk = async () => {
    const { groupName, remark } = await form.validateFields();
    if (editAddGroup === 1) {
      await addgroupsub({
        groupName,
        groupType: 'shema',
        parentId: editGroupItem?.groupId ?? 0,
        remark,
        spaceId: Number(localStorage.getItem('spaceId')),
        status: 1
      });
    } else {
      await editGroup({
        ...editGroupItem,
        groupName,
        remark,
        updateTime: formattedDate()
      });
    }
    handleCancel();
    updateGroupData();
  };

  useEffect(() => {
    if (editGroupItem) {
      form.setFieldsValue({
        groupName: editGroupItem.groupName,
        remark: editGroupItem.remark
      });
    }
  }, [editGroupItem, form,groupModalOpen]);

  return (
    <Modal
      open={groupModalOpen}
      centered
      title={editAddGroup === 1 ? '新增组' : '编辑组'}
      footer={[
        <Button
          key="back"
          onClick={handleCancel}
        >
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleOk}
        >
          确认
        </Button>
      ]}
      onCancel={handleCancel}
    >
      <Form
        form={form}
        labelCol={{ sm: { span: 6 }, xs: { span: 24 } }}
        style={{ maxWidth: 600 }}
        wrapperCol={{ sm: { span: 14 }, xs: { span: 24 } }}
      >
        <Form.Item
          label="组名称"
          name="groupName"
          rules={[
            { message: '组名称未填写', required: true },
            { max: 50, message: '组名称最多50个字符' }
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="组描述"
          name="remark"
          rules={[
            { max: 500, message: '组描述最多500个字符' }
          ]}
        >
          <Input.TextArea maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
};
