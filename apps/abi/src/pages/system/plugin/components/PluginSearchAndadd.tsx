import { PlusOutlined } from '@ant-design/icons';

interface PluginSearchAndaddProps {
  readonly onAdd: () => void;
  readonly onSearch: (value: string) => void;
}

export const PluginSearchAndadd: React.FC<PluginSearchAndaddProps> = ({ onAdd, onSearch }: PluginSearchAndaddProps) => {
  return (
    <div>
      <ASpace className="flex justify-between">
        <AInput
          placeholder="请输入插件名称"
          onChange={e => onSearch(e.target.value)}
        />

        <AButton
          color="primary"
          icon={<PlusOutlined />}
          variant="outlined"
          onClick={onAdd}
        >
          新增插件
        </AButton>
      </ASpace>
    </div>
  );
};
