import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Select, message } from 'antd'
import React, { useCallback, useState } from 'react'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'
import { useAppSelector } from '@/hooks/business/useStore'
import { useOntologyViewControls } from '@/pages/workbench/ontology-kg/hooks/useOntologyViewControls'
import type { OntologyNetworkId, OntologyRelation } from '@/pages/workbench/ontology-kg/shared-network-types'
import { getSpaceId } from '@/store/slice/app'

import RelationDrawer from './components/RelationDrawer'
import RelationTable from './components/RelationTable'
import { useRelationManagement } from './hooks/useRelationManagement'
import type { RelationFormValues, RelationSearchValues } from './types'

const RELATION_COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'startEntityId', label: '开始节点', visible: true },
  { key: 'relation', label: '关系名称', visible: true },
  { key: 'endEntityId', label: '结束节点', visible: true },
  { key: 'inverseFlag', label: '是否可逆', visible: true },
  { key: 'createBy', label: '创建人', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
]

export const Component: React.FC = () => {
  const spaceId = useAppSelector(getSpaceId)
  const { deleteRelation, entities, entityNameMap, loading, pagination, relations, draftSearchValues, resetSearch, saveRelation, setPage, setDraftSearchValues, submitSearch } =
    useRelationManagement(spaceId)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRelation, setEditingRelation] = useState<OntologyRelation | null>(null)
  const [saving, setSaving] = useState(false)
  const { columnOptions, handleColumnToggle, setViewMode, viewMode, visibleColumnKeys } = useOntologyViewControls(RELATION_COLUMN_OPTIONS)

  const updateSearch = useCallback(
    (patch: Partial<RelationSearchValues>): void => {
      setDraftSearchValues((current) => ({ ...current, ...patch }))
    },
    [setDraftSearchValues],
  )

  const handleSearch = useCallback((): void => {
    submitSearch()
  }, [submitSearch])

  const handleReset = useCallback((): void => {
    resetSearch()
  }, [resetSearch])

  const handleCreate = useCallback((): void => {
    setEditingRelation(null)
    setDrawerOpen(true)
  }, [])

  const handleEdit = useCallback((relation: OntologyRelation): void => {
    setEditingRelation(relation)
    setDrawerOpen(true)
  }, [])

  const handleSave = useCallback(
    async (values: RelationFormValues, relation?: OntologyRelation): Promise<void> => {
      setSaving(true)
      try {
        await saveRelation(values, relation)
        message.success(relation ? '关系已更新' : '关系已新增')
      } catch {
        message.error('保存失败，请稍后重试')
        throw new Error('保存关系失败')
      } finally {
        setSaving(false)
      }
    },
    [saveRelation],
  )

  const handleDelete = useCallback(
    (relation: OntologyRelation): void => {
      ;(async () => {
        try {
          await deleteRelation(relation.id)
          message.success('关系已删除')
        } catch {
          // The request layer has already displayed the backend error message.
        }
      })()
    },
    [deleteRelation],
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <section className="abi-searchbar">
        <div className="abi-search-row flex-wrap">
          <Select
            allowClear
            className="abi-field-input"
            fieldNames={{ label: 'entityName', value: 'id' }}
            options={entities}
            placeholder="开始节点"
            showSearch
            style={{ width: 190 }}
            value={draftSearchValues.startEntityId}
            optionFilterProp="entityName"
            onChange={(value: OntologyNetworkId | undefined) => updateSearch({ startEntityId: value })}
          />
          <AInput
            allowClear
            className="abi-field-input"
            placeholder="关系名称"
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            style={{ width: 190 }}
            value={draftSearchValues.relation}
            onChange={(event) => updateSearch({ relation: event.target.value })}
            onPressEnter={handleSearch}
          />
          <Select
            allowClear
            className="abi-field-input"
            fieldNames={{ label: 'entityName', value: 'id' }}
            options={entities}
            placeholder="结束节点"
            showSearch
            style={{ width: 190 }}
            value={draftSearchValues.endEntityId}
            optionFilterProp="entityName"
            onChange={(value: OntologyNetworkId | undefined) => updateSearch({ endEntityId: value })}
          />
          <AButton className="btn-accent-gradient" type="primary" onClick={handleSearch}>
            <SearchOutlined /> 查询
          </AButton>
          <AButton onClick={handleReset}>
            <ReloadOutlined /> 重置
          </AButton>
        </div>
      </section>
      <section className="abi-data-area flex min-h-0 flex-1 flex-col">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" type="primary" onClick={handleCreate}>
              <PlusOutlined /> 新增关系
            </AButton>
          </div>
          <ViewControls columns={columnOptions} viewMode={viewMode} onColumnToggle={handleColumnToggle} onViewModeChange={setViewMode} />
        </div>
        <RelationTable
          entityNameMap={entityNameMap}
          loading={loading}
          pagination={pagination}
          relations={relations}
          viewMode={viewMode}
          visibleColumnKeys={visibleColumnKeys}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onPageChange={setPage}
        />
      </section>
      <RelationDrawer entities={entities} loading={saving} open={drawerOpen} relation={editingRelation} onClose={() => setDrawerOpen(false)} onSave={handleSave} />
    </div>
  )
}

export default Component
