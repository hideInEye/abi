import { EditOutlined, SettingOutlined } from '@ant-design/icons'
import { App, Button, Form, Input, Select } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { useEffect, useState } from 'react'

import { getSkillDetailApi, updateSkillInfoApi } from '@/service/api/skill'
import { AssistantIconPicker, AssistantIconBlock } from '@/components/AssistantIcon'
import type { AssistantIconKey } from '@/components/AssistantIcon'

import '../skill.css'

type SkillItem = {
  bizName?: string
  createdBy?: string
  createTime?: string
  id?: number | string
  spaceId?: number | string
  spaceName?: string
  status?: string
  summary?: string
  updateTime?: string
}

type Props = {
  onClose: () => void
  onSuccess?: () => void
  open: boolean
  skill?: SkillItem | null
}

/** 图标 key 全集（与 abi/chat 保持一致） */
const ICON_KEYS: AssistantIconKey[] = ['data', 'table', 'orchestration', 'flow', 'automation', 'text', 'chat', 'doc', 'finance', 'account', 'ops', 'security', 'analysis', 'chart', 'other']
function getStoredIconKey(id?: number | string): AssistantIconKey {
  if (!id) return 'other'
  const stored = localStorage.getItem(`skill_icon_${id}`)
  if (stored && ICON_KEYS.includes(stored as AssistantIconKey)) return stored as AssistantIconKey
  // 兆底散列
  const hash = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return ICON_KEYS[hash % ICON_KEYS.length]
}

const SkillEditDrawer: FC<Props> = ({ onClose, onSuccess, open, skill }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<SkillItem | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [iconKey, setIconKey] = useState<AssistantIconKey>('other')

  useEffect(() => {
    if (open && skill?.id) {
      form.resetFields()
      setLoadingDetail(true)
      setIconKey('other') // 先设默认，等详情接口返回后覆盖
      // 先用列表数据预填充（仅可编辑字段）
      form.setFieldsValue({
        status: skill.status ?? '1',
        summary: skill.summary,
      })
      getSkillDetailApi({ skillId: skill.id })
        .then((res: any) => {
          const d = res?.response?.data?.data || res?.data?.data || res?.data || {}
          if (d && Object.keys(d).length) {
            setDetail(d)
            // 优先使用接口返回的 icon（跨设备同步），兜底散列
            if (d.icon && ICON_KEYS.includes(d.icon as AssistantIconKey)) {
              setIconKey(d.icon as AssistantIconKey)
            } else {
              setIconKey(getStoredIconKey(skill.id))
            }
            form.setFieldsValue({
              status: d.status ?? skill.status ?? '1',
              summary: d.summary || skill.summary,
            })
          }
        })
        .catch(() => {
          // 详情加载失败时使用列表数据
        })
        .finally(() => setLoadingDetail(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSave() {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const res: any = await updateSkillInfoApi({
        icon: iconKey,
        skillId: skill?.id!,
        skillType: 1,
        status: values.status,
        summary: values.summary,
      })
      const code = res?.response?.data?.code ?? res?.data?.code
      if (code === 200 || res?.response?.data?.success || res?.data?.success) {
        message.success('保存成功')
        onSuccess?.()
        onClose()
      } else {
        message.error(res?.response?.data?.msg || res?.data?.msg || '保存失败')
      }
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const skillName = skill?.bizName || detail?.bizName || '技能'

  return (
    <CommonDrawer
      className="ds-operate-drawer"
      open={open}
      onClose={onClose}
      width={640}
      destroyOnClose
      description={`修改 ${skillName} 的基本信息`}
      icon={<EditOutlined />}
      title={'编辑技能'}
      styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 0 } }}
      footer={
        <div style={{ alignItems: 'center', display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '4px 0' }}>
          <Button
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid rgba(130,140,200,0.18)', color: '#5f7490', fontWeight: 500, height: 38, padding: '0 20px', borderRadius: 8 }}
          >
            取消
          </Button>
          <Button
            loading={saving}
            onClick={handleSave}
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
    >
      <Form form={form} layout="vertical" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flexShrink: 0, padding: '20px 24px 0' }}>
          {/* 基础信息区 */}
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
            <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>基本信息</span>
          </div>

          {/* 技能图标 + 名称 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#3e5068', fontWeight: 500, marginBottom: 6, fontSize: 14 }}>技能图标</div>
            <AssistantIconPicker value={iconKey} onChange={(key) => setIconKey(key)}>
              <div
                style={{
                  alignItems: 'center',
                  border: '1px solid rgba(130,140,200,0.18)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  gap: 10,
                  padding: '10px 16px',
                  transition: 'border-color 0.2s',
                }}
              >
                <AssistantIconBlock iconKey={iconKey} radius={10} size={36} />
                <span style={{ color: '#5f7490', fontSize: 13, fontWeight: 500 }}>点击更换图标</span>
              </div>
            </AssistantIconPicker>
          </div>

          {/* 技能名称（只读，不可编辑） */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#3e5068', fontWeight: 500, marginBottom: 6, fontSize: 14 }}>技能名称</div>
            <div
              style={{
                background: '#f5f7fb',
                border: '1px solid rgba(130,140,200,0.18)',
                borderRadius: 8,
                color: '#1a2744',
                fontSize: 14,
                padding: '6px 12px',
                lineHeight: '22px',
              }}
            >
              {skill?.bizName || detail?.bizName || '-'}
            </div>
          </div>

          <Form.Item label={<span style={{ color: '#3e5068', fontWeight: 500 }}>技能描述</span>} name="summary">
            <Input.TextArea autoSize={{ maxRows: 6, minRows: 3 }} placeholder="请输入技能描述" />
          </Form.Item>

          <Form.Item label={<span style={{ color: '#3e5068', fontWeight: 500 }}>状态</span>} name="status" style={{ marginBottom: 0 }}>
            <Select style={{ width: 160 }}>
              <Select.Option value="1">启用</Select.Option>
              <Select.Option value="0">隐藏</Select.Option>
            </Select>
          </Form.Item>
        </div>

        {/* 额外信息区 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 24px 24px' }}>
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
            <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>详细信息</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skill-edit-info-row">
              <span className="skill-edit-info-label">所属空间</span>
              <span className="skill-edit-info-value">{skill?.spaceName || (skill?.spaceId ? `空间 #${skill.spaceId}` : '-')}</span>
            </div>
            <div className="skill-edit-info-row">
              <span className="skill-edit-info-label">创建人</span>
              <span className="skill-edit-info-value">{detail?.createdBy || '-'}</span>
            </div>
            <div className="skill-edit-info-row">
              <span className="skill-edit-info-label">创建时间</span>
              <span className="skill-edit-info-value">{detail?.createTime ? String(detail.createTime).replace('T', ' ') : '-'}</span>
            </div>
            <div className="skill-edit-info-row">
              <span className="skill-edit-info-label">更新时间</span>
              <span className="skill-edit-info-value">{detail?.updateTime ? String(detail.updateTime).replace('T', ' ') : '-'}</span>
            </div>
          </div>
        </div>
      </Form>
    </CommonDrawer>
  )
}

export default SkillEditDrawer
