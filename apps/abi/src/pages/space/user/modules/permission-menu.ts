import { flatMapDeep } from 'lodash'

type PermissionMenuKey = number | string

interface PermissionMenuTreeItem {
  children?: PermissionMenuTreeItem[] | null
  id: PermissionMenuKey
  label: string
}

interface PermissionMenuPayload {
  checkedKeys?: PermissionMenuKey[] | null
  menus?: PermissionMenuTreeItem[] | null
}

function flattenPermissionMenus(menus: PermissionMenuTreeItem[] | null | undefined): PermissionMenuTreeItem[] {
  return flatMapDeep(menus || [], (menu): Array<PermissionMenuTreeItem | PermissionMenuTreeItem[]> => [menu, flattenPermissionMenus(menu.children)]) as PermissionMenuTreeItem[]
}

function getCheckedPermissionMenus(payload?: PermissionMenuPayload | null): PermissionMenuTreeItem[] {
  const checkedKeySet = new Set((payload?.checkedKeys || []).map((key) => String(key)))
  if (checkedKeySet.size === 0) return []

  return flattenPermissionMenus(payload?.menus).filter((menu) => checkedKeySet.has(String(menu.id)))
}

export type { PermissionMenuPayload, PermissionMenuTreeItem }
export { flattenPermissionMenus, getCheckedPermissionMenus }
