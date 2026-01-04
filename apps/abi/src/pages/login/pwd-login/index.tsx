import { Button, Checkbox, Divider, Form, Input, message, Space } from 'antd';

import { loginModuleRecord } from '@/constants/app';
import { useLogin } from '@/hooks/common/login';
import { getCode } from '@/service/api/data-table-meaning';
import Captcha, { CaptchaRef } from '@/components/captcha-code';
import { debounce } from 'lodash';
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
  const [captchaUuid, setCaptchaUuid] = useState('');

  const {
    formRules: { pwd, userName: userNameRules }
  } = useFormRules();

  const handleSubmit = debounce(async function handleSubmit() {
    const userInput = inputValue.trim();
    if (!userInput) {
      message.error(t('page.login.pwdLogin.captchaError'));
      return;
    }
    const params = await form.validateFields();
    toLogin({
      ...params,
      code: userInput,
      uuid: captchaUuid
    }, captchaRef);
  }, 300);

  useKeyPress('enter', () => {
    handleSubmit();
  });

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
          rules={[{
            required:true,
            message: '请输入密码'
          }]}
        >
          <Input.Password placeholder='请输入密码' autoComplete="password" />
        </Form.Item>
        <Space direction="horizontal" className="flex [&_.ant-space-item:first-child]:flex-auto">
          <Input
            placeholder="请输入验证码"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
          <Captcha ref={captchaRef} width={100} height={30} onChange={(uuid) => { setCaptchaUuid(uuid); }} />
        </Space>
        <Space
          className="w-full"
          direction="vertical"
          size={24}
        >
          <div className="mt-8px">
            { /* 屏蔽记住我 */ }
            {/* <Checkbox>{t('page.login.pwdLogin.rememberMe')}</Checkbox> */}
            {/* 屏蔽忘记密码 */}
            {/* <Button
              type="text"
              onClick={() => toggleLoginModule('reset-pwd')}
            >
              {t('page.login.pwdLogin.forgetPassword')}
            </Button> */}
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
