type MenuId = string | number

interface MenuNode {
  id: MenuId
  children?: MenuNode[]
}

export function getRoleMenuCheckedKeys(ids: MenuId[] = [], tree: MenuNode[] = []): MenuId[] {
  const checked = new Map(ids.map(id => [String(id), id]))
  const visit = (node: MenuNode): boolean => {
    const descendants = (node.children || []).map(visit).some(Boolean)
    const selected = checked.has(String(node.id))
    // Ancestor IDs in the saved payload also represent half-checked nodes, not their siblings.
    if (descendants) checked.delete(String(node.id))
    return selected || descendants
  }
  tree.forEach(visit)
  return [...checked.values()]
}

export function collectRoleMenuIds(ids: MenuId[] = [], tree: MenuNode[] = []): MenuId[] {
  const checked = new Set(getRoleMenuCheckedKeys(ids, tree).map(String))
  const result = new Map<string, MenuId>()
  const visit = (node: MenuNode, inherited = false): boolean => {
    const selected = inherited || checked.has(String(node.id))
    const descendants = (node.children || []).map(child => visit(child, selected)).some(Boolean)
    if (selected || descendants) result.set(String(node.id), node.id)
    return selected || descendants
  }
  tree.forEach(node => visit(node))
  return [...result.values()]
}
