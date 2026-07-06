import { CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Empty, Form, Input, Select, Space, Table, Tabs, message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import type { ColumnsType } from 'antd/es/table'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Group } from '@/components/stateful/group/Group'
import { useAppSelector } from '@/hooks/business/useStore'
import type { OntologyEntity, OntologyEntityAttribute, OntologyLabel } from '@/pages/workbench/ontology-kg/shared-network-types'
import { formatDisplayValue } from '@/pages/workbench/ontology-kg/utils/table-display'
import type { TableSemanticsGroupType } from '@/service/api/table-semantics'
import { getSpaceId } from '@/store/slice/app'

import { useAttributeAssets } from '../hooks/useAttributeAssets'
import { useEntityAttributeManagement } from '../hooks/useEntityAttributeManagement'
import type { AttributeBindingValues } from '../types'
import { makeAttributes } from '../utils/entity'

type SupportedAttributeType = Exclude<OntologyEntityAttribute['attributeType'], 'field'>
type AttributeTab = 'all' | SupportedAttributeType

interface AttributeDrawerProps {
  readonly entity?: OntologyEntity
  readonly labels: OntologyLabel[]
  readonly onClose: () => void
  readonly onSaved: () => Promise<void>
  readonly open: boolean
}

const TYPE_LABELS: Record<SupportedAttributeType, string> = {
  dimension: '维度属性',
  indicator: '指标属性',
  label: '标签属性',
}

const ATTRIBUTE_TYPE_LABELS: Record<OntologyEntityAttribute['attributeType'], string> = {
  dimension: '维度属性',
  field: '字段属性',
  indicator: '指标属性',
  label: '标签属性',
}

const GROUP_TYPE_BY_ATTRIBUTE: Record<SupportedAttributeType, TableSemanticsGroupType> = {
  dimension: 'ontology-dimension',
  indicator: 'ontology',
  label: 'tag',
}

const GROUP_CONFIG: Record<
  SupportedAttributeType,
  {
    button: string
    inputLabel: string
    inputPlaceholder: string
    modalAddTitle: string
    modalEditTitle: string
    panelTitle: string
    rule: Array<Array<{ message: string; required: boolean }>>
    type: TableSemanticsGroupType
  }
> = {
  dimension: {
    button: '添加维度组',
    inputLabel: '维度组名称',
    inputPlaceholder: '请输入分组名称',
    modalAddTitle: '新增维度组',
    modalEditTitle: '编辑维度组',
    panelTitle: '维度组',
    rule: [[{ message: '请输入维度组名称', required: true }]],
    type: 'ontology-dimension',
  },
  indicator: {
    button: '添加指标组',
    inputLabel: '指标组名称',
    inputPlaceholder: '请输入分组名称',
    modalAddTitle: '新增指标组',
    modalEditTitle: '编辑指标组',
    panelTitle: '指标组',
    rule: [[{ message: '请输入指标组名称', required: true }]],
    type: 'ontology',
  },
  label: {
    button: '添加标签组',
    inputLabel: '标签组名称',
    inputPlaceholder: '请输入分组名称',
    modalAddTitle: '新增标签组',
    modalEditTitle: '编辑标签组',
    panelTitle: '标签组',
    rule: [[{ message: '请输入标签组名称', required: true }]],
    type: 'tag',
  },
}

export const AttributeDrawer: React.FC<AttributeDrawerProps> = ({ entity, labels, onClose, onSaved, open }) => {
  const spaceId = useAppSelector(getSpaceId)
  const [form] = Form.useForm<AttributeBindingValues>()
  const [activeTab, setActiveTab] = useState<AttributeTab>('all')
  const [selectedType, setSelectedType] = useState<SupportedAttributeType | undefined>()
  const [selectedGroupId, setSelectedGroupId] = useState<string>()
  const [adding, setAdding] = useState(false)
  const addLock = useRef(false)
  const { assets, clearAssets, loading: loadingAssets, loadAssets } = useAttributeAssets(spaceId)
  const { addAttributes, attributes, detailEntity, loadedDetail, loadingDetail, removeAttribute, saveAttributes, saving } = useEntityAttributeManagement(entity, open, spaceId)

  useEffect(() => {
    if (!open) return
    form.resetFields()
    setActiveTab('all')
    setSelectedType(undefined)
    setSelectedGroupId(undefined)
    clearAssets()
  }, [clearAssets, entity?.id, form, open])

  const handleTypeChange = useCallback(
    (type: SupportedAttributeType): void => {
      setSelectedType(type)
      setSelectedGroupId(undefined)
      form.setFieldsValue({ assetCode: undefined })
      clearAssets()
    },
    [clearAssets, form],
  )

  const handleGroupChange = useCallback(
    (groupId: string): void => {
      clearAssets()
      if (!selectedType || !groupId) {
        setSelectedGroupId(undefined)
        form.setFieldsValue({ assetCode: undefined })
        return
      }
      setSelectedGroupId(groupId)
      form.setFieldsValue({ assetCode: undefined })
      loadAssets(selectedType, groupId as any)
    },
    [clearAssets, form, loadAssets, selectedType],
  )

  const handleAdd = useCallback(async (): Promise<void> => {
    if (addLock.current) return
    addLock.current = true
    setAdding(true)
    try {
      let values: AttributeBindingValues
      try {
        values = await form.validateFields()
      } catch {
        return
      }
      if (!selectedType) {
        message.warning('请选择属性类型')
        return
      }
      if (!selectedGroupId) {
        message.warning('请选择绑定分组')
        return
      }
      if (!values.assetCode) return
      const selectedAssets = values.assetCode === '__group__' ? assets : assets.filter((asset) => asset.attributeCode === values.assetCode)
      const nextAttributes = makeAttributes(selectedAssets, selectedType, values.remark?.trim())
      if (nextAttributes.length === 0) return
      if (!addAttributes(nextAttributes)) {
        message.warning('当前资产已绑定，请勿重复添加')
        return
      }
      setActiveTab(selectedType)
      form.setFieldsValue({ assetCode: undefined, remark: undefined })
      message.success(values.assetCode === '__group__' ? `已绑定分组内 ${nextAttributes.length} 个资产` : '属性已添加')
    } finally {
      addLock.current = false
      setAdding(false)
    }
  }, [addAttributes, assets, form, selectedGroupId, selectedType])

  const handleRemove = useCallback(
    (attribute: OntologyEntityAttribute): void => {
      removeAttribute(attribute)
    },
    [removeAttribute],
  )

  const handleSave = useCallback(async (): Promise<void> => {
    const saved = await saveAttributes()
    if (!saved) return
    message.success('属性配置已保存')
    try {
      await onSaved()
      onClose()
    } catch {
      message.error('实体列表刷新失败，请稍后重试')
    }
  }, [onClose, onSaved, saveAttributes])

  const visibleAttributes = useMemo(() => (activeTab === 'all' ? attributes : attributes.filter((attribute) => attribute.attributeType === activeTab)), [activeTab, attributes])
  const assetOptions = useMemo(
    () => [
      { disabled: assets.length === 0, label: `绑定整个分组（${assets.length} 个资产）`, value: '__group__' },
      ...assets.map((asset) => ({ label: `${asset.attributeName}（${asset.attributeCode}）`, value: asset.attributeCode })),
    ],
    [assets],
  )
  const tabItems = useMemo(
    () => [
      { key: 'all', label: `全部（${attributes.length}）` },
      ...(['dimension', 'indicator', 'label'] as SupportedAttributeType[]).map((type) => ({
        key: type,
        label: `${TYPE_LABELS[type]}（${attributes.filter((attribute) => attribute.attributeType === type).length}）`,
      })),
    ],
    [attributes],
  )
  const columns = useMemo<ColumnsType<OntologyEntityAttribute>>(
    () => [
      { align: 'center', dataIndex: 'attributeType', key: 'attributeType', title: '属性类型', width: 110, render: (type: OntologyEntityAttribute['attributeType']) => ATTRIBUTE_TYPE_LABELS[type] },
      { align: 'center', dataIndex: 'attributeName', ellipsis: true, key: 'attributeName', render: formatDisplayValue, title: '属性名称' },
      { align: 'center', dataIndex: 'attributeCode', ellipsis: true, key: 'attributeCode', render: formatDisplayValue, title: '属性编码' },
      { align: 'center', key: 'source', title: '来源模块', width: 120, render: (_, attribute) => ATTRIBUTE_TYPE_LABELS[attribute.attributeType] },
      {
        align: 'center',
        key: 'action',
        title: '操作',
        width: 80,
        render: (_, attribute) => (
          <Button className="abi-action-link-danger" icon={<DeleteOutlined />} size="small" type="link" onClick={() => handleRemove(attribute)}>
            删除
          </Button>
        ),
      },
    ],
    [handleRemove],
  )

  const currentConfig = selectedType ? GROUP_CONFIG[selectedType] : null
  const renderedEntity = detailEntity ?? entity
  const labelName = renderedEntity?.labelId === null || renderedEntity?.labelId === undefined ? '-' : (labels.find((label) => String(label.id) === String(renderedEntity.labelId))?.bizName ?? '-')

  return (
    <CommonDrawer
      footer={
        <Space className="flex justify-end">
          <Button onClick={onClose}>取消</Button>
          <Button disabled={!loadedDetail || loadingDetail || saving} loading={saving} type="primary" onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
      open={open}
      title="属性配置"
      width={960}
      onClose={onClose}
    >
      <section style={{ background: '#f7f9fc', borderRadius: 8, marginBottom: 16, padding: 14 }}>
        <Space size={28} wrap>
          <span>
            <strong>实体名称：</strong>
            {renderedEntity?.entityName ?? '-'}
          </span>
          <span>
            <strong>实体编码：</strong>
            {renderedEntity?.entityCode ?? '-'}
          </span>
          <span>
            <strong>标签类型：</strong>
            {labelName}
          </span>
        </Space>
      </section>
      <section style={{ border: '1px solid #edf0f5', borderRadius: 8, marginBottom: 16, padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>新增属性绑定</div>
        <Form<AttributeBindingValues> form={form} layout="vertical">
          <Form.Item label="属性类型" name="attributeType" rules={[{ message: '请选择属性类型', required: true }]}>
            <Select<SupportedAttributeType>
              options={(Object.keys(TYPE_LABELS) as SupportedAttributeType[]).map((type) => ({ label: TYPE_LABELS[type], value: type }))}
              placeholder="请选择属性类型"
              onChange={handleTypeChange}
            />
          </Form.Item>
          {currentConfig ? (
            <div style={{ display: 'flex', gap: 16, minHeight: 230 }}>
              <div className="abi-group-sidebar" style={{ flex: '0 0 250px', height: 230, overflow: 'auto' }}>
                <Group key={GROUP_TYPE_BY_ATTRIBUTE[selectedType!]} config={currentConfig} onGroupId={handleGroupChange} />
              </div>
              <div style={{ flex: 1 }}>
                <Form.Item label="绑定资产" name="assetCode" rules={[{ message: '请选择绑定资产', required: true }]}>
                  <Select disabled={!selectedGroupId} loading={loadingAssets} options={assetOptions} placeholder="请选择绑定整个分组或具体资产" />
                </Form.Item>
                <Form.Item label="备注" name="remark" rules={[{ max: 500, message: '备注最多500个字符' }]}>
                  <Input.TextArea maxLength={500} placeholder="请输入备注" rows={3} showCount />
                </Form.Item>
                <Button disabled={!selectedGroupId || adding} icon={<PlusOutlined />} loading={adding} type="primary" onClick={handleAdd}>
                  添加属性
                </Button>
              </div>
            </div>
          ) : null}
        </Form>
      </section>
      <Tabs activeKey={activeTab} items={tabItems} onChange={(key) => setActiveTab(key as AttributeTab)} />
      {visibleAttributes.length === 0 && !loadingDetail ? (
        <Empty description="暂无已绑定属性" />
      ) : (
        <Table<OntologyEntityAttribute>
          className="abi-std-table"
          columns={columns}
          dataSource={visibleAttributes}
          loading={loadingDetail}
          pagination={false}
          rowKey={(attribute) => `${attribute.attributeType}-${attribute.attributeCode}`}
        />
      )}
    </CommonDrawer>
  )
}
