import { message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import { fetchResetPassword } from '@/service/api'
import { encrypt } from '@/utils/jsencrypt'

import './user-drawer.scss'

interface PropsType {
  onClose: (refresh?: boolean) => void
  userId: number
}

const ResetPassword: FC<PropsType> = memo(({ onClose, userId }) => {
  const [form] = AForm.useForm()
  const {
    formRules: { pwd },
  } = useFormRules()

  const handleOk = async () => {
    const { password } = await form.validateFields()
    const params = { password: encrypt(password), userId }
    const res = await fetchResetPassword(params)
    if (res.response?.data?.code === 200) {
      onClose(true)
      message.success('重置成功')
    }
  }

  return (
    <CommonDrawer
      className="reset-password-drawer-v5"
      open={true}
      title="重置密码"
      footer={
        <div className="reset-password-drawer-footer-v5">
          <AButton className="btn-ghost-v5" onClick={() => onClose()}>
            取消
          </AButton>
          <AButton className="btn-accent-gradient" onClick={handleOk}>
            确认
          </AButton>
        </div>
      }
      onClose={() => onClose()}
    >
      <div className="reset-password-form-panel">
        <AForm form={form}>
          <AForm.Item label="密码" name="password" rules={pwd}>
            <AInput.Password placeholder="请输入密码" />
          </AForm.Item>
        </AForm>
      </div>
    </CommonDrawer>
  )
})

export default ResetPassword
