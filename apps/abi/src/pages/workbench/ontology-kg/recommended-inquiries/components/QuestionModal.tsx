import { Form } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React from 'react'

import { useAssistant } from '../hooks/useAssistant.ts'
import type { QuestionTableData } from '../types/index.ts'
import { CloseOutlined } from '@ant-design/icons'
import { scrollToFirstFormError } from '@/pages/workbench/ontology-kg/utils/form-scroll'

interface TagModalProps {
  readonly editingGroup: QuestionTableData | null
  readonly isModalOpen: boolean
  readonly isReset?: boolean
  readonly mode: 'add' | 'edit'
  readonly onSave: (values: QuestionTableData) => void
  readonly setIsModalOpen: (isOpen: boolean) => void
}

export const QuestionModal: React.FC<TagModalProps> = ({ editingGroup, isModalOpen, isReset, mode, onSave, setIsModalOpen }) => {
  const [form] = Form.useForm()
  const { getAssistantConfigList } = useAssistant()

  useEffect(() => {
    if (mode === 'add') {
      form.resetFields()
    }

    if (isReset) {
      form.resetFields()
    }
  }, [mode, isModalOpen])

  useEffect(() => {
    getAssistantConfigList()
  }, [])

  const handleModalCancel = () => {
    form.resetFields()
    setIsModalOpen(false)
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      onSave(values)
    } catch (error) {
      scrollToFirstFormError(form, error)
      console.error('Validation failed:', error)
    }
  }

  useEffect(() => {
    if (editingGroup) {
      form.setFieldsValue({
        agentId: editingGroup.agentId,
        question: editingGroup.question,
      })
    }
  }, [editingGroup])

  return (
    <CommonDrawer
      open={isModalOpen}
      title={editingGroup ? '编辑问题' : '新增问题'}
      width={600}
      footer={
        <ASpace className="w-full justify-end">
          <AButton onClick={handleModalCancel}>取消</AButton>
          <AButton type="primary" onClick={handleModalOk}>
            确认
          </AButton>
        </ASpace>
      }
      onClose={handleModalCancel}
    >
      <Form className="mt-5" form={form} initialValues={editingGroup || { tagName: '' }} layout="vertical">
        {/* <Form.Item
          label="选择助手"
          name="agentId"
          rules={[{ message: '请选择助手', required: true }]}
        >
          <ASelect
            defaultValue={editingGroup?.agentId}
            options={assistantConfigList}
            placeholder="请选择助手"
            onChange={value => {
              form.setFieldsValue({
                agentId: value
              });
            }}
          />
        </Form.Item> */}
        <Form.Item
          label="推荐问题"
          name="question"
          rules={[
            { max: 50, message: '不能超过50个字符' },
            {
              message: '请输入问题',
              required: true,
            },
          ]}
        >
          <AInput placeholder="请输入问题" />
        </Form.Item>
      </Form>
    </CommonDrawer>
  )
}
