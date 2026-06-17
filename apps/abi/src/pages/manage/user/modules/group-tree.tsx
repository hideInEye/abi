import {
  ApartmentOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { Dispatch, Key, SetStateAction } from 'react';

import { fetchGetDeptTree } from '@/service/api';

interface PropsType {
  selectedKeys: any;
  setSelectedKeys: Dispatch<SetStateAction<Key[] | undefined>>;
}

function filterTreeData(data: Api.SystemManage.MenuTree[], keyword: string): DataNode[] {
  const filterNode = (node: Api.SystemManage.MenuTree): DataNode | null => {
    if (node.label.includes(keyword)) {
      return {
        children: node.children ? filterTreeData(node.children, keyword) : undefined,
        key: node.id,
        title: node.label
      };
    }

    if (node.children) {
      const filteredChildren = node.children.map(filterNode).filter((child): child is DataNode => child !== null);

      if (filteredChildren.length > 0) {
        return {
          children: filteredChildren,
          key: node.id,
          title: node.label
        };
      }
    }

    return null;
  };

  return data?.map(filterNode).filter((node): node is DataNode => node !== null);
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 260;

const GroupTree: FC<PropsType> = memo(({ selectedKeys, setSelectedKeys }) => {
  const [keyword, setKeyword] = useState<string>('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

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
      setExpandedKeys(curExpandedKeys);
      if (data?.data[0]) {
        setSelectedKeys([data?.data[0]?.id]);
      }
    }
  }, [data]);

  // ── Resize handlers ──
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="dept-tree-panel" style={{ width: panelWidth }}>
      {/* Resize handle — right edge */}
      <div
        className="dept-tree-resize-handle"
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <div className="dept-tree-header">
        <div className="dept-tree-header-title">
          <span className="dept-tree-header-icon">
            <ApartmentOutlined />
          </span>
          <span>机构目录</span>
        </div>
      </div>

      {/* Search */}
      <div className="dept-tree-search">
        <div className="dept-tree-search-inner">
          <SearchOutlined />
          <input
            className="dept-tree-search-input"
            placeholder="搜索机构名称"
            value={keyword}
            onChange={e => setKeyword(e.target?.value)}
          />
        </div>
      </div>

      {/* Tree Body */}
      <div className="dept-tree-body">
        <ATree
          expandedKeys={expandedKeys}
          selectedKeys={selectedKeys}
          treeData={treeData}
          showIcon
          blockNode
          switcherIcon={<RightOutlined style={{ fontSize: 10 }} />}
          icon={(props: any) => {
            if (props.expanded) return <FolderOpenOutlined style={{ color: '#5b7cf7' }} />;
            return <FolderOutlined style={{ color: '#5b7cf7' }} />;
          }}
          onExpand={keys => {
            setExpandedKeys(keys);
          }}
          onSelect={value => {
            setSelectedKeys(value);
          }}
        />
      </div>
    </div>
  );
});

export default GroupTree;
