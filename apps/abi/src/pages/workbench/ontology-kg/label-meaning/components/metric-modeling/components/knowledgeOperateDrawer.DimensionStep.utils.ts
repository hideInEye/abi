export interface DimensionSelectionTreeNode {
  children?: DimensionSelectionTreeNode[]
  disabled?: boolean
  key: number | string
}

export interface DimensionTreeSelectionChange {
  checked: boolean
  keys: string[]
}

export function getSelectableDimensionLeafKeys(nodes: DimensionSelectionTreeNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.children?.length) return getSelectableDimensionLeafKeys(node.children)
    return node.disabled ? [] : [String(node.key)]
  })
}

export function getDimensionTreeSelectionChange(node: DimensionSelectionTreeNode, checked: boolean): DimensionTreeSelectionChange {
  return {
    checked,
    keys: getSelectableDimensionLeafKeys([node]),
  }
}
