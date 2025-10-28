import { useForm } from 'antd/es/form/Form';
import type { Dispatch, SetStateAction } from 'react';
import React from 'react';

interface IState {
  bizName: undefined;
  remark: undefined;
  techName: undefined;
}
interface PropsType {
  readonly dispatch: (obj: object) => void;
  setHasChange: Dispatch<SetStateAction<boolean>>;
  readonly state: IState;
}

const BasicInformation: FC<PropsType> = memo(({ dispatch, setHasChange, state }) => {
  const [form] = useForm();

  useEffect(() => {
    form.setFieldsValue(state);
  }, [form, state]);

  const handleValuesChange = (changeValues: any) => {
    dispatch(changeValues);
    setHasChange(true);
  };
  return (
    <AForm
      form={form}
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 16 }}
      onValuesChange={handleValuesChange}
    >
      <AForm.Item
        label="名称"
        name="bizName"
        rules={[{ required: true }, { max: 20 }]}
      >
        <AInput placeholder="请输入助手名称" />
      </AForm.Item>
      <AForm.Item
        label="英文名称"
        name="techName"
        rules={[
          { required: true, max: 50 },
          {
              message: '请输入正确格式英文名,英文单词以_分割',
              pattern: /^[a-zA-Z]+(_[a-zA-Z]+)*$/
          }
        ]}
      >
        <AInput placeholder="请输入助手英文名称" />
      </AForm.Item>
      <AForm.Item
        label="描述"
        name="remark"
      >
        <AInput.TextArea placeholder="请输入描述" />
      </AForm.Item>
    </AForm>
  );
});

export default BasicInformation;
