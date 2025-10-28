/**
 * Namespace Api
 *
 * All backend api type
 */
declare namespace Api {
  namespace Common {
    /** common params of paginating */
    interface PaginatingCommonParams {
      /** current page number */
      pageNum: number;
      /** page size */
      pageSize: number;
      /** total count */
      total: number;
    }

    /** common params of paginating query list data */
    interface PaginatingQueryRecord<T = any> extends PaginatingCommonParams {
      data: T[];
    }

    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'pageNum' | 'pageSize'>;

    /**
     * enable status
     *
     * - "1": enabled
     * - "2": disabled
     */
    type EnableStatus = '0' | '1';

    /**
     * Permission Ranage
     *
     * - "1": 全部数据权限
     * - "2": 自定数据权限
     * - "3": 本部门数据权限
     * - "4": 本部门及以下数据权限
     * - "5": 仅本人数据权限
     */
    type PermissionRanage = '1' | '2' | '3' | '4' | '5';

    /** common record */
    type CommonRecord<T = any> = {
      /** record creator */
      createBy: string;
      /** record create time */
      createTime: string;
      /** record id */
      id: number;
      /** record status */
      status: EnableStatus | null;
      /** record updater */
      updateBy: string;
      /** record update time */
      updateTime: string;
    } & T;
  }

  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    interface LoginToken {
      access_token?: string;
      refresh_token?: string;
      token?: string;
      userId?: string;
    }

    interface UserInfo {
      buttons: string[];
      roles: string[];
      userId: string;
      userName: string;
    }
  }

  /**
   * namespace Route
   *
   * backend api module: "route"
   */
  namespace Route {
    type ElegantConstRoute = import('@elegant-router/types').ElegantConstRoute;

    interface MenuRoute extends ElegantConstRoute {
      id: string;
    }

    interface UserRoute {
      home: import('@elegant-router/types').LastLevelRouteKey;
      routes: MenuRoute[];
    }
  }

  /**
   * namespace SystemManage
   *
   * backend api module: "systemManage"
   */
  namespace SystemManage {
    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'pageNum' | 'pageSize'>;

    /** role */
    type Role = Common.CommonRecord<{
      /** role code */
      roleCode: string;
      /** role description */
      roleDesc: string;
      /** role name */
      roleName: string;
    }>;

    /** role search params */
    type RoleSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Role, 'roleCode' | 'roleName' | 'status'> & CommonSearchParams
    >;

    /** role list */
    type RoleList = Common.PaginatingQueryRecord<Role>;

    /** all role */
    type AllRole = Pick<Role, 'id' | 'roleCode' | 'roleName'>;

    /**
     * user gender
     *
     * - "1": "male"
     * - "2": "female"
     */
    type UserGender = '1' | '2';

    /** user */
    type User = Common.CommonRecord<{
      /** user nick name */
      nickName: string;
      operateTime: string;
      /** user email */
      userEmail: string;
      /** user gender */
      userGender: UserGender | null;
      /** user name */
      userName: string;
      /** user phone */
      userPhone: string;
      /** user role code collection */
      userRoles: string[];
    }>;

    /** user search params */
    type UserSearchParams = CommonType.RecordNullable<{ keyword: string } & CommonSearchParams>;

    /** user list */
    type UserList = Common.PaginatingQueryRecord<User>;

    /**
     * menu type
     *
     * - "1": directory
     * - "2": menu
     */
    // type MenuType = '1' | '2' | '3';
    type MenuType = '1' | '2';

    type MenuVisible = '0' | '1';

    type MenuCache = '0' | '1';

    type MenuButton = {
      /**
       * button code
       *
       * it can be used to control the button permission
       */
      code: string;
      /** button description */
      desc: string;
    };

    /**
     * icon type
     *
     * - "1": iconify icon
     * - "2": local icon
     */
    type IconType = '1' | '2';

    type MenuPropsOfRoute = Pick<
      import('@ohh-889/react-auto-route').RouteMeta,
      | 'activeMenu'
      | 'constant'
      | 'fixedIndexInTab'
      | 'hideInMenu'
      | 'href'
      | 'i18nKey'
      | 'keepAlive'
      | 'multiTab'
      | 'order'
      | 'query'
    >;

    type Menu = Common.CommonRecord<{
      /** buttons */
      buttons?: MenuButton[] | null;
      /** children menu */
      children?: Menu[] | null;
      /** component */
      component?: string;
      /** iconify icon name or local icon name */
      icon: string;
      /** icon type */
      iconType: IconType;
      /** menu name */
      menuName: string;
      /** menu type */
      menuType: MenuType;
      /** parent menu id */
      parentId: number;
      /** route name */
      routeName: string;
      /** route path */
      routePath: string;
    }> &
      MenuPropsOfRoute;

    /** menu list */
    type MenuList = Common.PaginatingQueryRecord<Menu>;

    type MenuTree = {
      children?: MenuTree[];
      id: number;
      label: string;
      pId: number;
    };
  }

  /**
   * namespace DataPreparation
   *
   * backend api module: "DataPreparation" todo
   */
  namespace DataPreparation {
    interface DatasourceConfigType {
      dbName: string;
      extraParams: string;
      host: string;
      part: string;
      password: string;
      userName: string;
    }

    interface DatasourceType {
      configuration: DatasourceConfigType;
      createBy: string;
      createTime: string;
      index: number;
      parentId: number;
      remark: string;
      sourceId: number;
      sourceName: string;
      sourceType: string;
      spaceId: number;
      status: string;
      updateBy: string;
      updateTime: string;
    }

    type DataSourceSearchParamsType = CommonType.RecordNullable<
      Pick<DatasourceType, 'sourceName' | 'spaceId'> & CommonSearchParams
    >;

    type DatasourceListType = Common.PaginatingQueryRecord<DatasourceType>;

    type validDataSource = Pick<DatasourceType, 'configuration' | 'sourceType'> &
      Partial<Pick<DatasourceType, 'sourceId' | 'sourceName' | 'spaceId'>>;

    type ConnectType = 'all' | 'inner' | 'left' | 'right';

    interface NodeType {
      children?: NodeType[];
      connect_type?: ConnectType;
      id: string;
      parent?: any[];
      tableName: string;
      uniqueId: string;
    }

    interface CalculatedParamsType {
      originName: string;
      tfieldId?: string;
      value: number;
    }

    type CommonSearchParams = Pick<Common.PaginatingCommonParams, 'pageNum' | 'pageSize'>;

    /** role */
    type Role = Common.CommonRecord<{
      /** role code */
      roleCode: string;
      /** role description */
      roleDesc: string;
      /** role name */
      roleName: string;
    }>;

    /** role search params */
    type RoleSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.Role, 'roleCode' | 'roleName' | 'status'> & CommonSearchParams
    >;

    /** role list */
    type RoleList = Common.PaginatingQueryRecord<Role>;

    /** all role */
    type AllRole = Pick<Role, 'id' | 'roleCode' | 'roleName'>;

    /**
     * user gender
     *
     * - "1": "male"
     * - "2": "female"
     */
    type UserGender = '1' | '2';

    /** user */
    type User = Common.CommonRecord<{
      /** user nick name */
      nickName: string;
      /** user email */
      userEmail: string;
      /** user gender */
      userGender: UserGender | null;
      /** user name */
      userName: string;
      /** user phone */
      userPhone: string;
      /** user role code collection */
      userRoles: string[];
    }>;

    /** user search params */
    type UserSearchParams = CommonType.RecordNullable<
      Pick<Api.SystemManage.User, 'nickName' | 'status' | 'userEmail' | 'userGender' | 'userName' | 'userPhone'> &
      CommonSearchParams
    >;

    /** user list */
    type UserList = Common.PaginatingQueryRecord<User>;

    /**
     * menu type
     *
     * - "1": directory
     * - "2": menu
     */
    type MenuType = '1' | '2';

    type MenuButton = {
      /**
       * button code
       *
       * it can be used to control the button permission
       */
      code: string;
      /** button description */
      desc: string;
    };

    /**
     * icon type
     *
     * - "1": iconify icon
     * - "2": local icon
     */
    type IconType = '1' | '2';

    type MenuPropsOfRoute = Pick<
      import('@ohh-889/react-auto-route').RouteMeta,
      | 'activeMenu'
      | 'constant'
      | 'fixedIndexInTab'
      | 'hideInMenu'
      | 'href'
      | 'i18nKey'
      | 'keepAlive'
      | 'multiTab'
      | 'order'
      | 'query'
    >;

    type Menu = Common.CommonRecord<{
      /** buttons */
      buttons?: MenuButton[] | null;
      /** children menu */
      children?: Menu[] | null;
      /** component */
      component?: string;
      /** iconify icon name or local icon name */
      icon: string;
      /** icon type */
      iconType: IconType;
      /** menu name */
      menuName: string;
      /** menu type */
      menuType: MenuType;
      /** parent menu id */
      parentId: number;
      /** route name */
      routeName: string;
      /** route path */
      routePath: string;
    }> &
      MenuPropsOfRoute;

    /** menu list */
    type MenuList = Common.PaginatingQueryRecord<Menu>;

    type MenuTree = {
      children?: MenuTree[];
      id: number;
      label: string;
      pId: number;
    };
  }
}
