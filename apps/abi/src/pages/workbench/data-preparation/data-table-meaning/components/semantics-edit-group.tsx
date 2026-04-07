import { DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Popconfirm, Switch, TreeSelect } from 'antd';
import { useEffect } from 'react';

import { addgroupsub, editGroup } from '@/service/api/data-table-meaning';
import { deleteTableSemanticsGroup } from '@/service/api/table-semantics';
import { formattedDate } from '@/utils/date';

import { useTableSemanticsStore } from '../store/useTableSemanticsStore';
import { buildGroupTree } from '../utils/helper';
import type { groupitem } from '../types';

interface EditGroupProps {
  readonly updateGroupData: () => void;
  readonly allGroups: groupitem[];
}

function buildParentTreeOptions(list: groupitem[], excludeId?: number): any[] {
  return buildGroupTree(list).flatMap(function toOption(node: any): any[] {
    if (node.groupId === excludeId) return [];
    return [{
      title: node.groupName,
      value: node.groupId,
      children: node.children?.flatMap(toOption) ?? []
    }];
  });
}

export const EditGroup = ({ updateGroupData, allGroups }: EditGroupProps) => {
  const [form] = Form.useForm();
  const { editAddGroup, editGroupItem, groupModalOpen, setGroupModalOpen } = useTableSemanticsStore();

  const handleCancel = () => {
    form.resetFields();
    setGroupModalOpen(false);
  };

  const handleOk = async () => {
    const { groupName, parentId } = await form.validateFields();
    if (editAddGroup === 1) {
      await addgroupsub({
        groupName,
        groupType: 'shema',
        parentId: parentId ?? 0,
        spaceId: Number(localStorage.getItem('spaceId')),
        status: 1
      });
    } else {
      await editGroup({
        ...editGroupItem,
        groupName,
        parentId: parentId ?? 0,
        updateTime: formattedDate()
      });
    }
    handleCancel();
    updateGroupData();
  };

  const handleDelete = async () => {
    if (editGroupItem?.groupId) {
      await deleteTableSemanticsGroup(editGroupItem.groupId);
      handleCancel();
      updateGroupData();
    }
  };

  useEffect(() => {
    if (groupModalOpen) {
      if (editAddGroup === 2 && editGroupItem) {
        form.setFieldsValue({
          groupName: editGroupItem.groupName,
          parentId: editGroupItem.parentId || undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [editGroupItem, editAddGroup, form, groupModalOpen]);

  // 编辑时排除自身，避免选自己为父级
  const parentOptions = buildParentTreeOptions(
    allGroups,
    editAddGroup === 2 ? editGroupItem?.groupId : undefined
  );

  return (
    <Modal
      open={groupModalOpen}
      centered
      title={editAddGroup === 1 ? '新增组' : '编辑组'}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 左侧删除按钮（仅编辑模式显示） */}
          <div>
            {editAddGroup === 2 && (
              <Popconfirm
                title="提示"
                description="确认删除该组吗？"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            )}
          </div>
          {/* 右侧取消/确认 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" onClick={handleOk}>确认</Button>
          </div>
        </div>
      }
      onCancel={handleCancel}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          label="组名称"
          name="groupName"
          style={{ marginBottom: 12 }}
          rules={[
            { message: '组名称未填写', required: true },
            { max: 50, message: '组名称最多50个字符' }
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="父级文件夹"
          name="parentId"
          style={{ marginBottom: 12 }}
        >
          <TreeSelect
            allowClear
            placeholder="无（根目录）"
            treeData={parentOptions}
            treeDefaultExpandAll
            style={{ width: '100%' }}
          />
        </Form.Item>

        {/* 私密开关 - 卡片风格 */}
        <Form.Item name="isPrivate" valuePropName="checked" noStyle>
          <Switch style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }} />
        </Form.Item>
        <Form.Item shouldUpdate noStyle style={{ marginBottom: 0 }}>
          {({ getFieldValue, setFieldsValue }) => (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                background: '#f5f5f5',
                cursor: 'pointer',
              }}
              onClick={() => setFieldsValue({ isPrivate: !getFieldValue('isPrivate') })}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#333', fontSize: '0.875rem' }}>
                <LockOutlined style={{ color: '#8c8c8c' }} />
                设为私密文件夹
              </span>
              <Switch
                size="small"
                checked={getFieldValue('isPrivate')}
                onClick={(_checked, e) => e.stopPropagation()}
                onChange={val => setFieldsValue({ isPrivate: val })}
              />
            </div>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};
