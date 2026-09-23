import type { DictionaryEnumAddItem, DictionaryEnumItem } from '@/pages/component/data/data-dictionary/types'
import type {
  DictDataCode,
  DictDataCreateParams,
  DictDataListParams,
  DictDataUpdateParams,
  DictTypeCreateParams,
  DictTypeId,
  DictTypeListParams,
  DictTypeUpdateParams
} from '@/pages/systems/data-dictionary/types'

import { apiRequest } from '../request'

const DICT_DATA_API_PREFIX = '/api/system/dict/data'
const DICT_TYPE_API_PREFIX = '/api/system/dict/type'

export function addDictionary(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/system/v1/dictionary'
  })
}

export function editDictionary(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: '/api/system/v1/dictionary'
  })
}

export function deleteDictionary(ids: number) {
  return apiRequest({
    method: 'delete',
    params: {
      ids
    },
    url: `/api/system/v1/dictionary/${ids}`
  })
}

export function queryDictionary(data: { groupId: string; pageNum: number; pageSize: number }) {
  return apiRequest({
    data,
    method: 'get',
    params: data,
    url: '/api/system/v1/dictionary/list'
  })
}

/**
 * 字典枚举添加
 *
 * @param data
 * @returns
 */
export function addDictionaryEnum(data: DictionaryEnumAddItem) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/system/v1/dictionarydata'
  })
}

export function updateDictionaryEnum(data: DictionaryEnumItem) {
  return apiRequest({
    data,
    method: 'put',
    url: '/api/system/v1/dictionarydata'
  })
}

/**
 * 字典枚举查询
 *
 * @param dictId
 * @returns
 */
export function queryDictionaryEnum(params: {
  dictField: string
  dictLabel: string
  pageNum: number
  pageSize: number
}) {
  return apiRequest({
    method: 'get',
    params,
    url: `/api/system/v1/dictionarydata/list`
  })
}

export function deleteDictionaryEnum(dictIds: number) {
  return apiRequest({
    method: 'delete',
    params: {
      dictIds
    },
    url: `/api/system/v1/dictionarydata/${dictIds}`
  })
}

export function queryDictionaryDataByType(dictType: string) {
  return apiRequest<unknown>({
    method: 'get',
    url: `${DICT_DATA_API_PREFIX}/type/${encodeURIComponent(dictType)}`
  })
}

export function queryDictDataList(params: DictDataListParams) {
  return apiRequest<unknown>({
    method: 'get',
    params,
    url: `${DICT_DATA_API_PREFIX}/list`
  })
}

export function getDictDataDetail(dictCode: DictDataCode) {
  return apiRequest<unknown>({
    method: 'get',
    url: `${DICT_DATA_API_PREFIX}/${encodeURIComponent(String(dictCode))}`
  })
}

export function createDictData(data: DictDataCreateParams) {
  return apiRequest<unknown>({
    data,
    method: 'post',
    url: DICT_DATA_API_PREFIX
  })
}

export function updateDictData(data: DictDataUpdateParams) {
  return apiRequest<unknown>({
    data,
    method: 'put',
    url: DICT_DATA_API_PREFIX
  })
}

export function deleteDictData(dictCodes: readonly DictDataCode[]) {
  const encodedCodes = dictCodes.map(dictCode => encodeURIComponent(String(dictCode))).join(',')
  return apiRequest<unknown>({
    method: 'delete',
    url: `${DICT_DATA_API_PREFIX}/${encodedCodes}`
  })
}

export function queryDictTypeList(params: DictTypeListParams) {
  return apiRequest<unknown>({
    method: 'get',
    params,
    url: `${DICT_TYPE_API_PREFIX}/list`
  })
}

export function createDictType(data: DictTypeCreateParams) {
  return apiRequest<unknown>({
    data,
    method: 'post',
    url: DICT_TYPE_API_PREFIX
  })
}

export function updateDictType(data: DictTypeUpdateParams) {
  return apiRequest<unknown>({
    data,
    method: 'put',
    url: DICT_TYPE_API_PREFIX
  })
}

export function deleteDictType(dictIds: readonly DictTypeId[]) {
  const encodedIds = dictIds.map(dictId => encodeURIComponent(String(dictId))).join(',')
  return apiRequest<unknown>({
    method: 'delete',
    url: `${DICT_TYPE_API_PREFIX}/${encodedIds}`
  })
}

export function refreshDictTypeCache() {
  return apiRequest<unknown>({
    method: 'delete',
    url: `${DICT_TYPE_API_PREFIX}/refreshCache`
  })
}

export function queryDictTypeOptions() {
  return apiRequest<unknown>({
    method: 'get',
    url: `${DICT_TYPE_API_PREFIX}/optionselect`
  })
}
