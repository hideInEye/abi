import { ApartmentOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Empty, Form, Input, Select, Space, Table, Tabs, TreeSelect, message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import type { ColumnsType } from 'antd/es/table'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAppSelector } from '@/hooks/business/useStore'
import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'
import type { OntologyEntity, OntologyEntityAttribute, OntologyLabel } from '@/pages/workbench/ontology-kg/shared-network-types'
import { formatDisplayValue } from '@/pages/workbench/ontology-kg/utils/table-display'
import { getSpaceId } from '@/store/slice/app'

import { useAttributeAssets } from '../hooks/useAttributeAssets'
import { useAttributeGroups } from '../hooks/useAttributeGroups'
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

const DRAWER_STYLES: Record<string, React.CSSProperties> = {
  bindingFormRow: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: 16,
    width: '100%',
  },
  bindingSection: {
    background: '#fff',
    border: '1px solid #edf1f7',
    borderRadius: 8,
    marginTop: 16,
    padding: 16,
  },
  entityInfoGrid: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    marginBottom: 16,
  },
  infoCard: {
    background: '#fff',
    border: '1px solid #e7ecf5',
    borderRadius: 8,
    boxShadow: '0 8px 22px rgba(31, 45, 61, 0.04)',
    padding: '16px 20px',
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: '22px',
    marginBottom: 6,
  },
  infoValue: {
    color: '#1f2a44',
    fontSize: 18,
    fontWeight: 600,
    lineHeight: '26px',
  },
  listSection: {
    background: '#fff',
    border: '1px solid #edf1f7',
    borderRadius: 8,
    padding: 16,
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
  const { clearGroups, hasGroups, loadGroups, loading: loadingGroups, treeOptions: groupTreeOptions } = useAttributeGroups(spaceId)
  const { assets, clearAssets, loading: loadingAssets, loadAssets } = useAttributeAssets(spaceId)
  const { addAttributes, attributes, detailEntity, loadedDetail, loadingDetail, removeAttribute, saveAttributes, saving } = useEntityAttributeManagement(entity, open, spaceId)

  useEffect(() => {
    if (!open) return
    form.resetFields()
    setActiveTab('all')
    setSelectedType(undefined)
    setSelectedGroupId(undefined)
    clearGroups()
    clearAssets()
  }, [clearAssets, clearGroups, entity?.id, form, open])

  const handleTypeChange = useCallback(
    (type: SupportedAttributeType): void => {
      setSelectedType(type)
      setSelectedGroupId(undefined)
      form.setFieldsValue({ assetCode: undefined, groupId: undefined })
      clearAssets()
      void loadGroups(type)
    },
    [clearAssets, form, loadGroups],
  )

  const handleGroupChange = useCallback(
    (groupId?: string): void => {
      clearAssets()
      if (!selectedType || !groupId) {
        setSelectedGroupId(undefined)
        form.setFieldsValue({ assetCode: undefined, groupId })
        return
      }
      setSelectedGroupId(groupId)
      form.setFieldsValue({ assetCode: undefined, groupId })
      loadAssets(selectedType, groupId)
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
      const groupId = values.groupId ?? selectedGroupId
      if (!groupId) {
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
      { disabled: assets.length === 0, label: `绑定当前分组（${assets.length} 个资产）`, value: '__group__' },
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
        width: 120,
        render: (_, attribute) => (
          <Button className="abi-action-link-danger" icon={<DeleteOutlined />} size="small" type="link" onClick={() => handleRemove(attribute)}>
            删除
          </Button>
        ),
      },
    ],
    [handleRemove],
  )

  const renderedEntity = detailEntity ?? entity
  const labelName = renderedEntity?.labelId === null || renderedEntity?.labelId === undefined ? '-' : (labels.find((label) => String(label.id) === String(renderedEntity.labelId))?.bizName ?? '-')
  const entityInfoItems = useMemo(
    () => [
      { label: '当前实体', value: renderedEntity?.entityName ?? '-' },
      { label: '实体编码', value: renderedEntity?.entityCode ?? '-' },
      { label: '标签类型', value: labelName },
    ],
    [labelName, renderedEntity?.entityCode, renderedEntity?.entityName],
  )

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
      width={1120}
      onClose={onClose}
    >
      <section style={DRAWER_STYLES.entityInfoGrid}>
        {entityInfoItems.map((item) => (
          <div key={item.label} style={DRAWER_STYLES.infoCard}>
            <div style={DRAWER_STYLES.infoLabel}>{item.label}</div>
            <div style={DRAWER_STYLES.infoValue}>{item.value}</div>
          </div>
        ))}
      </section>

      <Tabs activeKey={activeTab} items={tabItems} onChange={(key) => setActiveTab(key as AttributeTab)} />

      <section style={DRAWER_STYLES.listSection}>
        <Table<OntologyEntityAttribute>
          className="abi-std-table"
          columns={columns}
          dataSource={visibleAttributes}
          loading={loadingDetail}
          locale={{ emptyText: <Empty description="暂无已绑定属性" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={false}
          rowKey={(attribute) => `${attribute.attributeType}-${attribute.attributeCode}`}
          title={() => <OntologyFormSectionTitle icon={<ApartmentOutlined />}>已绑定属性列表</OntologyFormSectionTitle>}
        />
      </section>

      <section style={DRAWER_STYLES.bindingSection}>
        <OntologyFormSectionTitle icon={<PlusOutlined />}>新增属性绑定</OntologyFormSectionTitle>
        <Form<AttributeBindingValues> className="ds-form-section" form={form} layout="vertical">
          <div style={DRAWER_STYLES.bindingFormRow}>
            <Form.Item label="属性类型" name="attributeType" rules={[{ message: '请选择属性类型', required: true }]} style={{ flex: '0 0 180px', marginBottom: 0 }}>
              <Select<SupportedAttributeType>
                options={(Object.keys(TYPE_LABELS) as SupportedAttributeType[]).map((type) => ({ label: TYPE_LABELS[type], value: type }))}
                placeholder="请选择属性类型"
                onChange={handleTypeChange}
              />
            </Form.Item>
            <Form.Item label="绑定分组" name="groupId" rules={[{ message: '请选择绑定分组', required: true }]} style={{ flex: '0 0 240px', marginBottom: 0 }}>
              <TreeSelect
                allowClear
                disabled={!selectedType || loadingGroups || !hasGroups}
                loading={loadingGroups}
                notFoundContent={loadingGroups ? '加载中' : '暂无分组'}
                placeholder={!selectedType ? '请先选择属性类型' : hasGroups ? '请选择绑定分组' : '暂无可选分组'}
                showSearch
                treeData={groupTreeOptions}
                treeDefaultExpandAll
                treeNodeFilterProp="label"
                treeNodeLabelProp="label"
                onChange={handleGroupChange}
              />
            </Form.Item>
            <Form.Item label="绑定资产" name="assetCode" rules={[{ message: '请选择绑定资产', required: true }]} style={{ flex: '1 1 260px', marginBottom: 0, minWidth: 220 }}>
              <Select disabled={!selectedGroupId} loading={loadingAssets} optionFilterProp="label" options={assetOptions} placeholder="请选择绑定当前分组或具体资产" showSearch />
            </Form.Item>
            <Form.Item label="备注" name="remark" rules={[{ max: 500, message: '备注最多500个字符' }]} style={{ flex: '0 0 220px', marginBottom: 0 }}>
              <Input maxLength={500} placeholder="请输入备注" />
            </Form.Item>
            <div style={{ flex: '0 0 96px', paddingTop: 30 }}>
              <Button block disabled={!selectedGroupId || adding} icon={<PlusOutlined />} loading={adding} type="primary" onClick={handleAdd}>
                添加
              </Button>
            </div>
          </div>
        </Form>
      </section>
    </CommonDrawer>
  )
}
