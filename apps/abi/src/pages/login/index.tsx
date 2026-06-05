import { Button, Checkbox, Form, Input } from 'antd'

import loginBg from '@/assets/imgs/login_bg.webp'
import Captcha, { CaptchaRef } from '@/components/captcha-code'
import { useLogin } from '@/hooks/common/login'
import { EyeInvisibleOutlined, EyeTwoTone, LockOutlined, UserOutlined } from '@ant-design/icons'
import { debounce } from 'lodash'

import styles from './index.module.css'

type AccountKey = 'admin' | 'super' | 'user'
interface Account {
  key: AccountKey
  label: string
  password: string
  username: string
  remember: boolean
}

interface LoginParams extends Pick<Account, 'password' | 'username' | 'remember'> {
  code: string
}

export function Component() {
  const [form] = Form.useForm<LoginParams>()
  const { loading, toLogin } = useLogin()
  const captchaRef = useRef<CaptchaRef>(null)
  const [captchaUuid, setCaptchaUuid] = useState('')

  const {
    formRules: { pwd, userName: userNameRules },
  } = useFormRules()

  const handleSubmit = debounce(async function handleSubmit() {
    const params = await form.validateFields()
    if (params.remember) {
      localStorage.setItem('loginInfo', JSON.stringify({ userName: params.username, passWord: params.password }))
    } else {
      localStorage.removeItem('loginInfo')
    }
    toLogin(
      {
        ...params,
        uuid: captchaUuid,
      },
      captchaRef,
    )
  }, 300)

  useKeyPress('enter', () => {
    handleSubmit()
  })
  useEffect(() => {
    const loginInfo = localStorage.getItem('loginInfo')
    if (loginInfo) {
      const data = JSON.parse(loginInfo)
      form.setFieldsValue({
        username: data.userName,
        password: data.passWord,
        remember: true,
      })
    }
  }, [])

  return (
    <div className={styles.page}>
      <img src={loginBg} alt="" className={styles.background} />
      <div className={styles.card}>
        <h1 className={styles.title}>欢迎登录</h1>
        <div className={styles.titleLine} />

        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          requiredMark={false}
          validateTrigger="onBlur"
          onFinish={handleSubmit}
          className={styles.form}
        >
          <Form.Item name="username" className={styles.formItem} rules={userNameRules}>
            <Input
              size="large"
              allowClear
              placeholder="账户名"
              prefix={<UserOutlined className={styles.loginIcon} />}
              className={styles.input}
            />
          </Form.Item>

          <Form.Item name="password" className={styles.formItem} rules={pwd}>
            <Input.Password
              size="large"
              placeholder="密码"
              prefix={<LockOutlined className={styles.loginIcon} />}
              iconRender={(visible) =>
                visible ? <EyeTwoTone twoToneColor="#1890FF" /> : <EyeInvisibleOutlined className={styles.eyeIcon} />
              }
              className={styles.input}
            />
          </Form.Item>

          <Form.Item name="code" className={styles.formItem} rules={[{ required: true, message: '请输入验证码' }]}>
            <Captcha
              ref={captchaRef}
              className={styles.captcha}
              inputClassName={styles.input}
              imageClassName={styles.captchaImage}
              onRefresh={setCaptchaUuid}
            />
          </Form.Item>

          <div className={styles.helperRow}>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox className={styles.remember}>记住我</Checkbox>
            </Form.Item>
            <a className={styles.forgotLink} href="#" onClick={(event) => event.preventDefault()}>
              忘记密码?
            </a>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            className={styles.submit}
            block
          >
            登 录
          </Button>
        </Form>
      </div>

      <div className={styles.copyright}>
        <span className={styles.copyrightText}>Copyright © 2025. 北京芯盾时代科技有限公司. 版权所有 京ICP备15056030号-1</span>
      </div>
    </div>
  )
}
