export interface ISpaceItem {
  createBy: string;
  createTime: string;
  owners: string;
  remark: string;
  spaceId: number;
  spaceName: string;
  updateBy: string;
  updateTime: string;
  userCount: number;
  type?: string
}

export interface DeptItem {
  childrenData?: UserItem[];
  deptId: number;
  deptName: string;
  isExpand?: boolean;
  isStuffChildren?: boolean;
  parentId?: number;
  parentName?: string;
  hasChildren: boolean
}

export interface UserItem {
  dept: {
    deptId: number;
    deptName: string;
  };
  userId: string;
  userName: string;
}

export interface PermissionItem {
  admin: false;
  createBy: null;
  dataScope: string;
  dataSource: number;
  delFlag: string;
  deptCheckStrictly: false;
  deptIds: null;
  flag: false;
  menuCheckStrictly: false;
  menuIds: null;
  permissions: null;
  remark: null;
  roleId: number;
  roleKey: string;
  roleName: string;
  roleSort: number;
}
