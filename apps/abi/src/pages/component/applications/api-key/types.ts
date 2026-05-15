import type { Dayjs } from 'dayjs'

export type IpAccessType = 'unlimited' | 'whitelist'

export type ApiKeyStatus = 'disabled' | 'normal'

export type DrawerMode = 'create' | 'view'

export interface ApiKeyItem {
  accessKey: string
  businessSpace: string
  clientId: string
  createdAt: string
  description: string
  expireTime?: string | null
  id: number
  ipAccessType: IpAccessType
  ipWhitelist: string[]
  rawSecretKey?: string
  secretKey: string
  spaceId: number
  status: ApiKeyStatus
  timeoutSeconds?: number
}

export interface ApiKeyFormValues {
  activeTimeout: number
  description?: string
  expireTime?: Dayjs | string | null
  ipAccessType: IpAccessType
  spaceId: number
}

export interface ApiKeyQueryValues {
  accessKey?: string
  clientId?: string
  entCreateTime?: string
  ipAccessType?: IpAccessType
  spaceId?: number
  startCreateTime?: string
  status?: ApiKeyStatus
}
