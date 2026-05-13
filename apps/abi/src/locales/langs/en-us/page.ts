const page: App.I18n.Schema['translation']['page'] = {
  // about: {
  //   devDep: 'Development Dependency',
  //   introduction: `SoybeanAdmin is an elegant and powerful admin template, based on the latest front-end technology stack, including React18.3, Vite5, TypeScript, ReactRouter6.4,Redux/toolkitand UnoCSS. It has built-in rich theme configuration and components, strict code specifications, and an automated file routing system. In addition, it also uses the online mock data solution based on ApiFox. SoybeanAdmin provides you with a one-stop admin solution, no additional configuration, and out of the box. It is also a best practice for learning cutting-edge technologies quickly.`,
  //   prdDep: 'Production Dependency',
  //   projectInfo: {
  //     githubLink: 'Github Link',
  //     latestBuildTime: 'Latest Build Time',
  //     previewLink: 'Preview Link',
  //     title: 'Project Info',
  //     version: 'Version'
  //   },
  //   title: 'About'
  // },
  dataPreparation: {
    dataCollection: {
      addCollection: 'Add Collection',
      createTime: 'Create Time',
      creator: 'Creator',
      databaseAddress: 'Database Address',
      datasource: 'Datasource',
      editCollection: 'Edit Collection',
      form: {
        databaseAddress: 'Please input database address',
        datasource: 'Please select datasource',
        name: 'Please input table name',
        password: 'Please input password',
        port: 'Please input port',
        username: 'Please input username'
      },
      keyword: 'keyword',
      keywordPlaceholder: 'Please input keyword',
      name: 'Name',
      operateTime: 'Operate Time',
      operator: 'Operator',
      password: 'Password',
      port: 'port',
      testConnect: 'Test Connect',
      title: 'Data Source List',
      username: 'Username'
    },
    dataSource: {
      addDatasource: 'Add Datasource',
      createTime: 'Create Time',
      creator: 'Creator',
      database: 'database',
      databaseAddress: 'Database Address',
      editDatasource: 'Edit Datasource',
      form: {
        database: 'database',
        databaseAddress: 'Please input database address',
        name: 'Please input table name',
        password: 'Please input password',
        port: 'Please input port',
        type: 'Please select database type',
        username: 'Please input username'
      },
      keyword: 'keyword',
      keywordPlaceholder: 'Please input keyword',
      name: 'Name',
      operateTime: 'Operate Time',
      operator: 'Operator',
      password: 'Password',
      port: 'port',
      testConnect: 'Test Connect',
      title: 'Data Source List',
      type: 'Data Source Type',
      username: 'Username'
    }
  },
  // function: {
  //   multiTab: {
  //     backTab: 'Back function_tab',
  //     routeParam: 'Route Param'
  //   },
  //   request: {
  //     repeatedError: 'Repeated Request Error',
  //     repeatedErrorMsg1: 'Custom Request Error 1',
  //     repeatedErrorMsg2: 'Custom Request Error 2',
  //     repeatedErrorOccurOnce: 'Repeated Request Error Occurs Once'
  //   },
  //   tab: {
  //     tabOperate: {
  //       addMultiTab: 'Add Multi Tab',
  //       addMultiTabDesc1: 'To MultiTab page',
  //       addMultiTabDesc2: 'To MultiTab page(with query params)',
  //       addTab: 'Add Tab',
  //       addTabDesc: 'To about page',
  //       closeAboutTab: 'Close "About" Tab',
  //       closeCurrentTab: 'Close Current Tab',
  //       closeTab: 'Close Tab',
  //       title: 'Tab Operation'
  //     },
  //     tabTitle: {
  //       change: 'Change',
  //       changeTitle: 'Change Title',
  //       reset: 'Reset',
  //       resetTitle: 'Reset Title',
  //       title: 'Tab Title'
  //     }
  //   },
  //   toggleAuth: {
  //     adminOrUserVisible: 'Admin and User Visible',
  //     adminVisible: 'Admin Visible',
  //     authHook: 'Auth Hook Function `hasAuth`',
  //     superAdminVisible: 'Super Admin Visible',
  //     toggleAccount: 'Toggle Account'
  //   }
  // },
  home: {
    aiBot: 'AI Bot',
    aiChat: 'AI Chat',
    creativity: 'Creativity',
    dataAssets: 'Data Assets',
    dataColletion: 'Data Collection',
    dataSource: 'Data Source',
    dealCount: 'Deal Count',
    downloadCount: 'Download Count',
    entertainment: 'Entertainment',
    greeting: 'Good morning, {{userName}}, today is another day full of vitality!',
    message: 'Message',
    mySpace: 'My Space',
    noSpaceRoleTips: 'Please create the space creator role first, and then create the space!',
    portalManagement: 'Portal Management',
    projectCount: 'Project Count',
    projectNews: {
      desc1: 'Soybean created the open source project soybean-admin on May 28, 2021!',
      desc2: 'Yanbowe submitted a bug to soybean-admin, the multi-tab bar will not adapt.',
      desc3: 'Soybean is ready to do sufficient preparation for the release of soybean-admin!',
      desc4: 'Soybean is busy writing project documentation for soybean-admin!',
      desc5: 'Soybean just wrote some of the workbench pages casually, and it was enough to see!',
      moreNews: 'More News',
      title: 'Project News'
    },
    registerCount: 'Register Count',
    rest: 'Rest',
    schedule: 'Work and rest Schedule',
    study: 'Study',
    todo: 'Todo',
    turnover: 'Turnover',
    visitCount: 'Visit Count',
    weatherDesc: 'Today is cloudy to clear, 20℃ - 25℃!',
    work: 'Work'
  },
  login: {
    bindWeChat: {
      title: 'Bind WeChat'
    },
    codeLogin: {
      getCode: 'Get verification code',
      imageCodePlaceholder: 'Please enter image verification code',
      reGetCode: 'Reacquire after {{time}}s',
      sendCodeSuccess: 'Verification code sent successfully',
      title: 'Verification Code Login'
    },
    common: {
      back: 'Back',
      cancel: 'Cancel',
      codeLogin: 'Verification code login',
      codePlaceholder: 'Please enter verification code',
      confirm: 'Confirm',
      confirmPasswordPlaceholder: 'Please enter password again',
      incorrectUsernameOrPassword: 'Incorrect username or password',
      loginOrRegister: 'Login / Register',
      loginSuccess: 'Login successfully',
      passwordPlaceholder: 'Please enter password',
      phonePlaceholder: 'Please enter phone number',
      userNamePlaceholder: 'Please enter user name',
      validateSuccess: 'Verification passed',
      welcomeBack: 'Welcome back, {{userName}} !'
    },
    pwdLogin: {
      admin: 'Admin',
      forgetPassword: 'Forget password?',
      otherAccountLogin: 'Other Account Login',
      otherLoginMode: 'Other Login Mode',
      register: 'Register',
      rememberMe: 'Remember me',
      superAdmin: 'Super Admin',
      title: 'Password Login',
      user: 'User',
      captchaError: 'Captcha code error'
    },
    register: {
      agreement: 'I have read and agree to',
      policy: '《Privacy Policy》',
      protocol: '《User Agreement》',
      title: 'Register'
    },
    resetPwd: {
      title: 'Reset Password'
    }
  },
  manage: {
    common: {
      add: 'Add',
      back: 'Go Back',
      beginTime: 'Begin Time',
      clear: 'Clear',
      createTime: 'Create Time',
      delete: 'Delete',
      edit: 'Edit',
      email: 'Email',
      endTime: 'End Time',
      export: 'Export',
      form: {
        checkEmail: 'Please enter the correct email address',
        checkPhone: 'Please enter the correct phone number',
        email: 'Please enter email',
        remark: 'Please enter remark',
        status: 'Please select status'
      },
      import: 'Import',
      order: 'Order',
      remark: 'Remark',
      sort: 'Sort',
      status: {
        disable: 'Disable',
        enable: 'Enable'
      },
      submit: 'Submit'
    },
    dept: {
      addDept: 'Add Department',
      deptName: 'Department Name',
      editDept: 'Edit Department',
      email: 'Email',
      form: {
        checkEmail: 'Please enter the correct email address',
        checkPhone: 'Please enter the correct phone number',
        deptName: 'Please enter department name',
        email: 'Please enter email',
        leader: 'Please enter leader',
        orderNum: 'Please enter display sort',
        parentId: 'Please select superior department',
        phone: 'Please enter phone'
      },
      leader: 'Leader',
      orderNum: 'Display sort',
      parentId: 'Superior department',
      phone: 'Phone',
      status: 'Status',
      title: 'Department List'
    },
    menu: {
      activeMenu: 'Active Menu',
      addChildMenu: 'Add Child Menu',
      addMenu: 'Add Menu',
      button: 'Button',
      buttonCode: 'Button Code',
      buttonDesc: 'Button Desc',
      componentPath: 'Conponent Path',
      constant: 'Constant',
      createTime: 'Create Time',
      editMenu: 'Edit Menu',
      fixedIndexInTab: 'Fixed Index In Tab',
      form: {
        activeMenu: 'Please select route name of the highlighted menu',
        button: 'Please select whether it is a button',
        buttonCode: 'Please enter button code',
        buttonDesc: 'Please enter button description',
        component: 'Please enter component path',
        fixedIndexInTab: 'Please enter the index fixed in the tab',
        fixedInTab: 'Please select whether to fix in the tab',
        hideInMenu: 'Please select whether to hide menu',
        home: 'Please select home',
        href: 'Please enter href',
        i18nKey: 'Please enter i18n key',
        icon: 'Please enter iconify name',
        keepAlive: 'Please select whether to cache route',
        layout: 'Please select layout component',
        localIcon: 'Please enter local icon name',
        menuName: 'Please enter menu name',
        menuStatus: 'Please select menu status',
        menuType: 'Please select menu type',
        multiTab: 'Please select whether to support multiple tabs',
        noMatchIcon: 'No matching icon found',
        order: 'Please enter order',
        orderNum: '',
        page: 'Please select page component',
        parent: 'Please select whether to parent menu',
        parentId: '',
        parentName: '',
        pathParam: 'Please enter path param',
        perms: 'Please enter route path permission characters',
        queryKey: 'Please enter route parameter Key',
        queryValue: 'Please enter route parameter Value',
        results: ' results',
        routeName: 'Please enter route name',
        routePath: 'Please enter route path',
        searchIcon: 'Please search icon'
      },
      hideInMenu: 'Hide In Menu',
      home: 'Home',
      href: 'Href',
      i18nKey: 'I18n Key',
      icon: 'Icon',
      iconType: {
        iconify: 'Iconify Icon',
        local: 'Local Icon'
      },
      iconTypeTitle: 'Icon Type',
      id: 'ID',
      isCache: 'Cache',
      isFrame: 'External links',
      keepAlive: 'Keep Alive',
      layout: 'Layout Component',
      localIcon: 'Local Icon',
      menuCache: {
        cache: 'cache',
        donotcache: 'do not cache'
      },
      menuName: 'Menu Name',
      menuStatus: 'Menu Status',
      menuType: 'Menu Type',
      multiTab: 'Multi Tab',
      order: 'Order',
      page: 'Page Component',
      parent: 'Parent Menu',
      parentId: 'Parent ID',
      pathParam: 'Path Param',
      permission: 'Permission identification',
      perms: 'Permission Characters',
      query: 'Query Params',
      routeName: 'Route Name',
      routePath: 'Route Path',
      status: 'Status',
      title: 'Menu List',
      type: {
        button: 'Button',
        directory: 'Directory',
        menu: 'Menu'
      },
      visible: 'DIsplay Status'
    },
    post: {
      form: {
        postCode: 'Please enter post code',
        postName: 'Please enter post name',
        postSort: 'Please enter post sort',
        remark: 'Please enter remark'
      },
      postCode: 'Post Code',
      postId: 'Post Id',
      postList: 'Post List',
      postName: 'Post Name',
      postSort: 'Post Sort',
      status: 'Status'
    },
    role: {
      addRole: 'Add Role',
      addUser: 'Add User',
      assignDataPermissions: 'Assign Data Permissions',
      assigningUsers: 'Assigning Users',
      batchAssignDataPermissions: 'Batch Cancel Authorization',
      buttonAuth: 'Button Auth',
      cancelAuthorization: 'Cancel Authorization',
      createTime: 'Create Time',
      dataPermissions: 'Data Permissions',
      editRole: 'Edit Role',
      form: {
        permissionRange: 'Please select permission range',
        remark: 'Please enter remark',
        roleCode: 'Please enter role code',
        roleDesc: 'Please enter role description',
        roleKey: 'Please enter role key',
        roleName: 'Please enter role name',
        roleSort: 'Please enter role sort',
        roleStatus: 'Please select role status'
      },
      isCancelAuthorization: 'Are you sure you want to cancel the authorization',
      isDisabledRole: 'Are you sure you want to "disable" this role?',
      isEnableRole: 'Are you sure you want to "enable" this role?',
      menuAuth: 'Menu Auth',
      order: 'Role Number',
      permission: 'Permission characters',
      permissionRange: 'Permission Ranage',
      permissionRangeMap: {
        all: 'All data permissions',
        custom: 'Customize data permissions',
        department: 'Data permissions for this department',
        departmentAndBelow: 'Data permissions for this department and below',
        myself: 'Only have personal data permissions'
      },
      remark: 'Remark',
      roleCode: 'Role Code',
      roleDesc: 'Role Description',
      roleName: 'Role Name',
      roleSort: 'Role Sort',
      roleStatus: 'Role Status',
      selectUser: 'Select User',
      status: 'Status',
      title: 'Role List'
    },
    spaceRole: {
      spaceRole: 'Space Role',
      title: 'Space Role List'
    },
    user: {
      addUser: 'Add User',
      assigningRole: 'Assigning Role',
      basicInformation: 'Basic Information',
      dept: 'Department',
      deptId: 'Department',
      editUser: 'Edit User',
      form: {
        deptId: 'Please select department',
        nickName: 'Please enter nick name',
        password: 'Please enter user password',
        phonenumber: 'Please enter phone number',
        post: 'Please select post',
        remark: 'Please enter remark',
        userEmail: 'Please enter email',
        userGender: 'Please select gender',
        userName: 'Please enter user name',
        userPhone: 'Please enter phone number',
        userRole: 'Please select user role',
        userSex: 'Please select uer sex',
        userStatus: 'Please select user status'
      },
      gender: {
        female: 'Female',
        male: 'Male'
      },
      isDisabledUser: 'Are you sure you want to "disable" this user?',
      isEnableUser: 'Are you sure you want to "enable" this user?',
      loginAccount: 'Login Account',
      nickName: 'Nick Name',
      organization: 'Organization',
      password: 'User Password',
      phonenumber: 'Phone Number',
      post: 'Post',
      resetPassword: 'Reset Password',
      roleInformation: 'Role Information',
      title: 'User List',
      userEmail: 'Email',
      userGender: 'Gender',
      userId: 'User Id',
      userName: 'User Name',
      userPhone: 'Phone Number',
      userRole: 'User Role',
      userSex: 'User sex',
      userStatus: 'User Status'
    },
    userDetail: {
      content: `The loader allows network requests and lazy-loaded files to be triggered almost simultaneously, enabling the lazy-loaded files to be parsed while waiting for the network request to complete. Once the network request finishes, the page is displayed all at once. Leveraging React's Fiber architecture, if users find the waiting time too long, they can switch to different pages during the wait. This is an advantage of the React framework and React Router's data loader, as it avoids the conventional sequence of: request lazy-loaded file -> parse -> mount -> send network request -> render page -> display, and eliminates the need for manually adding a loading effect.`,
      explain: `This page is solely for demonstrating the powerful capabilities of react-router-dom's loader. The data is random and may not match.`
    },
    skill: {
      title: 'Skill Manage',
      subtitle: 'Manage the skill packages you publish to your spaces. Click a card to view details or publish a new version.',
      publish: 'Publish Skill',
      empty: 'No skills yet. Click the button at the top-right to publish your first skill package.',
      view: 'View',
      downloads: 'Downloads',
      detailComingSoon: 'Detail page is coming soon',
      deleteConfirmTitle: 'Delete this skill?',
      deleteConfirmContent: 'This action cannot be undone. All versions of "{{name}}" will be removed.',
      filter: {
        all: 'All',
        published: 'Published',
        hidden: 'Hidden'
      },
      status: {
        published: 'Published',
        hidden: 'Hidden',
        archived: 'Archived',
        review: 'In Review',
        rejected: 'Rejected',
        scanning: 'Scanning'
      },
      publishPage: {
        back: 'Back to Skills',
        heroTitle: 'Publish New Skill',
        heroDesc: 'Choose the target space, upload a skill ZIP package, and publish to SkillHub in one click.',
        namespace: 'Namespace',
        namespacePh: 'Please select a space',
        namespaceRequired: 'Please select a space to publish to',
        version: 'Version',
        versionPh: 'e.g. 1.0.0 (optional, leave blank for auto-assignment)',
        changelog: 'Changelog',
        changelogPh: 'Briefly describe the changes in this version (optional)',
        skillPackage: 'Skill Package (ZIP)',
        dropOrClick: 'Click or drag a ZIP file here to upload',
        zipHint: 'Only .zip format is supported, maximum 100MB',
        clickToReplace: 'Click to replace',
        onlyZip: 'Only ZIP packages are supported',
        tooLarge: 'File size exceeds 100MB, please compress and try again',
        fileRequired: 'Please select a skill package first',
        submit: 'Publish',
        success: 'Published successfully',
        failed: 'Failed to publish, please try again later'
      }
    }
  },
  mySpace: {
    addNewSpace: 'Add New Space',
    searchPlaceholder: 'Please enter keywords to search'
  }
};

export default page;
