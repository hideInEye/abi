import { describe, expect, it } from 'vitest';

import { getGroupNodeKey, getInitialGroupSelection } from './group-selection';

describe('getInitialGroupSelection', () => {
  it('returns empty keys when there are no groups', () => {
    expect(getInitialGroupSelection([])).toEqual({
      expandedKeys: [],
      selectedKeys: []
    });
  });

  it('selects the first sorted top-level group without expanding a leaf', () => {
    const result = getInitialGroupSelection([
      { groupId: 2, groupName: '第二组', parentId: 0, sortOrder: 2 },
      { groupId: 1, groupName: '第一组', parentId: 0, sortOrder: 1 }
    ]);

    expect(result.selectedGroup?.groupId).toBe(1);
    expect(result.selectedKeys).toEqual([getGroupNodeKey(1)]);
    expect(result.expandedKeys).toEqual([]);
  });

  it('selects and expands the first top-level group even when a child is first in the flat data', () => {
    const result = getInitialGroupSelection([
      { groupId: 11, groupName: '子组', parentId: 1, sortOrder: 1 },
      { groupId: 1, groupName: '顶级组', parentId: 0, sortOrder: 1 },
      { groupId: 2, groupName: '另一个顶级组', parentId: 0, sortOrder: 2 }
    ]);

    expect(result.selectedGroup?.groupId).toBe(1);
    expect(result.selectedGroup?.groupName).toBe('顶级组');
    expect(result.selectedKeys).toEqual([getGroupNodeKey(1)]);
    expect(result.expandedKeys).toEqual([getGroupNodeKey(1)]);
  });
});
