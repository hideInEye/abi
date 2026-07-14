/**
 * 格式化字段 去除字段中的空格和逗号
 *
 * @param field
 * @returns
 */
export function formatField(field: string) {
  if (field) {
    return field.replace(/\s+/g, '').replace(/，/g, ',');
  }
  return '';
}

/**
 * 将平铺的分组数组按 parentId 递归构建成多级树
 * parentId === 0 表示根节点
 *
 * @param list 平铺分组数组
 * @param parentId 当前父节点 ID，默认 0
 * @param folderFirst 是否在同一父级下将文件夹（有子节点）排在叶子节点前面
 * @returns 多级树数组
 */
export function buildGroupTree(list: any[], parentId: string = '0', folderFirst: boolean = false): any[] {
  if (!Array.isArray(list)) return [];
  const nodes = list
    .filter(item => String(item.parentId) === String(parentId))
    .map(item => {
      const children = buildGroupTree(list, item.groupId, folderFirst);
      return children.length > 0 ? { ...item, children } : { ...item };
    });

  return nodes.sort((a, b) => {
    if (folderFirst) {
      const aHasChildren = a.children && a.children.length > 0;
      const bHasChildren = b.children && b.children.length > 0;
      if (aHasChildren !== bHasChildren) {
        return aHasChildren ? -1 : 1;
      }
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

/**
 * 获取指定分组的所有后代 ID（用于防止循环引用）
 *
 * @param list 平铺分组数组
 * @param groupId 当前分组 ID
 * @returns 包含所有后代 ID 的 Set
 */
export function getAllDescendantIds(list: any[], groupId: string): Set<string> {
  const descendants = new Set<string>();

  function collectDescendants(parentId: string) {
    list.forEach((item) => {
      if (String(item.parentId) === String(parentId) && !descendants.has(item.groupId)) {
        descendants.add(item.groupId);
        collectDescendants(item.groupId);
      }
    });
  }

  collectDescendants(groupId);
  return descendants;
}
