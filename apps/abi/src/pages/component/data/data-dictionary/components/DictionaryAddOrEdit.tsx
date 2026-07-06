import { BookOutlined, CloseOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Flex, Form, FormInstance, Input } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React, { useEffect } from 'react'

interface AddOrEditDictionaryProps {
  readonly editObj?: any
  readonly onClose: () => void
  readonly onSure: (values: any, form: FormInstance) => void
  readonly open: boolean
}

export const AddOrEditDictionary: React.FC<AddOrEditDictionaryProps> = ({ editObj, onClose, onSure, open }) => {
  const [form] = Form.useForm()

  const handleCancel = () => {
    onClose()
    form.resetFields()
  }

  const adrawerSure = async () => {
    const values = await form.validateFields()
    if (values) {
      onSure(values, form)
    }
  }

  useEffect(() => {
    if (open) {
      if (editObj) {
        form.setFieldsValue(editObj)
      } else {
        form.resetFields()
      }
    }
  }, [editObj, open, form])

  const isEdit = !!editObj
  const title = isEdit ? '编辑字典' : '新增字典'
  const subtitle = isEdit ? `修改 ${editObj?.dictField || ''} 的配置信息` : '创建新的数据字典定义'

  return (
    <CommonDrawer
      className="ds-operate-drawer"
      destroyOnClose
      open={open}
      description={subtitle}
      icon={<BookOutlined />}
      title={title}
      width={700}
      styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 0 } }}
      footer={
        <div style={{ alignItems: 'center', display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '4px 0' }}>
          <Button
            onClick={handleCancel}
            style={{ background: 'transparent', border: '1px solid rgba(130,140,200,0.18)', borderRadius: 8, color: '#5f7490', fontWeight: 500, height: 38, padding: '0 20px' }}
          >
            取消
          </Button>
          <Button
            onClick={adrawerSure}
            style={{
              background: 'linear-gradient(135deg, #5b7cf7, #7091fa)',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(91,124,247,0.3)',
              fontWeight: 600,
              height: 38,
              padding: '0 28px',
            }}
            type="primary"
          >
            保存
          </Button>
        </div>
      }
      onClose={handleCancel}
    >
      <Form form={form} layout="vertical" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flexShrink: 0, padding: '20px 24px 0' }}>
          {/* Section header */}
          <div
            style={{
              alignItems: 'center',
              borderBottom: '1px solid rgba(130,140,200,0.10)',
              display: 'flex',
              gap: 10,
              marginBottom: 20,
              padding: '10px 0',
            }}
          >
            <div
              style={{
                alignItems: 'center',
                background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
                borderRadius: 7,
                boxShadow: '0 2px 8px rgba(91,124,247,0.25)',
                color: '#fff',
                display: 'flex',
                fontSize: 13,
                height: 26,
                justifyContent: 'center',
                width: 26,
              }}
            >
              <SettingOutlined />
            </div>
            <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>基本信息</span>
          </div>

          <Form.Item
            label={<span style={{ color: '#3e5068', fontWeight: 500 }}>字典名称</span>}
            name="dictField"
            rules={[
              { message: '请输入数据库表字段英文名', required: true },
              { max: 50, message: '不能超过50个字符' },
              {
                message: '请输入数据库表字段英文名，以下划线分割',
                pattern: /^[a-zA-Z_]+$/,
              },
            ]}
          >
            <Input placeholder="请输入数据库表字段英文名，如 user_status" />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: '#3e5068', fontWeight: 500 }}>中文名称</span>}
            name="dictName"
            rules={[
              { message: '请输入中文名称', required: true },
              { max: 20, message: '长度不能超过20个字符' },
            ]}
          >
            <Input placeholder="请输入中文名称，如 用户状态" />
          </Form.Item>

          <Form.Item label={<span style={{ color: '#3e5068', fontWeight: 500 }}>字典描述</span>} name="remark">
            <Input.TextArea placeholder="请输入字典描述信息，用于说明该字典的用途和含义" rows={4} style={{ borderRadius: 8 }} />
          </Form.Item>
        </div>

        {/* Hints section */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 24px 24px' }}>
          <div
            style={{
              alignItems: 'center',
              borderBottom: '1px solid rgba(130,140,200,0.10)',
              display: 'flex',
              gap: 10,
              marginBottom: 16,
              padding: '10px 0',
            }}
          >
            <div
              style={{
                alignItems: 'center',
                background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
                borderRadius: 7,
                boxShadow: '0 2px 8px rgba(91,124,247,0.25)',
                color: '#fff',
                display: 'flex',
                fontSize: 13,
                height: 26,
                justifyContent: 'center',
                width: 26,
              }}
            >
              <SettingOutlined />
            </div>
            <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>填写说明</span>
          </div>

          <div
            style={{
              background: 'rgba(91,124,247,0.04)',
              border: '1px solid rgba(91,124,247,0.12)',
              borderRadius: 10,
              padding: '16px 18px',
            }}
          >
            <div style={{ color: '#3e5068', fontSize: 13, lineHeight: '22px' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>字典命名规范</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#5f7490' }}>
                <li>
                  字典名称仅允许英文字母和下划线，如 <code style={{ background: 'rgba(91,124,247,0.08)', borderRadius: 4, color: '#5b7cf7', fontSize: 12, padding: '1px 6px' }}>user_status</code>
                </li>
                <li>中文名称应简洁明了，不超过20个字符</li>
                <li>字典创建后可在枚举管理中配置具体枚举值</li>
              </ul>
            </div>
          </div>
        </div>
      </Form>
    </CommonDrawer>
  )
}
