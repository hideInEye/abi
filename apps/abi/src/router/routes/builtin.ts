import type { CustomRoute } from '@elegant-router/types';
import type { ElegantConstRoute } from '@ohh-889/react-auto-route';
import type { ActionFunctionArgs } from 'react-router-dom';
import { redirect } from 'react-router-dom';

import { requestLogout } from '@/service/logout';
import { store } from '@/store';
import { resetStore } from '@/store/slice/auth';

import { getRoutePath } from '../elegant/transform';

export const ROOT_ROUTE: CustomRoute = {
  meta: {
    constant: true,
    title: 'root'
  },
  name: 'root',
  path: '/',
  redirect: getRoutePath(import.meta.env.VITE_ROUTE_HOME) || '/home'
};

const NOT_FOUND_ROUTE: CustomRoute = {
  component: '$view.404',
  meta: {
    constant: true,
    title: 'not-found'
  },
  name: 'not-found',
  path: '*'
};

/** - logout route 通过 action 触发做相关的登出操作 */
/** - logout route triggers related logout operations through the action */
const LOG_OUT_ROUTE: CustomRoute = {
  action: async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData();

    await requestLogout();
    await store.dispatch(resetStore());

    const needRedirect = formData.get('needRedirect');

    if (needRedirect) {
      const redirectFullPath = formData.get('redirectFullPath');
      return redirect(`/login?redirect=${redirectFullPath}`);
    }

    return redirect('/login');
  },
  meta: {
    hideInMenu: true,
    i18nKey: 'route.logout',
    title: 'logout'
  },
  name: 'logout',
  path: '/logout'
};

/** builtin routes, it must be constant and setup in vue-router */
export const builtinRoutes: ElegantConstRoute[] = [ROOT_ROUTE, NOT_FOUND_ROUTE, LOG_OUT_ROUTE];
