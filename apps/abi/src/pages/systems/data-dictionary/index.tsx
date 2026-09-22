import { useState } from 'react'

import { DictDataManagement } from './components/DictDataManagement'
import { DictTypeManagement } from './components/DictTypeManagement'
import { DictionaryModeHeader } from './components/DictionaryModeHeader'
import type { DictionaryMode } from './components/DictionaryModeHeader'
import styles from './data-dictionary.module.scss'
import { useDictTypeOptions } from './hooks/useDictTypeOptions'
import type { SysDictType } from './types'

export const Component = () => {
  const [activeMode, setActiveMode] = useState<DictionaryMode>('type')
  const [selectedType, setSelectedType] = useState<SysDictType | null>(null)
  const {
    error: typeOptionsError,
    loading: typeOptionsLoading,
    options: typeOptions,
    refresh: refreshTypeOptions
  } = useDictTypeOptions()

  function changeMode(mode: DictionaryMode): void {
    setActiveMode(mode)
    setSelectedType(null)
  }

  function manageTypeData(record: SysDictType): void {
    setSelectedType(record)
    setActiveMode('data')
  }

  return (
    <div className={`${styles.pageRoot} h-full min-h-0 flex flex-col overflow-hidden`}>
      <DictionaryModeHeader
        activeMode={activeMode}
        onChange={changeMode}
      />
      {activeMode === 'type' ? (
        <DictTypeManagement
          onManageData={manageTypeData}
          onTypesChanged={() => refreshTypeOptions().catch(() => undefined)}
        />
      ) : (
        <DictDataManagement
          key={selectedType ? String(selectedType.dictId) : 'all-data'}
          selectedType={selectedType}
          typeOptions={typeOptions}
          typeOptionsError={typeOptionsError}
          typeOptionsLoading={typeOptionsLoading}
          onRetryTypeOptions={() => refreshTypeOptions().catch(() => undefined)}
        />
      )}
    </div>
  )
}
