/* eslint-disable complexity */
import { CloseOutlined } from '@ant-design/icons'
import { message } from 'antd'
import React from 'react'

import { TableSemantics } from '@/components/tableSemantics'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'
import { queryTableSemanticsDetail } from '@/service/api/data-table-meaning'

interface MeasureFieldItem {
  alias: string
  bizName: string
  description: string
  englishName: string
  fieldType: string
  key: string
  raw: Record<string, any>
}

interface MappingFormValues {
  semanticGroupId?: number
  semanticSchemaId?: number
}

interface Props {
  readonly groupName?: string
  readonly onClose: (refresh?: boolean) => void
  readonly onSubmit: (payload: Array<Record<string, any>>) => Promise<boolean>
  readonly open: boolean
  readonly groupId?: number
}

// eslint-disable-next-line complexity
function parseMeasureFields(modelDetail: any): MeasureFieldItem[] {
  if (!modelDetail) {
    return []
  }
  try {
    const detail = typeof modelDetail === 'string' ? JSON.parse(modelDetail) : modelDetail
    const measures = Array.isArray(detail?.measures) ? detail.measures : []
    return measures
      .map((item: any) => {
        const key = String(item?.techId || item?.tfieldId || item?.fieldName || item?.originName || '').trim()
        if (!key) {
          return null
        }
        const englishName =
          String(item?.originName || item?.fieldName || item?.techName || item?.tfieldName || key).trim() || key
        const bizName =
          String(item?.bizName || item?.tfieldAlias || item?.fieldShortName || item?.fieldName || englishName).trim() ||
          englishName
        return {
          alias: String(item?.alias || bizName).trim() || bizName,
          bizName,
          description: String(item?.description || '').trim(),
          englishName,
          fieldType: String(item?.fieldType || item?.tfieldType || '-').trim() || '-',
          key,
          raw: {
            ...item,
            techId: key
          }
        }
      })
      .filter(Boolean) as MeasureFieldItem[]
  } catch {
    return []
  }
}

export const KnowledgeAtomicMappingDrawer: React.FC<Props> = ({ groupName, onClose, onSubmit, open, groupId }) => {
  const [form] = AForm.useForm<MappingFormValues>()
  const [fieldRows, setFieldRows] = useState<MeasureFieldItem[]>([])
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSchemaChange = async ({ semanticSchemaId }: { semanticSchemaId: number }) => {
    setLoadingFields(true)
    try {
      const res = await queryTableSemanticsDetail(semanticSchemaId)
      const detail = res?.data ?? res?.response?.data?.data ?? res?.response?.data
      const nextRows = parseMeasureFields(detail?.modelDetail)
      setFieldRows(nextRows)
      setSelectedRowKeys([])
      if (!nextRows.length) {
        message.warning('当前表语义下没有可映射的度量字段')
      }
    } catch {
      setFieldRows([])
      setSelectedRowKeys([])
      message.error('查询表语义字段失败')
    } finally {
      setLoadingFields(false)
    }
  }

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setFieldRows([])
      setSelectedRowKeys([])
      setLoadingFields(false)
      setSaving(false)
    }
  }, [form, open])

  const handleSave = async () => {
    const values = await form.validateFields()
    if (!values.semanticSchemaId) {
      return
    }
    if (!selectedRowKeys.length) {
      message.warning('请至少选择一个度量字段')
      return
    }

    const selectedRows = fieldRows.filter(item => selectedRowKeys.includes(item.key))
    const payload = selectedRows.map(item => ({
      relSchemaId: values.semanticSchemaId,
      spaceId: Number(localStorage.getItem('spaceId')),
      groupId: groupId,
      techId: [{
        ...item.raw,
        alias: item.alias,
        bizName: item.bizName,
        description: item.description,
        englishName: item.englishName,
        fieldType: item.fieldType,
        techId: String(item.raw?.techId ?? item.key)
      }]
    }))

    setSaving(true)
    try {
      const success = await onSubmit(payload)
      if (!success) {
        return
      }
      onClose(true)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      dataIndex: 'englishName',
      key: 'englishName',
      title: '英文名称'
    },
    {
      dataIndex: 'fieldType',
      key: 'fieldType',
      title: '字段类型'
    },
    {
      key: 'semanticType',
      render: () => (
        <ASelect
          disabled
          options={[{ label: '度量', value: 'measure' }]}
          value="measure"
        />
      ),
      title: '语义类型'
    },
    {
      dataIndex: 'bizName',
      key: 'bizName',
      render: (value: string, record: MeasureFieldItem) => (
        <AInput
          value={value}
          onChange={e => {
            const nextValue = e.target.value
            setFieldRows(prev => prev.map(item => (item.key === record.key ? { ...item, bizName: nextValue } : item)))
          }}
        />
      ),
      title: '中文名称'
    },
    {
      dataIndex: 'alias',
      key: 'alias',
      render: (value: string, record: MeasureFieldItem) => (
        <AInput
          value={value}
          onChange={e => {
            const nextValue = e.target.value
            setFieldRows(prev => prev.map(item => (item.key === record.key ? { ...item, alias: nextValue } : item)))
          }}
        />
      ),
      title: '别名'
    },
    {
      dataIndex: 'description',
      key: 'description',
      render: (value: string, record: MeasureFieldItem) => (
        <AInput
          value={value}
          onChange={e => {
            const nextValue = e.target.value
            setFieldRows(prev =>
              prev.map(item => (item.key === record.key ? { ...item, description: nextValue } : item))
            )
          }}
        />
      ),
      title: '字段描述'
    }
  ]

  return (
    <ADrawer
      closeIcon={null}
      open={open}
      title="原子指标映射配置"
      width="60%"
      extra={
        <AButton
          icon={<CloseOutlined />}
          type="text"
          onClick={() => onClose()}
        />
      }
      footer={
        <ASpace className="w-full justify-end">
          <AButton onClick={() => onClose()}>取消</AButton>
          <AButton
            loading={saving}
            type="primary"
            onClick={handleSave}
          >
            保存绑定并映射
          </AButton>
        </ASpace>
      }
      onClose={() => onClose()}
    >
      <div className="mb-4 rounded bg-gray-50 px-3 py-2 text-sm">当前分组：{groupName || '-'}</div>
      <AForm<MappingFormValues>
        form={form}
        layout="vertical"
      >
        <TableSemantics
          form={form}
          getSchemaId={handleSchemaChange as any}
          getSchemaOptions={(_: TableSemanticParams[]) => {}}
          type="shema"
        />
      </AForm>

      <div className="mb-4 mt-2 text-4 font-semibold">字段映射原子指标</div>
      <ATable
        columns={columns as any}
        dataSource={fieldRows}
        loading={loadingFields}
        pagination={false}
        rowKey="key"
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys)
        }}
        scroll={{ x: 1200, y: 520 }}
      />
    </ADrawer>
  )
}
