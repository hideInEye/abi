import { useRequest } from '@sa/hooks';
import { useSelector } from 'react-redux';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

// import { QuestionCircleOutlined } from '@ant-design/icons';
import DarkModeContainer from '@/components/stateless/common/DarkModeContainer';
import { hideMenuRoute } from '@/constants/app';
import { useSpaceSwitch } from '@/hooks/business/useSpaceSwitch';
import { useAppDispatch, useAppSelector } from '@/hooks/business/useStore';
import { spaceList } from '@/service/api/data-space'; // 添加空间列表接口
import { changeSpaceId, getSpaceId } from '@/store/slice/app';
// import LangSwitch from '@/components/stateful/LangSwitch';
// import ThemeSchemaSwitch from '@/components/stateful/ThemeSchemaSwitch';
// import FullScreen from '@/components/stateless/common/FullScreen';
import { getAuthRoutes } from '@/store/slice/route';
import { useRoute, useRouter } from '~/packages/simple-router/src';

// import GlobalBreadcrumb from '../global-breadcrumb';
import GlobalLogo from '../global-logo';
// import GlobalSearch from '../global-search';

// import ThemeButton from './components/ThemeButton';
import UserAvatar from './components/UserAvatar';

interface Props {
  isMobile: boolean;
  mode: UnionKey.ThemeLayoutMode;
  reverse?: boolean;
  siderWidth: number;
}

const HEADER_PROPS_CONFIG: Record<UnionKey.ThemeLayoutMode, App.Global.HeaderProps> = {
  horizontal: {
    showLogo: true,
    showMenu: true,
    showMenuToggler: false
  },
  'horizontal-mix': {
    showLogo: true,
    showMenu: true,
    showMenuToggler: false
  },
  vertical: {
    showLogo: false,
    showMenu: false,
    showMenuToggler: true
  },
  'vertical-mix': {
    showLogo: false,
    showMenu: false,
    showMenuToggler: false
  }
};

const GlobalHeader: FC<Props> = memo(({ isMobile: _isMobile, mode, reverse, siderWidth }) => {
  const route = useRoute();
  const router = useRouter();
  const authRoutes = useSelector(getAuthRoutes); // 从全局状态获取当前空间ID
  const _curspaceId = useAppSelector(getSpaceId);

  const { switchToSpace } = useSpaceSwitch();
  const dispatch = useAppDispatch();

  // const [isFullscreen, { toggleFullscreen }] = useFullscreen(document.body);

  // 添加空间列表请求
  const { data: curspaceList, run: getSpaceList } = useRequest(spaceList, {
    manual: true
  });

  // 添加当前空间状态
  const [currentSpace, setCurrentSpace] = useState<number | null>(null);

  // 添加空间切换处理函数
  const handleSpaceChange = (value: number) => {
    setCurrentSpace(value);
    switchToSpace(value);
  };

  useEffect(() => {
    // 初始化时获取空间列表
    getSpaceList({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum: 1,
      pageSize: 100000
    });

    // 从localStorage获取当前空间
    // 仅在处于“空间”相关页面时，从 localStorage 恢复上次选择的 spaceId
    const savedSpace = localStorage.getItem('spaceId');
    const isSpacePath =
      typeof window !== 'undefined' &&
      (window.location.pathname.includes('/ai-assistant') || window.location.pathname.includes('/chatbi/ai-assistant'));
    if (savedSpace && isSpacePath) {
      setCurrentSpace(Number(savedSpace));
      dispatch(changeSpaceId(Number(savedSpace)));
    }

    // 添加全局事件监听器，响应其他组件修改的spaceId
    const handleGlobalSpaceChange = (event: CustomEvent) => {
      const { spaceId } = event.detail;
      dispatch(changeSpaceId(spaceId));
    };

    window.addEventListener('space-change', handleGlobalSpaceChange as EventListener);

    return () => {
      window.removeEventListener('space-change', handleGlobalSpaceChange as EventListener);
    };
  }, [dispatch, getSpaceList]);

  // 每次路由变化时，尝试从 localStorage 同步当前空间到 header 的选中值
  useEffect(() => {
    try {
      const saved = localStorage.getItem('spaceId');
      if (saved) {
        const sid = Number(saved);
        setCurrentSpace(sid);
        dispatch(changeSpaceId(sid));
      } else {
        setCurrentSpace(null);
      }
    } catch {
      // ignore
    }
  }, [route, dispatch]);

  const { showLogo: _showLogo, showMenu: _showMenu, showMenuToggler } = HEADER_PROPS_CONFIG[mode];
  const _showToggler = reverse ? true : showMenuToggler;
  const isHideMenuRoute = hideMenuRoute.includes(route.name!);
  const isMicroApp = qiankunWindow.__POWERED_BY_QIANKUN__;
  const routeName = (route.name || '') as string;
  const excludedRoutes = new Set(['home', 'workbench_app-workshop_recently-used', 'workbench_app-workshop_my-collect', 'workbench_app-workshop_my-share']);
  const isManageRoute = routeName.startsWith('manage');
  const showSpaceSelector = !excludedRoutes.has(routeName) && !isManageRoute;

  let items: any = [];
  // 一级菜单栏固定死为：门户首页
  const topMenuList = ['home'];
  authRoutes.forEach((item: any) => {
    if (topMenuList.includes(item.name)) {
      if (item.name === 'home') {
        items.push({
          key: 'home',
          label: '门户首页'
        });
      }
    }
  });

  if (isMicroApp) {
    const cacheMenu = localStorage.getItem('menu');
    // const cacheMenu =
    //   '[{"id":350,"parentId":0,"menuName":"系统管理","menuPath":"/studio/system","menuType":0,"blank":0},{"id":351,"parentId":350,"menuName":"系统管理","menuPath":null,"menuType":0,"blank":0},{"id":352,"parentId":351,"menuName":"基础信息配置","menuPath":"/studio/system/baseinfo","menuType":0,"blank":0},{"id":355,"parentId":351,"menuName":"组织管理员管理","menuPath":"/studio/system/admin","menuType":0,"blank":0},{"id":356,"parentId":351,"menuName":"角色权限管理","menuPath":"/studio/system/role","menuType":0,"blank":0},{"id":400,"parentId":0,"menuName":"chatbi","menuPath":"/studio/chatbi","menuType":0,"blank":0},{"id":401,"parentId":400,"menuName":"首页","menuPath":"/studio/chatbi/home","menuType":0,"blank":0},{"id":402,"parentId":400,"menuName":"智能对话","menuPath":null,"menuType":0,"blank":0},{"id":403,"parentId":402,"menuName":"对话分析","menuPath":"/studio/chatbi/ai-assistant/conversational-analysis","menuType":0,"blank":0},{"id":404,"parentId":400,"menuName":"分享管理","menuPath":null,"menuType":0,"blank":0},{"id":405,"parentId":404,"menuName":"我的分享","menuPath":"/studio/chatbi/share-manage/my-share","menuType":0,"blank":0},{"id":406,"parentId":400,"menuName":"助手管理","menuPath":null,"menuType":0,"blank":0},{"id":407,"parentId":406,"menuName":"助手配置","menuPath":"/studio/chatbi/assistant-manage/assistant-config","menuType":0,"blank":0},{"id":408,"parentId":406,"menuName":"标签语义","menuPath":"/studio/chatbi/assistant-manage/label-meaning","menuType":0,"blank":0},{"id":409,"parentId":406,"menuName":"记忆管理","menuPath":"/studio/chatbi/assistant-manage/memory-manage","menuType":0,"blank":0},{"id":410,"parentId":406,"menuName":"推荐问题","menuPath":"/studio/chatbi/assistant-manage/recommended-inquiries","menuType":0,"blank":0},{"id":411,"parentId":406,"menuName":"行业术语","menuPath":"/studio/chatbi/assistant-manage/technical-jargon","menuType":0,"blank":0},{"id":412,"parentId":400,"menuName":"数据准备","menuPath":null,"menuType":0,"blank":0},{"id":413,"parentId":412,"menuName":"数据源","menuPath":"/studio/chatbi/data-preparation/data-source","menuType":0,"blank":0},{"id":414,"parentId":412,"menuName":"数据集","menuPath":"/studio/chatbi/data-preparation/data-collection","menuType":0,"blank":0},{"id":415,"parentId":412,"menuName":"表语义","menuPath":"/studio/chatbi/data-preparation/data-table-meaning","menuType":0,"blank":0},{"id":416,"parentId":400,"menuName":"系统管理","menuPath":null,"menuType":0,"blank":0},{"id":417,"parentId":416,"menuName":"大模型管理","menuPath":"/studio/chatbi/manage/model","menuType":0,"blank":0},{"id":418,"parentId":416,"menuName":"插件管理","menuPath":"/studio/chatbi/manage/plugin-management","menuType":0,"blank":0},{"id":419,"parentId":400,"menuName":"我的收藏","menuPath":"/studio/chatbi/my-collect","menuType":0,"blank":0},{"id":420,"parentId":400,"menuName":"最近使用","menuPath":"/studio/chatbi/recently-used","menuType":0,"blank":0}]';
    if (cacheMenu) {
      const menuArr = JSON.parse(cacheMenu);
      items = items.filter((item: any) => {
        const cur = menuArr.find((menu: any) => menu.id === item.id);
        return cur && cur.menuPath.includes('/chatbi');
      });
    }
  }

  const handleBackMainSys = () => {
    // qiankunStore is injected at runtime by qiankun; ignore TS checking here
    // @ts-expect-error qiankunStore is injected at runtime
    window.qiankunStore?.commit('setShowMenu', true);
    // @ts-expect-error qiankunStore is injected at runtime
    window.qiankunStore?.commit('setShowHeader', true);
    try {
      const primaryAppMenu = localStorage.getItem('menu');
      if (primaryAppMenu) {
        const findMenu = JSON.parse(primaryAppMenu).find((item: any) => item.parentId && item.menuPath);
        if (findMenu) {
          window.location.href = findMenu.menuPath;
        }
      }
    } catch {
      // ignore parse errors
    }
  };

  // 格式化空间选项
  const spaceOptions =
    curspaceList?.map((space: any) => ({
      label: space.spaceName,
      value: space.spaceId
    })) || [];

  return (
    <DarkModeContainer className="h-full flex flex-y-center justify-between p-6 px-12px text-16px shadow-header">
      <div className="flex items-center">
        {isHideMenuRoute ? (
          <GlobalLogo
            className="h-full"
            style={{ width: `${siderWidth}px` }}
          />
        ) : null}

        <AMenu
          className="text-16px"
          items={items}
          mode="horizontal"
          selectedKeys={[route.name!]}
          onClick={e => router.push({ name: e.key })}
          // overflowedIndicator={<span style={{ display: 'none' }}>...</span>}
          // style={{ minWidth: 'auto', flex: 1 }}
        />
      </div>

      {isMicroApp ? (
        <div className="flex items-center">
          {showSpaceSelector && (
            <ASelect
              options={spaceOptions}
              placeholder="空间切换"
              style={{ width: '286px' }}
              value={currentSpace}
              variant="borderless"
              onChange={handleSpaceChange}
            />
          )}
          {/* <span className="cursor-pointer">用户权限管理</span> */}

          {/* <QuestionCircleOutlined /> */}
          <UserAvatar />
          <AButton onClick={handleBackMainSys}>返回主系统</AButton>
        </div>
      ) : (
        <>
          {/* <div
            className="h-full flex-y-center flex-1-hidden"
            id={GLOBAL_HEADER_MENU_ID}
          >
            {!isMobile && !showMenu && <GlobalBreadcrumb className="ml-12px" />}
          </div> */}

          <div className="h-full flex-y-center justify-end">
            {showSpaceSelector && (
              <ASelect
                options={spaceOptions}
                placeholder="空间切换"
                style={{ width: '286px' }}
                value={currentSpace}
                variant="borderless"
                onChange={handleSpaceChange}
              />
            )}
            {/* <GlobalSearch /> */}
            {/* {!isMobile && (
              <FullScreen
                className="px-12px"
                full={isFullscreen}
                toggleFullscreen={toggleFullscreen}
              />
            )} */}
            {/* <LangSwitch className="px-12px" /> */}
            {/* <ThemeSchemaSwitch className="px-12px" /> */}
            {/* <ThemeButton /> */}
            <UserAvatar />
          </div>
        </>
      )}
    </DarkModeContainer>
  );
});

export default GlobalHeader;
