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
 * @returns 多级树数组
 */
export function buildGroupTree(list: any[], parentId: string = '0'): any[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(item => String(item.parentId) === String(parentId))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(item => {
      const children = buildGroupTree(list, item.groupId);
      return children.length > 0 ? { ...item, children } : { ...item };
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
