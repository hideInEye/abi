import { useRoute } from '@sa/simple-router';
import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { getLocale } from '@/store/slice/app';
import { getSortRoutes } from '@/store/slice/route';
import { selectActiveFirstLevelMenuKey, setActiveFirstLevelMenuKey } from '@/store/slice/tab';
import { getActiveFirstLevelMenuKey } from '@/store/slice/tab/shared';

import { MixMenuContext } from '../context';

import { getGlobalMenusByAuthRoutes } from './MenuUtil';

interface Props {
  readonly children: ReactNode;
}

const MenuProvider: FC<Props> = ({ children }) => {
  const sortRoutes = useAppSelector(getSortRoutes);

  const locale = useAppSelector(getLocale);

  const menus = useMemo(() => getGlobalMenusByAuthRoutes(sortRoutes), [sortRoutes, locale]);

  const activeFirstLevelMenuKey = useAppSelector(selectActiveFirstLevelMenuKey);

  const dispatch = useAppDispatch();

  const route = useRoute();
  const location = useLocation();

  const selectKey = useMemo(() => {
    const name = route.name as string;

    // 从 URL pathname 推导菜单选中项（纯本地路由不在后端返回数据中，route.name/meta 不可靠）
    const pathname = location.pathname;
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length >= 2) {
      // 去掉末尾的数字ID段
      let pathSegs = [...segments];
      if (/^\d+$/.test(pathSegs[pathSegs.length - 1])) {
        pathSegs.pop();
      }

      if (pathSegs.length >= 2) {
        const lastSeg = pathSegs[pathSegs.length - 1];
        const suffixes = ['-operate', '-view', '-edit', '-detail', '-create'];
        let baseSeg = lastSeg;
        for (const suffix of suffixes) {
          if (lastSeg.endsWith(suffix)) {
            baseSeg = lastSeg.slice(0, -suffix.length);
            break;
          }
        }

        // 在菜单树中查找匹配的 key
        const findMenuKey = (menuList: any[], key: string): string | null => {
          for (const m of menuList) {
            if (m?.key === key) return m.key;
            if (m?.children?.length) {
              const found = findMenuKey(m.children, key);
              if (found) return found;
            }
          }
          return null;
        };

        // 尝试多种 key 格式（短格式和长格式）
        const parentSeg = pathSegs[pathSegs.length - 2];
        const fullPrefix = [...pathSegs.slice(0, -1), baseSeg].join('_');
        const candidates = [
          `${parentSeg}_${baseSeg}`,   // 短格式：data-preparation_data-collection
          fullPrefix,                   // 长格式：workbench_data-preparation_data-collection
          baseSeg                       // 最简格式
        ];

        for (const key of candidates) {
          const found = findMenuKey(menus, key);
          if (found) return [found];
        }
      }
    }

    return [name];
  }, [route, location.pathname, menus]);

  /** - 可以手动指定菜单或者是默认当前路由的一级菜单 */
  function changeActiveFirstLevelMenuKey(key?: string) {
    let routeKey = key;

    if (!routeKey) {
      routeKey = getActiveFirstLevelMenuKey(route);
    }

    dispatch(setActiveFirstLevelMenuKey(routeKey));
  }

  const firstLevelMenu = useMemo(
    () =>
      menus.map(menu => {
        const { children: _, ...rest } = menu;
         return rest;
      }) as App.Global.Menu[],
    [menus]
  );

  const childLevelMenus = useMemo(
    () => menus.find(menu => menu.key === activeFirstLevelMenuKey)?.children as App.Global.Menu[],
    [activeFirstLevelMenuKey, menus]
  );

  const mixMenuContext = {
    activeFirstLevelMenuKey,
    allMenus: menus,
    childLevelMenus: childLevelMenus || [],
    firstLevelMenu,
    isActiveFirstLevelMenuHasChildren: activeFirstLevelMenuKey ? Boolean(childLevelMenus) : false,
    route,
    selectKey,
    setActiveFirstLevelMenuKey: changeActiveFirstLevelMenuKey
  };

  return <MixMenuContext.Provider value={mixMenuContext}>{children}</MixMenuContext.Provider>;
};

export default MenuProvider;
