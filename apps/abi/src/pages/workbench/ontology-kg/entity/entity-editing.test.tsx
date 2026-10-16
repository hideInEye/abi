import React from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OntologyEntity } from '../shared-network-types'
import { EntityDrawer } from './components/EntityDrawer'
import { useEntityManagement } from './hooks/useEntityManagement'
import type { EntityFormValues } from './types'

interface FieldProps {
  children: ReactElement<{ disabled?: boolean; mode?: string }>
  name: string
  rules?: Array<{ required?: boolean; min?: number; max?: number; message?: string }>
}

const { fields, actions, api, validate, success, error } = vi.hoisted(() => ({
  fields: {} as Record<string, FieldProps>,
  actions: {} as Record<string, () => Promise<void>>,
  api: {
    createOntologyEntity: vi.fn(),
    updateOntologyEntity: vi.fn(),
    queryOntologyEntityList: vi.fn(),
    queryOntologyLabels: vi.fn(),
    deleteOntologyEntity: vi.fn(),
    deleteOntologyEntityBatch: vi.fn(),
  },
  validate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/service/api/ontology-network', () => api)
vi.mock('@/pages/workbench/ontology-kg/utils/form-scroll', () => ({ validateFieldsAndScroll: validate }))
vi.mock('antd', () => ({
  Form: Object.assign(({ children }: { children: ReactNode }) => <div>{children}</div>, {
    Item: (props: FieldProps) => {
      fields[props.name] = props
      return props.children
    },
    useForm: () => [{}],
  }),
  Input: Object.assign(() => <input />, { TextArea: () => <textarea /> }),
  Select: () => <select />,
  Space: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick }: { children: ReactNode; onClick: () => Promise<void> }) => {
    actions[String(children)] = onClick
    return null
  },
  message: { success, error },
}))
vi.mock('@ant-design/icons', () => ({ DeploymentUnitOutlined: () => null }))
vi.mock('@/components/stateless/common/CommonDrawer', () => ({
  default: ({ children, footer }: { children: ReactNode; footer: ReactNode }) => <div>{children}{footer}</div>,
}))
vi.mock('@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle', () => ({
  OntologyFormSectionTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

const entity: OntologyEntity = {
  id: '9007199254740993', spaceId: '138', entityName: '原实体', entityCode: 'entity_code',
  labelId: '1', color: '#5B7CF7', remark: '', attributeCount: 0,
  createBy: null, createTime: '', updateTime: '', validFlag: '1',
}
const values: EntityFormValues = {
  entityName: '  新实体名称  ', entityCode: entity.entityCode,
  labelSelection: '9007199254740995', color: '#123456', remark: '  修改备注  ',
}

function renderEditor(editingEntity?: OntologyEntity) {
  const onClose = vi.fn()
  function Editor() {
    const { saveEntity } = useEntityManagement('138')
    return <EntityDrawer entity={editingEntity} labels={[]} open onClose={onClose} onSave={saveEntity} />
  }
  renderToStaticMarkup(<Editor />)
  return onClose
}

beforeEach(() => {
  vi.resetAllMocks()
  Object.keys(fields).forEach(key => delete fields[key])
  Object.keys(actions).forEach(key => delete actions[key])
  validate.mockResolvedValue({ ...values })
  api.createOntologyEntity.mockResolvedValue({ data: entity, error: null })
  api.updateOntologyEntity.mockResolvedValue({ data: entity, error: null })
  api.queryOntologyEntityList.mockResolvedValue({ data: { records: [], total: 0 }, error: null })
  api.queryOntologyLabels.mockResolvedValue({ data: [], error: null })
})

describe('entity editing', () => {
  it('allows changing the name and label while keeping the entity code locked and validation intact', () => {
    renderEditor(entity)
    expect(fields.entityName.children.props.disabled).not.toBe(true)
    expect(fields.labelSelection.children.props.disabled).not.toBe(true)
    expect(fields.labelSelection.children.props.mode).toBeUndefined()
    expect(fields.entityCode.children.props.disabled).toBe(true)
    expect(fields.entityName.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ required: true }),
      expect.objectContaining({ min: 2 }),
      expect.objectContaining({ max: 50 }),
    ]))
    expect(fields.labelSelection.rules).toContainEqual(expect.objectContaining({ required: true }))
  })

  it.each(['9007199254740995', 42])('submits the edited name and label ID %s without changing the code', async labelId => {
    validate.mockResolvedValue({ ...values, labelSelection: labelId })
    const onClose = renderEditor(entity)
    await actions['保存']()

    expect(api.updateOntologyEntity).toHaveBeenCalledOnce()
    expect(api.updateOntologyEntity).toHaveBeenCalledWith({
      id: entity.id, spaceId: '138', entityName: '新实体名称', labelId,
      color: values.color, remark: '修改备注',
    })
    expect(api.createOntologyEntity).not.toHaveBeenCalled()
    expect(api.queryOntologyEntityList).toHaveBeenCalledOnce()
    expect(api.queryOntologyLabels).toHaveBeenCalledOnce()
    expect(success).toHaveBeenCalledWith('实体已更新')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('waits for the update response before refreshing, reporting success or closing', async () => {
    let resolveUpdate!: (value: { error: null }) => void
    api.updateOntologyEntity.mockReturnValue(new Promise(resolve => { resolveUpdate = resolve }))
    const onClose = renderEditor(entity)
    const saving = actions['保存']()
    await Promise.resolve()

    expect(api.updateOntologyEntity).toHaveBeenCalledOnce()
    expect(api.queryOntologyEntityList).not.toHaveBeenCalled()
    expect(api.queryOntologyLabels).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    resolveUpdate({ error: null })
    await saving
    expect(api.queryOntologyEntityList).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it.each(['business', 'network'])('keeps the editor open and does not refresh on a %s failure', async failure => {
    const saveError = new Error('更新失败')
    if (failure === 'business') api.updateOntologyEntity.mockResolvedValue({ error: saveError })
    else api.updateOntologyEntity.mockRejectedValue(saveError)
    const onClose = renderEditor(entity)
    await actions['保存']()

    expect(error).toHaveBeenCalledWith('实体保存失败，请稍后重试')
    expect(success).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(api.queryOntologyEntityList).not.toHaveBeenCalled()
    expect(api.queryOntologyLabels).not.toHaveBeenCalled()
  })

  it('does not submit when field validation fails', async () => {
    validate.mockResolvedValue(null)
    const onClose = renderEditor(entity)
    await actions['保存']()

    expect(api.updateOntologyEntity).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('preserves editable creation fields and new-label submission', async () => {
    validate.mockResolvedValue({ ...values, labelSelection: ['  新标签  '] })
    renderEditor()
    expect(fields.entityCode.children.props.disabled).toBe(false)
    expect(fields.labelSelection.children.props.mode).toBe('tags')
    await actions['保存']()

    expect(api.createOntologyEntity).toHaveBeenCalledOnce()
    expect(api.createOntologyEntity).toHaveBeenCalledWith({
      color: values.color, entityCode: entity.entityCode, entityName: '新实体名称',
      labelBizName: '新标签', remark: '修改备注', spaceId: '138',
    })
    expect(api.updateOntologyEntity).not.toHaveBeenCalled()
  })
})
