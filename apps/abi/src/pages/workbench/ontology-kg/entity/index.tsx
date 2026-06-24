import { PlusOutlined } from '@ant-design/icons'
import { Button, message } from 'antd'
import React, { useCallback, useState } from 'react'

import { useAppSelector } from '@/hooks/business/useStore'
import type { OntologyEntity } from '@/pages/workbench/ontology-kg/shared-network-types'
import { getSpaceId } from '@/store/slice/app'

import { AttributeDrawer } from './components/AttributeDrawer'
import { EntityDrawer } from './components/EntityDrawer'
import { EntitySearch } from './components/EntitySearch'
import { EntityTable } from './components/EntityTable'
import { useEntityManagement } from './hooks/useEntityManagement'
import type { EntitySearchValues } from './types'

export const Component: React.FC = () => {
  const spaceId = useAppSelector(getSpaceId)
  const [entityDrawerOpen, setEntityDrawerOpen] = useState(false)
  const [attributeDrawerOpen, setAttributeDrawerOpen] = useState(false)
  const [deletingEntityId, setDeletingEntityId] = useState<OntologyEntity['id']>()
  const [editingEntity, setEditingEntity] = useState<OntologyEntity>()
  const [attributeEntity, setAttributeEntity] = useState<OntologyEntity>()
  const { deleteEntity, entities, labels, loading, pagination, refresh, resetSearch, saveEntity, searchValues, setPage, setSearchValues } = useEntityManagement(spaceId)

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
          </div>
        </div>
        <div className="assistant-table-scroll min-h-0 flex-1 overflow-auto">
          <EntityTable
            data={entities}
            deletingId={deletingEntityId}
            labels={labels}
            loading={loading}
            pagination={pagination}
            onAttributes={openAttributes}
            onDelete={handleDelete}
            onEdit={openEdit}
            onPageChange={setPage}
          />
        </div>
      </main>
      <EntityDrawer entity={editingEntity} labels={labels} open={entityDrawerOpen} onClose={closeEntityDrawer} onSave={saveEntity} />
      <AttributeDrawer entity={attributeEntity} labels={labels} open={attributeDrawerOpen} onClose={closeAttributeDrawer} onSaved={refresh} />
    </div>
  )
}

export default Component
