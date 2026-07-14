import { describe, expect, it } from 'vitest';

import { buildGroupTree } from './helper';

describe('buildGroupTree', () => {
  it('returns empty array for non-array input', () => {
    expect(buildGroupTree(null as any)).toEqual([]);
    expect(buildGroupTree(undefined as any)).toEqual([]);
  });

  it('returns empty array for empty list', () => {
    expect(buildGroupTree([])).toEqual([]);
  });

  it('sorts by sortOrder by default', () => {
    const tree = buildGroupTree([
      { groupId: '3', groupName: '第三组', parentId: '0', sortOrder: 3 },
      { groupId: '1', groupName: '第一组', parentId: '0', sortOrder: 1 },
      { groupId: '2', groupName: '第二组', parentId: '0', sortOrder: 2 }
    ]);

    expect(tree.map(n => n.groupId)).toEqual(['1', '2', '3']);
  });

  it('keeps original sortOrder-based ordering when folderFirst is false', () => {
    const tree = buildGroupTree([
      { groupId: 'leaf-1', groupName: '叶子1', parentId: '0', sortOrder: 1 },
      { groupId: 'folder-1', groupName: '文件夹1', parentId: '0', sortOrder: 2 },
      { groupId: 'leaf-2', groupName: '叶子2', parentId: '0', sortOrder: 3 }
    ]);

    expect(tree.map(n => n.groupId)).toEqual(['leaf-1', 'folder-1', 'leaf-2']);
    expect(tree[1].children).toBeUndefined();
  });

  it('puts folders before leaves when folderFirst is true', () => {
    const tree = buildGroupTree(
      [
        { groupId: 'leaf-1', groupName: '叶子1', parentId: '0', sortOrder: 1 },
        { groupId: 'folder-1', groupName: '文件夹1', parentId: '0', sortOrder: 3 },
        { groupId: 'leaf-2', groupName: '叶子2', parentId: '0', sortOrder: 2 },
        { groupId: 'folder-2', groupName: '文件夹2', parentId: '0', sortOrder: 4 },
        { groupId: 'folder-1-child', groupName: '文件夹1子节点', parentId: 'folder-1', sortOrder: 1 },
        { groupId: 'folder-2-child', groupName: '文件夹2子节点', parentId: 'folder-2', sortOrder: 1 }
      ],
      '0',
      true
    );

    expect(tree.map(n => n.groupId)).toEqual(['folder-1', 'folder-2', 'leaf-1', 'leaf-2']);
  });

  it('applies folderFirst sorting recursively to nested levels', () => {
    const tree = buildGroupTree(
      [
        { groupId: 'root', groupName: '根文件夹', parentId: '0', sortOrder: 1 },
        { groupId: 'root-leaf', groupName: '根叶子', parentId: 'root', sortOrder: 1 },
        { groupId: 'sub-folder', groupName: '子文件夹', parentId: 'root', sortOrder: 2 },
        { groupId: 'sub-leaf', groupName: '子叶子', parentId: 'sub-folder', sortOrder: 1 }
      ],
      '0',
      true
    );

    const root = tree[0];
    expect(root.children?.map((n: any) => n.groupId)).toEqual(['sub-folder', 'root-leaf']);
    expect(root.children?.[0].children?.map((n: any) => n.groupId)).toEqual(['sub-leaf']);
  });

  it('preserves sortOrder within folders and leaves separately when folderFirst is true', () => {
    const tree = buildGroupTree(
      [
        { groupId: 'folder-b', groupName: '文件夹B', parentId: '0', sortOrder: 2 },
        { groupId: 'leaf-a', groupName: '叶子A', parentId: '0', sortOrder: 1 },
        { groupId: 'folder-a', groupName: '文件夹A', parentId: '0', sortOrder: 1 },
        { groupId: 'leaf-b', groupName: '叶子B', parentId: '0', sortOrder: 2 },
        { groupId: 'folder-a-child', groupName: '文件夹A子节点', parentId: 'folder-a', sortOrder: 1 },
        { groupId: 'folder-b-child', groupName: '文件夹B子节点', parentId: 'folder-b', sortOrder: 1 }
      ],
      '0',
      true
    );

    expect(tree.map(n => n.groupId)).toEqual(['folder-a', 'folder-b', 'leaf-a', 'leaf-b']);
  });
});
