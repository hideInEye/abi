import { EditOutlined, SettingOutlined } from '@ant-design/icons';
import { App, Button, Drawer, Form, Input, Select } from 'antd';
import { useEffect, useState } from 'react';

import { getSkillDetailApi, updateSkillInfoApi } from '@/service/api/skill';

import '../skill.css';

type SkillItem = {
  bizName?: string;
  createdBy?: string;
  createTime?: string;
  id?: number | string;
  spaceId?: number | string;
  spaceName?: string;
  status?: string;
  summary?: string;
  updateTime?: string;
};

type Props = {
  onClose: () => void;
  onSuccess?: () => void;
  open: boolean;
  skill?: SkillItem | null;
};

const SkillEditDrawer: FC<Props> = ({ onClose, onSuccess, open, skill }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<SkillItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (open && skill?.id) {
      form.resetFields();
      setLoadingDetail(true);
      // 先用列表数据预填充（仅可编辑字段）
      form.setFieldsValue({
        status: skill.status ?? '1',
        summary: skill.summary,
      });
      getSkillDetailApi({ skillId: skill.id })
        .then((res: any) => {
          const d = res?.response?.data?.data || res?.data?.data || res?.data || {};
          if (d && Object.keys(d).length) {
            setDetail(d);
            form.setFieldsValue({
              status: d.status ?? skill.status ?? '1',
              summary: d.summary || skill.summary,
            });
          }
        })
        .catch(() => {
          // 详情加载失败时使用列表数据
        })
        .finally(() => setLoadingDetail(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSave() {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res: any = await updateSkillInfoApi({
        skillId: skill?.id!,
        status: values.status,
        summary: values.summary,
      });
      const code = res?.response?.data?.code ?? res?.data?.code;
      if (code === 200 || res?.response?.data?.success || res?.data?.success) {
        message.success('保存成功');
        onSuccess?.();
        onClose();
      } else {
        message.error(res?.response?.data?.msg || res?.data?.msg || '保存失败');
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  const skillName = skill?.bizName || detail?.bizName || '技能';

  return (
    <Drawer
      className="ds-operate-drawer"
      open={open}
      onClose={onClose}
      width={640}
      destroyOnClose
      closeIcon={null}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            alignItems: 'center', background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
            borderRadius: 10, boxShadow: '0 4px 12px rgba(91,124,247,0.3)',
            color: '#fff', display: 'flex', fontSize: 18, height: 36, justifyContent: 'center', width: 36,
          }}>
            <EditOutlined />
          </div>
          <div>
            <div style={{ color: '#1a2744', fontSize: 17, fontWeight: 700, letterSpacing: '0.02em' }}>
              编辑技能
            </div>
            <div style={{ color: '#768a9f', fontSize: 12, marginTop: 2 }}>
              修改 {skillName} 的基本信息
            </div>
          </div>
        </div>
      }
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
              background: 'linear-gradient(135deg, #5b7cf7, #7091fa)', border: 'none',
              borderRadius: 8, boxShadow: '0 2px 10px rgba(91,124,247,0.3)', fontWeight: 600,
              height: 38, padding: '0 28px',
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
          <div style={{
            alignItems: 'center', borderBottom: '1px solid rgba(130,140,200,0.10)',
            display: 'flex', gap: 10, marginBottom: 16, padding: '10px 0',
          }}>
            <div style={{
              alignItems: 'center', background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
              borderRadius: 7, boxShadow: '0 2px 8px rgba(91,124,247,0.25)',
              color: '#fff', display: 'flex', fontSize: 13, height: 26, justifyContent: 'center', width: 26,
            }}>
              <SettingOutlined />
            </div>
            <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>基本信息</span>
          </div>

          {/* 技能名称（只读，不可编辑） */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#3e5068', fontWeight: 500, marginBottom: 6, fontSize: 14 }}>技能名称</div>
            <div style={{
              background: '#f5f7fb', border: '1px solid rgba(130,140,200,0.18)', borderRadius: 8,
              color: '#1a2744', fontSize: 14, padding: '6px 12px', lineHeight: '22px',
            }}>
              {skill?.bizName || detail?.bizName || '-'}
            </div>
          </div>

          <Form.Item
            label={<span style={{ color: '#3e5068', fontWeight: 500 }}>技能描述</span>}
            name="summary"
          >
            <Input.TextArea autoSize={{ maxRows: 6, minRows: 3 }} placeholder="请输入技能描述" />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: '#3e5068', fontWeight: 500 }}>状态</span>}
            name="status"
            style={{ marginBottom: 0 }}
          >
            <Select style={{ width: 160 }}>
              <Select.Option value="1">启用</Select.Option>
              <Select.Option value="0">隐藏</Select.Option>
            </Select>
          </Form.Item>
        </div>

        {/* 额外信息区 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 24px 24px' }}>
          <div style={{
            alignItems: 'center', borderBottom: '1px solid rgba(130,140,200,0.10)',
            display: 'flex', gap: 10, marginBottom: 16, padding: '10px 0',
          }}>
            <div style={{
              alignItems: 'center', background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
              borderRadius: 7, boxShadow: '0 2px 8px rgba(91,124,247,0.25)',
              color: '#fff', display: 'flex', fontSize: 13, height: 26, justifyContent: 'center', width: 26,
            }}>
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
    </Drawer>
  );
};

export default SkillEditDrawer;
