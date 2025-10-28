import { useRoute } from '@sa/simple-router';
import { Form, message } from 'antd';

import { authRoleByUserIdApi, getRoleListByUseIdApi } from '@/service/api/user';
import { getActiveTabId, removeTab } from '@/store/slice/tab';
import { useRouter } from '~/packages/simple-router/src/hooks/useRouter';

export function Component() {
  const activeTabId = useAppSelector(getActiveTabId);
  const route = useRoute();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { id } = route.params;

  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [form] = Form.useForm();

  const columns = [
    {
      align: 'center',
      dataIndex: 'index',
      key: 'index',
      title: t('page.manage.common.order'),
      width: 80
    },
    {
      align: 'center',
      dataIndex: 'roleId',
      key: 'roleId',
      title: t('page.manage.role.order')
    },
    {
      align: 'center',
      dataIndex: 'roleName',
      key: 'roleName',
      title: t('page.manage.role.roleName')
    },
    {
      align: 'center',
      dataIndex: 'roleKey',
      key: 'roleKey',
      title: t('page.manage.role.permission')
    },
    {
      align: 'center',
      dataIndex: 'createTime',
      key: 'createTime',
      title: t('page.manage.role.createTime'),
      width: 200
    }
  ];

  const fetchData = async (userId: number | string) => {
    setLoading(true);
    try {
      const res: any = await getRoleListByUseIdApi(userId);
      if (res?.response?.data) {
        const { roles, user } = res.response.data;
        if (Array.isArray(roles)) {
          const curSelectedRowKeys: any = [];
          const curRoles = roles.map((item: any, index: number) => {
            if (item.flag) {
              curSelectedRowKeys.push(item.roleId);
            }
            return {
              ...item,
              index: index + 1
            };
          });
          setSelectedRowKeys(curSelectedRowKeys);
          setData(curRoles);
        }
        if (user) {
          form.setFieldsValue({
            nickName: user.nickName,
            userName: user.userName
          });
        }
      }
    } catch (error) {
      message.error('获取列表数据失败');
      console.error('Fetch list error:', error);
    } finally {
      setLoading(false);
    }
  };

  const rowSelection = {
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
    selectedRowKeys
  };

  async function handSubmit() {
    const params = {
      roleIds: selectedRowKeys.join(','),
      userId: id
    };
    const res = await authRoleByUserIdApi(params);
    if (res?.response?.data) {
      const { code, msg } = res.response.data;
      if (code === 200) {
        message.open({
          content: '分配成功',
          duration: 2,
          onClose: () => {
            handBack();
          },
          type: 'success'
        });
      } else {
        message.error(msg || '分配失败');
      }
    }
  }

  function handBack() {
    router.back();
    dispatch(removeTab(activeTabId));
  }

  useEffect(() => {
    if (id) {
      fetchData(id);
    }
  }, [id]);

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard title={t('page.manage.user.basicInformation')}>
        <AFlex
          align="center"
          gap={20}
          justify="center"
        >
          <AForm
            form={form}
            style={{ width: '100%' }}
          >
            <ARow
              justify="center"
              gutter={[100, 16]}
            >
              <ACol
                lg={8}
                md={12}
                span={24}
              >
                <AForm.Item
                  className="m-0"
                  label={t('page.manage.user.nickName')}
                  name="nickName"
                >
                  <AInput disabled />
                </AForm.Item>
              </ACol>

              <ACol
                lg={8}
                md={12}
                span={24}
              >
                <AForm.Item
                  className="m-0"
                  label={t('page.manage.user.loginAccount')}
                  name="userName"
                >
                  <AInput disabled />
                </AForm.Item>
              </ACol>
            </ARow>
          </AForm>
        </AFlex>
      </ACard>

      <ACard
        bordered={false}
        title={t('page.manage.user.roleInformation')}
      >
        <ATable
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={false}
          rowKey="roleId"
          rowSelection={rowSelection}
          scroll={{ y: 400 }}
        />
      </ACard>

      <ACard>
        <AFlex
          align="center"
          gap={20}
          justify="center"
        >
          <AButton
            type="primary"
            onClick={handSubmit}
          >
            {t('page.manage.common.submit')}
          </AButton>

          <AButton
            ghost
            type="primary"
            onClick={handBack}
          >
            {t('page.manage.common.back')}
          </AButton>
        </AFlex>
      </ACard>
    </div>
  );
}
