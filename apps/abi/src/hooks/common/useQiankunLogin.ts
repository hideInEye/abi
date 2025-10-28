// import { useTranslation } from 'react-i18next';

import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { fetchLoginChatbiByOnenet } from '@/service/api';
import { fetchGetUserInfo } from '@/service/api/platform';
import { getUerName } from '@/store/slice/auth';
import { initAuthRoute } from '@/store/slice/route';
import { localStg } from '@/utils/storage';

import { useAppDispatch } from '../business/useStore';

// import { useRouterPush } from './routerPush';

export async function useQiankunLogin(props: any) {
  // const { redirectFromLogin } = useRouterPush();
  // const { t } = useTranslation();
  if (!qiankunWindow.__POWERED_BY_QIANKUN__) return;
  const dispatch = useAppDispatch();
  console.info('dispatch');

  // await dispatch(login(params));
  const { store: qiankunStore } = props;
  window.qiankunStore = qiankunStore;
  qiankunStore.commit('setShowMenu', false);
  qiankunStore.commit('setShowHeader', false);
  const res = await fetchLoginChatbiByOnenet();
  localStg.set('token', res.data?.access_token);
  const { error: userInfoError, response } = await fetchGetUserInfo();
  const { user } = response.data as any;
  if (!userInfoError) {
    // 2. store user info
    localStg.set('userInfo', user);
    // return {
    //   token: loginToken.token,
    //   userInfo: user
    // };
  }
  const userName = dispatch(getUerName());

  if (userName) {
    await dispatch(initAuthRoute());

    // if (redirect) {
    //   await redirectFromLogin(redirect);
    // }

    // window.$notification?.success({
    //   description: t('page.login.common.welcomeBack', { userName }),
    //   message: t('page.login.common.loginSuccess')
    // });
  } else {
    // dispatch(resetStore());
  }
}
