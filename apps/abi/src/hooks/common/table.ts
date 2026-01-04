import { useBoolean, useHookTable } from '@sa/hooks';
import type { TablePaginationConfig, TableProps } from 'antd';
import { Form } from 'antd';

import { getIsMobile } from '@/store/slice/app';

type TableData = AntDesign.TableData;
type GetTableData<A extends AntDesign.TableApiFn> = AntDesign.GetTableData<A>;
type TableColumn<T> = AntDesign.TableColumn<T>;

export function useTable<A extends AntDesign.TableApiFn>(
  config: AntDesign.AntDesignTableConfig<A>,
  paginationConfig?: Omit<TablePaginationConfig, 'current' | 'onChange' | 'pageSize' | 'total'>
) {
  const isMobile = useAppSelector(getIsMobile);

  const [total, setTotal] = useState<TablePaginationConfig['total']>(0);

  const { apiFn, apiParams, immediate, rowKey = 'id', transformer } = config;

  const [form] = Form.useForm<AntDesign.AntDesignTableConfig<A>['apiParams']>();

  const {
    columnChecks,
    columns,
    data,
    empty,
    loading,
    resetSearchParams,
    searchParams,
    setColumnChecks,
    updateSearchParams
  } = useHookTable<A, GetTableData<A>, TableColumn<any>>({
    apiFn,
    apiParams,
    columns: config.columns,
    getColumnChecks: cols => {
      const checks: AntDesign.TableColumnCheck[] = [];

      cols.forEach(column => {
        if (column.key) {
          checks.push({
            checked: true,
            key: column.key as string,
            title: column.title as string
          });
        }
      });

      return checks;
    },
    getColumns: (cols, checks) => {
      const columnMap = new Map<string, TableColumn<AntDesign.TableDataWithIndex<GetTableData<A>>>>();

      cols.forEach(column => {
        if (column.key) {
          columnMap.set(column.key as string, column);
        }
      });

      const filteredColumns = checks.filter(item => item.checked).map(check => columnMap.get(check.key));

      return filteredColumns as TableColumn<AntDesign.TableDataWithIndex<GetTableData<A>>>[];
    },
    immediate,
    onFetched: async transformed => {
      const { total: totalNum } = transformed;

      setTotal(totalNum);
    },
    transformer
  });

  // this is for mobile, if the system does not support mobile, you can use `pagination` directly
  const pagination: TablePaginationConfig = {
    current: searchParams.current.current,
    onChange: async (current: number, size: number) => {
      updateSearchParams({
        page: current,
        page_size: size,
        pageNum: current,
        pageSize: size
      } as any);
    },
    pageSize: searchParams.current.size,
    pageSizeOptions: ['10', '15', '20', '25', '30'],
    position: ['bottomRight'],
    showSizeChanger: true,
    simple: isMobile,
    // 固定分页位置在右下角
    style: {
      backgroundColor: '#fff',
      borderTop: '1px solid #f0f0f0',
      bottom: 0,
      padding: '16px 0',
      position: 'sticky',
      zIndex: 10
    },
    total,
    ...paginationConfig
  };

  function reset() {
    form.resetFields();
    resetSearchParams();
  }

  async function run(isResetCurrent: boolean = true) {
    const res = await form.validateFields();

    if (res) {
      if (isResetCurrent) {
        const { pageNum = 1, ...rest } = res;
        updateSearchParams({ pageNum, ...rest });
      } else {
        updateSearchParams(res);
      }
    }
  }

  return {
    columnChecks,
    data,
    empty,
    run,
    searchParams,
    searchProps: {
      form,
      reset,
      search: run
    },
    setColumnChecks,
    tableProps: {
      columns,
      dataSource: data,
      loading,
      pagination,
      rowKey
    },
    updateSearchParams
  };
}

export function useTableOperate<T extends TableData = TableData>(
  data: T[],
  getData: (isResetCurrent?: boolean) => Promise<void>,
  executeResActions: (res: T, operateType: AntDesign.TableOperateType) => void
) {
  const { bool: drawerVisible, setFalse: closeDrawer, setTrue: openDrawer } = useBoolean();

  const { t } = useTranslation();

  const [operateType, setOperateType] = useState<AntDesign.TableOperateType>('add');

  const [form] = Form.useForm<T>();

  function handleAdd(formData?: Record<string, unknown>) {
    if (formData) {
      form.setFieldsValue(formData as any);
    }
    setOperateType('add');
    openDrawer();
  }

  /** the editing row data */
  const [editingData, setEditingData] = useState<T>();

  function handleEdit(idOrData: T['id'] | T) {
    if (typeof idOrData === 'object') {
      form.setFieldsValue(idOrData);

      setEditingData(idOrData);
    } else {
      const findItem = data.find(item => item.id === idOrData);
      if (findItem) {
        form.setFieldsValue(findItem);
        setEditingData(findItem);
      }
    }

    setOperateType('edit');
    openDrawer();
  }

  /** the checked row keys of table */
  const [checkedRowKeys, setCheckedRowKeys] = useState<React.Key[]>([]);

  function onSelectChange(keys: React.Key[]) {
    setCheckedRowKeys(keys);
  }

  const rowSelection: TableProps<T>['rowSelection'] = {
    columnWidth: 48,
    fixed: true,
    onChange: onSelectChange,
    selectedRowKeys: checkedRowKeys,
    type: 'checkbox'
  };

  function onClose() {
    closeDrawer();

    form.resetFields();
  }

  /** the hook after the batch delete operation is completed */
  async function onBatchDeleted() {
    window.$message?.success(t('common.deleteSuccess'));
    setCheckedRowKeys([]);

    await getData(false);
  }

  /** the hook after the delete operation is completed */
  async function onDeleted() {
    window.$message?.success(t('common.deleteSuccess'));

    await getData(false);
  }

  async function handleSubmit(customParams?: any) {
    let res = null;
    if (customParams) {
      res = customParams;
    } else {
      res = await form.validateFields();
    }
    if (res.sourceName) {
      res.sourceName = res.sourceName.trim();
    }
    // request
    const executeRes: any = await executeResActions(res, operateType);
    if (executeRes === false) return;


    onClose();
    getData();
  }

  return {
    checkedRowKeys,
    closeDrawer,
    drawerVisible,
    editingData,
    generalPopupOperation: {
      form,
      handleSubmit,
      onClose,
      open: drawerVisible,
      operateType
    },
    handleAdd,
    handleEdit,
    onBatchDeleted,
    onDeleted,
    onSelectChange,
    openDrawer,
    operateType,
    rowSelection
  };
}

export function useTableScroll(scrollX: number = 1200) {
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  const size = useSize(tableWrapperRef);

  function getTableScrollY() {
    const height = size?.height;

    if (!height) return 400; // 提供默认高度
    // 为表格内容预留更多空间，确保滚动条能正常显示
    return height - 200; // Math.max(height - 200, 300);
  }

  const scrollConfig = {
    scrollToFirstRowOnChange: true,
    x: scrollX,
    y: getTableScrollY()
  };

  return {
    scrollConfig,
    tableWrapperRef
  };
}
