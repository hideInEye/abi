import {
  AppstoreOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  GlobalOutlined,
  IdcardOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Form, Input } from 'antd';

import type { ISpaceItem } from '../types';

interface SpaceBasicInfoProps {
  editSpace?: ISpaceItem | null;
}

export const SpaceBasicInfo = ({ editSpace }: SpaceBasicInfoProps) => {
  const { TextArea } = Input;
  const spaceName = Form.useWatch('spaceName');
  const remark = Form.useWatch('remark');

  const previewName = spaceName || editSpace?.spaceName || '';
  const initial = previewName ? previewName.charAt(0).toUpperCase() : '?';

  const dotColors = ['blue', 'purple', 'green'] as const;
  const dotColor = dotColors[(editSpace?.spaceId ?? 0) % dotColors.length];

  return (
    <div className="sd-v5-basic-info">
      {/* Hero banner */}
      <div className="sd-v5-hero">
        <div className="sd-v5-hero-bg">
          <span className="sd-v5-hero-orb sd-v5-hero-orb--1" />
          <span className="sd-v5-hero-orb sd-v5-hero-orb--2" />
          <span className="sd-v5-hero-orb sd-v5-hero-orb--3" />
        </div>
        <div className="sd-v5-hero-content">
          <div className={`sd-v5-hero-avatar sd-v5-hero-avatar--${dotColor}`}>
            {initial}
          </div>
          <div className="sd-v5-hero-info">
            <div className="sd-v5-hero-name">{previewName || '未命名空间'}</div>
            <div className="sd-v5-hero-subtitle">
              {editSpace ? '编辑空间配置' : '创建新的工作空间'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row (edit mode only) */}
      {editSpace && (
        <div className="sd-v5-stats-row">
          <div className="sd-v5-stat-card">
            <div className="sd-v5-stat-icon sd-v5-stat-icon--blue">
              <IdcardOutlined />
            </div>
            <div className="sd-v5-stat-body">
              <div className="sd-v5-stat-label">空间 ID</div>
              <div className="sd-v5-stat-value">{editSpace.spaceId}</div>
            </div>
          </div>
          <div className="sd-v5-stat-card">
            <div className="sd-v5-stat-icon sd-v5-stat-icon--green">
              <UserOutlined />
            </div>
            <div className="sd-v5-stat-body">
              <div className="sd-v5-stat-label">创建人</div>
              <div className="sd-v5-stat-value">{editSpace.createBy || '-'}</div>
            </div>
          </div>
          <div className="sd-v5-stat-card">
            <div className="sd-v5-stat-icon sd-v5-stat-icon--purple">
              <ClockCircleOutlined />
            </div>
            <div className="sd-v5-stat-body">
              <div className="sd-v5-stat-label">创建时间</div>
              <div className="sd-v5-stat-value">{editSpace.createTime || '-'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Form section */}
      <div className="sd-v5-field-group">
        <div className="sd-v5-field-group-title">
          <GlobalOutlined className="sd-v5-field-group-title-icon" />
          空间配置
        </div>

        <div className="sd-v5-field-card">
          <div className="sd-v5-field-card-accent" />
          <div className="sd-v5-field-card-body">
            <Form.Item
              label={
                <span className="sd-v5-label">
                  <AppstoreOutlined style={{ marginRight: 4 }} />
                  空间名称
                  <span className="sd-v5-label-required" />
                </span>
              }
              layout="vertical"
              name="spaceName"
              className="sd-v5-form-item"
              rules={[{ message: '请输入空间名称', required: true }]}
              extra={
                <span className="sd-v5-field-hint">
                  <InfoCircleOutlined style={{ marginRight: 4 }} />
                  空间名称将显示在工作台顶部导航中，建议不超过 20 个字符
                </span>
              }
            >
              <Input
                maxLength={50}
                placeholder="例如：风控反欺诈分析空间"
                className="sd-v5-input"
                prefix={<FileTextOutlined style={{ color: '#a3b3c8' }} />}
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="sd-v5-label">
                  <FileTextOutlined style={{ marginRight: 4 }} />
                  空间描述
                </span>
              }
              layout="vertical"
              name="remark"
              className="sd-v5-form-item"
              style={{ marginTop: 16 }}
              rules={[{ message: '请输入空间描述' }]}
              extra={
                <span className="sd-v5-field-hint">
                  <InfoCircleOutlined style={{ marginRight: 4 }} />
                  描述空间的用途和范围，便于团队成员理解
                </span>
              }
            >
              <TextArea
                maxLength={200}
                placeholder="描述该空间的主要用途和业务范围..."
                rows={3}
                className="sd-v5-textarea"
                showCount
              />
            </Form.Item>
          </div>
        </div>
      </div>
    </div>
  );
};
