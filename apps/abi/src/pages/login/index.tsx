import { Button, Checkbox, Divider, Form, Input, message, Space } from 'antd'

import useNameIcon from '@/assets/imgs/hoveruser.png'
import loginBg from '@/assets/imgs/login_bg.webp'
import passwordIcon from '@/assets/imgs/password.png'
import Captcha, { CaptchaRef } from '@/components/captcha-code'
import { loginModuleRecord } from '@/constants/app'
import { useLogin } from '@/hooks/common/login'
import { getCode } from '@/service/api/data-table-meaning'
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { debounce } from 'lodash'
import { localStg } from '@/utils/storage'
type AccountKey = 'admin' | 'super' | 'user'
interface Account {
  key: AccountKey
  label: string
  password: string
  username: string
  remember: boolean
}

type LoginParams = Pick<Account, 'password' | 'username' | 'remember'>
const INPUT_WRAPPER_CLASSES = 'h-14 rounded-xl border shadow-sm transition hover:!border-[#3366FF] focus-within:!border-[#3366FF] focus-within:!shadow-[0_0_0_0.125rem_rgba(51,102,255,0.15)]'

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
    }else {
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
  useEffect(()=>{
    const loginInfo = localStorage.getItem('loginInfo')
    if(loginInfo){
      const data = JSON.parse(loginInfo)
      form.setFieldsValue({
        username:data.userName,
        password: data.passWord,
        remember: true
      })
    }
  },[])
  return (
    <div className="relative min-h-screen w-full">
      <img src={loginBg} className="absolute inset-0 h-full w-full" />
      <div className="absolute right-[17%] top-[20%] z-10 flex w-full max-w-[25rem] flex-col rounded-[1.25rem] bg-white/30 px-8 pb-12 pt-14 shadow-[0.25rem_0.125rem_1rem_rgba(0,0,0,0.06)] backdrop-blur-xl sm:px-10 min-h-[30rem]">
        <h1 className="w-[7.5rem] font-[PingFangSC,'PingFang SC',sans-serif] text-3xl font-medium leading-[2.625rem] text-[#333333]">欢迎登录</h1>
        <div className="mt-2 h-[0.3125rem] w-20 rounded-full bg-[#3366FF]" />

        <Form form={form} layout="vertical" autoComplete="off" requiredMark={false} onFinish={handleSubmit} className="mt-10 flex flex-1 flex-col">
          <Form.Item name="username" className="mb-6" rules={userNameRules}>
            <Input size="large" allowClear placeholder="账户名" prefix={<img className="w-7 h-7" src={useNameIcon} />} className={`${INPUT_WRAPPER_CLASSES} !px-4 !text-base !text-[#333333]`} />
          </Form.Item>

          <Form.Item name="password" className="mb-4" rules={pwd}>
            <Input.Password
              size="large"
              placeholder="密码"
              prefix={<img className="w-7 h-7" src={passwordIcon} />}
              iconRender={(visible) => (visible ? <EyeTwoTone twoToneColor="#3366FF" /> : <EyeInvisibleOutlined />)}
              className={`${INPUT_WRAPPER_CLASSES} !px-4 !text-base !text-[#333333] [&_.ant-input]:!text-[#333333]`}
            />
          </Form.Item>
          <Form.Item name="code" className="mb-4">
            <Captcha ref={captchaRef} onRefresh={setCaptchaUuid} />
          </Form.Item>

          <div className="mt-2 flex items-center justify-between text-sm text-[#666666]">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox className="[&_span]:text-[#666666]">记住我</Checkbox>
            </Form.Item>
            <a className="transition hover:text-[#3366FF]" href="#" onClick={(event) => event.preventDefault()}>
              忘记密码?
            </a>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            className="mt-10 h-14 w-full rounded-xl bg-[#3366FF] text-base font-medium text-white shadow-[0_0.625rem_1.5rem_rgba(51,102,255,0.35)] transition hover:!bg-[#2C58E8] focus:!bg-[#2C58E8] active:!bg-[#2448C6]"
            block
          >
            登 录
          </Button>
        </Form>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <span className="text-xs text-white/90">Copyright © 2025. 北京芯盾时代科技有限公司. 版权所有 京ICP备15056030号-1</span>
      </div>
    </div>
  )
}
