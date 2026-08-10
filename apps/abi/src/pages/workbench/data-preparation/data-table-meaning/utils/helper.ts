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
 * 脏数据（parentId 指向不存在分组的游离节点）提升到根级展示，不再静默丢弃
 *
 * @param list 平铺分组数组
 * @param parentId 当前父节点 ID，默认 0
 * @param folderFirst 是否在同一父级下将文件夹（有子节点）排在叶子节点前面
 * @returns 多级树数组
 */
export function buildGroupTree(list: any[], parentId: string = '0', folderFirst: boolean = false): any[] {
  if (!Array.isArray(list)) return [];
  const isRoot = String(parentId) === '0';
  const existingIds = isRoot ? new Set(list.map(item => String(item.groupId))) : null;
  const nodes = list
    .filter(item =>
      String(item.parentId) === String(parentId) ||
      // 根级额外收容游离节点：parentId 在列表中找不到对应分组的脏数据
      (existingIds !== null && !existingIds.has(String(item.parentId)))
    )
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
 * 构建分组的层级路径（自顶级到当前分组），用分隔符连接各级名称
 * 用于在已选项处标注「属于哪个分组」并展示层级，例如「父组 / 子组」
 * 遇到脏数据（parentId 指向不存在的分组）或成环时安全终止
 *
 * @param list 平铺分组数组（需含 parentId）
 * @param groupId 目标分组 ID
 * @param separator 层级分隔符，默认 ' / '
 * @returns 形如「父组 / 子组」的路径；找不到时返回空串
 */
export function buildGroupPath(list: any[], groupId: string, separator: string = ' / '): string {
  if (!Array.isArray(list) || groupId == null) return '';
  const byId = new Map(list.map(item => [String(item.groupId), item]));
  const names: string[] = [];
  const seen = new Set<string>();
  let cur = byId.get(String(groupId));
  while (cur && !seen.has(String(cur.groupId))) {
    seen.add(String(cur.groupId));
    names.unshift(cur.groupName || '-');
    const pid = String(cur.parentId ?? '0');
    if (pid === '0') break;
    cur = byId.get(pid);
  }
  return names.join(separator);
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
