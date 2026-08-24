import { TagsOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Button, Form, Input, Modal, Tooltip, Typography } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { TableSemantics } from '@/components/tableSemantics'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'
import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import {
  type RuleExpressionBuilderHandle,
  compileRuleLayersToSql,
  createRuleFieldOptions
} from '@/pages/workbench/ontology-kg/label-meaning/components/rule-expression'
import ExpressionBuilder from '@/pages/workbench/ontology-kg/label-meaning/components/semantic-tag/Expr'
import {
  type DefinitionState,
  getDefinitionStateAfterExpressionChange,
  getDefinitionStateAfterManualChange,
  shouldConfirmDefinitionOverwrite
} from '@/pages/workbench/ontology-kg/label-meaning/components/semantic-tag/tagDefinition'
import {
  parseTagExpression,
  serializeTagExpression
} from '@/pages/workbench/ontology-kg/label-meaning/components/semantic-tag/tagExpression'
import { validateFieldsAndScroll } from '@/pages/workbench/ontology-kg/utils/form-scroll'

import { TagInput } from '../components/semantic-tag/Model/TagInput'
import type { TagGroup } from '../types'

interface TagModalProps {
  readonly editingGroup: TagGroup | null
  readonly isModalOpen: boolean
  readonly onCancel: (isOpen: boolean) => void
  readonly onSave: (values: Partial<TagGroup>) => void
}

const DEFINITION_STATUS: Partial<Record<DefinitionState, string>> = {
  generated: '已由表达式生成，可继续编辑',
  manual: '已手动调整',
  stale: '表达式已更新，建议重新生成定义'
}

function hasFieldValue(value: unknown) {
  return value !== undefined && value !== null && value !== ''
}

function buildFormInitData(editingGroup: TagGroup | null) {
  if (!editingGroup) {
    return { exp: parseTagExpression() }
  }

  const source = editingGroup as TagGroup & Record<string, unknown>
  const semanticsGroupId = source.semanticsGroupId ?? source.semanticGroupId
  const semanticSchemaId = source.semanticSchemaId ?? source.relSchemaId ?? source.schemaId

  return {
    ...editingGroup,
    exp: parseTagExpression(editingGroup.exp),
    semanticGroupId: hasFieldValue(semanticsGroupId) ? String(semanticsGroupId) : undefined,
    semanticSchemaId: hasFieldValue(semanticSchemaId) ? String(semanticSchemaId) : undefined,
    semanticsGroupId: hasFieldValue(semanticsGroupId) ? String(semanticsGroupId) : undefined
  }
}

export const TagModal: React.FC<TagModalProps> = ({ editingGroup, isModalOpen, onCancel, onSave }) => {
  const [form] = Form.useForm()
  const expressionRef = useRef<RuleExpressionBuilderHandle>(null)
  const suppressDefinitionChange = useRef(false)
  const lastGeneratedSql = useRef('')
  const [definitionState, setDefinitionState] = useState<DefinitionState>('idle')
  const [schemaOptions, setSchemaOptions] = useState<TableSemanticParams[]>([])
  const [viewDataId, setViewDataId] = useState<number | string | undefined>(undefined)
  const formInitData = useMemo(() => buildFormInitData(editingGroup), [editingGroup])
  const semanticSchemaIdVal = Form.useWatch('semanticSchemaId', form)
  const expressionValue = Form.useWatch('exp', form)

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    form.setFieldsValue(buildFormInitData(editingGroup))
    setDefinitionState('idle')
    lastGeneratedSql.current = ''
    suppressDefinitionChange.current = false

    if (editingGroup) {
      const source = editingGroup as TagGroup & Record<string, unknown>
      setViewDataId(source.viewId as string | number | undefined)
    } else {
      setViewDataId(undefined)
    }
  }, [editingGroup, form, isModalOpen])

  const allFields = useMemo(() => {
    if (!semanticSchemaIdVal) {
      return []
    }
    try {
      const current = schemaOptions.find(item => String(item.schemaId) === String(semanticSchemaIdVal))
      if (!current?.modelDetail) {
        return []
      }
      const modelDetail = JSON.parse(current.modelDetail) as Record<string, unknown>
      const result: unknown[] = []
      const typeTitles = { dimensions: '维度', measures: '度量' }
      ;(['dimensions', 'measures'] as const).forEach(key => {
        const items = modelDetail[key]
        if (!Array.isArray(items)) {
          return
        }
        items.forEach(item => {
          const source = item as Record<string, unknown>
          const isDate = key === 'dimensions' && source.type === 'datetime'
          result.push({
            ...source,
            tfieldType: isDate ? 'dates' : key,
            typeTitle: isDate ? '日期' : typeTitles[key]
          })
        })
      })
      return result
    } catch {
      return []
    }
  }, [schemaOptions, semanticSchemaIdVal])

  const ruleFields = useMemo(() => createRuleFieldOptions(allFields), [allFields])
  const generatedDefinition = useMemo(
    () => compileRuleLayersToSql(expressionValue, ruleFields),
    [expressionValue, ruleFields]
  )

  const handleModalCancel = () => {
    form.resetFields()
    onCancel(false)
  }

  const handleModalOk = async () => {
    if (expressionRef.current?.focusFirstError()) {
      return
    }
    const formData = await validateFieldsAndScroll(form)
    if (!formData) {
      return
    }
    const { exp: expData, ...rest } = formData
    onSave({
      ...rest,
      exp: serializeTagExpression(expData),
      viewId: viewDataId
    })
    form.resetFields()
  }

  const applyGeneratedDefinition = () => {
    suppressDefinitionChange.current = true
    form.setFieldValue('remark', generatedDefinition.sql)
    lastGeneratedSql.current = generatedDefinition.sql
    setDefinitionState('generated')
    window.setTimeout(() => {
      suppressDefinitionChange.current = false
    })
  }

  const handleGenerateDefinition = () => {
    if (!generatedDefinition.validation.valid) {
      expressionRef.current?.focusFirstError()
      return
    }
    const currentDefinition = String(form.getFieldValue('remark') || '')
    const wouldOverwriteManualContent = shouldConfirmDefinitionOverwrite(currentDefinition, lastGeneratedSql.current)
    if (wouldOverwriteManualContent) {
      Modal.confirm({
        cancelText: '取消',
        content: '重新生成将覆盖当前标签定义中的手工调整内容，是否继续？',
        okText: '继续生成',
        onOk: applyGeneratedDefinition,
        title: '覆盖标签定义'
      })
      return
    }
    applyGeneratedDefinition()
  }

  const getSchemaId = ({
    semanticGroupId,
    semanticSchemaId,
    semanticsGroupId,
    viewId
  }: {
    semanticGroupId: number | string | null
    semanticSchemaId: number | string
    semanticsGroupId: number | string | null
    viewId: number | string
  }) => {
    const nextGroupId = semanticsGroupId ?? semanticGroupId ?? undefined
    form.setFieldsValue({ semanticGroupId: nextGroupId, semanticSchemaId, semanticsGroupId: nextGroupId })
    setViewDataId(viewId)
  }

  const definitionStatusText = DEFINITION_STATUS[definitionState]

  return (
    <CommonDrawer
      open={isModalOpen}
      title={editingGroup ? '编辑标签语义' : '新增标签语义'}
      width={900}
      footer={
        <ASpace className="w-full justify-end">
          <AButton onClick={handleModalCancel}>取消</AButton>
          <AButton
            type="primary"
            onClick={handleModalOk}
          >
            确认
          </AButton>
        </ASpace>
      }
      onClose={handleModalCancel}
    >
      <AForm
        className="ds-form-section mt-5"
        form={form}
        initialValues={formInitData}
        layout="vertical"
        onValuesChange={changedValues => {
          if (Object.hasOwn(changedValues, 'exp')) {
            setDefinitionState(getDefinitionStateAfterExpressionChange)
          }
          if (
            Object.hasOwn(changedValues, 'remark') &&
            !suppressDefinitionChange.current &&
            changedValues.remark !== lastGeneratedSql.current
          ) {
            setDefinitionState(getDefinitionStateAfterManualChange)
          }
        }}
      >
        <OntologyFormSectionTitle icon={<TagsOutlined />}>基础信息</OntologyFormSectionTitle>
        <TableSemantics
          valueAsString
          form={form}
          getSchemaId={getSchemaId}
          getSchemaOptions={setSchemaOptions}
          groupFieldName="semanticsGroupId"
          isEdit={Boolean(editingGroup)}
          type="shema"
        />
        <TagInput />
        <AForm.Item
          name="remark"
          rules={[{ message: '请输入标签定义', required: true }]}
          extra={
            definitionStatusText ? (
              <Typography.Text type={definitionState === 'stale' ? 'warning' : 'secondary'}>
                {definitionStatusText}
              </Typography.Text>
            ) : undefined
          }
          label={
            <span className="inline-flex items-center gap-1">
              标签定义
              <Tooltip
                title={
                  generatedDefinition.validation.valid
                    ? '一键生成定义'
                    : generatedDefinition.validation.issues[0]?.message || '请先完善表达式'
                }
              >
                <span>
                  <Button
                    aria-label="一键生成定义"
                    disabled={!generatedDefinition.validation.valid}
                    icon={<ThunderboltOutlined />}
                    shape="circle"
                    size="small"
                    type="text"
                    onClick={handleGenerateDefinition}
                  />
                </span>
              </Tooltip>
            </span>
          }
        >
          <Input.TextArea
            placeholder="请输入标签定义"
            rows={5}
          />
        </AForm.Item>
        <ExpressionBuilder
          fields={ruleFields}
          key={`${isModalOpen}-${editingGroup?.tagId || 'new'}`}
          ref={expressionRef}
        />
      </AForm>
    </CommonDrawer>
  )
}
