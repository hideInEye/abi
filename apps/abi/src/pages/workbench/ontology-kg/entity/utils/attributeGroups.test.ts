import { describe, expect, it } from 'vitest'

import { buildAttributeGroupTreeOptions, normalizeAttributeGroupRows } from './attributeGroups'

describe('attributeGroups', () => {
  it('builds selectable tree options with slash-separated display paths', () => {
    const options = buildAttributeGroupTreeOptions([
      { groupId: 1, groupName: '父级', parentId: 0 },
      { groupId: 2, groupName: '子级', parentId: 1 },
      { groupId: 3, groupName: '叶子', parentId: 2 },
    ])

    expect(options).toEqual([
      {
        children: [
          {
            children: [
              {
                label: '父级/子级/叶子',
                title: '叶子',
                value: '3',
              },
            ],
            label: '父级/子级',
            title: '子级',
            value: '2',
          },
        ],
        label: '父级',
        title: '父级',
        value: '1',
      },
    ])
  })

  it('normalizes flat group list responses without coercing ids to numbers', () => {
    expect(
      normalizeAttributeGroupRows({
        data: [
          { groupId: '9007199254740993', groupName: '父级', parentId: 0, sortOrder: '2' },
          { groupId: '9007199254740994', groupName: '子级', parentId: '9007199254740993' },
        ],
      }),
    ).toEqual([
      { groupId: '9007199254740993', groupName: '父级', parentId: 0, sortOrder: 2 },
      { groupId: '9007199254740994', groupName: '子级', parentId: '9007199254740993', sortOrder: undefined },
    ])
  })
})

