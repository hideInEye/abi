import type { GroupProps } from './Group';
import { useGroupManagement } from './useGroupManagement';

interface GroupFromProps {
  readonly config: GroupProps['config'];
}

const maxRule = [{ max: 20, message: '组名称最多20个字符' }];

export const GroupFrom: React.FC<GroupFromProps> = ({ config }: GroupFromProps) => {
  const { editingGroup } = useGroupManagement(config);
  return (
    <div>
      <AForm.Item
        label={config.inputLabel}
        name="groupName"
        rules={[...maxRule, ...config.rule[0]]}
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
    </div>
  );
};
