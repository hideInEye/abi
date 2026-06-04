import { DeleteOutlined, EllipsisOutlined, FileTextOutlined, FolderOpenOutlined, FolderOutlined, PlusCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Form, message, Modal, Popconfirm, Tooltip, Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import React, { useMemo } from 'react';

import type { TableSemanticsGroupType } from '@/service/api/table-semantics';
import { buildGroupTree, getAllDescendantIds } from '@/pages/workbench/data-preparation/data-table-meaning/utils/helper';

/**
 * 构建父级文件夹树形选项
 * @param list 平铺分组数组
 * @param excludeId 编辑时需排除的分组 ID（排除自身及所有后代，防止循环引用）
 */
function buildParentTreeOptions(list: any[], excludeId?: number): any[] {
  // 编辑模式：过滤掉自身及其所有后代节点，防止选自己或子文件夹作为父级
  const excludeIds = excludeId != null
    ? new Set([excludeId, ...getAllDescendantIds(list, excludeId)])
    : new Set<number>();

  const filteredList = excludeIds.size > 0
    ? list.filter(item => !excludeIds.has(item.groupId))
    : list;

  return buildGroupTree(filteredList).map(function toOption(node: any): any {
    return {
      title: node.groupName,
      value: node.groupId,
      ...(node.children?.length ? { children: node.children.map(toOption) } : {}),
    };
  });
}

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
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

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
        // 新增模式：parentId 来自表单选择（未选则为 0），isPrivate 来自表单
        flag = !!(await handleGroupAdd({
          ...values,
          groupType: config.type,
          parentId: values.parentId ?? 0,
          isPrivate: values.isPrivate ?? false
        }));
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

  const showEditModal = (group: QuestionGroupItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroup(group);
    form.setFieldsValue({
      ...group,
      parentId: group.parentId || undefined,
    });
    setIsModalOpen(true);
  };

  const handleAddGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    showAddModal();
  };

  const handleDeleteGroup = async (groupId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await handleGroupDelete(groupId);
  };

  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0] as string;
      const groupId = Number(key.replace('group-', ''));
      const group = groups.find(g => g.groupId === groupId);
      if (group) {
        setSelectedKeys(selectedKeys);
        onGroupId(group.groupId);
      }
    }
  };

  // 递归构建子节点（区分文件夹/叶子图标，对齐 qknow-ui DeptTree 视觉）
  const buildTreeNodes = (items: any[], currentExpandedKeys: React.Key[]): TreeDataNode[] => {
    return items.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const nodeKey = `group-${item.groupId}`;
      const isExpanded = currentExpandedKeys.includes(nodeKey);
      // 有子节点 → 文件夹图标（展开/折叠区分），叶子节点 → 文档图标
      const nodeIcon = hasChildren
        ? (isExpanded
          ? <FolderOpenOutlined className="group-node-icon group-node-icon--folder-open" />
          : <FolderOutlined className="group-node-icon group-node-icon--folder" />)
        : <FileTextOutlined className="group-node-icon group-node-icon--leaf" />;
      return {
        title: (
          <span className="flex items-center gap-2 w-full group overflow-hidden">
            {nodeIcon}
            <span className="group-tree-title flex-1 min-w-0 truncate">{item.groupName}</span>
            <span className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
              <Tooltip title="编辑">
                <EllipsisOutlined
                  className="text-gray-400 cursor-pointer hover:text-primary"
                  style={{ fontSize: '1rem' }}
                  onClick={(e) => showEditModal(item, e)}
                />
              </Tooltip>
            </span>
          </span>
        ),
        key: nodeKey,
        children: hasChildren ? buildTreeNodes(item.children, currentExpandedKeys) : undefined,
        isLeaf: !hasChildren
      };
    });
  };

  const treeData = useMemo(() => buildTreeNodes(buildGroupTree(groups), expandedKeys), [groups, expandedKeys]);

  return (
    <>
      <div className="group-panel flex flex-col gap-2">
        <AInput
          allowClear
          placeholder={config.inputPlaceholder}
          className="group-search-input"
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <div className="flex items-center justify-between px-1 py-1">
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(0,0,0,0.35)', letterSpacing: '0.05em' }}>文件夹</span>
          <Tooltip title="添加组">
            <PlusCircleOutlined
              className="text-gray-400 cursor-pointer hover:text-primary"
              style={{ fontSize: '0.875rem' }}
              onClick={(e) => handleAddGroup(e as any)}
            />
          </Tooltip>
        </div>
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
        footer={
          <div className="flex items-center justify-between">
            {/* 编辑时左下角显示删除按钮 */}
            {editingGroup ? (
              <Popconfirm
                title="提示"
                description="确定删除该组吗？"
                onConfirm={() => { handleDeleteGroup(editingGroup.groupId); handleModalCancel(); }}
              >
                <Button danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            ) : <span />}
            <div className="flex gap-2">
              <Button onClick={handleModalCancel}>取消</Button>
              <Button type="primary" onClick={handleModalOk}>确认</Button>
            </div>
          </div>
        }
      >
        <AForm form={form} layout="vertical">
          <GroupFrom
            config={config}
            parentOptions={buildParentTreeOptions(groups, editingGroup?.groupId)}
          />
        </AForm>
      </Modal>
    </>
  );
};
