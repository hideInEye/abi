import { useLoading } from '@sa/hooks';
import { useTranslation } from 'react-i18next';

import { getUerName, login } from '@/store/slice/auth';
import { initAuthRoute, resetRouteStore } from '@/store/slice/route';
import { resetLoginExpiredState } from '@/utils/auth';

import { useAppDispatch } from '../business/useStore';

import { useRouterPush } from './routerPush';

export function useLogin() {
  const { endLoading, loading, startLoading } = useLoading();
  const { redirectFromLogin } = useRouterPush();
  const { t } = useTranslation();

  const dispatch = useAppDispatch();

  async function toLogin(params: { password: string; username: string; code?: string; uuid?: string }, captchaRef: any) {
    startLoading();

    try {
      // 在登录前彻底重置路由状态
      await dispatch(resetRouteStore());

      const { payload } = await dispatch(login(params));
      if (!payload) {
        captchaRef.current?.refresh();
        return false;
      }

      const userName = dispatch(getUerName());

      if (userName) {
        resetLoginExpiredState();
        await dispatch(initAuthRoute());

        // 等待路由初始化完成后再跳转
        await redirectFromLogin();

        window.$notification?.success({
          description: t('page.login.common.welcomeBack', { userName }),
          message: t('page.login.common.loginSuccess')
        });
      }

      return Boolean(userName);
    } finally {
      endLoading();
    }
  }

  return {
    loading,
    toLogin
  };
}
