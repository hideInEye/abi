import { SettingOutlined } from '@ant-design/icons';
// import { useRoute } from '@sa/simple-router';
import { Button, Dropdown } from 'antd';
import { cloneDeep } from 'lodash';
// import { useSubmit } from 'react-router-dom';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { portalManageMenus } from '@/constants/app';
import { useSystemStore } from '@/my-store';
import { logoutNow } from '@/service/logout';
import { selectToken, selectUserInfo } from '@/store/slice/auth';
import { getAllRoutes } from '@/store/slice/route';

const isMicroApp = qiankunWindow.__POWERED_BY_QIANKUN__;
const UserAvatar = memo(() => {
  const token = useAppSelector(selectToken);
  const { t } = useTranslation();
  const userInfo = useAppSelector(selectUserInfo);
  // const submit = useSubmit();
  // const route = useRoute();
  const router = useRouterPush();
  const { setOnenetPortalManageMenus } = useSystemStore();
  function logout() {
    window?.$modal?.confirm({
      cancelText: t('common.cancel'),
      content: t('common.logoutConfirm'),
      okText: t('common.confirm'),
      onOk: () => logoutNow(),
      title: t('common.tip')
    });
  }

  function onClick({ item, key }: { item: any; key: string }) {
    switch (key) {
      case '1':
        router.routerPushByKey(item.props.routeName);
        break;
      case '2':
        logout();
        break;
      default:
        break;
    }
  }
  function loginOrRegister() {
    router.routerPushByKey('login');
  }

  const defaultItems = [
    // {
    //   key: '0',
    //   label: (
    //     <div className="flex-center gap-8px">
    //       <SvgIcon
    //         className="text-icon"
    //         icon="ph:user-circle"
    //       />
    //       {t('common.userCenter')}
    //     </div>
    //   )
    // },
  ];

  const routes = useAppSelector(getAllRoutes);
  const showManage = routes.find(r => r.name === 'manage');
  if (showManage) {
    defaultItems.push({
      key: '1',
      label: (
        <div className="flex-center gap-8px">
          <SettingOutlined />
          {t('page.home.portalManagement')}
        </div>
      ),
      routeName: 'manage_user'
    });
  }
  const [items, setItems] = useState<any>(defaultItems);

  useEffect(() => {
    if (isMicroApp) {
      const cacheMenu = localStorage.getItem('menu');
      // const cacheMenu =
      //   '[{"id":350,"parentId":0,"menuName":"系统管理","menuPath":"/studio/system","menuType":0,"blank":0},{"id":351,"parentId":350,"menuName":"系统管理","menuPath":null,"menuType":0,"blank":0},{"id":352,"parentId":351,"menuName":"基础信息配置","menuPath":"/studio/system/baseinfo","menuType":0,"blank":0},{"id":355,"parentId":351,"menuName":"组织管理员管理","menuPath":"/studio/system/admin","menuType":0,"blank":0},{"id":356,"parentId":351,"menuName":"角色权限管理","menuPath":"/studio/system/role","menuType":0,"blank":0},{"id":400,"parentId":0,"menuName":"chatbi","menuPath":"/studio/chatbi","menuType":0,"blank":0},{"id":401,"parentId":400,"menuName":"门户首页","menuPath":"/studio/chatbi/home","menuType":0,"blank":0},{"id":402,"parentId":400,"menuName":"最近使用","menuPath":"/studio/chatbi/recently-used","menuType":0,"blank":0},{"id":403,"parentId":400,"menuName":"我的收藏","menuPath":"/studio/chatbi/my-collect","menuType":0,"blank":0},{"id":404,"parentId":400,"menuName":"我的分享","menuPath":"/studio/chatbi/share-manage/my-share","menuType":0,"blank":0},{"id":405,"parentId":400,"menuName":"空间菜单管理","menuPath":"/studio/chatbi/manage/menu","menuType":0,"blank":0},{"id":406,"parentId":400,"menuName":"空间角色管理","menuPath":"/studio/chatbi/manage/role","menuType":0,"blank":0},{"id":500,"parentId":0,"menuName":"数据挖掘","menuPath":"/studio/data-mining","menuType":0,"blank":0}]';
      const menuArr = JSON.parse(cacheMenu!);
      const manageMenus = portalManageMenus.filter((item: any) => {
        const cur = menuArr.find((menu: any) => menu.id === item.id);
        return cur && cur.menuPath.includes('/chatbi');
      });
      setOnenetPortalManageMenus(manageMenus);
      setItems((_items: any) => {
        const cloneItems = cloneDeep(_items);
        if (manageMenus && manageMenus.length) {
          cloneItems.splice(1, 1, {
            key: '1',
            label: (
              <div className="flex-center gap-8px">
                <SettingOutlined />
                系统管理
              </div>
            ),
            routeName: manageMenus[0].routeName
          });
        } else {
          cloneItems.splice(1, 1);
        }
        return cloneItems;
      });
    } else {
      setItems((_items: any) => {
        const cloneItems = cloneDeep(_items);
        cloneItems.push({
          type: 'divider'
        });
        cloneItems.push({
          key: '2',
          label: (
            <div className="flex-center gap-8px">
              <SvgIcon
                className="text-icon"
                icon="ph:sign-out"
              />
              {t('common.logout')}
            </div>
          )
        });
        return cloneItems;
      });
    }
  }, [setOnenetPortalManageMenus]);

  return token ? (
    <Dropdown
      menu={{ items, onClick }}
      placement="bottomRight"
      trigger={['click']}
    >
      <div>
        <ButtonIcon className="px-12px">
          <SvgIcon
            className="text-icon-large"
            icon="ph:user-circle"
          />

          <span className="text-16px font-medium">
            {isMicroApp ? window.qiankunStore?.state.userInfo?.userName : userInfo.userName}
          </span>
        </ButtonIcon>
      </div>
    </Dropdown>
  ) : (
    <Button onClick={loginOrRegister}>{t('page.login.common.loginOrRegister')}</Button>
  );
});

export default UserAvatar;
