import { ApartmentOutlined, DeleteOutlined, EllipsisOutlined, FileTextOutlined, FolderOpenOutlined, FolderOutlined, MoreOutlined, PlusOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Form, message, Modal, Popconfirm, Tooltip, Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';

import type { TableSemanticsGroupType } from '@/service/api/table-semantics';
import { buildGroupTree, getAllDescendantIds } from '@/pages/workbench/data-preparation/data-table-meaning/utils/helper';

/**
 * 构建父级文件夹树形选项
 * @param list 平铺分组数组
 * @param excludeId 编辑时需排除的分组 ID（排除自身及所有后代，防止循环引用）
 */
function buildParentTreeOptions(list: any[], excludeId?: string): any[] {
  // 编辑模式：过滤掉自身及其所有后代节点，防止选自己或子文件夹作为父级
  const excludeIds = excludeId != null
    ? new Set([excludeId, ...getAllDescendantIds(list, excludeId)])
    : new Set<string>();

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
import { getInitialGroupSelection } from './group-selection';
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
    panelTitle?: string;
    remark?: string;
    rule: any[];
    type: TableSemanticsGroupType;
  };
  readonly onGroupId: (groupId: string | number, groupName?: string) => void;
  /** 上报“是否存在分组”（null=加载中），供右侧业务区域门控使用 */
  readonly onGroupsChange?: (hasAnyGroup: boolean | null) => void;
}

/** Group 对外暴露的命令式句柄 */
export interface GroupHandle {
  /** 打开新增分组弹窗（供右侧空状态“新建分组”按钮调用） */
  openAddModal: () => void;
}

export const Group = forwardRef<GroupHandle, GroupProps>(({ config, onGroupId, onGroupsChange }, ref) => {
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
    hasAnyGroup,
    isModalOpen,
    setEditingGroup,
    setIsModalOpen
  } = useGroupManagement(config);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onGroupsChange?.(hasAnyGroup);
  }, [hasAnyGroup]);

  useEffect(() => {
    getGroups();
    setSelectedKeys([]);
    setExpandedKeys([]);
  }, [spaceId]);

  useEffect(() => {
    const initialSelection = getInitialGroupSelection(groups);

    setSelectedKeys(initialSelection.selectedKeys);
    setExpandedKeys(initialSelection.expandedKeys);

    if (initialSelection.selectedGroup) {
      onGroupId(initialSelection.selectedGroup.groupId, initialSelection.selectedGroup.groupName);
    } else {
      // 分组为空时通知父组件清空数据
      onGroupId('');
    }
  }, [groups]);

  const handleSearch = (value: string) => {
    void handleGroupSearch(value);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingGroup(null);
    form.resetFields();
  };

  const handleModalOk = async () => {
    if (submitting) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      let flag:any = true
      if (editingGroup) {
        // 编辑模式
       flag = await handleGroupEdit({ ...editingGroup, ...values, groupType: editingGroup.groupType || config.type });
             
      } else {
        // 新增模式：parentId 来自表单选择（未选则是 0）
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
    } finally {
      setSubmitting(false);
    }
  };

  const showAddModal = () => {
    setEditingGroup(null);
    setIsModalOpen(true);
  };

  useImperativeHandle(ref, () => ({ openAddModal: showAddModal }));

  const showEditModal = (group: QuestionGroupItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroup(group);
    form.setFieldsValue({
      ...group,
      parentId: (group.parentId && String(group.parentId) !== '0') ? group.parentId : undefined,
    });
    setIsModalOpen(true);
  };

  const handleAddGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    showAddModal();
  };

  const handleDeleteGroup = async (groupId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // 存在子分组时拦截删除：后端只删父组，子组会变成脏数据
    const hasChildren = groups.some(group => String(group.parentId) === String(groupId));
    if (hasChildren) {
      message.warning('该分组下存在子分组，请先删除或移动子分组');
      return false;
    }
    await handleGroupDelete(groupId);
    return true;
  };

  const handleTreeSelect = (keys: React.Key[], info: { node: any }) => {
    const nodeKey = info.node.key as string;
    // 始终选中当前点击节点
    setSelectedKeys([nodeKey]);
    const groupIdStr = nodeKey.replace('group-', '');
    const group = groups.find(g => String(g.groupId) === groupIdStr);
    // 直接用解析出的 groupId 回调，不依赖 groups.find 结果
    onGroupId(groupIdStr, group?.groupName);
    // 文件夹节点：点击行切换展开/折叠（对齐 qknow-ui DeptTree 行为）
    if (!info.node.isLeaf) {
      setExpandedKeys(currentKeys =>
        currentKeys.includes(nodeKey)
          ? currentKeys.filter(key => key !== nodeKey)
          : [...currentKeys, nodeKey]
      );
    }
  };

  // 递归构建子节点（图标和缩进保持原样，折叠箭头移到右侧，字体按 v5 调整）
  const buildTreeNodes = (items: any[], currentExpandedKeys: React.Key[]): TreeDataNode[] => {
    return items.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const nodeKey = `group-${item.groupId}`;
      const isExpanded = currentExpandedKeys.includes(nodeKey);

      // 图标统一为文件夹语义：有子级且展开为打开文件夹，其余为关闭文件夹（右侧列表才是文件）
      const nodeIcon = hasChildren && isExpanded
        ? <FolderOpenOutlined className="group-node-icon group-node-icon--folder-open" />
        : <FolderOutlined className="group-node-icon group-node-icon--folder" />;

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

  /** 弹窗标题 — v5 渐变图标 + 主/副标题 */
  const modalTitle = (
    <div className="group-modal-title">
      <div className="group-modal-title-icon">
        <ApartmentOutlined />
      </div>
      <div className="group-modal-title-text">
        <span className="group-modal-title-main">
          {editingGroup ? config.modalEditTitle : config.modalAddTitle}
        </span>
        <span className="group-modal-title-sub">
          {editingGroup ? '修改分组信息及层级关系' : '创建新的分组节点'}
        </span>
      </div>
    </div>
  );

  const treeData = useMemo(() => buildTreeNodes(buildGroupTree(groups, '0', true), expandedKeys), [groups, expandedKeys]);

  return (
    <>
      <div className="group-panel">
        <div className="group-header">
          <div className="group-header-title">
            数据目录
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
        className="group-modal-v5"
        title={modalTitle}
        onCancel={() => {
          if (!submitting) handleModalCancel();
        }}
        footer={
          <div className="group-modal-footer">
            {editingGroup ? (
              <Popconfirm
                title="提示"
                description="确定删除该组吗？"
                onConfirm={async () => {
                  const deleted = await handleDeleteGroup(editingGroup.groupId);
                  if (deleted) handleModalCancel();
                }}
              >
                <Button className="group-modal-btn-danger" icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            ) : <span />}
            <div className="group-modal-footer-actions">
              <Button className="btn-ghost-v5" disabled={submitting} onClick={handleModalCancel}>取消</Button>
              <Button className="btn-accent-gradient" loading={submitting} onClick={handleModalOk}>确认</Button>
            </div>
          </div>
        }
      >
        <div className="group-modal-form-panel">
          <AForm form={form} layout="vertical">
            <GroupFrom
              config={config}
              parentOptions={buildParentTreeOptions(groups, editingGroup?.groupId)}
            />
          </AForm>
        </div>
      </Modal>
    </>
  );
});

Group.displayName = 'Group';
