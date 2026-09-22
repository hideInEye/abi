import { describeStrictApiCallContract } from '../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, './hooks/useDictTypeManagement.ts', [
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryDictTypeList' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'createDictType' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'updateDictType' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'deleteDictType' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'refreshDictTypeCache' }
])

describeStrictApiCallContract(import.meta.url, './hooks/useDictTypeOptions.ts', [
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'queryDictTypeOptions' }
])
