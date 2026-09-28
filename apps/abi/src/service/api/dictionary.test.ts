import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  DictDataCreateParams,
  DictDataListParams,
  DictDataUpdateParams,
  DictTypeCreateParams,
  DictTypeListParams,
  DictTypeUpdateParams
} from '@/pages/systems/data-dictionary/types'

import {
  createDictData,
  createDictType,
  deleteDictData,
  deleteDictType,
  getDictDataDetail,
  queryDictDataList,
  queryDictTypeList,
  queryDictTypeOptions,
  queryDictionaryDataByType,
  refreshDictTypeCache,
  updateDictData,
  updateDictType
} from './dictionary'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('../request', () => ({ apiRequest }))

describe('system dictionary data API routes', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('queries the server-paginated list with GET params', () => {
    const params: DictDataListParams = {
      dictLabel: '业务',
      dictType: 'semantic',
      pageNum: 2,
      pageSize: 20,
      status: '0'
    }

    queryDictDataList(params)

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      params,
      url: '/api/system/dict/data/list'
    })
  })

  it('gets an encoded Long ID through the detail path', () => {
    getDictDataDetail('code/9007199254740993')

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      url: '/api/system/dict/data/code%2F9007199254740993'
    })
  })

  it('queries an encoded dictionary type', () => {
    queryDictionaryDataByType('semantic/type')

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      url: '/api/system/dict/data/type/semantic%2Ftype'
    })
  })

  it('posts and puts the confirmed form payloads', () => {
    const createPayload: DictDataCreateParams = {
      cssClass: '',
      dictLabel: '高风险',
      dictSort: 10,
      dictType: 'semantic_biz_type',
      dictValue: 'HIGH_RISK',
      isDefault: 'N',
      listClass: 'danger',
      remark: '',
      status: '0'
    }
    const updatePayload: DictDataUpdateParams = {
      ...createPayload,
      dictCode: '9007199254740993'
    }

    createDictData(createPayload)
    updateDictData(updatePayload)

    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      data: createPayload,
      method: 'post',
      url: '/api/system/dict/data'
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      data: updatePayload,
      method: 'put',
      url: '/api/system/dict/data'
    })
  })

  it('encodes every delete ID while preserving comma separators', () => {
    deleteDictData(['9007199254740993', 'code/2', 3])

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'delete',
      url: '/api/system/dict/data/9007199254740993,code%2F2,3'
    })
  })
})

describe('system dictionary type API routes', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('queries the server-paginated type list with GET params', () => {
    const params: DictTypeListParams = {
      dictName: '业务',
      dictType: 'semantic',
      pageNum: 3,
      pageSize: 30,
      status: '0'
    }

    queryDictTypeList(params)

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'get',
      params,
      url: '/api/system/dict/type/list'
    })
  })

  it('posts and puts dictionary type payloads', () => {
    const createPayload: DictTypeCreateParams = {
      dictName: '业务类别',
      dictType: 'semantic_biz_type',
      remark: '',
      status: '0'
    }
    const updatePayload: DictTypeUpdateParams = {
      ...createPayload,
      dictId: '9007199254740993'
    }

    createDictType(createPayload)
    updateDictType(updatePayload)

    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      data: createPayload,
      method: 'post',
      url: '/api/system/dict/type'
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      data: updatePayload,
      method: 'put',
      url: '/api/system/dict/type'
    })
  })

  it('encodes every type ID while preserving comma separators', () => {
    deleteDictType(['9007199254740993', 'type/2', 3])

    expect(apiRequest).toHaveBeenCalledWith({
      method: 'delete',
      url: '/api/system/dict/type/9007199254740993,type%2F2,3'
    })
  })

  it('refreshes the dictionary cache and queries type options', () => {
    refreshDictTypeCache()
    queryDictTypeOptions()

    expect(apiRequest).toHaveBeenNthCalledWith(1, {
      method: 'delete',
      url: '/api/system/dict/type/refreshCache'
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, {
      method: 'get',
      url: '/api/system/dict/type/optionselect'
    })
  })
})
