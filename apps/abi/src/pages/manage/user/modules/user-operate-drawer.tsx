import { TreeSelect } from 'antd';

import { enableStatusOptions, userGenderOptions } from '@/constants/business';
import { REG_PWD } from '@/constants/reg';
import { $t } from '@/locales';
import { useSystemStore } from '@/my-store';
import { getDeptTreeApi } from '@/service/api/dept';
import { getPostSelectListApi } from '@/service/api/post';

import './user-drawer.scss';

type Props = Page.OperateDrawerProps;

const UserOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation();
  const { loadRoleOptions, roleOptions } = useSystemStore();
  const [deptTree, setDeptTree] = useState([]);
  const [postList, setPostList] = useState([]);
  const {
    formRules: {  userName: userNameRules }
  } = useFormRules();
  const getMenuTree = async () => {
    const res = await getDeptTreeApi();
    setDeptTree(res.data);
  };

  const getPostSelectList = async () => {
    const res = await getPostSelectListApi();
    if (Array.isArray(res.data)) {
      const curPostList = res.data.map((item: any) => {
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
  }, []);

  return (
    <ADrawer
      className="user-drawer-v5"
      open={open}
      title={operateType === 'add' ? t('page.manage.user.addUser') : t('page.manage.user.editUser')}
      footer={
        <div className="user-drawer-footer-v5">
          <AButton className="btn-ghost-v5" onClick={onClose}>{t('common.cancel')}</AButton>
          <AButton
            className="btn-accent-gradient"
            onClick={submit}
          >
            {t('common.confirm')}
          </AButton>
        </div>
      }
      onClose={onClose}
    >
      <div className="user-form-panel">
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
                label: 'label',
                value: 'id'
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
            rules={[...userNameRules]}
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
            rules={[{ required: true }]}
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

          {/* 角色 */}
          <AForm.Item
            label={t('page.manage.user.userRole')}
            name="roleIds"
            rules={[{ required: true }]}
          >
            <ASelect
              options={roleOptions}
              placeholder={t('page.manage.user.form.userRole')}
            />
          </AForm.Item>

          {/* 备注 */}
          <AForm.Item
            label={t('page.manage.common.remark')}
            name="remark"
          >
            <AInput.TextArea placeholder={t('page.manage.common.form.remark')} rows={3} />
          </AForm.Item>
        </AForm>
      </div>
    </ADrawer>
  );
});

export default UserOperateDrawer;
