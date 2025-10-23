import request from '@/services'
import { loginModel } from '@/types/login'
import { encrypt } from '@/utils'
import { localStg } from '@/utils/login'

const login: loginModel = {
  namespace: 'login',
  state: {
    loading: false,
  },
  effects: {
    *login({ payload }, { put }) {
      const { userName, password } = payload
      const psd = encrypt(password) as string
      console.log(psd, userName)

      const { data, error } = yield put(request.loginController.login({ userName, password: psd }))
      const loginToken = {
        ...data,
        refreshToken: data?.refresh_token || '',
        token: data?.access_token || '',
        userId: data?.userId || '',
      }

      // 1. stored in the localStorage, the later requests need it in headers
      if (!error) {
        localStg.set('token', loginToken.token)
        localStg.set('refreshToken', loginToken.refreshToken)
        localStg.set('userId', loginToken.userId)

        const { error: userInfoError, response } = yield put(request.loginController.getUserInfo())
        const { user } = response.data as any
        if (!userInfoError) {
          // 2. store user info
          localStg.set('userInfo', user)
          return {
            token: loginToken.token,
            userInfo: user,
          }
        }
      }
    },
  },
  reducers: {},
}

export default login
