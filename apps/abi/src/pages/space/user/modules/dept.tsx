import classNames from "classnames";
import PropTypes from "prop-types";
import { qiankunWindow } from "vite-plugin-qiankun/dist/helper";

import { queryDeptList, queryUserList } from "@/service/api/space";

import type { CheckboxChangeEvent } from "antd/es/checkbox";
import type { ChangeEvent } from "react";
import type { DeptItem, UserItem } from "../types";
import SearchUser from "./search-user";
interface DeptSelectorProps {
  defaultUserKeys?: React.Key[];
  defaultUserRoles?: any[];
  onCancel: () => void;
  onConfirm: (params: any[]) => void;
  open: boolean;
}

const DEFAULT_PLACEHOLDER = "搜索部门或人员";

function findRootDept(list: DeptItem[]) {
  if (!list.length) {
    return null;
  }
  const root = list.find((item) => !item.parentId || item.parentId === 0);
  return root ?? list[0];
}

export const DeptSelector: FC<DeptSelectorProps> = ({
  defaultUserKeys = [],
  defaultUserRoles = [],
  onCancel,
  onConfirm,
  open,
}) => {
  const [deptList, setDeptList] = useState<DeptItem[]>([]);
  const [currentDeptId, setCurrentDeptId] = useState<number | null>(null);
  const [flatDeptList, setFlatDeptList] = useState<DeptItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<DeptItem[]>([]);
  const [currentUsers, setCurrentUsers] = useState<UserItem[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>(defaultUserKeys);
  const [roleData, setRoleData] = useState<any[]>(defaultUserRoles);
  const [searchedUserMap, setSearchedUserMap] = useState<Record<string, any>>(
    {},
  );
  const selectedUserIds = useMemo(() => {
    return roleData
      .filter((item) => item.otype === 1)
      .map((item) => item.recordId);
  }, [roleData]);
  const handleDeptList = (list: DeptItem[] = []) => {
    const data: DeptItem[] = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].children) {
        data.push(...handleDeptList(list[i].children));
      }
      data.push(list[i]);
    }
    return data;
  };

  const childDepartments = useMemo(() => {
    if (!currentDeptId) {
      return [];
    }

    return flatDeptList.filter((item) => item.parentId === currentDeptId);
  }, [currentDeptId, flatDeptList]);

  const currentUsersKeys = currentUsers.map((item) => item.userUuid);
  const currentDeptKeys = childDepartments.map((item) => item.deptUuid);
  const visibleKeys: React.Key[] = [...currentDeptKeys, ...currentUsersKeys];
  const selectedVisibleCount = visibleKeys.filter((key) =>
    checkedKeys.includes(key),
  ).length;
  const allVisibleChecked =
    visibleKeys.length > 0 && selectedVisibleCount === visibleKeys.length;
  const partiallyChecked =
    selectedVisibleCount > 0 && selectedVisibleCount < visibleKeys.length;

  const handleDeptCheckboxChange =
    (deptId: number) => (e: CheckboxChangeEvent) => {
      const { checked } = e.target;
      setCheckedKeys((prev) => {
        if (checked) {
          return Array.from(new Set([...prev, deptId]));
        }
        return prev.filter((key) => key !== deptId);
      });
    };

  const handleUserCheckboxChange =
    (userId: React.Key) => (e: CheckboxChangeEvent) => {
      const { checked } = e.target;
      setCheckedKeys((prev) => {
        if (checked) {
          return Array.from(new Set([...prev, userId]));
        }
        return prev.filter((key) => key !== userId);
      });
    };

  const handleToggleAll = (_e: CheckboxChangeEvent) => {
    if (!visibleKeys.length) {
      return;
    }
    setCheckedKeys((prev) => {
      if (allVisibleChecked) {
        return prev.filter((key) => !visibleKeys.includes(key));
      }
      const next = new Set(prev);
      visibleKeys.forEach((key) => next.add(key));
      return Array.from(next);
    });
  };

  const generateRoleItems = useCallback(
    (keys: React.Key[]) => {
      return keys
        .map((key) => {
          const dept = flatDeptList.find((item) => item.deptUuid === key);

          if (dept) {
            return {
              deptId: dept.deptId,
              deptName: dept.deptName,
              oid: dept.deptId,
              recordId: dept.deptUuid,
              oname: dept.deptName,
              orgId: dept.parentId,
              orgName: dept.parentName,
              otype: 2,
              roles: [],
            };
          }
          const user = currentUsers.find((item) => item.userUuid === key);
          if (user) {
            return {
              // ...user,
              oid: user.userId,
              recordId: user.userUuid,
              oname: user.userName,
              orgId: user.dept?.deptId,
              orgName: user.dept?.deptName,
              otype: 1,
              roles: [],
            };
          }
          const searched = searchedUserMap[String(key)];
          if (searched) {
            return searched;
          }
          return null;
        })
        .filter(Boolean);
    },
    [currentUsers, flatDeptList, searchedUserMap],
  );

  // useEffect(() => {
  //   setCheckedKeys(defaultUserKeys);
  //   setRoleData(defaultUserRoles);
  // }, [ open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    async function fetchDept() {
      setDeptLoading(true);
      try {
        const { data } = await queryDeptList({
          dataSource: qiankunWindow.__POWERED_BY_QIANKUN__ ? 3 : 0,
          onenetToken: qiankunWindow.__POWERED_BY_QIANKUN__
            ? localStorage.getItem("SOY-REACT_token") || ""
            : "",
        });
        setDeptList(data);
        const flatList = handleDeptList(data);
        setFlatDeptList(flatList);
        const root = findRootDept(flatList);
        if (root) {
          setCurrentDeptId(root.deptId);
          setBreadcrumbs([root]);
        } else {
          setCurrentDeptId(null);
          setBreadcrumbs([]);
        }
      } finally {
        setDeptLoading(false);
      }
    }
    fetchDept();
  }, [open]);

  useEffect(() => {
    if (!currentDeptId || !open) {
      setCurrentUsers([]);
      return;
    }
    async function fetchUsers() {
      setUserLoading(true);
      try {
        const { data } = await queryUserList({
          deptId: currentDeptId!,
        });
        setCurrentUsers(data);
      } finally {
        setUserLoading(false);
      }
    }
    fetchUsers();
  }, [currentDeptId, open]);

  useEffect(() => {
    setRoleData((prev) => {
      const selectedKeySet = new Set(checkedKeys);
      const kept = prev.filter((item) => selectedKeySet.has(item.recordId));
      const keptKeySet = new Set(kept.map((item) => item.recordId));
      const needGenerate = checkedKeys.filter((key) => !keptKeySet.has(key));
      if (!needGenerate.length) {
        return kept;
      }
      const addition = generateRoleItems(needGenerate);

      return [...kept, ...addition];
    });
  }, [checkedKeys, generateRoleItems]);

  const handleEnterDept = (dept: DeptItem) => {
    setBreadcrumbs((prev) => {
      if (!prev.length) {
        return [dept];
      }
      const parentIndex =
        typeof dept.parentId !== "undefined"
          ? prev.findIndex((item) => item.deptId === dept.parentId)
          : -1;
      if (parentIndex >= 0) {
        const nextPath = prev.slice(0, parentIndex + 1);
        if (nextPath[nextPath.length - 1]?.deptId === dept.deptId) {
          return nextPath;
        }
        return [...nextPath, dept];
      }
      if (prev[prev.length - 1]?.deptId === dept.deptId) {
        return prev;
      }
      return [...prev, dept];
    });
    setCurrentDeptId(dept.deptId);
  };

  const handleBack = (deptId: number) => {
    if (breadcrumbs.length <= 1) {
      return;
    }
    const index = breadcrumbs.findIndex((item) => item.deptId === deptId);

    const next = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(next);
    setCurrentDeptId(next[next.length - 1].deptId);
  };

  const handleRemoveSelected = (key: React.Key) => {
    setCheckedKeys((prev) => prev.filter((item) => item !== key));
  };

  const handleConfirm = () => {

    onConfirm(roleData);
  };

  const handleSearchUser = (option: { label: string; value: React.Key }) => {
    if (!option?.value) {
      return;
    }
    const key = option.value;
    const name =
      typeof option.label === "string" ? option.label : String(option.label);
    const data = {
      oid: key,
      recordId: key,
      oname: name,
      orgId: key,
      orgName: name,
      otype: 1,
      roles: [],
    };
    setSearchedUserMap((prev) => {
      const recordKey = String(key);
      if (prev[recordKey] && prev[recordKey].oname === data.oname) {
        return prev;
      }
      return {
        ...prev,
        [recordKey]: data,
      };
    });
    setCheckedKeys((prev) => {
      if (prev.includes(key)) {
        return prev;
      }
      return [...prev, key];
    });
  };

  const renderDeptRow = (item: DeptItem) => {
    return (
      <div
        className="flex items-center justify-between px4 py3 hover:bg-gray-1/40"
        key={item.deptId}
      >
        <div className="flex flex-1 items-center gap-3">
          <ACheckbox
            checked={checkedKeys.includes(item.deptUuid!)}
            onChange={handleDeptCheckboxChange(item.deptUuid!)}
          />
          <div className="flex-1">
            <div className="text-base text-gray-8">{item.deptName}</div>
            {typeof item.parentName === "string" && (
              <div className="text-12px text-gray-5">{item.parentName}</div>
            )}
          </div>
        </div>
        <span
          className={`${checkedKeys.includes(item.deptId) ? "pointer-events-none cursor-not-allowed text-[#ccc]" : "cursor-pointer text-blue"} text-12px `}
          onClick={() => {
            handleEnterDept(item);
          }}
        >
          下级
        </span>
      </div>
    );
  };

  const renderUserRow = (user: UserItem) => {
    const initial = user.userName?.charAt(0) ?? "";
    return (
      <div
        className="flex items-center gap-3 px4 py3 hover:bg-gray-1/40"
        key={user.userId}
      >
        <ACheckbox
          checked={checkedKeys.includes(user.userUuid!)}
          onChange={handleUserCheckboxChange(user.userUuid!)}
        />
        <div className="flex items-center gap-3">
          <div className="h-32px w-32px flex items-center justify-center rounded-full bg-gray-2 text-12px text-gray-7">
            {initial}
          </div>
          <div>
            <div className="text-base text-gray-8">{user.userName}</div>
            <div className="text-12px text-gray-5">{user.dept?.deptName}</div>
          </div>
        </div>
      </div>
    );
  };

  const showEmpty =
    !deptLoading &&
    !userLoading &&
    !childDepartments.length &&
    !currentUsers.length;

  return (
    <ADrawer
      destroyOnClose
      open={open}
      title="选择协作者"
      width={1000}
      footer={<DrawerFooter onCancel={onCancel} onConfirm={handleConfirm} />}
      onClose={onCancel}
    >
      <div className="h-600px flex gap-4">
        <div className="flex flex-col flex-1 rounded-2xl bg-white shadow-sm">
          <div className="px4 py3">
            <SearchUser
              disabledValues={selectedUserIds}
              onChange={handleSearchUser}
            />
          </div>
          <div className="flex items-center gap-3 px4 py3">
            <span className="text-base text-gray-8 font-medium text-center">
              {breadcrumbs.length > 0 && <span className="mr-1">当前部门：</span>}
              {breadcrumbs.map((item, index) => {
                return (
                  <span
                    className="cursor-pointer text-gray-5"
                    onClick={() => {
                      handleBack(item.deptId);
                    }}
                  >
                    {item.deptName}
                    {index < breadcrumbs.length - 1 && " > "}
                  </span>
                );
              }) ?? "暂无部门"}
            </span>
          </div>
          <div className="border-t border-gray-2 border-solid px4 py3">
            <ACheckbox
              checked={allVisibleChecked}
              indeterminate={partiallyChecked}
              onChange={handleToggleAll}
            >
              全选
            </ACheckbox>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ASpin delay={150} spinning={deptLoading || userLoading}>
              {showEmpty ? (
                <AEmpty className="pt-12" description="暂无数据" />
              ) : (
                <>
                  {childDepartments.map(renderDeptRow)}
                  {currentUsers.map(renderUserRow)}
                </>
              )}
            </ASpin>
          </div>
        </div>
        <div className="w-2/5 flex flex-col rounded-2xl bg-white p4 shadow-sm">
          <div className="mb4 flex items-center justify-between">
            <span className="text-base text-gray-8 font-medium">
              已选择（{roleData.length}）
            </span>
            {roleData.length > 0 && (
              <span
                className="cursor-pointer text-12px text-gray-5 hover:text-gray-7"
                onClick={() => setCheckedKeys([])}
              >
                清空
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 overflow-y-auto">
            {roleData.length === 0 && (
              <span className="text-13px text-gray-5">暂无选择</span>
            )}
            {roleData.map((item) => (
              <ATag
                closable
                key={item.recordId}
                onClose={() => handleRemoveSelected(item.recordId)}
              >
                {item.oname}
              </ATag>
            ))}
          </div>
        </div>
      </div>
    </ADrawer>
  );
};

DeptSelector.propTypes = {
  defaultUserKeys: PropTypes.array,
  defaultUserRoles: PropTypes.array,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};

function DrawerFooter({
  onCancel,
  onConfirm,
}: {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <AFlex className="gap-4" justify="flex-end">
      <AButton onClick={onCancel}>取消</AButton>
      <AButton type="primary" onClick={onConfirm}>
        确定
      </AButton>
    </AFlex>
  );
}
