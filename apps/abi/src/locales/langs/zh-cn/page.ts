const page: App.I18n.Schema['translation']['page'] = {
  // about: {
  //   devDep: '开发依赖',
  //   introduction: `SoybeanAdmin 是一个优雅且功能强大的后台管理模板，基于最新的前端技术栈，包括 React18.3, Vite5, TypeScript,ReactRouter6.4,Redux/toolkit 和 UnoCSS。它内置了丰富的主题配置和组件，代码规范严谨，实现了自动化的文件路由系统。此外，它还采用了基于 ApiFox 的在线Mock数据方案。SoybeanAdmin 为您提供了一站式的后台管理解决方案，无需额外配置，开箱即用。同样是一个快速学习前沿技术的最佳实践。`,
  //   prdDep: '生产依赖',
  //   projectInfo: {
  //     githubLink: 'Github 地址',
  //     latestBuildTime: '最新构建时间',
  //     previewLink: '预览地址',
  //     title: '项目信息',
  //     version: '版本'
  //   },
  //   title: '关于'
  // },
  dataPreparation: {
    dataCollection: {
      addCollection: '添加数据集',
      createTime: '创建时间',
      creator: '创建人',
      databaseAddress: '数据库地址',
      datasource: '数据源',
      editCollection: '数据集配置',
      form: {
        databaseAddress: '请输入数据库地址',
        datasource: '请选择数据源类型',
        name: '请输入名称',
        password: '请输入密码',
        port: '请输入端口',
        username: '请输入用户名'
      },
      keyword: '关键字',
      keywordPlaceholder: '请输入关键字',
      name: '名称',
      operateTime: '操作时间',
      operator: '操作人',
      password: '密码',
      port: '端口',
      testConnect: '测试连接',
      title: '数据源列表',
      username: '用户名'
    },
    dataSource: {
      addDatasource: '添加数据源',
      createTime: '创建时间',
      creator: '创建人',
      database: '数据库',
      databaseAddress: '数据库地址',
      editDatasource: '数据源配置',
      form: {
        database: '请输入数据库',
        databaseAddress: '请输入数据库地址',
        name: '请输入名称',
        password: '请输入密码',
        port: '请输入端口',
        type: '请选择数据源类型',
        username: '请输入用户名'
      },
      keyword: '关键字',
      keywordPlaceholder: '请输入关键字',
      name: '数据源名称',
      operateTime: '操作时间',
      operator: '操作人',
      password: '密码',
      port: '端口',
      testConnect: '测试连接',
      title: '数据源列表',
      type: '数据源类型',
      username: '用户名'
    }
  },
  // function: {
  //   multiTab: {
  //     backTab: '返回 function_tab',
  //     routeParam: '路由参数'
  //   },
  //   request: {
  //     repeatedError: '重复请求错误',
  //     repeatedErrorMsg1: '自定义请求错误 1',
  //     repeatedErrorMsg2: '自定义请求错误 2',
  //     repeatedErrorOccurOnce: '重复请求错误只出现一次'
  //   },
  //   tab: {
  //     tabOperate: {
  //       addMultiTab: '添加多标签页',
  //       addMultiTabDesc1: '跳转到多标签页页面',
  //       addMultiTabDesc2: '跳转到多标签页页面(带有查询参数)',
  //       addTab: '添加标签页',
  //       addTabDesc: '跳转到关于页面',
  //       closeAboutTab: '关闭"关于"标签页',
  //       closeCurrentTab: '关闭当前标签页',
  //       closeTab: '关闭标签页',
  //       title: '标签页操作'
  //     },
  //     tabTitle: {
  //       change: '修改',
  //       changeTitle: '修改标题',
  //       reset: '重置',
  //       resetTitle: '重置标题',
  //       title: '标签页标题'
  //     }
  //   },
  //   toggleAuth: {
  //     adminOrUserVisible: '管理员和用户可见',
  //     adminVisible: '管理员可见',
  //     authHook: '权限钩子函数 `hasAuth`',
  //     superAdminVisible: '超级管理员可见',
  //     toggleAccount: '切换账号'
  //   }
  // },
  home: {
    aiBot: '智能助手',
    aiChat: '智能对话',
    creativity: '创意',
    dataAssets: '数据资产',
    dataColletion: '数据集',
    dataSource: '数据源',
    dealCount: '成交量',
    downloadCount: '下载量',
    entertainment: '娱乐',
    greeting: '早安，{{userName}}, 今天又是充满活力的一天!',
    message: '消息',
    mySpace: '我的空间',
    noSpaceRoleTips: '请先创建空间创建者角色，再创建空间!',
    portalManagement: '门户管理',
    projectCount: '项目数',
    projectNews: {
      desc1: 'Soybean 在2021年5月28日创建了开源项目 soybean-admin!',
      desc2: 'Yanbowe 向 soybean-admin 提交了一个bug，多标签栏不会自适应。',
      desc3: 'Soybean 准备为 soybean-admin 的发布做充分的准备工作!',
      desc4: 'Soybean 正在忙于为soybean-admin写项目说明文档！',
      desc5: 'Soybean 刚才把工作台页面随便写了一些，凑合能看了！',
      moreNews: '更多动态',
      title: '项目动态'
    },
    registerCount: '注册量',
    rest: '休息',
    schedule: '作息安排',
    study: '学习',
    todo: '待办',
    turnover: '成交额',
    visitCount: '访问量',
    weatherDesc: '今日多云转晴，20℃ - 25℃!',
    work: '工作'
  },
  login: {
    bindWeChat: {
      title: '绑定微信'
    },
    codeLogin: {
      getCode: '获取验证码',
      imageCodePlaceholder: '请输入图片验证码',
      reGetCode: '{{time}}秒后重新获取',
      sendCodeSuccess: '验证码发送成功',
      title: '验证码登录'
    },
    common: {
      back: '返回',
      cancel: '取消',
      codeLogin: '验证码登录',
      codePlaceholder: '请输入验证码',
      confirm: '确定',
      confirmPasswordPlaceholder: '请再次输入密码',
      incorrectUsernameOrPassword: '用户名或密码错误',
      loginOrRegister: '登录 / 注册',
      loginSuccess: '登录成功',
      passwordPlaceholder: '请输入密码',
      phonePlaceholder: '请输入手机号',
      userNamePlaceholder: '请输入用户名',
      validateSuccess: '验证成功',
      welcomeBack: '欢迎回来，{{userName}} ！'
    },
    pwdLogin: {
      admin: '管理员',
      forgetPassword: '忘记密码？',
      otherAccountLogin: '其他账号登录',
      otherLoginMode: '其他登录方式',
      register: '注册账号',
      rememberMe: '记住我',
      superAdmin: '超级管理员',
      title: '密码登录',
      user: '普通用户',
      captchaError: '验证码错误'
    },
    register: {
      agreement: '我已经仔细阅读并接受',
      policy: '《隐私权政策》',
      protocol: '《用户协议》',
      title: '注册账号'
    },
    resetPwd: {
      title: '重置密码'
    }
  },
  manage: {
    common: {
      add: '新增',
      back: '返回',
      beginTime: '开始日期',
      clear: '清除',
      createTime: '创建时间',
      delete: '删除',
      edit: '编辑',
      email: '邮箱',
      endTime: '结束日期',
      export: '导出',
      form: {
        checkEmail: '请输入正确的邮箱地址',
        checkPhone: '请输入正确的手机号码',
        email: '请输入邮箱地址',
        remark: '请输入备注',
        status: '请选择状态'
      },
      import: '导入',
      order: '序号',
      remark: '备注',
      sort: '排序',
      status: {
        disable: '禁用',
        enable: '启用'
      },
      submit: '提交'
    },
    dept: {
      addDept: '新增部门',
      deptName: '部门名称',
      editDept: '编辑部门',
      email: '邮箱',
      form: {
        checkEmail: '请输入正确的邮箱地址',
        checkPhone: '请输入正确的手机号码',
        deptName: '请输入部门名称',
        email: '请输入邮箱',
        leader: '请输入负责人',
        orderNum: '请输入显示排序',
        parentId: '请选择上级部门',
        phone: '请输入联系电话'
      },
      leader: '负责人',
      orderNum: '显示排序',
      parentId: '上级部门',
      phone: '联系电话',
      status: '状态',
      title: '机构列表'
    },
    menu: {
      activeMenu: '高亮的菜单',
      addChildMenu: '新增子菜单',
      addMenu: '新增菜单',
      button: '按钮',
      buttonCode: '按钮编码',
      buttonDesc: '按钮描述',
      componentPath: '组件路径',
      constant: '常量路由',
      createTime: '创建时间',
      editMenu: '编辑菜单',
      fixedIndexInTab: '固定在页签中的序号',
      form: {
        activeMenu: '请选择高亮的菜单的路由名称',
        button: '请选择是否按钮',
        buttonCode: '请输入按钮编码',
        buttonDesc: '请输入按钮描述',
        component: '请输入组件路径',
        fixedIndexInTab: '请输入固定在页签中的序号',
        fixedInTab: '请选择是否固定在页签中',
        hideInMenu: '请选择是否隐藏菜单',
        home: '请选择首页',
        href: '请输入外链',
        i18nKey: '请输入国际化key',
        icon: '请输入图标',
        keepAlive: '请选择是否缓存路由',
        layout: '请选择布局组件',
        localIcon: '请选择本地图标',
        menuName: '请输入菜单名称',
        menuStatus: '请选择角色状态',
        menuType: '请选择菜单类型',
        multiTab: '请选择是否支持多标签',
        noMatchIcon: '没有找到匹配的图标',
        order: '请输入排序',
        orderNum: '',
        page: '请选择页面组件',
        parent: '请选择父级菜单',
        parentId: '请选择上级菜单',
        parentName: '请选择上级菜单',
        pathParam: '请输入路径参数',
        perms: '请输入权限字符',
        queryKey: '请输入路由参数Key',
        queryValue: '请输入路由参数Value',
        results: '个结果',
        routeName: '请输入路由名称',
        routePath: '请输入路由路径',
        searchIcon: '搜索图标'
      },
      hideInMenu: '隐藏菜单',
      home: '首页',
      href: '外链',
      i18nKey: '国际化key',
      icon: '图标',
      iconType: {
        iconify: 'iconify图标',
        local: '本地图标'
      },
      iconTypeTitle: '图标类型',
      id: 'ID',
      isCache: '是否缓存',
      isFrame: '是否外链',
      keepAlive: '缓存路由',
      layout: '布局',
      localIcon: '本地图标',
      menuCache: {
        cache: '缓存',
        donotcache: '不缓存'
      },
      menuName: '菜单名称',
      menuStatus: '角色状态',
      menuType: '菜单类型',
      multiTab: '支持多页签',
      order: '排序',
      page: '页面组件',
      parent: '父级菜单',
      parentId: '父级菜单ID',
      pathParam: '路径参数',
      permission: '权限标识',
      perms: '权限字符',
      query: '路由参数',
      routeName: '路由名称',
      routePath: '路由地址',
      status: '状态',
      title: '菜单列表',
      type: {
        button: '按钮',
        directory: '目录',
        menu: '菜单'
      },
      visible: '显示状态'
    },
    post: {
      form: {
        postCode: '请输入岗位编码',
        postName: '请输入岗位名称',
        postSort: '请输入岗位顺序',
        remark: '请输入备注'
      },
      postCode: '岗位编码',
      postId: '岗位编号',
      postList: '岗位列表',
      postName: '岗位名称',
      postSort: '岗位排序',
      status: '状态'
    },
    role: {
      addRole: '新增角色',
      addUser: '添加用户',
      assignDataPermissions: '分配数据权限',
      assigningUsers: '分配用户',
      batchAssignDataPermissions: '批量取消授权',
      buttonAuth: '按钮权限',
      cancelAuthorization: '取消授权',
      createTime: '创建时间',
      dataPermissions: '数据权限',
      editRole: '编辑角色',
      form: {
        permissionRange: '请选择权限范围',
        remark: '请输入备注',
        roleCode: '请输入角色编码',
        roleDesc: '请输入角色描述',
        roleKey: '请输入权限字符',
        roleName: '请输入角色名称',
        roleSort: '请输入显示顺序',
        roleStatus: '请选择角色状态'
      },
      isCancelAuthorization: '确认取消授权吗',
      isDisabledRole: '确认要"停用"该角色吗？',
      isEnableRole: '确认要"启用"该角色吗？',
      menuAuth: '菜单权限',
      order: '角色编号',
      permission: '权限字符',
      permissionRange: '权限范围',
      permissionRangeMap: {
        all: '全部数据权限',
        custom: '自定数据权限',
        department: '本部门数据权限',
        departmentAndBelow: '本部门及以下数据权限',
        myself: '仅本人数据权限'
      },
      remark: '备注',
      roleCode: '角色编码',
      roleDesc: '角色描述',
      roleName: '角色名称',
      roleSort: '显示顺序',
      roleStatus: '角色状态',
      selectUser: '选择用户',
      status: '角色状态',
      title: '角色列表'
    },
    spaceRole: {
      spaceRole: '空间角色',
      title: '空间角色列表'
    },
    user: {
      addUser: '新增用户',
      assigningRole: '分配角色',
      basicInformation: '基本信息',
      dept: '部门',
      deptId: '归属部门',
      editUser: '编辑用户',
      form: {
        deptId: '请选择归属部门',
        nickName: '请输入昵称',
        password: '请输入用户密码',
        phonenumber: '请输入手机号码',
        post: '请选择岗位',
        remark: '请输入备注',
        userEmail: '请输入邮箱',
        userGender: '请选择性别',
        userName: '请输入用户名',
        userPhone: '请输入手机号',
        userRole: '请选择用户角色',
        userSex: '请选择用户性别',
        userStatus: '请选择用户状态'
      },
      gender: {
        female: '女',
        male: '男'
      },
      isDisabledUser: '确认要"禁用"该用户吗？',
      isEnableUser: '确认要"启用"该用户吗？',
      loginAccount: '登录账号',
      nickName: '用户昵称',
      organization: '组织',
      password: '用户密码',
      phonenumber: '手机号码',
      post: '岗位',
      resetPassword: '重置密码',
      roleInformation: '角色信息',
      title: '用户列表',
      userEmail: '邮箱',
      userGender: '性别',
      userId: '用户编号',
      userName: '用户账号',
      userPhone: '手机号',
      userRole: '用户角色',
      userSex: '用户性别',
      userStatus: '用户状态'
    },
    userDetail: {
      content: `loader 会让网络请求跟懒加载的文件几乎一起发出请求 然后 一边解析懒加载的文件 一边去等待 网络请求
        待到网络请求完成页面 一起显示 配合react的fiber架构 可以做到 用户如果嫌弃等待时间较长 在等待期间用户可以去
        切换不同的页面 这是react 框架和react-router数据路由器的优势 而不用非得等到 页面的显现 而不是常规的
        请求懒加载的文件 - 解析 - 请求懒加载的文件 - 挂载之后去发出网络请求 - 然后渲染页面 - 渲染完成
        还要自己加loading效果`,
      explain: '这个页面仅仅是为了展示 react-router-dom 的 loader 的强大能力，数据是随机的对不上很正常'
    },
    skill: {
      title: '技能管理',
      subtitle: '管理你发布到空间的技能包，点击卡片查看详情或发布新版本。',
      publish: '安装技能',
      empty: '暂无技能，点击【安装技能】发布您的第一个技能',
      view: '查看',
      downloads: '下载量',
      detailComingSoon: '详情页即将上线',
      deleteConfirmTitle: '确认删除该技能？',
      deleteConfirmContent: '删除后将无法恢复，技能「{{name}}」的所有版本都会被移除。',
      filter: {
        all: '全部',
        published: '启用',
        hidden: '隐藏'
      },
      status: {
        published: '启用',
        hidden: '隐藏',
        archived: '已归档',
        review: '审核中',
        rejected: '已驳回',
        scanning: '扫描中'
      },
      publishPage: {
        back: '返回技能列表',
        heroTitle: '安装新技能',
        heroDesc: '选择归属空间，上传技能 ZIP 包，一键发布',
        namespace: '归属空间',
        namespacePh: '请选择空间',
        namespaceRequired: '请选择要发布到的空间',
        version: '版本号',
        versionPh: '例如：1.0.0（可选，留空则由后端自动分配）',
        changelog: '版本说明',
        changelogPh: '简要描述本次变更内容（可选）',
        skillPackage: '技能包（ZIP）',
        dropOrClick: '点击或拖拽 ZIP 包到此处上传',
        zipHint: '仅支持 .zip 格式，文件最大 100MB',
        clickToReplace: '点击重新选择',
        onlyZip: '只支持 ZIP 格式的技能包',
        tooLarge: '文件大小超过 100MB，请压缩后重试',
        fileRequired: '请先选择要上传的技能包',
        submit: '发布',
        success: '发布成功',
        failed: '发布失败，请稍后重试'
      }
    }
  },
  mySpace: {
    addNewSpace: '新增空间',
    searchPlaceholder: '请输入关键字进行搜索'
  },
  system: {
    common: {
      add: '新增',
      back: '返回',
      beginTime: '开始日期',
      createTime: '创建时间',
      delete: '删除',
      edit: '编辑',
      email: '邮箱',
      endTime: '结束日期',
      export: '导出',
      form: {
        checkEmail: '请输入正确的邮箱地址',
        checkPhone: '请输入正确的手机号码',
        email: '请输入邮箱地址',
        remark: '请输入备注',
        status: '请选择状态'
      },
      import: '导入',
      order: '序号',
      remark: '备注',
      sort: '排序',
      status: {
        disable: '禁用',
        enable: '启用'
      },
      submit: '提交'
    },
    dept: {
      addDept: '新增部门',
      deptName: '部门名称',
      editDept: '编辑部门',
      email: '邮箱',
      form: {
        checkEmail: '请输入正确的邮箱地址',
        checkPhone: '请输入正确的手机号码',
        deptName: '请输入部门名称',
        email: '请输入邮箱',
        leader: '请输入负责人',
        orderNum: '请输入显示排序',
        parentId: '请选择上级部门',
        phone: '请输入联系电话'
      },
      leader: '负责人',
      orderNum: '显示排序',
      parentId: '上级部门',
      phone: '联系电话',
      status: '状态',
      title: '部门列表'
    },
    menu: {
      activeMenu: '高亮的菜单',
      addChildMenu: '新增子菜单',
      addMenu: '新增菜单',
      button: '按钮',
      buttonCode: '按钮编码',
      buttonDesc: '按钮描述',
      componentPath: '组件路径',
      constant: '常量路由',
      createTime: '创建时间',
      editMenu: '编辑菜单',
      fixedIndexInTab: '固定在页签中的序号',
      form: {
        activeMenu: '请选择高亮的菜单的路由名称',
        button: '请选择是否按钮',
        buttonCode: '请输入按钮编码',
        buttonDesc: '请输入按钮描述',
        component: '请输入组件路径',
        fixedIndexInTab: '请输入固定在页签中的序号',
        fixedInTab: '请选择是否固定在页签中',
        hideInMenu: '请选择是否隐藏菜单',
        home: '请选择首页',
        href: '请输入外链',
        i18nKey: '请输入国际化key',
        icon: '请输入图标',
        keepAlive: '请选择是否缓存路由',
        layout: '请选择布局组件',
        localIcon: '请选择本地图标',
        menuName: '请输入菜单名称',
        menuStatus: '请选择菜单状态',
        menuType: '请选择菜单类型',
        multiTab: '请选择是否支持多标签',
        order: '请输入排序',
        orderNum: '',
        page: '请选择页面组件',
        parent: '请选择父级菜单',
        parentId: '请选择上级菜单',
        parentName: '请选择上级菜单',
        pathParam: '请输入路径参数',
        perms: '请输入权限字符',
        queryKey: '请输入路由参数Key',
        queryValue: '请输入路由参数Value',
        routeName: '请输入路由名称',
        routePath: '请输入路由路径'
      },
      hideInMenu: '隐藏菜单',
      home: '首页',
      href: '外链',
      i18nKey: '国际化key',
      icon: '图标',
      iconType: {
        iconify: 'iconify图标',
        local: '本地图标'
      },
      iconTypeTitle: '图标类型',
      id: 'ID',
      isCache: '是否缓存',
      isFrame: '是否外链',
      keepAlive: '缓存路由',
      layout: '布局',
      localIcon: '本地图标',
      menuCache: {
        cache: '缓存',
        donotcache: '不缓存'
      },
      menuName: '菜单名称',
      menuStatus: '菜单状态',
      menuType: '菜单类型',
      multiTab: '支持多页签',
      order: '排序',
      page: '页面组件',
      parent: '父级菜单',
      parentId: '父级菜单ID',
      pathParam: '路径参数',
      permission: '权限标识',
      perms: '权限字符',
      query: '路由参数',
      routeName: '路由名称',
      routePath: '路由地址',
      status: '状态',
      title: '菜单列表',
      type: {
        button: '按钮',
        directory: '目录',
        menu: '菜单'
      },
      visible: '显示状态'
    },
    post: {
      form: {
        postCode: '请输入岗位编码',
        postName: '请输入岗位名称',
        postSort: '请输入岗位顺序',
        remark: '请输入备注'
      },
      postCode: '岗位编码',
      postId: '岗位编号',
      postList: '岗位列表',
      postName: '岗位名称',
      postSort: '岗位排序',
      status: '状态'
    },
    role: {
      addRole: '新增角色',
      addUser: '添加用户',
      assignDataPermissions: '分配数据权限',
      assigningUsers: '分配用户',
      batchAssignDataPermissions: '批量取消授权',
      buttonAuth: '按钮权限',
      cancelAuthorization: '取消授权',
      createTime: '创建时间',
      dataPermissions: '数据权限',
      editRole: '编辑角色',
      form: {
        permissionRange: '请选择权限范围',
        remark: '请输入备注',
        roleCode: '请输入角色编码',
        roleDesc: '请输入角色描述',
        roleKey: '请输入权限字符',
        roleName: '请输入角色名称',
        roleSort: '请输入显示顺序',
        roleStatus: '请选择角色状态'
      },
      isCancelAuthorization: '确认取消授权吗',
      isDisabledRole: '确认要"停用"该角色吗？',
      isEnableRole: '确认要"启用"该角色吗？',
      menuAuth: '菜单权限',
      order: '角色编号',
      permission: '权限字符',
      permissionRange: '权限范围',
      permissionRangeMap: {
        all: '全部数据权限',
        custom: '自定数据权限',
        department: '本部门数据权限',
        departmentAndBelow: '本部门及以下数据权限',
        myself: '仅本人数据权限'
      },
      remark: '备注',
      roleCode: '角色编码',
      roleDesc: '角色描述',
      roleName: '角色名称',
      roleSort: '显示顺序',
      roleStatus: '角色状态',
      selectUser: '选择用户',
      status: '状态',
      title: '角色列表'
    },
    spaceRole: {
      title: '空间角色列表'
    },
    user: {
      addUser: '新增用户',
      assigningRole: '分配角色',
      basicInformation: '基本信息',
      dept: '部门',
      deptId: '归属部门',
      editUser: '编辑用户',
      form: {
        deptId: '请选择归属部门',
        nickName: '请输入昵称',
        password: '请输入用户密码',
        phonenumber: '请输入手机号码',
        post: '请选择岗位',
        remark: '请输入备注',
        userEmail: '请输入邮箱',
        userGender: '请选择性别',
        userName: '请输入用户名',
        userPhone: '请输入手机号',
        userRole: '请选择用户角色',
        userSex: '请选择用户性别',
        userStatus: '请选择用户状态'
      },
      gender: {
        female: '女',
        male: '男'
      },
      isDisabledUser: '确认要"禁用"该用户吗？',
      isEnableUser: '确认要"启用"该用户吗？',
      loginAccount: '登录账号',
      nickName: '用户昵称',
      password: '用户密码',
      phonenumber: '手机号码',
      post: '岗位',
      resetPassword: '重置密码',
      roleInformation: '角色信息',
      title: '用户列表',
      userEmail: '邮箱',
      userGender: '性别',
      userId: '用户编号',
      userName: '用户名称',
      userPhone: '手机号',
      userRole: '用户角色',
      userSex: '用户性别',
      userStatus: '用户状态'
    },
    userDetail: {
      content: `loader 会让网络请求跟懒加载的文件几乎一起发出请求 然后 一边解析懒加载的文件 一边去等待 网络请求
        待到网络请求完成页面 一起显示 配合react的fiber架构 可以做到 用户如果嫌弃等待时间较长 在等待期间用户可以去
        切换不同的页面 这是react 框架和react-router数据路由器的优势 而不用非得等到 页面的显现 而不是常规的
        请求懒加载的文件 - 解析 - 请求懒加载的文件 - 挂载之后去发出网络请求 - 然后渲染页面 - 渲染完成
        还要自己加loading效果`,
      explain: '这个页面仅仅是为了展示 react-router-dom 的 loader 的强大能力，数据是随机的对不上很正常'
    }
  }
};

export default page;
