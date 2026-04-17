export type IpAccessType = 'unlimited' | 'whitelist'

export type ApiKeyStatus = 'disabled' | 'normal'

export type DrawerMode = 'create' | 'edit' | 'view'

export interface ApiKeyItem {
  accessKey: string
  businessSpace: string
  clientId: string
  createdAt: string
  description: string
  id: number
  ipAccessType: IpAccessType
  ipWhitelist: string[]
  secretKey: string
  status: ApiKeyStatus
}

export interface ApiKeyFormValues {
  businessSpace: string
  description?: string
  ipAccessType: IpAccessType
}
