import { describeStrictApiCallContract } from '../../../../service/request/strict-api-call-contract.test-helper'

describeStrictApiCallContract(import.meta.url, './hooks/useTagManagement.ts', [
  { guard: /isFlatRequestSuccess\(res\)/, name: 'queryTerms' },
  { guard: /assertFlatRequestSuccess\(res/, name: 'deleteTerms' },
])

describeStrictApiCallContract(import.meta.url, './components/TechnicalJargonOperateDrawer.tsx', [
  { guard: /isFlatRequestSuccess\(result\)/, name: 'addTerms' },
  { guard: /isFlatRequestSuccess\(result\)/, name: 'editTerms' },
])

describeStrictApiCallContract(import.meta.url, './components/CalculateCom.tsx', [{ guard: /isFlatRequestSuccess\(result\)/, name: 'fetchDataCollectionList' }])
