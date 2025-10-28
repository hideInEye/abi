import { Button, Checkbox, Divider, Form, Input, message, Space } from 'antd';

import { loginModuleRecord } from '@/constants/app';
import { useLogin } from '@/hooks/common/login';
import { getCode } from '@/service/api/data-table-meaning';
import Captcha, { CaptchaRef } from '@/components/captcha-code';
type AccountKey = 'admin' | 'super' | 'user';
interface Account {
  key: AccountKey;
  label: string;
  password: string;
  userName: string;
}

type LoginParams = Pick<Account, 'password' | 'userName'>;

export function Component() {
  const [form] = Form.useForm<LoginParams>();
  const { toggleLoginModule } = useRouterPush();
  const { t } = useTranslation();
  const { loading, toLogin } = useLogin();
  const captchaRef = useRef<CaptchaRef>(null);
  const [inputValue, setInputValue] = useState('');
  const [realCode, setRealCode] = useState('');

  const {
    formRules: { pwd, userName: userNameRules }
  } = useFormRules();

  async function handleSubmit() {
    const userInput = inputValue.trim().toUpperCase();
    const code = realCode.toUpperCase();
    if (userInput !== code) {
      message.error(t('page.login.pwdLogin.captchaError'));
      captchaRef.current?.refresh();
      return
    }
    const params = await form.validateFields();
    toLogin(params);
  }

  useKeyPress('enter', () => {
    handleSubmit();
  });

  function handleAccountLogin(account: Account) {
    toLogin(account);
  }

  const accounts: Account[] = [
    {
      key: 'super',
      label: t('page.login.pwdLogin.superAdmin'),
      password: '123456',
      userName: 'Super'
    },
    {
      key: 'admin',
      label: t('page.login.pwdLogin.admin'),
      password: '123456',
      userName: 'Admin'
    },
    {
      key: 'user',
      label: t('page.login.pwdLogin.user'),
      password: '123456',
      userName: 'User'
    }
  ];

  return (
    <>
      <h3 className="text-18px text-primary font-medium">{t('page.login.pwdLogin.title')}</h3>
      <Form
        className="pt-24px"
        form={form}
        initialValues={{
          password: '',
          userName: ''
        }}
      >
        <Form.Item
          name="userName"
          rules={userNameRules}
        >
          <Input  placeholder='请输入用户名' />
        </Form.Item>

        <Form.Item
          name="password"
          rules={pwd}
        >
          <Input.Password placeholder='请输入密码' autoComplete="password" />
        </Form.Item>
        <Space direction="horizontal" className="flex [&_.ant-space-item:first-child]:flex-auto">
          <Input
            placeholder="请输入验证码"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
          <Captcha ref={captchaRef} onChange={(code) => { setRealCode(code); }} />
        </Space>
        <Space
          className="w-full"
          direction="vertical"
          size={24}
        >
          <div className="flex-y-center justify-between">
            <Checkbox>{t('page.login.pwdLogin.rememberMe')}</Checkbox>

            <Button
              type="text"
              onClick={() => toggleLoginModule('reset-pwd')}
            >
              {t('page.login.pwdLogin.forgetPassword')}
            </Button>
          </div>
          <Button
            block
            loading={loading}
            shape="round"
            size="large"
            type="primary"
            onClick={handleSubmit}
          >
            {t('common.confirm')}
          </Button>
          {/* <div className="flex-y-center justify-between gap-12px">
            <Button
              block
              className="flex-1"
              onClick={() => toggleLoginModule('code-login')}
            >
              {t(loginModuleRecord['code-login'])}
            </Button>
            <Button
              block
              className="flex-1"
              onClick={() => toggleLoginModule('register')}
            >
              {t(loginModuleRecord.register)}
            </Button>
          </div>
          <Divider className="!m-0 !text-14px !text-#666">{t('page.login.pwdLogin.otherAccountLogin')}</Divider>
          <div className="flex-center gap-12px">
            {accounts.map(item => {
              return (
                <Button
                  key={item.key}
                  type="primary"
                  onClick={() => handleAccountLogin(item)}
                >
                  {item.label}
                </Button>
              );
            })}
          </div> */}
        </Space>
      </Form>
    </>
  );
}
