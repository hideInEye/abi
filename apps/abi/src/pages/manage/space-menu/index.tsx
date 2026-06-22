import { DeleteOutlined, EditOutlined, MinusOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import * as antdIcons from '@ant-design/icons';
import { message } from 'antd';
import { Suspense } from 'react';

import { enableStatusRecord } from '@/constants/business';
import {
  addSpaceMenuApi,
  deleteSpaceMenuApi,
  getSpaceMenuInfoApi,
  getSpaceMenuListApi,
  updateSpaceMenuApi
} from '@/service/api/space-menu';
import { getLocalIcons } from '@/utils/icon';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';

// 预加载本地 SVG 图标名称列表
const localIconNames = getLocalIcons();

const MenuOperateDrawer = lazy(() => import('./modules/menu-operate-drawer'));

// Column definitions for picker
const ALL_COLUMNS: ColumnOption[] = [
  { key: 'menuName', label: '菜单名称', visible: true },
  { key: 'icon', label: '图标', visible: true },
  { key: 'orderNum', label: '排序', visible: true },
  { key: 'perms', label: '权限标识', visible: true },
  { key: 'component', label: '组件路径', visible: true },
  { key: 'status', label: '菜单状态', visible: true },
  { key: 'createTime', label: '创建时间', visible: true },
];

export function Component() {
  const { t } = useTranslation();

  // Search state
  const [searchValue, setSearchValue] = useState('');
  const [statusValue, setStatusValue] = useState<string | undefined>(undefined);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>(ALL_COLUMNS);

  // Tree expand state
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };

  const visibleKeys = useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions]);

  const statusOptions = [
    { label: t('page.manage.common.status.enable'), value: '0' },
    { label: t('page.manage.common.status.disable'), value: '1' }
  ];

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
    M: '1'
  };

  // 创建图标渲染函数：支持 antd 图标和本地 SVG 图标
  const renderIcon = (iconName: string) => {
    if (iconName && !iconName.endsWith('Outlined') && localIconNames.includes(iconName)) {
      return <SvgIcon localIcon={iconName} style={{ fontSize: 20 }} />;
    }
    const IconComponent = (antdIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent style={{ fontSize: 20 }} />;
    }
    if (iconName && localIconNames.includes(iconName)) {
      return <SvgIcon localIcon={iconName} style={{ fontSize: 20 }} />;
    }
    return <antdIcons.QuestionCircleOutlined style={{ fontSize: 20 }} />;
  };

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps, updateSearchParams } = useTreeTable({
    apiFn: getSpaceMenuListApi as any,
    apiParams: {
      menuName: '',
      status: ''
    },
    columns: () =>
      [
        {
          align: 'left',
          className: 'col-menu-name',
          dataIndex: 'menuName',
          key: 'menuName',
          onHeaderCell: () => ({ className: 'col-menu-name' }),
          title: t('page.manage.menu.menuName'),
          minWidth: 180
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
          title: t('page.manage.menu.icon'),
          minWidth: 80
        },
        {
          align: 'center',
          dataIndex: 'orderNum',
          key: 'orderNum',
          title: t('page.manage.menu.order'),
          minWidth: 80
        },
        {
          align: 'center',
          dataIndex: 'perms',
          key: 'perms',
          title: t('page.manage.menu.permission'),
          minWidth: 140
        },
        {
          align: 'center',
          dataIndex: 'component',
          key: 'component',
          title: t('page.manage.menu.componentPath'),
          minWidth: 140
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (_: unknown, record: { status: Api.Common.EnableStatus }) => {
            const label = t(enableStatusRecord[record.status]);
            if (record.status === '0') {
              return <span className="abi-status-tag status-normal">{label}</span>;
            }
            return <span className="abi-status-tag status-disabled">{label}</span>;
          },
          title: t('page.manage.menu.status'),
          minWidth: 100
        },
        {
          align: 'center',
          dataIndex: 'createTime',
          key: 'createTime',
          title: t('page.manage.menu.createTime'),
          minWidth: 160
        },
        {
          align: 'center',
          fixed: 'right',
          key: 'operate',
          minWidth: 240,
          render: (_: unknown, record: any) => (
            <div className="ds-action-group">
              <AButton className="abi-action-link" size="small" variant="link" onClick={() => edit(record.menuId)}>
                <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
              </AButton>
              <AButton className="abi-action-link" size="small" variant="link" onClick={() => add(record.menuId)}>
                <PlusOutlined style={{ marginRight: 3, fontSize: 12 }} />新增子级
              </AButton>
              <APopconfirm
                title="提示"
                description={t('common.confirmDelete')}
                onConfirm={() => handleDelete(record.menuId)}
              >
                <AButton className="abi-action-link" size="small" variant="link">
                  <DeleteOutlined style={{ marginRight: 3, fontSize: 12 }} />删除
                </AButton>
              </APopconfirm>
            </div>
          ),
          title: t('common.operate'),
          width: 240
        }
      ] as any,
    rowKey: 'menuId'
  } as any);

  // Filter columns by visibility (always keep operate column)
  const filteredColumns = useMemo(() => {
    const cols = tableProps.columns as any[];
    if (!cols) return cols;
    return cols.filter((col: any) => col.key === 'operate' || visibleKeys.has(col.key));
  }, [tableProps.columns, visibleKeys]);

  const { checkedRowKeys, editingData, generalPopupOperation, handleAdd, handleEdit, onDeleted, rowSelection } = useTableOperate(
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
        const addRes: any = await addSpaceMenuApi(params);
        if (addRes?.response?.data?.code !== 200) return false;
      } else if (type === 'edit') {
        const params = {
          ...res,
          menuId: editingData.menuId,
          menuType: curmenuTypeMap[res.menuType as '1' | '2' | '3']
        };
        const addRes: any = await updateSpaceMenuApi(params);
        if (addRes?.response?.data?.code !== 200) return false;
      }
    },
    true
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
    const res = await getSpaceMenuInfoApi(row);
    const type = res.data.menuType as MenuType;
    handleEdit({
      ...res.data,
      menuType: menuTypeMap[type]
    });
  }

  async function handleDelete(menuId: number) {
    const res = await deleteSpaceMenuApi(menuId);
    if (res.response.data.code !== 200) return false;
    return onDeleted();
  }

  async function handleBatchDelete() {
    if (checkedRowKeys.length === 0) {
      message.warning('请先选择要删除的菜单');
      return;
    }
    const promises = checkedRowKeys.map((menuId) => deleteSpaceMenuApi(Number(menuId)));
    const results = await Promise.all(promises);
    const allSuccess = results.every((res: any) => res.response.data.code === 200);
    if (allSuccess) {
      message.success('批量删除成功');
      run();
    } else {
      message.error('批量删除部分失败');
    }
  }

  // Search handlers
  const handleSearch = () => {
    updateSearchParams({
      menuName: searchValue.trim() || '',
      status: statusValue ?? ''
    } as any);
  };

  const handleReset = () => {
    setSearchValue('');
    setStatusValue(undefined);
    updateSearchParams({
      menuName: '',
      status: ''
    } as any);
  };

  // Expand all rows when data loads
  useEffect(() => {
    const dataSource = tableProps.dataSource as any[];
    if (dataSource && dataSource.length > 0) {
      const allKeys: React.Key[] = [];
      const collectKeys = (items: any[]) => {
        items.forEach((item: any) => {
          allKeys.push(item.menuId);
          if (item.children && item.children.length > 0) {
            collectKeys(item.children);
          }
        });
      };
      collectKeys(dataSource);
      setExpandedRowKeys(allKeys);
    }
  }, [tableProps.dataSource]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }} className="lt-sm:overflow-auto">
      {/* Searchbar */}
      <section className="abi-searchbar">
        <div className="abi-search-row">
          <AInput
            allowClear
            placeholder={t('page.manage.menu.form.menuName')}
            prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onPressEnter={handleSearch}
            className="abi-field-input"
            style={{ width: '220px' }}
          />
          <ASelect
            allowClear
            placeholder={t('page.manage.menu.form.menuStatus')}
            options={statusOptions}
            value={statusValue}
            onChange={(val) => setStatusValue(val)}
            className="abi-field-input"
            style={{ width: '160px' }}
          />
          <AButton type="primary" className="btn-accent-gradient" onClick={handleSearch}>
            <SearchOutlined /> 查询
          </AButton>
          <AButton className="btn-ghost-v5" onClick={handleReset}>
            <ReloadOutlined /> 重置
          </AButton>
        </div>
      </section>

      {/* Data Area */}
      <section className="abi-data-area" style={{ paddingBottom: '16px' }}>
        {/* Toolbar */}
        <div className="abi-toolbar">
          <div className="abi-toolbar-left">
            <AButton className="btn-accent-gradient" onClick={() => add(0)}>
              <PlusOutlined />新增菜单
            </AButton>
            <AButton
              className="btn-ghost-v5"
              disabled={checkedRowKeys.length === 0}
              onClick={handleBatchDelete}
            >
              批量删除
            </AButton>
          </div>
          <ViewControls
            hideViewToggle
            columns={columnOptions}
            onColumnToggle={handleColumnToggle}
          />
        </div>

        {/* Table */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div
            style={{
              border: '1px solid rgba(130,140,200,0.18)',
              borderRadius: '12px',
              overflow: 'hidden',
              flex: 1,
              minHeight: 0
            }}
          >
            <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
              <ATable
                {...treeProps}
                expandable={{
                  ...treeProps.expandable,
                  expandedRowKeys,
                  onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as React.Key[]),
                  expandIcon: ({ expanded, onExpand, record }: any) => {
                    if (!record.children || record.children.length === 0) {
                      return <span style={{ display: 'inline-block', width: 20 }} />;
                    }
                    return (
                      <span
                        onClick={(e) => onExpand(record, e)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          border: '1px solid rgba(91,124,247,0.3)',
                          background: expanded ? 'rgba(91,124,247,0.08)' : 'transparent',
                          color: '#5b7cf7',
                          cursor: 'pointer',
                          fontSize: 12,
                          transition: 'all 0.2s',
                          marginRight: 4,
                        }}
                      >
                        {expanded ? <MinusOutlined /> : <PlusOutlined />}
                      </span>
                    );
                  },
                }}
                columns={filteredColumns as any}
                dataSource={tableProps.dataSource}
                loading={tableProps.loading}
                pagination={false}
                rowKey="menuId"
                rowSelection={rowSelection}
                scroll={{ x: 'max-content' }}
                size="middle"
                className="abi-std-table space-menu-table"
              />
            </div>
          </div>
        </div>
      </section>

      <Suspense>
        <MenuOperateDrawer {...generalPopupOperation} />
      </Suspense>
    </div>
  );
}
