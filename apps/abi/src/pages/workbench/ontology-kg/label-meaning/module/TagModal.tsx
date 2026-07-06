import { CloseOutlined } from '@ant-design/icons'
import { Form, Input } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React from 'react'

import { TableSemantics } from '@/components/tableSemantics'
import ExpressionBuilder from '@/pages/workbench/ontology-kg/label-meaning/components/semantic-tag/Expr.tsx'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types/index.js'

import { TagInput } from '../components/semantic-tag/Model/TagInput.tsx'
import type { TagGroup } from '../types/index.ts'

interface TagModalProps {
  readonly editingGroup: TagGroup | null
  readonly isModalOpen: boolean
  readonly onCancel: (isOpen: boolean) => void
  readonly onSave: (values: Partial<TagGroup>) => void
}

export const TagModal: React.FC<TagModalProps> = ({ editingGroup, isModalOpen, onCancel, onSave }) => {
  const [form] = Form.useForm()
  const { exp, ...resta } = editingGroup || {}
  const [viewDataId, setViewDataId] = useState<number>(0)
  const formInitData = {
    ...resta,
    exp: exp ? JSON.parse(decodeURIComponent(exp)) : [],
  }

  useEffect(() => {
    if (editingGroup) {
      return
    }
    form.setFieldsValue({
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
    })
  }, [])

  useEffect(() => {
    if (editingGroup) {
      setViewDataId(editingGroup.viewId)
    }
  }, [editingGroup])

  const handleModalCancel = async () => {
    form.resetFields()
    onCancel(false)
  }

  const handleModalOk = async () => {
    const formData = await form.validateFields()
    const { exp: expData, ...rest } = formData
    onSave({
      ...rest,
      exp: encodeURIComponent(JSON.stringify(expData)),
      viewId: viewDataId,
    })
    form.resetFields()
  }

  const semanticSchemaIdVal = Form.useWatch('semanticSchemaId', form)

  const getSchemaId = ({ semanticGroupId, semanticSchemaId, viewId }: { semanticGroupId: number | null; semanticSchemaId: number; viewId: number }) => {
    form.setFieldsValue({ semanticGroupId, semanticSchemaId })
    setViewDataId(viewId)
  }

  const [schemaOptions, setSchemaOptions] = useState<any>(null)

  const allFields = useMemo(() => {
    if (semanticSchemaIdVal) {
      try {
        const cur: any = schemaOptions.find((item: any) => item.schemaId === semanticSchemaIdVal)
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
      } catch (error) {
        console.log(error)
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
      <AForm className="mt-5" form={form} initialValues={formInitData || {}} layout="vertical">
        <TableSemantics form={form} getSchemaId={getSchemaId} getSchemaOptions={getSchemaOptions} isEdit={Boolean(editingGroup)} type="shema" />
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
