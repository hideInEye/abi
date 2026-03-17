import type { DictionaryEnumAddItem, DictionaryEnumItem } from '@/pages/component/system/data-dictionary/types';

import { apiRequest } from '../request';

export function addDictionary(data: any) {
  return apiRequest({
    data,
    method: 'post',
    url: '/api/system/v1/dictionary'
  });
}

export function editDictionary(data: any) {
  return apiRequest({
    data,
    method: 'put',
    url: '/api/system/v1/dictionary'
  });
}

export function deleteDictionary(ids: number) {
  return apiRequest({
    method: 'delete',
    params: {
      ids
    },
    url: `/api/system/v1/dictionary/${ids}`
  });
}

export function queryDictionary(data: { groupId: string; pageNum: number; pageSize: number }) {
  return apiRequest({
    data,
    method: 'get',
    params: data,
    url: '/api/system/v1/dictionary/list'
  });
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
  });
}

export function updateDictionaryEnum(data: DictionaryEnumItem) {
  return apiRequest({
    data,
    method: 'put',
    url: '/api/system/v1/dictionarydata'
  });
}

/**
 * 字典枚举查询
 *
 * @param dictId
 * @returns
 */
export function queryDictionaryEnum(params: {
  dictField: string;
  dictLabel: string;
  pageNum: number;
  pageSize: number;
}) {
  return apiRequest({
    method: 'get',
    params,
    url: `/api/system/v1/dictionarydata/list`
  });
}

export function deleteDictionaryEnum(dictIds: number) {
  return apiRequest({
    method: 'delete',
    params: {
      dictIds
    },
    url: `/api/system/v1/dictionarydata/${dictIds}`
  });
}
