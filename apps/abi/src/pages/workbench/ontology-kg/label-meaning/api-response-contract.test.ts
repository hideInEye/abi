import { describeStrictApiCallContract } from '../../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, './hooks/useTagGroups.ts', [
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'addTag' },
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'delTag' },
])

describeStrictApiCallContract(import.meta.url, './hooks/useDataCollectionList.ts', [{ guard: /isFlatRequestSuccess\(result\)/, name: 'fetchDataCollectionList' }])

describeStrictApiCallContract(import.meta.url, './hooks/useTagManagement.ts', [
  { guard: /assertFlatRequestSuccess\(result\)/, name: 'delTag' },
  { guard: /isFlatRequestSuccess\(result\)/, name: 'queryTag' },
  { guard: /isFlatRequestSuccess\(result\)/, name: 'editTag' },
  { guard: /isFlatRequestSuccess\(result\)/, name: 'addTag' },
])

describeStrictApiCallContract(import.meta.url, './components/semantic-tag/Model/DataMapsSelect.tsx', [{ guard: /isFlatRequestSuccess\(result\)/, name: 'getCollectionDetail' }])
