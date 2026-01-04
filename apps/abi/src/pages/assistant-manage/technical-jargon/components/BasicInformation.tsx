import type { FormInstance } from 'antd/es/form/Form';

import { tabTypeOptions } from '../../label-meaning/constants';
import { IDataType } from '../constant';

interface IState {
  bizName: undefined;
  remark: undefined;
  techName: undefined;
}

interface PropsType {
  readonly dispatch: (obj: object) => void;
  readonly form: FormInstance<any>;
  readonly state: IState;
}

const BasicInformation: FC<PropsType> = memo(({ dispatch, form, state }) => {
  useEffect(() => {
    form.setFieldsValue(state);
  }, [form, state]);

  const handleValuesChange = (changeValues: any) => {
    dispatch(changeValues);
  };
  return (
    <AForm
      form={form}
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 16 }}
      onValuesChange={handleValuesChange}
    >
      <AForm.Item
        label="中文名"
        name="bizName"
      >
        <AInput placeholder="请输入中文名" />
      </AForm.Item>
      <AForm.Item
        label="英文名"
        name="techName"
        rules={[{ message: '请输入英文名', required: true },{message:'请输入正确格式英文名,英文单词以_分割',pattern:'^[a-zA-Z]+(_[a-zA-Z]+)*$'}]}
      >
        <AInput placeholder="请输入英文名" />
      </AForm.Item>

      <AForm.Item
        label="别名"
        name="termAlias"
      >
        <AInput />
      </AForm.Item>

      <AForm.Item
        label="数据类型"
        name="dataType"
        rules={[{ message: '请选择数据类型', required: true }]}
      >
        <ASelect placeholder="请选择数据类型">
          {IDataType.map((i, index) => (
            <ASelect.Option
              key={index}
              value={i.label}
            >
              {i.value}
            </ASelect.Option>
          ))}
        </ASelect>
      </AForm.Item>

      <AForm.Item
        label="术语类型"
        name="termType"
        rules={[{ message: '请选择术语类型', required: true }]}
      >
        <ASelect
          options={tabTypeOptions}
          placeholder="请选择术语类型"
        />
      </AForm.Item>

      <AForm.Item
        label="计量单位"
        name="measurementUnit"
        rules={[{ max: 32, message: '计量单位不超过32个字符' }]}
      >
        <AInput placeholder="请输入计量单位" />
      </AForm.Item>
      <p className="indent-6em text-sm text-gray-500">请输入：中文、英文、数字、特殊字符等，不超过32个字符</p>
    </AForm>
  );
});

export default BasicInformation;
