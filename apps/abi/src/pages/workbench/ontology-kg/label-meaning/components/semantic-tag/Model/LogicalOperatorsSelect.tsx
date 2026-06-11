import type { CheckboxGroupProps } from 'antd/es/checkbox';
import type { RadioChangeEvent } from 'antd/es/radio';

interface LogicalOperatorsSelectProps {
  readonly onChange: (value: string) => void;
}

export function LogicalOperatorsSelect({ onChange }: LogicalOperatorsSelectProps) {
  const plainOptions: CheckboxGroupProps<string>['options'] = ['全且', '全或', '自定义'];
  const [logicalOperators, setLogicalOperators] = useState(plainOptions[2]);
  const handleChange = (e: RadioChangeEvent) => {
    setLogicalOperators(e.target.value);
    onChange(e.target.value);
  };
  return (
    <div>
      <p className="my-5 text-3.5 font-bold">字段表达式</p>
      <ARadio.Group
        defaultValue={logicalOperators}
        options={plainOptions}
        onChange={handleChange}
      />
      {/* <AFlex className="mt8 items-center">
        <span>自定义规则条件逻辑关系：</span>
        <div>
          <AForm.Item
            className="mb0"
            name="exp"
          >
            <AInput
              disabled={true}
              placeholder="请输入逻辑关系"
            />
          </AForm.Item>
          <p className="mt-2 text-sm opacity-60">使用条件序号加上（）、且、或，来拼接表达式，例如（A且B且C）或D。</p>
        </div>
      </AFlex> */}
    </div>
  );
}
