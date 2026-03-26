import { DeleteOutlined, EditOutlined, PlusCircleOutlined, MinusCircleOutlined, FolderOutlined, ApartmentOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tooltip, Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import React, { useEffect, useState } from 'react';

import { deleteTableSemanticsGroup, tableSemanticsGroupList } from '@/service/api/table-semantics';
import { buildGroupTree } from '../utils/helper';
import '@/components/stateful/group/group.scss';
import './index.scss';

import { EditGroup } from '../components/semantics-edit-group';
import { useTableSemanticsStore } from '../store/useTableSemanticsStore';
import { useTableStore } from '../store/useTableStore';
import type { groupitem } from '../types';

interface DataGroupProps {
  readonly groupName: string;
  readonly onDefaultGroupUpdate: (data: any) => void;
}

export const SemanticsGroup: React.FC<DataGroupProps> = ({ groupName, onDefaultGroupUpdate }) => {
  const { setEditAddGroup, setEditGroupItem, setGroupModalOpen } = useTableSemanticsStore();
  const [listSemanticGroup, setListSemanticGroup] = useState<groupitem[]>([]);
  const { groupId, setGroupId } = useTableStore();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['group-root']);

  const groupNameClick = async (item: any) => {
    setGroupId(item.groupId);
    onDefaultGroupUpdate(item);
  };

  const groupList = async () => {
    const pageSize = 1000;
    const pageNum = 1;
    const spaceId = Number(localStorage.getItem('spaceId'));
    const { response } = await tableSemanticsGroupList({
      groupName,
      groupType: 'shema',
      pageNum,
      pageSize,
      spaceId
    });
    const { rows } = response.data as unknown as { rows: any[] };
    if (rows.length > 0) {
      groupNameClick(rows[0]);
      setListSemanticGroup(rows);
    }
  };

  useEffect(() => {
    setListSemanticGroup([]);
    groupList();
  }, [groupName]);

  const handleDelete = async (key: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTableSemanticsGroup(key);
    setListSemanticGroup([]);
    groupList();
  };

  function handleEditGroup(item: any, e: React.MouseEvent) {
    e.stopPropagation();
    setGroupModalOpen(true);
    setEditAddGroup(2);
    setEditGroupItem(item);
  }

  function handleAddGroup(parentItem?: any, e?: React.MouseEvent) {
    e?.stopPropagation();
    setGroupModalOpen(true);
    setEditAddGroup(1);
    setEditGroupItem(parentItem ?? null);
  }

  function handleUpdateData() {
    groupList();
  }

  // 树节点选中
  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    const key = selectedKeys[0];
    if (key && String(key).startsWith('group-') && key !== 'group-root') {
      const gId = Number(String(key).replace('group-', ''));
      const item = listSemanticGroup.find(g => g.groupId === gId);
      if (item) {
        groupNameClick(item);
      }
    }
  };

  // 递归构建子节点
  const buildTreeNodes = (items: any[]): TreeDataNode[] => {
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
              <Tooltip title="添加子组">
                <PlusCircleOutlined
                  className="text-gray-400 cursor-pointer hover:text-primary"
                  onClick={(e) => handleAddGroup(item, e)}
                />
              </Tooltip>
              <Tooltip title="编辑">
                <EditOutlined
                  className="text-gray-400 cursor-pointer hover:text-primary"
                  onClick={(e) => handleEditGroup(item, e)}
                />
              </Tooltip>
              <Popconfirm
                title="提示"
                description="确定删除该组吗？"
                onConfirm={(e) => handleDelete(item.groupId, e as any)}
                onCancel={(e) => e?.stopPropagation()}
              >
                <Tooltip title="删除">
                  <MinusCircleOutlined
                    className="text-gray-400 cursor-pointer hover:text-red-500"
                    onClick={(e) => e.stopPropagation()}
                  />
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

  // 构建树形数据
  const treeData: TreeDataNode[] = [
    {
      title: (
        <span className="inline-flex items-center gap-2 group">
          <FolderOutlined className="group-node-icon group-node-icon--folder" />
          <span className="group-tree-title">表语义组</span>
          <span className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <Tooltip title="添加组">
              <PlusCircleOutlined
                className="text-gray-400 cursor-pointer hover:text-primary"
                onClick={(e) => handleAddGroup(undefined, e)}
              />
            </Tooltip>
          </span>
        </span>
      ),
      key: 'group-root',
      children: buildTreeNodes(buildGroupTree(listSemanticGroup))
    }
  ];

  return (
    <div>
      <EditGroup updateGroupData={handleUpdateData} />
      <Tree
        treeData={treeData}
        expandedKeys={expandedKeys}
        onExpand={(keys) => setExpandedKeys(keys)}
        selectedKeys={groupId ? [`group-${groupId}`] : []}
        onSelect={handleTreeSelect}
        blockNode
        className="semantics-tree"
      />
    </div>
  );
};
