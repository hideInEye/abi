import { CloseOutlined } from '@ant-design/icons';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import PropTypes from 'prop-types';
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper';

import { queryDeptList, queryUserList } from '@/service/api/space';

import type { DeptItem, UserItem } from '../types';
import lever from '../../../../assets/imgs/lever.png'

interface NewCreateUserProps {
  defaultUserKeys: any[];
  defaultUserRoles: any[];
  open: boolean;
  userCancel: () => void;
  userSure: (parmas: any) => void;
}

export const NewCreateUser: FC<NewCreateUserProps> = ({
  defaultUserKeys,
  defaultUserRoles,
  open,
  userCancel,
  userSure
}) => {
  const [deptList, setOriginalDeptList] = useState<DeptItem[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>(defaultUserKeys);
  const [roleData, setRoleData] = useState<React.Key[]>(defaultUserRoles);

  async function getDeptList() {
    const { data } = await queryDeptList({
      dataSource: qiankunWindow.__POWERED_BY_QIANKUN__ ? 3 : 0,
      onenetToken: qiankunWindow.__POWERED_BY_QIANKUN__ ? localStorage.getItem('SOY-REACT_token') || '' : ''
    });
    setOriginalDeptList(data);
  }

  useEffect(() => {
    getDeptList();
  }, []);

  function insertChildren(data: UserItem[], deptId: number) {
    const newDeptList = deptList.map(item =>
      item.deptId === deptId ? { ...item, childrenData: data, isExpand: true, isStuffChildren: true } : item
    );
    setOriginalDeptList(newDeptList);
  }

  async function getUserList(deptId: number) {
    const { data } = await queryUserList({
      deptId
    });
    insertChildren(data, deptId);
  }

  function handleClose() {
    userCancel();
  }

  function handleSure() {
    userSure(roleData);
  }

  const toggleExpand = (deptId: React.Key) => {
    const newDeptList = deptList.map(item => {
      if (item.deptId === deptId) {
        return {
          ...item,
          isExpand: !item.isExpand
        };
      }
      return item;
    });
    setOriginalDeptList(newDeptList);
  };

  const handleExpand = (deptId: React.Key) => {
    const dept = deptList.find(item => item.deptId === deptId);

    if (dept?.isStuffChildren) {
      toggleExpand(deptId);
      return;
    }

    getUserList(Number(deptId));
  };

  const handleCheckboxChange = (e: CheckboxChangeEvent) => {
    const { value } = e.target;
    const isChecked = checkedKeys.includes(value);
    const newCheckedKeys = isChecked ? checkedKeys.filter(key => key !== value) : [...checkedKeys, value];
    setCheckedKeys(newCheckedKeys);
  };

  const handleRemoveUser = (key: React.Key) => {
    const newCheckedKeys = checkedKeys.filter(k => k !== key);
    setCheckedKeys(newCheckedKeys);
  };

  const genRoleData = () => {
    return checkedKeys.filter((key: React.Key) => {
      return !roleData.some(item => item.oid === key);
    });
  };

  const generateNewRoleData = (keys: React.Key[]) => {
    return keys
      .map((key: React.Key) => {
        const dept = deptList.find(item => item.deptId === key);
        if (dept) {
          return {
            oid: dept.deptId,
            oname: dept.deptName,
            orgId: dept.parentId,
            orgName: dept.parentName,
            otype: 2,
            roles: []
          };
        }
        if (deptList.some(item => item.childrenData?.some(user => user.userId === key))) {
          const user = deptList
            .find(item => item.childrenData?.some(c => c.userId === key))
            ?.childrenData?.find(c => c.userId === key);
          return {
            oid: user?.userId,
            oname: user?.userName,
            orgId: user?.dept?.deptId,
            orgName: user?.dept?.deptName,
            otype: 1,
            roles: []
          };
        }

        return null;
      })
      .filter(Boolean);
  };

  useEffect(() => {
    // 1. 找出需要新增的数据
    const needGenerateKey = genRoleData();
    const newRoleData = generateNewRoleData(needGenerateKey);

    // 2. 过滤掉已取消选择的数据
    const filteredRoleData = roleData.filter(item => checkedKeys.includes(item.oid));

    // 3. 合并新的和保留的数据
    setRoleData([...filteredRoleData, ...newRoleData]);
  }, [checkedKeys]);

  return (
    <ADrawer
      closeIcon={null}
      extra={<CloseOutlined onClick={handleClose} />}
      open={open}
      title="新建用户"
      width={1000}
      footer={
        <ADrawerFooter
          handleClose={handleClose}
          handleSure={handleSure}
        />
      }
      onClose={handleClose}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-gray-2 border-solid p4">
          <ACheckbox.Group
            className="grid grid-cols-1 gap-3"
            value={checkedKeys}
          >
            {deptList.map(item => (
              <div key={item.deptId}>
                <div className="flex items-center justify-between">
                  <ACheckbox
                    key={item.deptId}
                    value={item.deptId}
                    onChange={handleCheckboxChange}
                  >
                    <div className="text-base">{item.deptName}</div>
                  </ACheckbox>
                  {item.hasChildren&&
                    <div
                      className="cursor-pointer text-sm text-gray-5"
                      onClick={() => handleExpand(item.deptId)}
                    >
                      <img src={lever} className='w-[15px] h-[15px]' />
                    </div>
                  }
                </div>
                {item.childrenData && item.childrenData.length > 0 && item.isExpand && (
                  <div className="grid grid-cols-1 gap-2 py6 pl8">
                    {item.childrenData.map(user => {
                      return (
                        <ACheckbox
                          key={user.userId}
                          value={user.userId}
                          onChange={handleCheckboxChange}
                        >
                          <p className="text-sm">{user.userName}</p>
                        </ACheckbox>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </ACheckbox.Group>
        </div>
        <div className="border border-gray-1 border-solid p4">
          <div className="flex flex-wrap gap-4">
            {roleData.map(item => (
              <div
                className="flex items-center justify-between rd-2 bg-blue-1/20 p2 text-center text-sm font-bold shadow-sm"
                key={item.oid}
              >
                {item.oname}
                <CloseOutlined
                  className="ml2"
                  onClick={() => handleRemoveUser(item.oid)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ADrawer>
  );
};

NewCreateUser.propTypes = {
  defaultUserKeys: PropTypes.array.isRequired,
  defaultUserRoles: PropTypes.array.isRequired,
  open: PropTypes.bool.isRequired,
  userCancel: PropTypes.func.isRequired,
  userSure: PropTypes.func.isRequired
};

function ADrawerFooter({
  handleClose,
  handleSure
}: {
  readonly handleClose: () => void;
  readonly handleSure: () => void;
}) {
  return (
    <AFlex
      className="mt-4 gap-4"
      justify="flex-end"
    >
      <AButton
        type="default"
        onClick={handleClose}
      >
        取消
      </AButton>
      <AButton
        type="primary"
        onClick={handleSure}
      >
        确定
      </AButton>
    </AFlex>
  );
}
