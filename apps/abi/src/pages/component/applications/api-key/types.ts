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
  timeoutMinutes?: number
}

export interface ApiKeyFormValues {
  description?: string
  ipAccessType: IpAccessType
  spaceId: number
}
