export type DictDataCode = string | number

export type DictTypeId = string | number

export type DictDataStatus = '0' | '1'

export type DictDefaultFlag = 'N' | 'Y'

export interface SysDictData {
  createBy: string
  createTime: string
  cssClass: string
  dictCode: DictDataCode
  dictLabel: string
  dictSort: number | null
  dictType: string
  dictValue: string
  isDefault: DictDefaultFlag
  listClass: string
  remark: string
  status: DictDataStatus
  updateBy: string
  updateTime: string
}

export interface DictDataApiRecord {
  createBy?: unknown
  createTime?: unknown
  cssClass?: unknown
  dictCode?: unknown
  dictLabel?: unknown
  dictSort?: unknown
  dictType?: unknown
  dictValue?: unknown
  isDefault?: unknown
  listClass?: unknown
  remark?: unknown
  status?: unknown
  updateBy?: unknown
  updateTime?: unknown
}

export interface DictDataFilters {
  dictLabel: string
  dictType: string
  status: '' | DictDataStatus
}

export interface DictDataListParams {
  dictLabel?: string
  dictType?: string
  pageNum: number
  pageSize: number
  status?: DictDataStatus
}

export interface DictDataFormValues {
  cssClass?: string
  dictLabel: string
  dictSort?: number | null
  dictType: string
  dictValue: string
  isDefault?: DictDefaultFlag
  listClass?: string
  remark?: string
  status?: DictDataStatus
}

export interface DictDataCreateParams {
  cssClass: string
  dictLabel: string
  dictSort?: number
  dictType: string
  dictValue: string
  isDefault: DictDefaultFlag
  listClass: string
  remark: string
  status: DictDataStatus
}

export interface DictDataUpdateParams extends DictDataCreateParams {
  dictCode: DictDataCode
}

export interface DictDataPage {
  records: SysDictData[]
  total: number
}

export interface SysDictType {
  createBy: string
  createTime: string
  dictId: DictTypeId
  dictName: string
  dictType: string
  remark: string
  status: DictDataStatus
  updateBy: string
  updateTime: string
}

export interface DictTypeApiRecord {
  createBy?: unknown
  createTime?: unknown
  dictId?: unknown
  dictName?: unknown
  dictType?: unknown
  remark?: unknown
  status?: unknown
  updateBy?: unknown
  updateTime?: unknown
}

export interface DictTypeFilters {
  dictName: string
  dictType: string
  status: '' | DictDataStatus
}

export interface DictTypeListParams {
  dictName?: string
  dictType?: string
  pageNum: number
  pageSize: number
  status?: DictDataStatus
}

export interface DictTypeFormValues {
  dictName: string
  dictType: string
  remark?: string
  status?: DictDataStatus
}

export interface DictTypeCreateParams {
  dictName: string
  dictType: string
  remark: string
  status: DictDataStatus
}

export interface DictTypeUpdateParams extends DictTypeCreateParams {
  dictId: DictTypeId
}

export interface DictTypePage {
  records: SysDictType[]
  total: number
}
