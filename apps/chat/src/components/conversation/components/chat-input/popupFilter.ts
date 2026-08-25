/** 统一弹窗（数据语义 / 技能 / MCP）搜索过滤纯函数 */

/** 大小写不敏感的包含匹配；关键词为空时恒命中 */
export function matchKeyword(text: unknown, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return true;
  return String(text ?? '').toLowerCase().includes(kw);
}

/**
 * 数据语义树递归过滤：
 * - 叶子（type=schema）仅自身名称命中时保留；
 * - 分组自身名称命中时保留整棵子树；
 * - 分组自身未命中时，仅当存在命中的后代才保留，且 children 替换为过滤后的结果。
 */
export function filterSemanticTree(nodes: any[], keyword: string): any[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return nodes;
  const walk = (list: any[]): any[] => {
    const result: any[] = [];
    for (const node of list) {
      const selfHit = String(node?.name ?? '').toLowerCase().includes(kw);
      if (selfHit) {
        result.push(node);
        continue;
      }
      if (node?.type === 'schema') continue;
      const children = Array.isArray(node?.children) ? walk(node.children) : [];
      if (children.length > 0) result.push({ ...node, children });
    }
    return result;
  };
  return walk(nodes);
}
