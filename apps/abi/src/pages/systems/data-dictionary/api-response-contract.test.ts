import { describeStrictApiCallContract } from '../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, './hooks/useDictDataManagement.ts', [
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryDictDataList' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'getDictDataDetail' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryDictionaryDataByType' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'createDictData' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'updateDictData' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'deleteDictData' }
])
