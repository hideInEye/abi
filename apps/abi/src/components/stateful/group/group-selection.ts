import { buildGroupTree } from '../../../pages/workbench/data-preparation/data-table-meaning/utils/helper';

export interface GroupSelectionItem {
  groupId: string;
  groupName?: string;
  parentId?: string;
  sortOrder?: number;
  children?: GroupSelectionItem[];
}

export interface InitialGroupSelection {
  expandedKeys: string[];
  selectedGroup?: GroupSelectionItem;
  selectedKeys: string[];
}

export function getGroupNodeKey(groupId: string) {
  return `group-${groupId}`;
}

/**
 * 初始化时必须以树结构的第一个顶级分组为准，不能直接使用平铺数组第一项。
 */
export function getInitialGroupSelection(groups: GroupSelectionItem[]): InitialGroupSelection {
  const tree = buildGroupTree(groups, '0', true);
  const firstTopGroup = tree[0] as GroupSelectionItem | undefined;

  if (!firstTopGroup) {
    return {
      expandedKeys: [],
      selectedKeys: []
    };
  }

  const firstTopKey = getGroupNodeKey(firstTopGroup.groupId);

  return {
    expandedKeys: firstTopGroup.children?.length ? [firstTopKey] : [],
    selectedGroup: firstTopGroup,
    selectedKeys: [firstTopKey]
  };
}
