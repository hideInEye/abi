import { useBoolean, useHookTable } from '@sa/hooks';
import type { TablePaginationConfig, TableProps } from 'antd';
import { Form } from 'antd';

import { getIsMobile } from '@/store/slice/app';

type TableData = AntDesign.TableData;
type GetTableData<A extends AntDesign.TableApiFn> = AntDesign.GetTableData<A>;
type TableColumn<T> = AntDesign.TableColumn<T>;

export function useTreeTable<A extends AntDesign.TableApiFn>(
  config: AntDesign.AntDesignTableConfig<A>,
  paginationConfig?: Omit<TablePaginationConfig, 'current' | 'onChange' | 'pageSize' | 'total'>
) {
  const isMobile = useAppSelector(getIsMobile);

  const [total, setTotal] = useState<TablePaginationConfig['total']>(0);

  const { apiFn, apiParams, immediate, rowKey = 'id' } = config;

  const [form] = Form.useForm<AntDesign.AntDesignTableConfig<A>['apiParams']>();

  interface TreeNode<T> {
    children?: TreeNode<T>[];
    data?: T;
    parentId?: string | number;
    [idKey: string]: string | number | T | undefined;
  }

  function listToTree<T, K extends keyof TreeNode<T>>(
    list: TreeNode<T>[],
    options: {
      childrenKey?: string;
      idKey?: K;
      parentKey?: K;
    } = {}
  ): TreeNode<T>[] {
    const { childrenKey = 'children', idKey = 'id' as K, parentKey = 'parentId' as K } = options;

    // 1. 预处理：收集所有存在的节点ID
    const existingIds = new Set(list.map(node => node[idKey]));

    // 2. 创建节点映射表
    const nodeMap = new Map<TreeNode<T>[keyof TreeNode<T>], TreeNode<T>>();

    list.forEach(node => {
      const id = node[idKey];
      const treeNode = {
        ...node,
        [childrenKey]: []
      } as TreeNode<T> & { [childrenKey]: TreeNode<T>[] };

      nodeMap.set(id, treeNode);
    });

    // 3. 构建树结构
    const tree: TreeNode<T>[] = [];
    list.forEach(node => {
      const id = node[idKey];
      const parentId = node[parentKey];
      const currentNode = nodeMap.get(id)!;

      // 优化后的根节点判断逻辑：
      // 1. parentId 不存在
      // 2. parentId 存在但不在当前节点列表中
      const isRoot = parentId === 0 || parentId === null || !(parentKey in node) || !existingIds.has(parentId);

      if (isRoot) {
        tree.push(currentNode);
      } else {
        const parentNode = nodeMap.get(parentId as TreeNode<T>[keyof TreeNode<T>]);
        if (parentNode) {
          parentNode[childrenKey]!.push(currentNode);
        }
      }
    });

    return tree;
  }
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
    transformer: (res): any => {
      const listData = JSON.parse(JSON.stringify(res.data));
      const treeData = listToTree(listData, {
        childrenKey: 'children',
        idKey: config.rowKey?.toString(),
        parentKey: 'parentId' as const
      });
      return {
        data: treeData
      };
    }
  });

  // this is for mobile, if the system does not support mobile, you can use `pagination` directly
  const pagination: TablePaginationConfig = {
    current: searchParams.current.current,
    onChange: async (current: number, size: number) => {
      updateSearchParams({
        pageNum: current,
        pageSize: size
      });
    },
    pageSize: searchParams.current.size,
    pageSizeOptions: ['10', '15', '20', '25', '30'],
    showSizeChanger: true,
    simple: isMobile,
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
