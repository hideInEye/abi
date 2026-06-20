import { LockOutlined } from '@ant-design/icons';
import { Radio, Switch, TreeSelect } from 'antd';

import type { GroupProps } from './Group';
import { useGroupManagement } from './useGroupManagement';

interface GroupFromProps {
  readonly config: GroupProps['config'];
  /** 可选父级树形列表，新增/编辑时传入 */
  readonly parentOptions?: { title: string; value: number; children?: any[] }[];
}

const maxRule = [{ max: 20, message: '组名称最多20个字符' }];

export const GroupFrom: React.FC<GroupFromProps> = ({ config, parentOptions }: GroupFromProps) => {
  const { editingGroup } = useGroupManagement(config);
  return (
    <div>
      {/* 分组类型选择（仅当配置了 groupTypeOptions 时显示） */}
      {config.groupTypeOptions && config.groupTypeOptions.length > 0 && (
        <AForm.Item
          label="分组类型"
          name="groupType"
          initialValue={editingGroup?.groupType || config.groupTypeOptions[0].value}
          rules={[{ message: '请选择分组类型', required: true }]}
          style={{ marginBottom: 12 }}
        >
          <Radio.Group disabled={!!editingGroup}>
            {config.groupTypeOptions.map(opt => (
              <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
            ))}
          </Radio.Group>
        </AForm.Item>
      )}
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
      {/* 父级文件夹（树形选择，支持多级） */}
      {parentOptions !== undefined && (
        <AForm.Item label="父级文件夹" name="parentId" style={{ marginBottom: 12 }}>
          <TreeSelect
            allowClear
            placeholder="无（根目录）"
            treeData={parentOptions}
            treeDefaultExpandAll
            style={{ width: '100%' }}
          />
        </AForm.Item>
      )}

      {/* 私密开关 - 卡片风格 */}
      <AForm.Item name="isPrivate" valuePropName="checked" noStyle>
        <Switch style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }} />
      </AForm.Item>
      <AForm.Item shouldUpdate noStyle style={{ marginBottom: 0 }}>
        {({ getFieldValue, setFieldsValue }) => (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 8,
              background: '#f5f5f5',
              cursor: 'pointer',
            }}
            onClick={() => setFieldsValue({ isPrivate: !getFieldValue('isPrivate') })}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#333', fontSize: '0.875rem' }}>
              <LockOutlined style={{ color: '#8c8c8c' }} />
              设为私密文件夹
            </span>
            <Switch size="small" checked={getFieldValue('isPrivate')} onClick={(_checked, e) => e.stopPropagation()} onChange={val => setFieldsValue({ isPrivate: val })} />
          </div>
        )}
      </AForm.Item>
    </div>
  );
};
