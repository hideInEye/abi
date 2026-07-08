import { BranchesOutlined } from '@ant-design/icons'
import { Form, Input, Select, Switch } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import type { OntologyEntity, OntologyNetworkId, OntologyRelation } from '@/pages/workbench/ontology-kg/shared-network-types'

import type { RelationFormValues } from '../types'

interface RelationDrawerProps {
  readonly entities: OntologyEntity[]
  readonly loading: boolean
  readonly onClose: () => void
  readonly onSave: (values: RelationFormValues, relation?: OntologyRelation) => Promise<void>
  readonly open: boolean
  readonly relation: OntologyRelation | null
}

export const RelationDrawer: React.FC<RelationDrawerProps> = ({ entities, loading, open, relation, onClose, onSave }) => {
  const [form] = Form.useForm<RelationFormValues>()
  const saveInFlightRef = useRef(false)
  const title = relation ? '编辑关系' : '新增关系'

  useEffect(() => {
    if (!open) return
    form.resetFields()
    if (relation) {
      form.setFieldsValue({
        endEntityId: relation.endEntityId,
        inverseFlag: Number(relation.inverseFlag) === 1 ? 1 : 0,
        relation: relation.relation,
        remark: relation.remark ?? '',
        startEntityId: relation.startEntityId,
      })
    } else {
      form.setFieldsValue({ inverseFlag: 0, relation: '', remark: '' })
    }
  }, [form, open, relation])

  const relationRules = useMemo(
    () => [
      { message: '请输入关系名称', required: true },
      { max: 50, message: '关系名称长度为 2-50 个字符' },
      { min: 2, message: '关系名称长度为 2-50 个字符' },
    ],
    [],
  )

  const handleSave = useCallback(async (): Promise<void> => {
    if (saveInFlightRef.current) return
    saveInFlightRef.current = true
    try {
      const values = await form.validateFields()
      await onSave(values, relation ?? undefined)
      onClose()
    } catch {
      // Form rules and the caller's notification already explain the failure.
    } finally {
      saveInFlightRef.current = false
    }
  }, [form, onClose, onSave, relation])

  const validateDifferentEntities = useCallback(async (): Promise<void> => {
    const startEntityId = form.getFieldValue('startEntityId')
    const endEntityId = form.getFieldValue('endEntityId')
    if (startEntityId !== undefined && endEntityId !== undefined && String(startEntityId) === String(endEntityId)) {
      throw new Error('开始节点和结束节点不能相同')
    }
  }, [form])

  return (
    <CommonDrawer
      destroyOnClose
      open={open}
      title={title}
      width={520}
      onClose={onClose}
      extra={
        <AButton loading={loading} type="primary" onClick={handleSave}>
          保存
        </AButton>
      }
    >
      <Form className="ds-form-section" form={form} layout="vertical">
        <OntologyFormSectionTitle icon={<BranchesOutlined />}>基本信息</OntologyFormSectionTitle>
        <Form.Item label="开始节点" name="startEntityId" rules={[{ message: '请选择开始节点', required: true }, { validator: validateDifferentEntities }]}>
          <Select<OntologyNetworkId> allowClear fieldNames={{ label: 'entityName', value: 'id' }} options={entities} placeholder="请选择开始节点" showSearch optionFilterProp="entityName" />
        </Form.Item>
        <Form.Item label="关系名称" name="relation" rules={relationRules}>
          <Input allowClear maxLength={50} placeholder="请输入关系名称" />
        </Form.Item>
        <Form.Item label="结束节点" name="endEntityId" rules={[{ message: '请选择结束节点', required: true }, { validator: validateDifferentEntities }]}>
          <Select<OntologyNetworkId> allowClear fieldNames={{ label: 'entityName', value: 'id' }} options={entities} placeholder="请选择结束节点" showSearch optionFilterProp="entityName" />
        </Form.Item>
        <Form.Item getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)} getValueProps={(value: number | undefined) => ({ checked: value === 1 })} label="是否可逆" name="inverseFlag">
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
        <Form.Item label="备注说明" name="remark" rules={[{ max: 500, message: '备注说明不能超过 500 个字符' }]}>
          <Input.TextArea maxLength={500} placeholder="请输入备注说明" rows={4} showCount />
        </Form.Item>
      </Form>
    </CommonDrawer>
  )
}

export default RelationDrawer
