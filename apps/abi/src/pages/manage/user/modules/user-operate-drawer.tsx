import { TreeSelect } from 'antd';

import { enableStatusOptions, userGenderOptions } from '@/constants/business';
import { REG_PWD } from '@/constants/reg';
import { $t } from '@/locales';
import { useSystemStore } from '@/my-store';
import { getDeptTreeApi } from '@/service/api/dept';
import { getPostSelectListApi } from '@/service/api/post';
// import { getRoleSelectListApi } from '@/service/api/role';

type Props = Page.OperateDrawerProps;

const UserOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation();
  const { loadRoleOptions, roleOptions } = useSystemStore();
  const [deptTree, setDeptTree] = useState([]);
  const [postList, setPostList] = useState([]);
  // const [roleList, setRoleList] = useState([]);

  const getMenuTree = async () => {
    const res = await getDeptTreeApi();
    setDeptTree(res.data);
  };

  // const getRoleSelectList = async () => {
  //   const res = await getRoleSelectListApi();
  //   if (Array.isArray(res.data)) {
  //     const curRoleList = [];
  //     res.data.forEach(item => {
  //       if (item.roleName !== '超级管理员') {
  //         curRoleList.push({
  //           label: item.roleName,
  //           value: item.roleId
  //         });
  //       }
  //     });
  //     setRoleList(curRoleList)
  //   }
  // };

  const getPostSelectList = async () => {
    const res = await getPostSelectListApi();
    if (Array.isArray(res.data)) {
      const curPostList = res.data.map(item => {
        return {
          label: item.postName,
          value: item.postId
        };
      });
      setPostList(curPostList);
    }
  };

  const submit = async () => {
    try {
      const values = await form.validateFields();
      handleSubmit({ ...values });
    } catch (err) {
      // eslint-disable-next-line
      console.log(err);
    }
  };

  useEffect(() => {
    loadRoleOptions();
    getMenuTree();
    getPostSelectList();
    // getRoleSelectList();
  }, []);

  return (
    <ADrawer
      open={open}
      title={operateType === 'add' ? t('page.manage.user.addUser') : t('page.manage.user.editUser')}
      footer={
        <AFlex justify="space-between">
          <AButton onClick={onClose}>{t('common.cancel')}</AButton>
          <AButton
            type="primary"
            onClick={submit}
          >
            {t('common.confirm')}
          </AButton>
        </AFlex>
      }
      onClose={onClose}
    >
      <AForm
        form={form}
        layout="vertical"
      >
        {/* 用户昵称 */}
        <AForm.Item
          label={t('page.manage.user.nickName')}
          name="nickName"
          rules={[{ required: true }]}
        >
          <AInput placeholder={t('page.manage.user.form.nickName')} />
        </AForm.Item>

        {/* 归属部门 */}
        <AForm.Item
          label={t('page.manage.user.deptId')}
          name="deptId"
          rules={[{ required: true }]}
        >
          <TreeSelect
            placeholder={t('page.manage.user.form.deptId')}
            treeData={deptTree}
            fieldNames={{
              children: 'children',
              label: 'label', // 显示文本对应数据中的 label 字段
              value: 'id' // 子节点字段（可选，默认 children）
            }}
          />
        </AForm.Item>

        {/* 手机号码 */}
        <AForm.Item
          label={t('page.manage.user.phonenumber')}
          name="phonenumber"
          rules={[
            {
              message: t('page.manage.common.form.checkPhone'),
              pattern: /^1[3-9]\d{9}$/
            }
          ]}
        >
          <AInput placeholder={t('page.manage.user.form.phonenumber')} />
        </AForm.Item>

        {/* 邮箱 */}
        <AForm.Item
          label={t('page.manage.user.userEmail')}
          name="email"
          rules={[{ message: t('page.manage.common.form.checkEmail'), type: 'email' }]}
        >
          <AInput placeholder={t('page.manage.user.form.userEmail')} />
        </AForm.Item>

        {/* 用户名称 */}
        <AForm.Item
          label={t('page.manage.user.userName')}
          name="userName"
          rules={[{ required: true }]}
        >
          <AInput placeholder={t('page.manage.user.form.userName')} />
        </AForm.Item>

        {/* 用户密码 */}
        {operateType === 'add' ? (
          <AForm.Item
            label={t('page.manage.user.password')}
            name="password"
            rules={[{ required: true }, { message: $t('form.pwd.invalid'), pattern: REG_PWD }]}
          >
            <AInput.Password placeholder={t('page.manage.user.form.password')} />
          </AForm.Item>
        ) : null}

        {/* 用户性别 */}
        <AForm.Item
          label={t('page.manage.user.userSex')}
          name="sex"
        >
          <ARadio.Group>
            {userGenderOptions.map(item => (
              <ARadio
                key={item.value}
                value={item.value}
              >
                {t(item.label)}
              </ARadio>
            ))}
          </ARadio.Group>
        </AForm.Item>

        {/* 状态 */}
        <AForm.Item
          label={t('page.manage.user.userStatus')}
          name="status"
        >
          <ARadio.Group>
            {enableStatusOptions.map(item => (
              <ARadio
                key={item.value}
                value={item.value}
              >
                {t(item.label)}
              </ARadio>
            ))}
          </ARadio.Group>
        </AForm.Item>

        {/* 岗位 */}
        {/* <AForm.Item
          label={t('page.manage.user.post')}
          name="postIds"
        >
          <ASelect
            mode="multiple"
            options={postList}
            placeholder={t('page.manage.user.form.post')}
          />
        </AForm.Item> */}

        {/* 角色 */}
        <AForm.Item
          label={t('page.manage.user.userRole')}
          name="roleIds"
          rules={[{ required: true }]}
        >
          <ASelect
            mode="multiple"
            options={roleOptions}
            placeholder={t('page.manage.user.form.userRole')}
          />
        </AForm.Item>

        {/* 备注 */}
        <AForm.Item
          label={t('page.manage.common.remark')}
          name="remark"
        >
          <AInput.TextArea placeholder={t('page.manage.common.form.remark')} />
        </AForm.Item>
      </AForm>
    </ADrawer>
  );
});

export default UserOperateDrawer;
