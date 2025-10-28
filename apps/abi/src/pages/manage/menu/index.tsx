import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import * as antdIcons from '@ant-design/icons';
import { Suspense } from 'react';

import { enableStatusRecord } from '@/constants/business';
import { addMenuApi, deleteMenuApi, getMenuInfoApi, getMenuListApi, updateMenuApi } from '@/service/api/menu';

import MenuSearch from './modules/menu-search';

const MenuOperateDrawer = lazy(() => import('./modules/menu-operate-drawer'));

export function Component() {
  const { t } = useTranslation();

  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const treeProps = {
    childrenColumnName: 'children',
    expandable: {
      defaultExpandAllRows: true
    },
    indentSize: 24,
    rowKey: 'menuId'
  };

  // 定义类型
  type MenuType = 'C' | 'F' | 'M';

  // 类型安全的映射表
  const menuTypeMap: Record<MenuType, string> = {
    C: '2',
    F: '3',
    M: '1' // 显式处理未知类型
  };

  // 创建图标渲染函数
  const renderIcon = (iconName: string) => {
    const IconComponent = (antdIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent style={{ fontSize: 20 }} />;
    }
    return <antdIcons.QuestionCircleOutlined style={{ fontSize: 20 }} />;
  };

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps } = useTreeTable({
    apiFn: getMenuListApi as any,
    apiParams: {
      menuName: '',
      status: ''
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'menuName',
          key: 'menuName',
          title: t('page.manage.menu.menuName')
        },
        {
          align: 'center',
          dataIndex: 'icon',
          key: 'icon',
          render: (iconName: string) => (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderIcon(iconName)}
            </div>
          ),
          title: t('page.manage.menu.icon')
        },
        {
          align: 'center',
          dataIndex: 'orderNum',
          key: 'orderNum',
          title: t('page.manage.menu.order')
        },
        {
          align: 'center',
          dataIndex: 'perms',
          key: 'perms',
          title: t('page.manage.menu.permission')
        },
        {
          align: 'center',
          dataIndex: 'component',
          key: 'component',
          title: t('page.manage.menu.componentPath')
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (_: unknown, record: { status: Api.Common.EnableStatus }) => {
            const label = t(enableStatusRecord[record.status]);
            if (record.status === '0') {
              return <ATag color="success">{label}</ATag>;
            }
            return <ATag color="error">{label}</ATag>;
          },
          title: t('page.manage.menu.status')
        },
        {
          dataIndex: 'createTime',
          key: 'createTime',
          title: t('page.manage.menu.createTime'),
          width: 160
        },
        {
          align: 'center',
          key: 'operate',
          render: (_: unknown, record: any) => (
            <div className="flex-center gap-8px">
              <ATooltip title={t('page.manage.common.edit')}>
                <AButton
                  color="primary"
                  icon={<EditOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => edit(record.menuId)}
                />
              </ATooltip>

              <ATooltip title={t('page.manage.common.add')}>
                <AButton
                  className="tex-14px mr-2"
                  color="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => add(record.menuId)}
                />
              </ATooltip>

              <APopconfirm
                title={t('common.confirmDelete')}
                onConfirm={() => handleDelete(record.menuId)}
              >
                <ATooltip title={t('page.manage.common.delete')}>
                  <DeleteOutlined
                    className="text-red"
                    type="error"
                  />
                </ATooltip>
              </APopconfirm>
            </div>
          ),
          title: t('common.operate'),
          width: 160
        }
      ] as any,
    rowKey: 'menuId'
  } as any);

  const { checkedRowKeys, editingData, generalPopupOperation, handleAdd, handleEdit, onDeleted } = useTableOperate(
    data as any,
    run,
    // eslint-disable-next-line
    async (res: any, type) => {
      const curmenuTypeMap = {
        '1': 'M',
        '2': 'C',
        '3': 'F'
      };
      if (type === 'add') {
        const params = {
          ...res,
          menuType: curmenuTypeMap[res.menuType as '1' | '2' | '3']
        };
        const addRes: any = await addMenuApi(params);
        if (addRes?.response?.data?.code !== 200) return false;
      } else if (type === 'edit') {
        const params = {
          ...res,
          menuId: editingData.menuId,
          menuType: curmenuTypeMap[res.menuType as '1' | '2' | '3']
        };
        const addRes: any = await updateMenuApi(params);
        if (addRes?.response?.data?.code !== 200) return false;
      }
    }
  );

  async function add(row: number) {
    handleAdd({
      isCache: '0',
      isFrame: '1',
      menuType: '1',
      parentId: row,
      status: '0',
      visible: '0'
    });
  }

  async function edit(row: number) {
    const res = await getMenuInfoApi(row);

    // 使用时
    const type = res.data.menuType as MenuType;
    handleEdit({
      ...res.data,
      menuType: menuTypeMap[type]
    });
  }

  async function handleDelete(menuId: number) {
    const res = await deleteMenuApi(menuId);
    if (res.response.data.code !== 200) return false;
    return onDeleted();
  }

  // getUserSystemMenuApi();

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard>
        <MenuSearch {...searchProps} />
      </ACard>

      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        ref={tableWrapperRef}
        title={t('page.manage.menu.title')}
        extra={
          <TableHeaderOperation
            columns={columnChecks}
            disabledDelete={checkedRowKeys.length === 0}
            loading={tableProps.loading}
            refresh={run}
            setColumnChecks={setColumnChecks}
            add={() => {
              add(0);
            }}
          />
        }
      >
        <ATable
          {...treeProps} // 合并树形配置
          scroll={scrollConfig}
          size="small"
          {...(tableProps as any)}
          pagination={false}
        />
      </ACard>

      <Suspense>
        <MenuOperateDrawer {...generalPopupOperation} />
      </Suspense>
    </div>
  );
}
