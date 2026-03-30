import { EditOutlined, MinusCircleOutlined, PlusCircleOutlined, FolderOutlined, ApartmentOutlined } from '@ant-design/icons';
import { Form, message, Modal, Popconfirm, Tooltip, Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import React from 'react';

import type { TableSemanticsGroupType } from '@/service/api/table-semantics';
import { buildGroupTree } from '@/pages/workbench/data-preparation/data-table-meaning/utils/helper';

import { GroupFrom } from './GroupFrom';
import { type QuestionGroupItem, useGroupManagement } from './useGroupManagement';
import  './group.scss'

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
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['group-root']);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [addParentItem, setAddParentItem] = useState<QuestionGroupItem | null>(null);

  useEffect(() => {
    getGroups();
  }, []);

  useEffect(() => {
    if (groups.length > 0) {
      const firstKey = `group-${groups[0].groupId}`;
      setSelectedKeys([firstKey]);
      onGroupId(groups[0].groupId);
    }
  }, [groups]);

  const handleSearch = (value: string) => {
    setGroups([]);
    handleGroupSearch(value);
    getGroups(value);
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
       flag = await handleGroupEdit({ ...editingGroup, ...values, groupType: config.type });
       
      } else {
        // 新增模式
      flag = !!(await handleGroupAdd({ ...values, groupType: config.type, parentId: addParentItem?.groupId ?? 0 }));
      }
      if(flag){
        handleModalCancel();
        message.success(editingGroup?'编辑成功':'创建成功')
      }
    } catch (error) {
      console.error('Validate Failed:', error);
    }
  };

  const showAddModal = (parentItem?: QuestionGroupItem | null) => {
    setAddParentItem(parentItem ?? null);
    setEditingGroup(null);
    setIsModalOpen(true);
  };

  const showEditModal = (group: QuestionGroupItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroup(group);
    form.setFieldsValue(group);
    setIsModalOpen(true);
  };

  const handleAddGroup = (e: React.MouseEvent, parentItem?: QuestionGroupItem) => {
    e.stopPropagation();
    showAddModal(parentItem);
  };

  const handleAddChildGroup = (item: QuestionGroupItem, e: React.MouseEvent) => {
    e.stopPropagation();
    showAddModal(item);
  };

  const handleDeleteGroup = async (groupId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await handleGroupDelete(groupId);
  };

  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0] as string;
      if (key !== 'group-root') {
        const groupId = Number(key.replace('group-', ''));
        const group = groups.find(g => g.groupId === groupId);
        if (group) {
          setSelectedKeys(selectedKeys);
          onGroupId(group.groupId);
        }
      }
    }
  };

  // 递归构建子节点
  const buildTreeNodes = (items: any[], isLeafLevel = false): TreeDataNode[] => {
    return items.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const nodeIsLeaf = !hasChildren;
      return {
        title: (
          <span className="inline-flex items-center gap-2 group">
            {nodeIsLeaf
              ? <ApartmentOutlined className="group-node-icon group-node-icon--leaf" />
              : <FolderOutlined className="group-node-icon group-node-icon--folder" />
            }
            <span className="group-tree-title">{item.groupName}</span>
            <span className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100">
              {!nodeIsLeaf || true ? (
                <Tooltip title="添加子组">
                  <PlusCircleOutlined className="text-gray-400 cursor-pointer hover:text-primary" onClick={(e) => handleAddChildGroup(item, e)} />
                </Tooltip>
              ) : null}
              <Tooltip title="编辑">
                <EditOutlined className="text-gray-400 cursor-pointer hover:text-primary" onClick={(e) => showEditModal(item, e)} />
              </Tooltip>
              <Popconfirm
                title="提示"
                description="确定删除该组吗？"
                onConfirm={(e) => handleDeleteGroup(item.groupId, e as any)}
                onCancel={(e) => e?.stopPropagation()}
              >
                <Tooltip title="删除">
                  <MinusCircleOutlined className="text-gray-400 cursor-pointer hover:text-red-500" onClick={(e) => e.stopPropagation()} />
                </Tooltip>
              </Popconfirm>
            </span>
          </span>
        ),
        key: `group-${item.groupId}`,
        children: hasChildren ? buildTreeNodes(item.children) : undefined,
        isLeaf: nodeIsLeaf
      };
    });
  };

  const treeData: TreeDataNode[] = [
    {
      title: (
        <span className="inline-flex items-center gap-2 group">
          <FolderOutlined className="group-node-icon group-node-icon--folder" />
          <span className="group-tree-title">{config.panelTitle}</span>
          <span className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <Tooltip title="添加组">
              <PlusCircleOutlined className="text-gray-400 cursor-pointer hover:text-primary" onClick={handleAddGroup} />
            </Tooltip>
          </span>
        </span>
      ),
      key: 'group-root',
      children: buildTreeNodes(buildGroupTree(groups))
    }
  ];

  return (
    <>
      <div className="group-panel flex flex-col gap-2">
        <AInput
          placeholder={config.inputPlaceholder}
          className="group-search-input"
          onChange={(e) => handleSearch(e.target.value)}
        />
        <Tree
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys)}
          selectedKeys={selectedKeys}
          onSelect={handleTreeSelect}
          blockNode
        />
      </div>

      <Modal
        open={isModalOpen}
        centered
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
