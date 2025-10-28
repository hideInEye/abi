import { apiRequest } from '../request';

export async function queryOperateRecordList(params: any) {
  const res: any = await apiRequest({
    method: 'get',
    params,
    url: '/abi-system/record/list'
  });
  return res;
}

export async function deleteOperateRecord(ids: string) {
  const res: any = await apiRequest({
    method: 'delete',
    url: `/system/record/${ids}`
  });
  return res;
}
