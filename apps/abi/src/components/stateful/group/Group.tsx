import { DeleteOutlined, EllipsisOutlined, FileTextOutlined, FolderOpenOutlined, FolderOutlined, MoreOutlined, PlusOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
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
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';
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
  readonly onGroupId: (groupId: number, groupName?: string) => void;
}

export const Group: React.FC<GroupProps> = ({ config, onGroupId }) => {
  const spaceId = useAppSelector(getSpaceId);
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
    setSelectedKeys([]);
  }, [spaceId]);

  useEffect(() => {
    if (groups.length > 0) {
      const firstKey = `group-${groups[0].groupId}`;
      setSelectedKeys([firstKey]);
      onGroupId(groups[0].groupId, groups[0].groupName);
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

  const handleTreeSelect = (keys: React.Key[], info: { node: any }) => {
    const nodeKey = info.node.key as string;
    // 始终选中当前点击节点
    setSelectedKeys([nodeKey]);
    const groupId = Number(nodeKey.replace('group-', ''));
    const group = groups.find(g => g.groupId === groupId);
    if (group) {
      onGroupId(group.groupId, group.groupName);
    }
    // 文件夹节点：点击行切换展开/折叠（对齐 qknow-ui DeptTree 行为）
    if (!info.node.isLeaf) {
      if (expandedKeys.includes(nodeKey)) {
        setExpandedKeys(expandedKeys.filter(k => k !== nodeKey));
      } else {
        setExpandedKeys([...expandedKeys, nodeKey]);
      }
    }
  };

  // 递归构建子节点（图标和缩进保持原样，折叠箭头移到右侧，字体按 v5 调整）
  const buildTreeNodes = (items: any[], currentExpandedKeys: React.Key[]): TreeDataNode[] => {
    return items.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const nodeKey = `group-${item.groupId}`;
      const isExpanded = currentExpandedKeys.includes(nodeKey);

      // 图标保持原蓝色文件夹 / 浅蓝文档图标
      const nodeIcon = hasChildren
        ? (isExpanded
          ? <FolderOpenOutlined className="group-node-icon group-node-icon--folder-open" />
          : <FolderOutlined className="group-node-icon group-node-icon--folder" />)
        : <FileTextOutlined className="group-node-icon group-node-icon--leaf" />;

      // 右侧折叠箭头（仅文件夹节点）
      const chevron = hasChildren ? (
        <span className={`group-node-chevron ${isExpanded ? 'open' : ''}`}>
          <RightOutlined />
        </span>
      ) : null;

      return {
        title: (
          <span className={`group-node-label ${hasChildren ? 'is-folder' : 'is-leaf'}`}>
            {nodeIcon}
            <span className="group-tree-title">{item.groupName}</span>
            <span className="group-node-action">
              <Tooltip title="编辑">
                <MoreOutlined
                  className="text-gray-400 cursor-pointer hover:text-primary"
                  style={{ fontSize: '1rem' }}
                  onClick={(e) => showEditModal(item, e)}
                />
              </Tooltip>
            </span>
            {chevron}
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
      <div className="group-panel">
        <div className="group-header">
          <div className="group-header-title">
            {config.panelTitle}
            <Tooltip title="添加组">
              <div className="group-add-btn" onClick={(e) => handleAddGroup(e as any)}>
                <PlusOutlined />
              </div>
            </Tooltip>
          </div>
          <div className="group-search">
            <SearchOutlined />
            <input
              className="group-search-input-inner"
              type="text"
              placeholder={config.inputPlaceholder}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="group-tree-body">
          <Tree
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            selectedKeys={selectedKeys}
            onSelect={handleTreeSelect}
            blockNode
            motion={false}
          />
        </div>
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
