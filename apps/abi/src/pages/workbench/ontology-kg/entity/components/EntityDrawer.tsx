import { CloseOutlined } from '@ant-design/icons'
import { Button, Drawer, Form, Input, Select, Space, message } from 'antd'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { OntologyEntity, OntologyLabel, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'

import type { EntityFormValues } from '../types'
import { ENTITY_CODE_PATTERN } from '../utils/entity'

interface EntityDrawerProps {
  readonly entity?: OntologyEntity
  readonly labels: OntologyLabel[]
  readonly onClose: () => void
  readonly onSave: (values: EntityFormValues, entity?: OntologyEntity) => Promise<void>
  readonly open: boolean
}

const DEFAULT_COLOR = '#5B7CF7'

export const EntityDrawer: React.FC<EntityDrawerProps> = ({ entity, labels, onClose, onSave, open }) => {
  const [form] = Form.useForm<EntityFormValues>()
  const [saving, setSaving] = useState(false)
  const saveLock = useRef(false)

  const labelOptions = useMemo(() => labels.map((label) => ({ label: label.bizName, value: label.id })), [labels])

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({
      color: entity?.color ?? DEFAULT_COLOR,
      entityCode: entity?.entityCode ?? '',
      entityName: entity?.entityName ?? '',
      labelSelection: entity?.labelId ?? undefined,
      remark: entity?.remark ?? '',
    })
  }, [entity, form, open])

  const handleSave = useCallback(async (): Promise<void> => {
    if (saveLock.current) return
    saveLock.current = true
    setSaving(true)
    try {
      let values: EntityFormValues
      try {
        values = await form.validateFields()
      } catch {
        return
      }
      await onSave(values, entity)
      message.success(entity ? '实体已更新' : '实体已新增')
      onClose()
    } catch {
      message.error('实体保存失败，请稍后重试')
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }, [entity, form, onClose, onSave])

  const handleClose = useCallback((): void => {
    form.resetFields()
    onClose()
  }, [form, onClose])

  return (
    <Drawer
      closeIcon={null}
      extra={<Button icon={<CloseOutlined />} type="text" onClick={handleClose} />}
      footer={
        <Space className="flex justify-end">
          <Button onClick={handleClose}>取消</Button>
          <Button loading={saving} type="primary" onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
      open={open}
      title={entity ? '编辑实体' : '新增实体'}
      width={560}
      onClose={handleClose}
    >
      <Form<EntityFormValues> form={form} layout="vertical">
        <Form.Item
          label="实体名称"
          name="entityName"
          rules={[
            { message: '请输入实体名称', required: true },
            { max: 50, message: '实体名称长度需为2-50个字符' },
            { min: 2, message: '实体名称长度需为2-50个字符' },
          ]}
        >
          <Input disabled={Boolean(entity)} maxLength={50} placeholder="请输入实体名称" />
        </Form.Item>
        <Form.Item
          label="实体编码"
          name="entityCode"
          rules={[
            { message: '请输入实体编码', required: true },
            { max: 50, message: '实体编码长度需为2-50个字符' },
            { min: 2, message: '实体编码长度需为2-50个字符' },
            { message: '实体编码需以字母开头，仅支持字母、数字和下划线', pattern: ENTITY_CODE_PATTERN },
          ]}
        >
          <Input disabled={Boolean(entity)} maxLength={50} placeholder="请输入实体编码" />
        </Form.Item>
        <Form.Item label="标签类型" name="labelSelection" rules={[{ message: '请选择或输入一个标签类型', required: true }]}>
          {entity ? (
            <Select<OntologyNetworkId> disabled options={labelOptions} placeholder="请选择标签类型" />
          ) : (
            <Select<OntologyNetworkId | string> maxCount={1} mode="tags" options={labelOptions} placeholder="请选择或输入标签类型后按回车" tokenSeparators={[',']} />
          )}
        </Form.Item>
        <Form.Item label="实体颜色" name="color" rules={[{ message: '请选择实体颜色', required: true }]}>
          <input aria-label="实体颜色" style={{ height: 32, padding: 0, width: 32, borderRadius:'50%' }} type="color" />
        </Form.Item>
        <Form.Item label="备注" name="remark" rules={[{ max: 500, message: '备注最多500个字符' }]}>
          <Input.TextArea maxLength={500} placeholder="请输入备注" rows={4} showCount />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
