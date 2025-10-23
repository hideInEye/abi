import { apiRequest } from '../request';
/** shema:表语义，term：专业术语，tag：标签，question：推荐问题，agent:智能助手，dictionary:字典类型 */
export type TableSemanticsGroupType = 'agent' | 'dictionary' | 'question' | 'shema' | 'tag' | 'term';

interface GrouplistParams {
  groupName?: string;
  groupType: TableSemanticsGroupType;
  pageNum: number;
  pageSize: number;
  spaceId: number;
}

interface EditGroupParams {
  groupId: number;
  groupName: string;
  groupType: TableSemanticsGroupType;
  spaceId: number;
}

interface AddGroupParams {
  groupName: string;
  groupType: TableSemanticsGroupType;
  remark?: string;
  spaceId: number;
}

/** 获取标语义组 */
export function tableSemanticsGroupList(params: GrouplistParams) {
  return apiRequest({
    method: 'get',
    params: {
      groupName: params.groupName,
      groupType: params.groupType,
      pageNum: params.pageNum,
      pageSize: params.pageSize,
      spaceId: params.spaceId
    },
    url: '/copilot/v1/group/list'
  });
}

/** 修改标语义组 */
export function editTableSemanticsGroup(data: EditGroupParams) {
  return apiRequest({
    data,
    method: 'put',
    url: '/copilot/v1/group'
  });
}

/** 新增标语义组 */
export function addTableSemanticsGroup(data: AddGroupParams) {
  return apiRequest({
    data,
    method: 'post',
    url: '/copilot/v1/group'
  });
}

/** 删除表语义组 */
export function deleteTableSemanticsGroup(groupId: number) {
  return apiRequest({
    method: 'delete',
    url: `/copilot/v1/group/${groupId}`
  });
}
