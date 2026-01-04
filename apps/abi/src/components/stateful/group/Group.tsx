import { PlusOutlined } from '@ant-design/icons';
import { Button, Collapse, Form, Input, message, Modal, Space } from 'antd';
import React from 'react';

import type { TableSemanticsGroupType } from '@/service/api/table-semantics';

import { GroupFrom } from './GroupFrom';
import GroupList from './GroupList';
import { type QuestionGroupItem, useGroupManagement } from './useGroupManagement';
import  './group.scss'

const { Panel } = Collapse;

export interface GroupProps {
  readonly config: {
    button: string;
    inputLabel: string;
    inputPlaceholder: string;
    inputPlaceholderEn?: string;
    modalAddTitle: string;
    modalEditTitle: string;
    panelTitle: string;
    remark?: string;
    rule: any[];
    type: TableSemanticsGroupType;
  };
  readonly onGroupId: (groupId: number) => void;
}

export const Group: React.FC<GroupProps> = ({ config, onGroupId }) => {
  const [form] = Form.useForm();
  const {
    editingGroup,
    getGroups,
    groups,
    handleGroupAdd,
    handleGroupDelete,
    handleGroupEdit,
    handleGroupSearch,
    isModalOpen,
    setEditingGroup,
    setGroups,
    setIsModalOpen
  } = useGroupManagement(config);

  useEffect(() => {
    getGroups();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGroups([]);
    handleGroupSearch(e.target.value);
    getGroups(e.target.value);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingGroup(null);
    form.resetFields();
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      let flag:any = true
      if (editingGroup) {
        // 编辑模式
       flag = await handleGroupEdit({ ...editingGroup, ...values, groupType: config.type },form);
       
      } else {
        // 新增模式
      flag = !!(await handleGroupAdd({ ...values, groupType: config.type,form }));
      }
      if(flag){
        handleModalCancel();
        message.success(editingGroup?'编辑成功':'创建成功')
      }
    } catch (error) {
      console.error('Validate Failed:', error);
    }
  };

  const showAddModal = () => {
    setEditingGroup(null);
    setIsModalOpen(true);
  };

  const showEditModal = (group: QuestionGroupItem) => {
    setEditingGroup(group);
    form.setFieldsValue(group);
    setIsModalOpen(true);
  };

  return (
    <>
      <Space direction="vertical" className="space">
        <Input
          placeholder={config.inputPlaceholder}
          onChange={handleSearch}
        />
        <Collapse defaultActiveKey={['1']}>
          <Panel
            className="min-w-100"
            header={config.panelTitle}
            key="1"
            extra={
              <Button
                color="primary"
                icon={<PlusOutlined />}
                size="small"
                type="primary"
                variant="outlined"
                onClick={e => {
                  e.stopPropagation();
                  showAddModal();
                }}
              >
                {config.button}
              </Button>
            }
          >
            <GroupList
              groups={groups}
              onDelete={handleGroupDelete}
              onEdit={showEditModal}
              onGroupId={onGroupId}
            />
          </Panel>
        </Collapse>
      </Space>

      <Modal
        open={isModalOpen}
        title={editingGroup ? config.modalEditTitle : config.modalAddTitle}
        onCancel={handleModalCancel}
        onOk={handleModalOk}
        okText="确认"
      >
        <AForm form={form}>
          <GroupFrom config={config} />
        </AForm>
      </Modal>
    </>
  );
};
