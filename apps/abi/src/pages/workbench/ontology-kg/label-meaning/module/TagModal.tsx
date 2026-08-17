import { TagsOutlined } from '@ant-design/icons'
import { Form, Input } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React, { useEffect, useMemo, useState } from 'react'

import { TableSemantics } from '@/components/tableSemantics'
import ExpressionBuilder from '@/pages/workbench/ontology-kg/label-meaning/components/semantic-tag/Expr.tsx'
import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import { validateFieldsAndScroll } from '@/pages/workbench/ontology-kg/utils/form-scroll'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types/index.js'

import { TagInput } from '../components/semantic-tag/Model/TagInput.tsx'
import type { TagGroup } from '../types/index.ts'

interface TagModalProps {
  readonly editingGroup: TagGroup | null
  readonly isModalOpen: boolean
  readonly onCancel: (isOpen: boolean) => void
  readonly onSave: (values: Partial<TagGroup>) => void
}

function hasFieldValue(value: unknown) {
  return value !== undefined && value !== null && value !== ''
}

function parseExpressions(exp?: string) {
  if (!exp) {
    return []
  }
  try {
    return JSON.parse(decodeURIComponent(exp))
  } catch {
    return []
  }
}

function buildFormInitData(editingGroup: TagGroup | null) {
  if (!editingGroup) {
    return {
      exp: [
        {
          binName: '',
          conditions: [
            {
              metric: '',
              operator: '>=',
              value: '',
            },
          ],
          logic: 'AND',
        },
      ],
    }
  }

  const source = editingGroup as TagGroup & Record<string, unknown>
  const semanticsGroupId = source.semanticsGroupId ?? source.semanticGroupId
  const semanticSchemaId = source.semanticSchemaId ?? source.relSchemaId ?? source.schemaId

  return {
    ...editingGroup,
    exp: parseExpressions(editingGroup.exp),
    semanticGroupId: hasFieldValue(semanticsGroupId) ? String(semanticsGroupId) : undefined,
    semanticSchemaId: hasFieldValue(semanticSchemaId) ? String(semanticSchemaId) : undefined,
    semanticsGroupId: hasFieldValue(semanticsGroupId) ? String(semanticsGroupId) : undefined,
  }
}

export const TagModal: React.FC<TagModalProps> = ({ editingGroup, isModalOpen, onCancel, onSave }) => {
  const [form] = Form.useForm()
  const [viewDataId, setViewDataId] = useState<number | string | undefined>(undefined)
  const formInitData = buildFormInitData(editingGroup)

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    const nextValues = buildFormInitData(editingGroup)
    form.setFieldsValue(nextValues)

    if (editingGroup) {
      const source = editingGroup as TagGroup & Record<string, unknown>
      setViewDataId(source.viewId as string | number | undefined)
    } else {
      setViewDataId(undefined)
    }
  }, [editingGroup, form, isModalOpen])

  const handleModalCancel = async () => {
    form.resetFields()
    onCancel(false)
  }

  const handleModalOk = async () => {
    const formData = await validateFieldsAndScroll(form)
    if (!formData) {
      return
    }
    const { exp: expData, ...rest } = formData
    onSave({
      ...rest,
      exp: encodeURIComponent(JSON.stringify(expData)),
      viewId: viewDataId,
    })
    form.resetFields()
  }

  const semanticSchemaIdVal = Form.useWatch('semanticSchemaId', form)

  const getSchemaId = ({ semanticGroupId, semanticSchemaId, semanticsGroupId, viewId }: { semanticGroupId: number | string | null; semanticSchemaId: number | string; semanticsGroupId: number | string | null; viewId: number | string }) => {
    const nextGroupId = semanticsGroupId ?? semanticGroupId ?? undefined
    form.setFieldsValue({ semanticGroupId: nextGroupId, semanticSchemaId, semanticsGroupId: nextGroupId })
    setViewDataId(viewId)
  }

  const [schemaOptions, setSchemaOptions] = useState<TableSemanticParams[]>([])

  const allFields = useMemo(() => {
    if (semanticSchemaIdVal) {
      try {
        const cur: any = schemaOptions.find((item: any) => String(item.schemaId) === String(semanticSchemaIdVal))
        if (!cur?.modelDetail) {
          return []
        }
        const modelDetailObj = JSON.parse(cur.modelDetail)
        let resData: any[] = []
        const includesTypes = ['dimensions', 'measures']
        const labelMap: any = {
          dimensions: '维度',
          measures: '度量',
        }
        Object.keys(modelDetailObj).forEach((key) => {
          if (includesTypes.includes(key)) {
            const formatArr = modelDetailObj[key].map((item: any) => ({
              ...item,
              tfieldType: key === 'dimensions' && item.type === 'datetime' ? 'dates' : key,
              typeTitle: key === 'dimensions' && item.type === 'datetime' ? '日期' : labelMap[key],
            }))
            resData = resData.concat(formatArr)
          }
        })

        return resData
      } catch {
        return []
      }
    }
    return []
  }, [semanticSchemaIdVal, schemaOptions])

  const getSchemaOptions = (options: TableSemanticParams[]) => {
    setSchemaOptions(options)
  }

  return (
    <CommonDrawer
      open={isModalOpen}
      title={editingGroup ? '编辑标签语义' : '新增标签语义'}
      width={900}
      footer={
        <ASpace className="w-full justify-end">
          <AButton type="primary" onClick={handleModalCancel}>
            取消
          </AButton>
          <AButton type="primary" onClick={handleModalOk}>
            确认
          </AButton>
        </ASpace>
      }
      onClose={handleModalCancel}
    >
      <AForm className="mt-5 ds-form-section" form={form} initialValues={formInitData || {}} layout="vertical">
        <OntologyFormSectionTitle icon={<TagsOutlined />}>基础信息</OntologyFormSectionTitle>
        <TableSemantics
          form={form}
          getSchemaId={getSchemaId}
          getSchemaOptions={getSchemaOptions}
          groupFieldName="semanticsGroupId"
          isEdit={Boolean(editingGroup)}
          type="shema"
          valueAsString
        />
        <TagInput />
        <AForm.Item
          label="标签定义"
          name="remark"
          rules={[
            { message: '支持输入多个，支持换行，支持输入特殊字符，支持输入运算公式', required: true },
            {
              max: 100,
              message: '不能超过100个字符',
            },
          ]}
        >
          <Input.TextArea placeholder="请输入标签定义" rows={5} />
        </AForm.Item>
        <ExpressionBuilder allFields={allFields} />
      </AForm>
    </CommonDrawer>
  )
}
