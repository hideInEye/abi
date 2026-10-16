import { useLoading } from '@sa/hooks';
import { useTranslation } from 'react-i18next';
import { initializeSessionSpace } from '@/bootstrap/sessionSpace';

import { getUerName, login } from '@/store/slice/auth';
import { initAuthRoute, resetRouteStore } from '@/store/slice/route';
import { resetLoginExpiredState } from '@/utils/auth';
import { localStg } from '@/utils/storage';

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
        await initializeSessionSpace();
        // 用户资料和默认空间均就绪后才通知其他页面，避免新账号读取到旧空间。
        localStg.set('authSessionVersion', Date.now());
        window.dispatchEvent(new Event('auth-session-ready'));
        await dispatch(initAuthRoute());

        // 等待路由初始化完成后再跳转
        await redirectFromLogin();

        window.$notification?.success({
          description: t('page.login.common.welcomeBack', { userName }),
          message: t('page.login.common.loginSuccess')
        });
      }

      return Boolean(userName);
    } catch (error) {
      window.$message?.error(error instanceof Error ? error.message : '登录初始化失败，请重试');
      return false;
    } finally {
      endLoading();
    }
  }

  return {
    loading,
    toLogin
  };
}
