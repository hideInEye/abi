import { describe, expect, it } from 'vitest'

import { flattenPermissionMenus, getCheckedPermissionMenus } from './permission-menu'

const menus = [
  {
    id: 1087,
    label: '对话',
    children: [{ id: 1088, label: '对话分析' }],
  },
  {
    id: 1098,
    label: '工作台',
    children: [
      {
        id: 1103,
        label: '应用工坊',
        children: [
          { id: 1104, label: '我的大屏' },
          { id: 1129, label: '对话应用' },
        ],
      },
      { id: 1101, label: '数据大屏' },
    ],
  },
]

describe('permission-menu', () => {
  it('flattens menu trees recursively', () => {
    expect(flattenPermissionMenus(menus).map((menu) => menu.label)).toEqual(['对话', '对话分析', '工作台', '应用工坊', '我的大屏', '对话应用', '数据大屏'])
  })

  it('returns only menus whose id matches checkedKeys', () => {
    expect(
      getCheckedPermissionMenus({
        checkedKeys: [1087, 1088, 1104, 1101],
        menus,
      }).map((menu) => menu.label),
    ).toEqual(['对话', '对话分析', '我的大屏', '数据大屏'])
  })

  it('matches numeric menu ids with string checkedKeys', () => {
    expect(
      getCheckedPermissionMenus({
        checkedKeys: ['1103', '1129'],
        menus,
      }).map((menu) => menu.label),
    ).toEqual(['应用工坊', '对话应用'])
  })

  it('returns an empty list when checkedKeys is empty', () => {
    expect(getCheckedPermissionMenus({ checkedKeys: [], menus })).toEqual([])
  })
})
