import { useLoading } from '@sa/hooks';
import { useTranslation } from 'react-i18next';

import { router } from '@/router';
import { store } from '@/store';
import { getUerName, login, resetStore } from '@/store/slice/auth';
import { getRouteHome, initAuthRoute, resetRouteStore, safeResetRouteStore } from '@/store/slice/route';

import { useAppDispatch } from '../business/useStore';

import { useRouterPush } from './routerPush';

export function useLogin() {
  const { endLoading, loading, startLoading } = useLoading();
  const { redirectFromLogin } = useRouterPush();
  const { t } = useTranslation();

  const dispatch = useAppDispatch();

  async function toLogin(params: { password: string; userName: string }, redirect = true) {
    startLoading();

    // 在登录前彻底重置路由状态
    await dispatch(resetRouteStore());

    await dispatch(login(params));
    const userName = dispatch(getUerName());

    if (userName) {
      await dispatch(initAuthRoute());

      // console.log('登录路由初始化完成，当前路由数:', {
      //   // matcherRoutes: router.matcher.getRoutes().length,
      //   reactRouteslength: router.reactRouter.routes.length,
      //   reactRoutes: router.reactRouter.routes,
      //   curRoutes: router.getRoutes()
      // });

      // 等待路由初始化完成后再跳转
      await redirectFromLogin();

      window.$notification?.success({
        description: t('page.login.common.welcomeBack', { userName }),
        message: t('page.login.common.loginSuccess')
      });
    } else {
      // dispatch(resetStore());
    }
    endLoading();
  }

  return {
    loading,
    toLogin
  };
}
