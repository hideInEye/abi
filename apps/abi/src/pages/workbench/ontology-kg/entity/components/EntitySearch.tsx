import { SearchOutlined } from '@ant-design/icons'
import { Button, Form, Input, Select, Space } from 'antd'
import React, { useCallback, useEffect } from 'react'

import type { OntologyLabel, OntologyNetworkId } from '@/pages/workbench/ontology-kg/shared-network-types'

import type { EntitySearchValues } from '../types'

interface EntitySearchProps {
  readonly labels: OntologyLabel[]
  readonly onChange: (values: EntitySearchValues) => void
  readonly onReset: () => void
  readonly value: EntitySearchValues
}

export const EntitySearch: React.FC<EntitySearchProps> = ({ labels, onChange, onReset, value }) => {
  const [form] = Form.useForm<EntitySearchValues>()

  useEffect(() => {
    form.setFieldsValue(value)
  }, [form, value])

  const handleFinish = useCallback(
    (values: EntitySearchValues): void => {
      onChange({ ...values, entityCode: values.entityCode?.trim() ?? '', entityName: values.entityName?.trim() ?? '' })
    },
    [onChange],
  )

  const handleReset = useCallback((): void => {
    form.resetFields()
    onReset()
  }, [form, onReset])

  const labelOptions = labels.map((label) => ({ label: label.bizName, value: label.id }))

  return (
    <Form className="abi-search-row flex-wrap" form={form} layout="inline" onFinish={handleFinish}>
      <Form.Item name="entityName">
        <Input allowClear className="abi-field-input" placeholder="请输入实体名称" prefix={<SearchOutlined />} style={{ width: 200 }} />
      </Form.Item>
      <Form.Item name="entityCode">
        <Input allowClear className="abi-field-input" placeholder="请输入实体编码" prefix={<SearchOutlined />} style={{ width: 200 }} />
      </Form.Item>
      <Form.Item name="labelId">
        <Select<OntologyNetworkId> allowClear className="abi-field-input" options={labelOptions} placeholder="请选择标签类型" style={{ width: 200 }} />
      </Form.Item>
      <Space>
        <Button className="btn-accent-gradient" htmlType="submit" type="primary">
          查询
        </Button>
        <Button onClick={handleReset}>重置</Button>
      </Space>
    </Form>
  )
}
