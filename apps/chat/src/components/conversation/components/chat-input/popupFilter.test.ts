import { describe, expect, it } from 'vitest';

import { filterSemanticTree, matchKeyword } from './popupFilter';

const tree = [
  {
    id: 'g_1',
    type: 'group',
    name: '测试分组',
    children: [
      { id: 's_1', type: 'schema', name: '水利语义', schemaId: 1 },
      {
        id: 'g_2',
        type: 'group',
        name: '子分组',
        children: [{ id: 's_2', type: 'schema', name: '订单语义', schemaId: 2 }],
      },
    ],
  },
  { id: 's_3', type: 'schema', name: '独立语义', schemaId: 3 },
];

describe('filterSemanticTree', () => {
  it('关键词为空时原样返回', () => {
    expect(filterSemanticTree(tree, '')).toBe(tree);
    expect(filterSemanticTree(tree, '   ')).toBe(tree);
  });

  it('叶子命中仅保留匹配叶子', () => {
    expect(filterSemanticTree(tree, '独立')).toEqual([{ id: 's_3', type: 'schema', name: '独立语义', schemaId: 3 }]);
  });

  it('分组自身命中保留整棵子树', () => {
    const res = filterSemanticTree(tree, '测试分组');
    expect(res).toHaveLength(1);
    expect(res[0]).toBe(tree[0]);
  });

  it('后代命中保留祖先分组并裁剪未命中兄弟', () => {
    const res = filterSemanticTree(tree, '订单');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('g_1');
    expect(res[0].children).toEqual([
      {
        id: 'g_2',
        type: 'group',
        name: '子分组',
        children: [{ id: 's_2', type: 'schema', name: '订单语义', schemaId: 2 }],
      },
    ]);
  });

  it('大小写不敏感匹配', () => {
    const res = filterSemanticTree([{ id: 's_9', type: 'schema', name: 'WATER语义', schemaId: 9 }], 'water');
    expect(res).toHaveLength(1);
  });

  it('无命中返回空数组', () => {
    expect(filterSemanticTree(tree, '不存在')).toEqual([]);
  });
});

describe('matchKeyword', () => {
  it('空关键词恒命中', () => {
    expect(matchKeyword('任意', '')).toBe(true);
    expect(matchKeyword(undefined, '  ')).toBe(true);
  });

  it('大小写不敏感包含匹配', () => {
    expect(matchKeyword('Walmart MCP', 'walmart')).toBe(true);
    expect(matchKeyword('walmart', 'mcp')).toBe(false);
  });
});
