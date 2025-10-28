import { Button, Form, message } from 'antd';

import { fetchResetPassword } from '@/service/api';
import { encrypt } from '@/utils/jsencrypt';

interface PropsType {
  onClose: (refresh?: boolean) => void;
  userId: number;
}

const ResetPassword: FC<PropsType> = memo(({ onClose, userId }) => {
  const [form] = Form.useForm();
  const handleOk = async () => {
    const { password } = await form.validateFields();
    const params = { password: encrypt(password), userId };
    const res = await fetchResetPassword(params);
    if (res.response?.data?.code === 200) {
      onClose(true);
      message.success('重置成功');
    }
  };
  return (
    <ADrawer
      open={true}
      title="重置密码"
      footer={
        <div className="text-right">
          <Button
            className="mr-2"
            onClick={() => onClose()}
          >
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleOk}
          >
            确认
          </Button>
        </div>
      }
      onClose={() => onClose()}
    >
      <AForm form={form}>
        <AForm.Item
          label="密码"
          name="password"
        >
          <AInput.Password
            className="w-200px"
            placeholder="请输入密码"
          />
        </AForm.Item>
      </AForm>
    </ADrawer>
  );
});

export default ResetPassword;
