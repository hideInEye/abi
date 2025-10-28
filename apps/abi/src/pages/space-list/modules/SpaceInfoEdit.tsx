import { Form, Input, Space } from 'antd';

export const SpaceBasicInfo = () => {
  const { TextArea } = Input;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={24}>
      <Form.Item
        label="空间名称"
        layout="vertical"
        name="spaceName"
        className='[&_.ant-form-item-margin-offset]:!mb-2'
        rules={[{ message: '请输入空间名称', required: true }]}
      >
        <Input
          maxLength={50}
          placeholder="输入空间名称"
        />
      </Form.Item>

      <Form.Item
        // className="mt-10"
        label="空间描述"
        layout="vertical"
        name="remark"
        rules={[{ message: '请输入空间描述' }]}
      >
        <TextArea
          maxLength={200}
          placeholder="输入空间描述"
          rows={5}
        />
      </Form.Item>
    </Space>
  );
};
