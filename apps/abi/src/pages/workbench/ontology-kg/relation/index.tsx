import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Popconfirm, Select, message } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'
import { DeferredRangePicker, SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar'
import { useAppSelector } from '@/hooks/business/useStore'
import { useOntologyViewControls } from '@/pages/workbench/ontology-kg/hooks/useOntologyViewControls'
import type { OntologyNetworkId, OntologyRelation } from '@/pages/workbench/ontology-kg/shared-network-types'
import { getSpaceId } from '@/store/slice/app'
import { filterByCreateTime } from '@/utils/date'

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
  const { batchDeleteRelations, deleteRelation, entities, entityNameMap, loading, relations, draftSearchValues, resetSearch, saveRelation, selectedRowKeys, setDraftSearchValues, setSelectedRowKeys, submitSearch } =
    useRelationManagement(spaceId)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRelation, setEditingRelation] = useState<OntologyRelation | null>(null)
  const [saving, setSaving] = useState(false)
  const [dateRange, setDateRange] = useState<any>(null)
  const [fePage, setFePage] = useState(1)
  const [fePageSize, setFePageSize] = useState(10)
  const { columnOptions, handleColumnToggle, setViewMode, viewMode, visibleColumnKeys } = useOntologyViewControls(RELATION_COLUMN_OPTIONS)

  const filteredRelations = useMemo(() => filterByCreateTime(relations as any[], dateRange, 'createTime') as OntologyRelation[], [relations, dateRange])
  const pagedRelations = useMemo(() => {
    const start = (fePage - 1) * fePageSize
    return filteredRelations.slice(start, start + fePageSize)
  }, [filteredRelations, fePage, fePageSize])
  useEffect(() => {
    setFePage(1)
  }, [dateRange, relations])
  const handleFePageChange = useCallback((page: number, size: number): void => {
    setFePage(page)
    setFePageSize(size)
  }, [])
  const handleViewModeChange = useCallback((mode: 'list' | 'card'): void => {
    setSelectedRowKeys([])
    setViewMode(mode)
  }, [setSelectedRowKeys, setViewMode])

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
    setDateRange(null)
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
    async (relation: OntologyRelation): Promise<void> => {
      await deleteRelation(relation.id)
      message.success('关系已删除')
    },
    [deleteRelation],
  )
  const handleBatchDelete = useCallback(async (): Promise<void> => {
    const deleted = await batchDeleteRelations()
    if (deleted) message.success('批量删除成功')
  }, [batchDeleteRelations])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <section className="abi-searchbar">
        <SearchFilterBar
          searchPlaceholder="请输入关系名称"
          searchValue={draftSearchValues.relation}
          onQuery={handleSearch}
          onReset={handleReset}
          onSearchChange={(value) => updateSearch({ relation: value })}
          filters={
            <>
              <SearchFilterField label="开始节点">
                <Select
                  allowClear
                  className="abi-field-input w-full"
                  fieldNames={{ label: 'entityName', value: 'id' }}
                  getPopupContainer={getFilterPopupContainer}
                  options={entities}
                  placeholder="开始节点"
                  showSearch
                  value={draftSearchValues.startEntityId}
                  optionFilterProp="entityName"
                  onChange={(value: OntologyNetworkId | undefined) => updateSearch({ startEntityId: value })}
                />
              </SearchFilterField>
              <SearchFilterField label="结束节点">
                <Select
                  allowClear
                  className="abi-field-input w-full"
                  fieldNames={{ label: 'entityName', value: 'id' }}
                  getPopupContainer={getFilterPopupContainer}
                  options={entities}
                  placeholder="结束节点"
                  showSearch
                  value={draftSearchValues.endEntityId}
                  optionFilterProp="entityName"
                  onChange={(value: OntologyNetworkId | undefined) => updateSearch({ endEntityId: value })}
                />
              </SearchFilterField>
              <SearchFilterField label="时间范围">
                <DeferredRangePicker
                  allowClear
                  className="abi-field-input"
                  format="YYYY-MM-DD"
                  getPopupContainer={getFilterPopupContainer}
                  placeholder={['开始时间', '结束时间']}
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates)}
                />
              </SearchFilterField>
            </>
          }
        />
      </section>
      <section className="abi-data-area flex min-h-0 flex-1 flex-col">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" type="primary" onClick={handleCreate}>
              <PlusOutlined /> 新增关系
            </AButton>
            <Popconfirm
              cancelText="取消"
              description={`确定删除选中的 ${selectedRowKeys.length} 条关系吗？`}
              disabled={!selectedRowKeys.length}
              okText="确定"
              title="提示"
              onConfirm={handleBatchDelete}
            >
              <AButton danger disabled={!selectedRowKeys.length} icon={<DeleteOutlined />}>
                批量删除{selectedRowKeys.length ? `(${selectedRowKeys.length})` : ''}
              </AButton>
            </Popconfirm>
          </div>
          <ViewControls columns={columnOptions} viewMode={viewMode} onColumnToggle={handleColumnToggle} onViewModeChange={handleViewModeChange} />
        </div>
        <RelationTable
          entityNameMap={entityNameMap}
          loading={loading}
          pagination={{ pageNum: fePage, pageSize: fePageSize, total: filteredRelations.length }}
          relations={pagedRelations}
          selectedRowKeys={selectedRowKeys}
          viewMode={viewMode}
          visibleColumnKeys={visibleColumnKeys}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onPageChange={handleFePageChange}
          onSelectedRowKeysChange={setSelectedRowKeys}
        />
      </section>
      <RelationDrawer entities={entities} loading={saving} open={drawerOpen} relation={editingRelation} onClose={() => setDrawerOpen(false)} onSave={handleSave} />
    </div>
  )
}

export default Component
