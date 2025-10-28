import request from '@/services'
import { loginModel } from '@/types/login'
import { encrypt } from '@/utils'
import { localStg } from '@/utils/login'

const login: loginModel = {
  namespace: 'login',
  state: {
    loading: false,
    token: '',
    userInfo: null,
  },
  effects: {
    *login({ payload }, { call, put }) {
      const { username, password } = payload
      const psd = encrypt(password) as string

      const data = yield call(request.loginController.login, { username, password: psd })
      if (data.access_token) {
        localStg.set('token', data.access_token)

        const { user } = yield call(request.loginController.getUserInfo)
        if (user) {
          
          localStg.set('userInfo', user)
          yield put({
            type: 'saveUserInfo',
            payload: {
              token: data.access_token,
              userInfo: user,
            },
          })
        }
      }
    },
  },
  reducers: {
    saveUserInfo(state, { payload }) {
      return {
        ...state,
        ...payload,
      }
    },
  },
}

export default login
