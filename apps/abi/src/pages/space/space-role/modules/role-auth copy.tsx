import { useRequest } from '@sa/hooks';
import type { DataNode } from 'antd/es/tree';
import { useState, useEffect } from 'react';

import { getSpaceMenuTreeApi } from '@/service/api/space-role';

import type { ModulesProps } from './type';

// 递归转换树结构
function recursiveTransform(data: Api.SystemManage.MenuTree[] | null): DataNode[] {
  return data
    ? data.map(item => {
      const { id: key, label } = item;

      if (item.children) {
        return {
          children: recursiveTransform(item.children),
          key,
          title: label
        };
      }

      return {
        key,
        title: label
      };
    })
    : [];
}

// 获取节点的所有子节点ID（不包含自身）
const getAllDescendantIds = (node: DataNode): React.Key[] => {
  let ids: React.Key[] = [];
  if (node.children) {
    node.children.forEach(child => {
      ids = [...ids, child.key, ...getAllDescendantIds(child)];
    });
  }
  return ids;
};

// 获取节点的所有父节点ID
const getAllParentIds = (treeData: DataNode[], targetId: React.Key): React.Key[] => {
  const findParent = (nodes: DataNode[], targetId: React.Key, parents: React.Key[] = []): React.Key[] => {
    for (const node of nodes) {
      if (node.key === targetId) return parents;

      if (node.children) {
        const found = findParent(node.children, targetId, [...parents, node.key]);
        if (found.length > 0) return found;
      }
    }
    return [];
  };

  return findParent(treeData, targetId);
};

// 在树中查找节点
const findNodeById = (nodes: DataNode[], id: React.Key): DataNode | null => {
  for (const node of nodes) {
    if (node.key === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// 检查节点是否有任何子节点被选中
const hasAnyChildChecked = (node: DataNode, checkedKeys: React.Key[]): boolean => {
  if (!node.children) return false;

  return node.children.some(child =>
    checkedKeys.includes(child.key) ||
    (child.children && hasAnyChildChecked(child, checkedKeys))
  );
};

const RoleAuth: React.FC<ModulesProps> = memo(({ onChange, value }) => {
  const { data: tree, run: getTree } = useRequest(getSpaceMenuTreeApi, {
    manual: true
  });

  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [internalCheckedKeys, setInternalCheckedKeys] = useState<React.Key[]>(value || []);

  function init() {
    getTree();
  }

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (tree) {
      setTreeData(recursiveTransform(tree));
    }
  }, [tree]);

  // 当外部value变化时更新内部状态
  useEffect(() => {
    setInternalCheckedKeys(value || []);
  }, [value]);

  // 完全手动处理节点选中事件
  const handleCheck = (checkedKeysValue: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }, info: any) => {
    const checkedKeys = Array.isArray(checkedKeysValue)
      ? checkedKeysValue
      : checkedKeysValue.checked;

    const { node, checked } = info;
    const currentId = node.key;

    let newCheckedKeys = [...checkedKeys];

    // 第一步：先处理用户直接点击的节点
    if (checked) {
      // 选中节点
      if (!newCheckedKeys.includes(currentId)) {
        newCheckedKeys.push(currentId);
      }
    } else {
      // 取消选中节点
      newCheckedKeys = newCheckedKeys.filter(id => id !== currentId);
    }

    // 第二步：手动处理关联逻辑（不依赖Ant Design的自动行为）

    if (node.children && node.children.length > 0) {
      // 处理父节点
      if (checked) {
        // 选中父节点时，选中所有子节点
        const allChildrenIds = getAllDescendantIds(node);
        allChildrenIds.forEach(childId => {
          if (!newCheckedKeys.includes(childId)) {
            newCheckedKeys.push(childId);
          }
        });
      } else {
        // 取消选中父节点时，取消所有子节点
        const allChildrenIds = getAllDescendantIds(node);
        newCheckedKeys = newCheckedKeys.filter(id => !allChildrenIds.includes(id));
      }
    } else {
      // 处理叶子节点
      if (checked) {
        // 选中叶子节点时，确保所有父节点被选中
        const allParentIds = getAllParentIds(treeData, currentId);
        allParentIds.forEach(parentId => {
          if (!newCheckedKeys.includes(parentId)) {
            newCheckedKeys.push(parentId);
          }
        });
      } else {
        // 取消选中叶子节点时，检查父节点是否需要取消
        const allParentIds = getAllParentIds(treeData, currentId);
        allParentIds.forEach(parentId => {
          const parentNode = findNodeById(treeData, parentId);
          if (parentNode && !hasAnyChildChecked(parentNode, newCheckedKeys)) {
            newCheckedKeys = newCheckedKeys.filter(id => id !== parentId);
          }
        });
      }
    }

    setInternalCheckedKeys(newCheckedKeys);
    onChange?.(newCheckedKeys as number[]);
  };

  return (
    <ATree
      checkable
      checkedKeys={internalCheckedKeys}
      className="h-280px"
      height={280}
      treeData={treeData}
      onCheck={handleCheck}
      expandedKeys={expandedKeys}
      onExpand={keys => setExpandedKeys(keys)}
      checkStrictly={true} // 使用严格模式，完全手动控制
    />
  );
});

export default RoleAuth;