/**
 * 构造树型结构数据
 *
 * @param {any} data 数据源
 * @param {any} id id字段 默认 'id'
 * @param {any} parentId 父节点字段 默认 'parentId'
 * @param {any} children 孩子节点字段 默认 'children'
 */
// eslint-disable-next-line max-params
export function handleTree(data: any, id: any, parentId?: any, children?: any) {
  const config = {
    childrenList: children || 'children',
    id: id || 'id',
    parentId: parentId || 'parentId'
  };

  const childrenListMap = {};
  const tree = [];
  for (const d of data) {
    const id = d[config.id];
    childrenListMap[id] = d;
    if (!d[config.childrenList]) {
      d[config.childrenList] = [];
    }
  }

  for (const d of data) {
    const parentId = d[config.parentId];
    const parentObj = childrenListMap[parentId];
    if (!parentObj) {
      tree.push(d);
    } else {
      parentObj[config.childrenList].push(d);
    }
  }
  return tree;
}
