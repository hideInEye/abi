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
}

export interface DeptItem {
  childrenData?: UserItem[];
  deptId: number;
  deptName: string;
  isExpand?: boolean;
  isStuffChildren?: boolean;
  parentId?: number;
  deptUuid: number;
  parentName?: string;
  hasChildren: boolean
  children: DeptItem[]
}

export interface UserItem {
  dept: {
    deptId: number;
    deptName: string;
  };
  userId: string;
  userName: string;
  userUuid: number
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
