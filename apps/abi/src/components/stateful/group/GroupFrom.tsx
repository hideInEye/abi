import { FolderOutlined, LockOutlined, TagOutlined } from '@ant-design/icons';
import { Switch, TreeSelect } from 'antd';

import type { GroupProps } from './Group';
import { useGroupManagement } from './useGroupManagement';

interface GroupFromProps {
  readonly config: GroupProps['config'];
  /** 可选父级树形列表，新增/编辑时传入 */
  readonly parentOptions?: { title: string; value: number; children?: any[] }[];
}

const maxRule = [{ max: 20, message: '组名称最多20个字符' }];

/** v5 分区小标题 */
const FormSectionTitle: FC<{ icon: React.ReactNode; title: string; color?: string }> = ({
  icon,
  title,
  color = '#5b7cf7',
}) => (
  <div className="group-form-section-title">
    <div
      className="group-form-section-icon"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
        boxShadow: `0 2px 8px ${color}28`,
      }}
    >
      {icon}
    </div>
    <span>{title}</span>
  </div>
);

export const GroupFrom: React.FC<GroupFromProps> = ({ config, parentOptions }: GroupFromProps) => {
  const { editingGroup } = useGroupManagement(config);
  return (
    <div>
      {/* ── 基本信息分区 ── */}
      <FormSectionTitle icon={<TagOutlined />} title="基本信息" color="#5b7cf7" />

      {/* 名称 */}
      <AForm.Item
        label={config.inputLabel}
        name="groupName"
        rules={[...maxRule, ...config.rule[0]]}
        style={{ marginBottom: 12 }}
      >
        <AInput
          defaultValue={editingGroup?.groupName}
          placeholder={config.inputPlaceholder}
        />
      </AForm.Item>

      {/* 在字典分组中，remark字段是英文名称 */}
      {config.remark && (
        <AForm.Item
          label={config.remark}
          name="remark"
          rules={config.rule[1]}
        >
          <AInput
            defaultValue={editingGroup?.remark}
            placeholder={config.inputPlaceholderEn}
          />
        </AForm.Item>
      )}

      {/* ── 层级关系分区 ── */}
      {parentOptions !== undefined && (
        <>
          <FormSectionTitle icon={<FolderOutlined />} title="层级关系" color="#10b981" />

          <AForm.Item label="父级文件夹" name="parentId" style={{ marginBottom: 12 }}>
            <TreeSelect
              allowClear
              placeholder="无（根目录）"
              treeData={parentOptions}
              treeDefaultExpandAll
              style={{ width: '100%' }}
            />
          </AForm.Item>
        </>
      )}

      {/* ── 隐私设置 ── */}
      <AForm.Item name="isPrivate" valuePropName="checked" noStyle>
        <Switch style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }} />
      </AForm.Item>
      <AForm.Item shouldUpdate noStyle style={{ marginBottom: 0 }}>
        {({ getFieldValue, setFieldsValue }) => {
          const isPrivate = getFieldValue('isPrivate');
          return (
            <div
              className={`group-private-card ${isPrivate ? 'is-active' : ''}`}
              onClick={() => setFieldsValue({ isPrivate: !isPrivate })}
            >
              <span className="group-private-card-label">
                <LockOutlined className="group-private-card-icon" />
                设为私密文件夹
              </span>
              <Switch
                size="small"
                checked={isPrivate}
                onClick={(_checked, e) => e.stopPropagation()}
                onChange={val => setFieldsValue({ isPrivate: val })}
              />
            </div>
          );
        }}
      </AForm.Item>
    </div>
  );
};
