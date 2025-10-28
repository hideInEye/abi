import type { DataNode } from 'antd/es/tree';
import type { Dispatch, Key, SetStateAction } from 'react';

import { fetchGetDeptTree } from '@/service/api';

interface PropsType {
  selectedKeys: any;
  setSelectedKeys: Dispatch<SetStateAction<Key[] | undefined>>;
}

function filterTreeData(data: Api.SystemManage.MenuTree[], keyword: string): DataNode[] {
  const filterNode = (node: Api.SystemManage.MenuTree): DataNode | null => {
    // 如果当前节点的 label 包含关键字，则保留该节点
    if (node.label.includes(keyword)) {
      return {
        children: node.children ? filterTreeData(node.children, keyword) : undefined,
        key: node.id,
        title: node.label
      };
    }

    // 如果当前节点有 children，递归过滤 children
    if (node.children) {
      const filteredChildren = node.children.map(filterNode).filter((child): child is DataNode => child !== null);

      // 如果有过滤后的 children，则保留该节点
      if (filteredChildren.length > 0) {
        return {
          children: filteredChildren,
          key: node.id,
          title: node.label
        };
      }
    }

    // 如果当前节点及其子节点都不匹配关键字，则返回 null
    return null;
  };

  return data?.map(filterNode).filter((node): node is DataNode => node !== null);
}

const GroupTree: FC<PropsType> = memo(({ selectedKeys, setSelectedKeys }) => {
  const [keyword, setKeyword] = useState<string>('');

  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const { data, run: getTree } = useRequest(fetchGetDeptTree, {
    manual: true
  });

  const treeData = useMemo(() => {
    return filterTreeData(data?.data as any, keyword);
  }, [data, keyword]);

  useEffect(() => {
    getTree();
  }, []);

  useEffect(() => {
    if (Array.isArray(data?.data)) {
      const curExpandedKeys = [] as number[];
      data?.data.forEach(item => {
        curExpandedKeys.push(item.id);
        if (Array.isArray(item.children)) {
          item.children.forEach((i: any) => {
            curExpandedKeys.push(i.id);
          });
        }
      });
      setExpandedKeys(curExpandedKeys); // 初始树展开展示
      if (data?.data[0]) {
        setSelectedKeys([data?.data[0]?.id]); // 初始部门选中
      }
    }
  }, [data]);

  return (
    <ASpace direction="vertical">
      <div className="flex-y-center gap-16px pb-12px">
        <AInput
          className="w-240px"
          placeholder="请输入关键字进行搜索"
          value={keyword}
          onChange={e => setKeyword(e.target?.value)}
        />
      </div>

      <ATree
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        treeData={treeData}
        onExpand={keys => {
          setExpandedKeys(keys);
        }}
        onSelect={value => {
          setSelectedKeys(value);
        }}
      />
    </ASpace>
  );
});

export default GroupTree;
