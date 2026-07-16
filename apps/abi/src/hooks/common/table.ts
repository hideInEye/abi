import { useBoolean, useHookTable } from '@sa/hooks';
import type { TablePaginationConfig, TableProps } from 'antd';
import { Form } from 'antd';

import { getIsMobile, getSpaceId } from '@/store/slice/app';

type TableData = AntDesign.TableData;
type GetTableData<A extends AntDesign.TableApiFn> = AntDesign.GetTableData<A>;
type TableColumn<T> = AntDesign.TableColumn<T>;

export function useTable<A extends AntDesign.TableApiFn>(
  config: AntDesign.AntDesignTableConfig<A>,
  paginationConfig?: Omit<TablePaginationConfig, 'current' | 'onChange' | 'pageSize' | 'total'>
) {
  const isMobile = useAppSelector(getIsMobile);
  const reduxSpaceId = useAppSelector(getSpaceId);

  const [total, setTotal] = useState<TablePaginationConfig['total']>(0);

  const { apiFn, apiParams, immediate, rowKey = 'id', transformer } = config;
  const [initialized, setInitialized] = useState<boolean>(() => !immediate);

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
      setInitialized(true);
    },
    transformer
  });

  const prevSpaceIdRef = useRef(reduxSpaceId);
  const apiParamsRef = useRef(apiParams);
  apiParamsRef.current = apiParams;

  useEffect(() => {
    if (reduxSpaceId <= 0) return;

    const currentParams = apiParamsRef.current;
    if (!currentParams) return;

    const keys = Object.keys(currentParams);
    const spaceKey = keys.find(k =>
      k.toLowerCase() === 'spaceid' || k.toLowerCase() === 'space_id'
    );

    if (!spaceKey) return;

    // 仅在 spaceId 真正发生变化时触发刷新，避免与首次挂载的 getData 重复请求
    if (reduxSpaceId === prevSpaceIdRef.current) return;

    prevSpaceIdRef.current = reduxSpaceId;
    updateSearchParams({ [spaceKey]: reduxSpaceId, pageNum: 1 } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduxSpaceId]);

  useEffect(() => {
    if (!immediate) {
      setInitialized(true);
      return;
    }

    if (initialized) return;

    const timer = window.setTimeout(() => setInitialized(true), 8000);
    return () => window.clearTimeout(timer);
  }, [immediate, initialized]);
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
      // borderTop: '1px solid #f0f0f0',
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

  const tableLoading = !initialized || loading;
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
      loading: tableLoading,
      pagination,
      rowKey
    },
    updateSearchParams
  };
}

export function useTableOperate<T extends TableData = TableData>(
  data: T[],
  getData: (isResetCurrent?: boolean) => Promise<void>,
  executeResActions: (res: T, operateType: AntDesign.TableOperateType) => void,
  enableBatchOperation: boolean = false
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

  function clearCheckedRowKeys() {
    setCheckedRowKeys([]);
  }

  const rowSelection: TableProps<T>['rowSelection'] = enableBatchOperation? {
    columnWidth: 48,
    fixed: true,
    onChange: onSelectChange,
    selectedRowKeys: checkedRowKeys,
    type: 'checkbox'
  }:undefined;

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
    checkedRowKeys: enableBatchOperation ? checkedRowKeys : [],
    clearCheckedRowKeys,
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

// export function useTableScroll(scrollX: number = 1200) {
//   const tableWrapperRef = useRef<HTMLDivElement>(null);

//   const size = useSize(tableWrapperRef);

//   function getTableScrollY() {
//     const height = size?.height;

//     if (!height) return 400; // 提供默认高度
//     // 为表格内容预留更多空间，确保滚动条能正常显示
//     return height - 200; // Math.max(height - 200, 300);
//   }

//   const scrollConfig = {
//     scrollToFirstRowOnChange: true,
//     x: scrollX,
//     y: getTableScrollY()
//   };

//   return {
//     scrollConfig,
//     tableWrapperRef
//   };
// }
