import React, { useEffect, useState } from 'react'
import { Modal, Input, Form, message } from 'antd'

interface EditSessionModalProps {
  visible: boolean
  initialValues?: { sessionId?: string | number; chat_id?: string | number; title?: string; biz_name?: string }
  onClose: () => void
  onOk: (values: { sessionId: string | number; title: string }) => Promise<void>
}

const EditSessionModal: React.FC<EditSessionModalProps> = ({ visible, initialValues, onClose, onOk }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue({
        title: initialValues.title || initialValues.biz_name || '',
      })
    }
  }, [visible, initialValues, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      if (!values.title?.trim()) {
        message.error('请输入会话名称')
        return
      }
      setLoading(true)
      await onOk({
        sessionId: initialValues?.sessionId ?? initialValues?.chat_id ?? '',
        title: values.title.trim(),
      })
      onClose()
    } catch (err: any) {
      if (err?.errorFields) return // form validation error
      message.error('更新失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={visible}
      title="编辑会话"
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      okText="保存"
      cancelText="取消"
      destroyOnClose
      width={420}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label="会话名称"
          name="title"
          rules={[
            { required: true, message: '请输入会话名称' },
            { max: 20, message: '名称不能超过20个字符' },
          ]}
        >
          <Input placeholder="请输入会话名称" maxLength={20} showCount />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default EditSessionModal
