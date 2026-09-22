import { EyeInvisibleOutlined, EyeTwoTone, LockOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Form, Input } from 'antd'
import { debounce } from 'lodash'

import loginBg from '@/assets/imgs/login/loginbg.png'
import loginHero from '@/assets/imgs/login/loginbot.png'
import loginLogo from '@/assets/imgs/login/logo.png'
import Captcha from '@/components/captcha-code'
import type { CaptchaRef } from '@/components/captcha-code'
import { useAppDispatch } from '@/hooks/business/useStore'
import { useLogin } from '@/hooks/common/login'
import { useRouterPush } from '@/hooks/common/routerPush'
import { checkAuthStatus } from '@/router/guard/authGuard'
import { store } from '@/store'
import { syncAuthFromStorage } from '@/store/slice/auth'
import { initAuthRoute } from '@/store/slice/route'
import { resetLoginExpiredState } from '@/utils/auth'
import { localStg } from '@/utils/storage'

import styles from './index.module.css'
import { clearLegacyRememberedCredentials } from './loginSecurity'
import {
  createLoginSessionRedirectCheck,
  hasActiveLoginSession,
  isLoginSessionReadyStorageKey,
} from './loginSessionSync'

type AccountKey = 'admin' | 'super' | 'user'
interface Account {
  key: AccountKey
  label: string
  password: string
  username: string
}

interface LoginParams extends Pick<Account, 'password' | 'username'> {
  code: string
}

export function Component() {
  const [form] = Form.useForm<LoginParams>()
  const dispatch = useAppDispatch()
  const { loading, toLogin } = useLogin()
  const { redirectFromLogin } = useRouterPush()
  const redirectFromLoginRef = useRef(redirectFromLogin)
  const captchaRef = useRef<CaptchaRef>(null)
  const [captchaUuid, setCaptchaUuid] = useState('')

  redirectFromLoginRef.current = redirectFromLogin

  const {
    formRules: { pwd, userName: userNameRules },
  } = useFormRules()

  const handleSubmit = debounce(async function handleSubmit() {
    const params = await form.validateFields()
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
    // Remove credentials persisted by older versions; passwords must never survive a page reload.
    clearLegacyRememberedCredentials(localStorage)
  }, [])

  useEffect(() => {
    let lastSessionVersion = localStg.get('authSessionVersion')
    const checkLoginSession = createLoginSessionRedirectCheck({
      isSessionActive: () =>
        hasActiveLoginSession(checkAuthStatus(), localStg.get('token'), localStg.get('userInfo')),
      restoreSession: async () => {
        dispatch(syncAuthFromStorage())
        await dispatch(initAuthRoute())

        if (!store.getState().route.isInitAuthRoute) return false

        resetLoginExpiredState()
        return Boolean(await redirectFromLoginRef.current())
      },
    })
    const runSessionCheck = () => {
      checkLoginSession().catch(() => undefined)
    }
    const handleStorageChange = (event: StorageEvent) => {
      if (!isLoginSessionReadyStorageKey(event.key)) return

      lastSessionVersion = localStg.get('authSessionVersion')
      runSessionCheck()
    }
    const handleFocus = () => {
      const currentSessionVersion = localStg.get('authSessionVersion')
      if (currentSessionVersion === lastSessionVersion) return

      lastSessionVersion = currentSessionVersion
      runSessionCheck()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleFocus()
    }

    runSessionCheck()
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [dispatch])

  return (
    <div className={styles.page}>
      <img src={loginBg} alt="" className={styles.background} />
      <img src={loginLogo} alt="ABI" className={styles.logo} />

      <div className={styles.layout}>
        <section className={styles.leftPanel}>
          <div className={styles.brandCopy}>
            <h1 className={styles.heroTitle}>
              <span>欢迎体验</span>
              <strong>「芯智ABI」</strong>
            </h1>
            <p className={styles.heroSubtitle}>企业级数智化决策开放平台</p>
            <p className={styles.heroDesc}>自然语言交互 · 智能数据分析 · 可视化洞察 · 可信决策支持</p>
          </div>

          <img src={loginHero} alt="" className={styles.heroImage} />

          <p className={styles.sloganText}>
            智领数据，赋能行业。全链路智能分析与可信决策平台，以本体语义导航洞察先机，驱动业务确定性增长。
          </p>
        </section>

        <div className={styles.cardWrap}>
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
        </div>
      </div>

      <div className={styles.copyright}>
        <span className={styles.copyrightText}>Copyright © 2025. 北京芯盾时代科技有限公司. 版权所有 京ICP备15056030号-1</span>
      </div>
    </div>
  )
}
