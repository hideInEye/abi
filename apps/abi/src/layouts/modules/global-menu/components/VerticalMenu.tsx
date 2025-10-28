import { SimpleScrollbar } from '@sa/materials';
import type { RouteRecordNormalized } from '@sa/simple-router';
import type { MenuProps } from 'antd';
import { cloneDeep } from 'lodash';
import type { MenuInfo } from 'rc-menu/lib/interface';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { useSystemStore } from '@/my-store';
import { getSpaceMenuBySpaceIdApi } from '@/service/api';
import { getSiderCollapse } from '@/store/slice/app';
import { getThemeSettings } from '@/store/slice/theme';
import { convertRuoYiToSoybean, filterAndReconstructRoutes } from "@/utils/router";

interface LevelKeysProps {
  children?: LevelKeysProps[];
  key?: string;
}

const getLevelKeys = (items1: LevelKeysProps[]) => {
  const key: Record<string, number> = {};
  const func = (items2: LevelKeysProps[], level = 1) => {
    items2.forEach(item => {
      if (item.key) {
        key[item.key] = level;
      }
      if (item.children) {
        func(item.children, level + 1);
      }
    });
  };
  func(items1);
  return key;
};

const getSelectedMenuKeyPath = (matches: RouteRecordNormalized[]) => {
  const result = matches.reduce((acc: string[], match, index) => {
    if (index < matches.length - 1 && match.name) {
      acc.push(match.name);
    }
    return acc;
  }, []);

  return result;
};

const VerticalMenu = memo(() => {
  const isMicroApp = qiankunWindow.__POWERED_BY_QIANKUN__;
  const { allMenus, childLevelMenus, route, selectKey } = useMixMenuContext();
  const { onenetPortalManageMenus } = useSystemStore();

  // 状态：过滤后的菜单和加载状态
  const [filteredMenus, setFilteredMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 处理菜单过滤的副作用
  useEffect(() => {
    const filterMenus = async () => {
      setLoading(true); // 开始加载

      try {
        const cloneAllMenus = cloneDeep(allMenus);
        const spaceId: any = localStorage.getItem('spaceId');

        // 门户管理的特殊处理
        if (route.path.includes('/manage/')) {
          const manageMenus = cloneAllMenus.filter(item => item.key === 'manage');
          if (isMicroApp) {
            manageMenus[0].children = manageMenus[0].children!.filter((item: any) => {
              return onenetPortalManageMenus.find((oItem: any) => oItem.routeName === item.key);
            });
          }
          setFilteredMenus(manageMenus);
          return;
        }

        let finalMenus: any = [];
        // 空间菜单特殊处理
        if (spaceId && spaceId !== 'undefined' && spaceId !== 'null') {
          const { data, error } = await getSpaceMenuBySpaceIdApi(Number(spaceId));
          if (!error) {
            finalMenus = convertRuoYiToSoybean(data);

            const arr = filterAndReconstructRoutes(cloneAllMenus, finalMenus);
            setFilteredMenus(arr);
            return;
          }
          // 合并菜单：这里假设需要将空间菜单合并到主菜单中
          // 具体合并逻辑根据业务需求调整
          // const finalMenus1 = [
          //   ...cloneAllMenus.filter(item => item.key !== 'manage' && item.key !== 'my-collect' && item.key !== 'home' && item.key !== 'recently-used' && item.key !== 'share-manage'),
          //   // ...spaceMenus
          // ];
          // console.log(allMenus)
          // console.log('---------------')
          // console.log(finalMenus)
          setFilteredMenus(finalMenus);
          return;
        }

        // 默认情况：直接为空 目前该场景待确认
        setFilteredMenus(finalMenus);
        // setFilteredMenus(cloneAllMenus.filter(item => item.key !== 'manage'));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('菜单过滤出错', error);
        // 出错时回退到默认菜单
        setFilteredMenus(allMenus.filter(item => item.key !== 'manage'));
      } finally {
        setLoading(false); // 结束加载
      }
    };

    filterMenus();
  }, [route, allMenus, isMicroApp, onenetPortalManageMenus]);

  // 计算levelKeys - 添加空数组处理
  const levelKeys = useMemo(() => {
    // 确保filteredMenus是有效数组
    if (loading || !filteredMenus || filteredMenus.length === 0) {
      return {};
    }
    return getLevelKeys(filteredMenus);
  }, [filteredMenus, loading]);

  const themeSettings = useAppSelector(getThemeSettings);

  const router = useRouterPush();

  const isMix = themeSettings.layout.mode.includes('mix');

  const isVerticalMix = themeSettings.layout.mode === 'vertical-mix';

  const inlineCollapsed = useAppSelector(getSiderCollapse);

  const [stateOpenKeys, setStateOpenKeys] = useState<string[]>(
    inlineCollapsed ? [] : getSelectedMenuKeyPath(route.matched)
  );

  function handleClickMenu(menuInfo: MenuInfo) {
    router.routerPushByKeyWithMetaQuery(menuInfo.key);
  }

  const onOpenChange: MenuProps['onOpenChange'] = keys => {
    if (keys.includes('rc-menu-more')) {
      setStateOpenKeys(keys);
      return;
    }

    const currentOpenKey = keys.find(key => !stateOpenKeys.includes(key));

    // open
    if (currentOpenKey && themeSettings.isOnlyExpandCurrentParentMenu) {
      const repeatIndex = keys
        .filter(key => key !== currentOpenKey)
        .findIndex(key => levelKeys[key] === levelKeys[currentOpenKey]);

      setStateOpenKeys(
        keys
          // remove repeat key
          .filter((_, index) => index !== repeatIndex)
          // remove current level all child
          .filter(key => levelKeys[key] <= levelKeys[currentOpenKey])
      );
    } else {
      // // close
      setStateOpenKeys(keys);
    }
  };

  useEffect(() => {
    if (inlineCollapsed || isVerticalMix) return;
    setStateOpenKeys(getSelectedMenuKeyPath(route.matched));
  }, [route, inlineCollapsed, isVerticalMix]);

  useUpdateEffect(() => {
    if (inlineCollapsed || isVerticalMix) return;

    const names = route.matched
      .slice(isMix ? 1 : 0, -1)
      .map(item => item.name)
      .filter(Boolean) as string[];

    setStateOpenKeys(names || []);
  }, [isMix, inlineCollapsed]);

  return (
    <SimpleScrollbar>
      <AMenu
        className="size-full transition-300 border-0!"
        inlineCollapsed={isVerticalMix ? false : inlineCollapsed}
        inlineIndent={18}
        items={isMix ? childLevelMenus : filteredMenus}
        mode="inline"
        openKeys={stateOpenKeys}
        selectedKeys={selectKey}
        onOpenChange={onOpenChange}
        onSelect={handleClickMenu}
      />
    </SimpleScrollbar>
  );
});

export default VerticalMenu;
