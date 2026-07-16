import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Popconfirm, message } from 'antd'
import React, { useCallback, useState } from 'react'

import { ViewControls } from '@/components/ViewControls'
import type { ColumnOption } from '@/components/ViewControls'
import { useAppSelector } from '@/hooks/business/useStore'
import { useOntologyViewControls } from '@/pages/workbench/ontology-kg/hooks/useOntologyViewControls'
import type { OntologyEntity } from '@/pages/workbench/ontology-kg/shared-network-types'
import { getSpaceId } from '@/store/slice/app'

import { AttributeDrawer } from './components/AttributeDrawer'
import { EntityDrawer } from './components/EntityDrawer'
import { EntitySearch } from './components/EntitySearch'
import { EntityTable } from './components/EntityTable'
import { useEntityManagement } from './hooks/useEntityManagement'
import type { EntitySearchValues } from './types'

const ENTITY_COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'entityName', label: '实体名称', visible: true },
  { key: 'entityCode', label: '实体编码', visible: true },
  { key: 'labelId', label: '标签类型', visible: true },
  { key: 'color', label: '颜色', visible: true },
  { key: 'attributeCount', label: '属性数量', visible: true },
  { key: 'validFlag', label: '有效状态', visible: true },
  { key: 'createBy', label: '创建人', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
]

export const Component: React.FC = () => {
  const spaceId = useAppSelector(getSpaceId)
  const [entityDrawerOpen, setEntityDrawerOpen] = useState(false)
  const [attributeDrawerOpen, setAttributeDrawerOpen] = useState(false)
  const [deletingEntityId, setDeletingEntityId] = useState<OntologyEntity['id']>()
  const [editingEntity, setEditingEntity] = useState<OntologyEntity>()
  const [attributeEntity, setAttributeEntity] = useState<OntologyEntity>()
  const { batchDeleteEntities, deleteEntity, entities, labels, loading, pagination, refresh, resetSearch, saveEntity, searchValues, selectedRowKeys, setPage, setSearchValues, setSelectedRowKeys } =
    useEntityManagement(spaceId)
  const { columnOptions, handleColumnToggle, setViewMode, viewMode, visibleColumnKeys } = useOntologyViewControls(ENTITY_COLUMN_OPTIONS)

  const openCreate = useCallback((): void => {
    setEditingEntity(undefined)
    setEntityDrawerOpen(true)
  }, [])
  const openEdit = useCallback((entity: OntologyEntity): void => {
    setEditingEntity(entity)
    setEntityDrawerOpen(true)
  }, [])
  const openAttributes = useCallback((entity: OntologyEntity): void => {
    setAttributeEntity(entity)
    setAttributeDrawerOpen(true)
  }, [])
  const closeEntityDrawer = useCallback((): void => setEntityDrawerOpen(false), [])
  const closeAttributeDrawer = useCallback((): void => setAttributeDrawerOpen(false), [])
  const handleSearch = useCallback(
    (values: EntitySearchValues): void => {
      setSearchValues(values)
      setPage(1)
    },
    [setPage, setSearchValues],
  )
  const handleDelete = useCallback(
    (id: OntologyEntity['id']): void => {
      ;(async () => {
        setDeletingEntityId(id)
        try {
          await deleteEntity(id)
          message.success('实体已删除')
        } catch {
          // The request layer has already displayed the backend error message.
        } finally {
          setDeletingEntityId(undefined)
        }
      })()
    },
    [deleteEntity],
  )
  const handleBatchDelete = useCallback((): void => {
    ;(async () => {
      try {
        await batchDeleteEntities()
        message.success('批量删除成功')
      } catch {
        // The request layer has already displayed the backend error message.
      }
    })()
  }, [batchDeleteEntities])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <section className="abi-searchbar">
        <EntitySearch labels={labels} value={searchValues} onChange={handleSearch} onReset={resetSearch} />
      </section>
      <main className="abi-data-area flex min-h-0 flex-1 flex-col">
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <Button className="btn-accent-gradient" icon={<PlusOutlined />} type="primary" onClick={openCreate}>
              新增实体
            </Button>
            <Popconfirm
              cancelText="取消"
              description={`确定删除选中的 ${selectedRowKeys.length} 条实体吗？`}
              disabled={!selectedRowKeys.length}
              okText="确定"
              title="提示"
              onConfirm={handleBatchDelete}
            >
              <Button danger disabled={!selectedRowKeys.length} icon={<DeleteOutlined />}>
                批量删除{selectedRowKeys.length ? `(${selectedRowKeys.length})` : ''}
              </Button>
            </Popconfirm>
          </div>
          <ViewControls columns={columnOptions} viewMode={viewMode} onColumnToggle={handleColumnToggle} onViewModeChange={setViewMode} />
        </div>
        <EntityTable
          data={entities}
          deletingId={deletingEntityId}
          labels={labels}
          loading={loading}
          pagination={pagination}
          selectedRowKeys={selectedRowKeys}
          viewMode={viewMode}
          visibleColumnKeys={visibleColumnKeys}
          onAttributes={openAttributes}
          onDelete={handleDelete}
          onEdit={openEdit}
          onPageChange={setPage}
          onSelectedRowKeysChange={setSelectedRowKeys}
        />
      </main>
      <EntityDrawer entity={editingEntity} labels={labels} open={entityDrawerOpen} onClose={closeEntityDrawer} onSave={saveEntity} />
      <AttributeDrawer entity={attributeEntity} labels={labels} open={attributeDrawerOpen} onClose={closeAttributeDrawer} onSaved={refresh} />
    </div>
  )
}

export default Component
