import { Button, Checkbox, Form, Input } from 'antd'

import useNameIcon from '@/assets/hoveruser.png'
// import { useFormRules } from '@/hooks/common/form';
import loginBg from '@/assets/login_bg.jpg'
import passwordIcon from '@/assets/password.png'
import { LoginFormValues, LoginModelState } from '@/types/login'
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons'
import { connect, useDispatch } from '@umijs/max'

const INPUT_WRAPPER_CLASSES = 'h-14 rounded-[12px] border border-white/60 bg-white/90 shadow-sm transition hover:!border-[#3366FF] focus-within:!border-[#3366FF] focus-within:!shadow-[0_0_0_2px_rgba(51,102,255,0.15)]'
const Login = (props: LoginModelState) => {
  const { loading } = props
  const [form] = Form.useForm<LoginFormValues>()
  const dispatch = useDispatch()

  // const {
  //   formRules: { pwd, userName: userNameRules }
  // } = useFormRules();

  const handleFinish = async (values: LoginFormValues) => {
    dispatch({
      type: 'login/login',
      payload: {
        ...values,
      },
    })
  }

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 xl:items-start xl:justify-start xl:pl-[780px] xl:pt-[220px] 2xl:pl-[934px] 2xl:pt-[260px] 3xl:pl-[1167px] 3xl:pt-[314px]"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="relative z-10 flex w-full max-w-[400px] flex-col rounded-[20px] bg-white/30 px-8 pb-12 pt-14 shadow-[4px_2px_16px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:px-10 min-h-[480px]">
        <h1 className="w-[120px] font-[PingFangSC,'PingFang SC',sans-serif] text-[30px] font-medium leading-[42px] text-[#333333]">欢迎登录</h1>
        <div className="mt-2 h-[5px] w-20 rounded-full bg-[#3366FF]" />

        <Form form={form} layout="vertical" autoComplete="off" initialValues={{ remember: false }} requiredMark={false} onFinish={handleFinish} className="mt-10 flex flex-1 flex-col">
          <Form.Item
            name="userName"
            className="mb-6"
            // rules={userNameRules}
          >
            <Input size="large" allowClear placeholder="账户名" prefix={<img className="w-[28px] h-[28px]" src={useNameIcon} />} className={`${INPUT_WRAPPER_CLASSES} !px-4 !text-base !text-[#333333]`} />
          </Form.Item>

          <Form.Item
            name="password"
            className="mb-4"
            // rules={pwd}
          >
            <Input.Password
              size="large"
              placeholder="密码"
              prefix={<img className=" w-[28px] h-[28px]" src={passwordIcon} />}
              iconRender={(visible) => (visible ? <EyeTwoTone twoToneColor="#3366FF" /> : <EyeInvisibleOutlined />)}
              className={`${INPUT_WRAPPER_CLASSES} !px-4 !text-base !text-[#333333] [&_.ant-input]:!text-[#333333]`}
            />
          </Form.Item>

          <div className="mt-2 flex items-center justify-between text-sm text-[#666666]">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox className="[&_span]:text-[#666666]">记住我</Checkbox>
            </Form.Item>
            <a className="transition hover:text-[#3366FF]" href="#" onClick={(event) => event.preventDefault()}>
              忘记密码?
            </a>
          </div>

          <Button type="primary" htmlType="submit" size="large" loading={loading} className="mt-10 h-14 w-full rounded-[12px] bg-[#3366FF] text-base font-medium text-white shadow-[0_10px_24px_rgba(51,102,255,0.35)] transition hover:!bg-[#2C58E8] focus:!bg-[#2C58E8] active:!bg-[#2448C6]" block>
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

const state = () => {
  return {}
}

export default connect(state)(Login)
