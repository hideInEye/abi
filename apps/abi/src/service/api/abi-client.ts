import { apiRequest } from '../request'

export interface AbiClientWhitelistItem {
  id?: number
  sysClientId?: number
  whitelist: string
}

export interface AbiClientListItem {
  accessKey: string
  activeTimeout?: number
  clientId: string
  createBy?: string
  createTime?: string
  expireTime?: string | null
  id: number
  ipWhitelist?: string
  remark?: string | null
  restrictedIp?: 0 | 1 | boolean
  secretKey?: string
  spaceId?: number
  spaceName?: string
  status?: '0' | '1' | number
  updateBy?: string | null
  updateTime?: string | null
  whitelist?: AbiClientWhitelistItem[]
}

export interface AbiClientDetailItem {
  accessKey: string
  activeTimeout?: number
  clientId: string
  createTime?: string
  expireTime?: string | null
  id: number
  remark?: string | null
  restrictedIp?: 0 | 1 | boolean
  secretKey?: string
  spaceId?: number
  status?: '0' | '1' | number
  whitelist?: AbiClientWhitelistItem[]
}

export interface QueryAbiClientListParams {
  accessKey?: string
  clientId?: string
  entCreateTime?: string
  pageNum: number
  pageSize: number
  restrictedIp?: 0 | 1
  spaceId: number
  startCreateTime?: string
  status?: '0' | '1'
}

export function queryAbiClientList(params: QueryAbiClientListParams) {
  return apiRequest({
    method: 'get',
    params,
    url: '/api/abi-system/client/list'
  })
}

export function addAbiClient(data: {
  activeTimeout?: number
  expireTime?: string | null
  ips?: AbiClientWhitelistItem[]
  name: string
  remark?: string
  restrictedIp: 0 | 1
  spaceId: number
}) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/abi-system/client/add'
  })
}

export function updateAbiClient(data: {
  activeTimeout?: number
  expireTime?: string | null
  id: number
  ips?: AbiClientWhitelistItem[]
  remark?: string
  restrictedIp: 0 | 1
  spaceId: number
}) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/abi-system/client/update'
  })
}

export function getAbiClientDetail(id: number) {
  return apiRequest({
    method: 'get',
    url: `/api/abi-system/client/get/${id}`
  })
}

export function resetAbiClientSk(id: number) {
  return apiRequest({
    method: 'get',
    url: `/api/abi-system/client/resetsk/${id}`
  })
}

export function deleteAbiClient(params: { id: number; spaceId: number }) {
  const { id, spaceId } = params

  return apiRequest({
    method: 'get',
    url: `/api/abi-system/client/${spaceId}/${id}`
  })
}

export function updateAbiClientStatus(params: { id: number; spaceId: number; status: 0 | 1 }) {
  const { id, spaceId, status } = params

  return apiRequest({
    method: 'get',
    url: `/api/abi-system/client/${status}/${spaceId}/${id}`
  })
}
