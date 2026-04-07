import { EllipsisOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Tooltip, Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import React, { useEffect, useState } from 'react';

import folderIcon from '@/assets/svg-icon/folder.svg';
import { tableSemanticsGroupList } from '@/service/api/table-semantics';
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
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

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

  function handleEditGroup(item: any, e: React.MouseEvent) {
    e.stopPropagation();
    setGroupModalOpen(true);
    setEditAddGroup(2);
    setEditGroupItem(item);
  }

  function handleAddGroup(e: React.MouseEvent) {
    e.stopPropagation();
    setGroupModalOpen(true);
    setEditAddGroup(1);
    setEditGroupItem(null);
  }

  function handleUpdateData() {
    groupList();
  }

  // 树节点选中
  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    const key = selectedKeys[0];
    if (key && String(key).startsWith('group-')) {
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
      return {
        title: (
          <span className="flex items-center gap-2 w-full group">
            <img src={folderIcon} className="group-node-icon group-node-icon--folder flex-shrink-0" alt="folder" />
            <span className="group-tree-title flex-1 truncate">{item.groupName}</span>
            <span className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
              <Tooltip title="编辑">
                <EllipsisOutlined
                  className="text-gray-400 cursor-pointer hover:text-primary"
                  style={{ fontSize: '1rem' }}
                  onClick={(e) => handleEditGroup(item, e)}
                />
              </Tooltip>
            </span>
          </span>
        ),
        key: `group-${item.groupId}`,
        children: hasChildren ? buildTreeNodes(item.children) : undefined,
        isLeaf: !hasChildren
      };
    });
  };

  const treeData: TreeDataNode[] = buildTreeNodes(buildGroupTree(listSemanticGroup));

  return (
    <div>
      <EditGroup updateGroupData={handleUpdateData} allGroups={listSemanticGroup} />
      {/* 顶部标题行 */}
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
        selectedKeys={groupId ? [`group-${groupId}`] : []}
        onSelect={handleTreeSelect}
        blockNode
        className="semantics-tree"
      />
    </div>
  );
};
