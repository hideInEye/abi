import { Button, Checkbox, Form, Input } from 'antd'

import useNameIcon from '@/assets/imgs/hoveruser.png'
import loginBg from '@/assets/imgs/login_bg.jpg'
import passwordIcon from '@/assets/imgs/password.png'
import { useLogin } from '@/hooks/common/login'
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'

type AccountKey = 'admin' | 'super' | 'user'
interface Account {
  key: AccountKey
  label: string
  password: string
  userName: string
}

type LoginParams = Pick<Account, 'password' | 'userName'>

const INPUT_WRAPPER_CLASSES = 'h-56px rd-12px border border-white/60 bg-white/90 shadow-sm transition hover:!border-#3366FF focus-within:!border-#3366FF focus-within:!shadow-[0_0_0_2px_rgba(51,102,255,0.15)]'
export function Component() {
  const [form] = Form.useForm<LoginParams>()
  const { toggleLoginModule } = useRouterPush()
  const { loading, toLogin } = useLogin()

  const {
    formRules: { pwd, userName: userNameRules },
  } = useFormRules()

  function handleSubmit() {
    const params = form.getFieldsValue()
    
    toLogin(params)
  }

  useKeyPress('enter', () => {
    handleSubmit()
  })

  return (
    <div
      className="relative flex min-h-100vh w-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-16px xl:items-start xl:justify-start xl:pl-780px xl:pt-220px 2xl:pl-934px 2xl:pt-260px 3xl:pl-1167px 3xl:pt-314px"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="relative z-10 flex min-h-480px w-full max-w-400px flex-col rd-20px bg-white/30 px-32px pb-48px pt-56px shadow-[4px_2px_16px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:px-40px">
        <h1 className="w-120px font-[PingFangSC,'PingFang SC',sans-serif] text-30px font-medium leading-42px text-#333333">欢迎登录</h1>
        <div className="mt-8px h-5px w-80px rd-full bg-#3366FF" />

        <Form form={form} layout="vertical" autoComplete="off" initialValues={{ remember: false }} requiredMark={false} onFinish={handleSubmit} className="mt-40px flex flex-1 flex-col">
          <Form.Item name="userName" className="mb-24px" rules={userNameRules}>
            <Input size="large" allowClear placeholder="账户名" prefix={<img className="w-28px h-28px" src={useNameIcon} />} className={`${INPUT_WRAPPER_CLASSES} !px-16px !text-base !text-#333333`} />
          </Form.Item>

          <Form.Item name="password" className="mb-16px" rules={pwd}>
            <Input.Password
              size="large"
              placeholder="密码"
              prefix={<img className="w-28px h-28px" src={passwordIcon} />}
              iconRender={(visible) => (visible ? <EyeTwoTone twoToneColor="#3366FF" /> : <EyeInvisibleOutlined />)}
              className={`${INPUT_WRAPPER_CLASSES} !px-16px !text-base !text-#333333 [&_.ant-input]:!text-#333333`}
            />
          </Form.Item>

          <div className="mt-8px flex items-center justify-between text-sm text-#666666">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox className="[&_span]:text-#666666">记住我</Checkbox>
            </Form.Item>
            <a className="transition hover:text-#3366FF" href="#" onClick={() => toggleLoginModule('reset-pwd')}>
              忘记密码?
            </a>
          </div>

          <Button type="primary"  size="large" loading={loading} className="mt-40px h-56px w-full rd-12px bg-#3366FF text-base font-medium text-white shadow-[0_10px_24px_rgba(51,102,255,0.35)] transition hover:!bg-#2C58E8 focus:!bg-#2C58E8 active:!bg-#2448C6" block>
            登 录
          </Button>
        </Form>
      </div>

      <div className="pointer-events-none absolute left-0 right-0 bottom-24px flex justify-center">
        <span className="text-xs text-white/90">Copyright © 2025. 北京芯盾时代科技有限公司. 版权所有 京ICP备15056030号-1</span>
      </div>
    </div>
  )
}
