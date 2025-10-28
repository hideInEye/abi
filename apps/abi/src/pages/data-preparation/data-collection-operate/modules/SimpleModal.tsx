interface SimpleModalProps {
  onClose: (val?: any) => void;
  type: string;
}

const SimpleModal: React.FC<SimpleModalProps> = memo(({ onClose, type }) => {
  const [form] = AForm.useForm();
  const onOk = async () => {
    const values = await form.validateFields();
    onClose(values);
  };
  return (
    <AModal
      open={true}
      title={type === 'rename' ? '重命名' : '格式编辑'}
      onCancel={onClose}
      onOk={onOk}
    >
      <AForm form={form}>
        <AForm.Item
          label={type === 'rename' ? '字段名称' : '自定义时间格式'}
          name={type}
          rules={[{ required: true }]}
        >
          <AInput placeholder="请输入" />
        </AForm.Item>
      </AForm>
    </AModal>
  );
});

export default SimpleModal;
