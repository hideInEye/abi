import { DownOutlined, FolderOpenOutlined, FolderOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { Popover, Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';

import { buildGroupTree, getAllDescendantIds } from '@/pages/workbench/data-preparation/data-table-meaning/utils/helper';

import styles from './DataDirectoryDropdown.module.css';

interface DataDirectoryDropdownProps {
  /** 平铺分组数组（groupType=assistant），用于构建目录树与统计各分组助手数 */
  groups: any[];
  /** 当前完整助手列表（分组过滤前），用于统计各分组下助手数量 */
  assistants: ReadonlyArray<{ groupId?: string }>;
  /** 已选分组 id，'' 表示全部 */
  value: string;
  /** 选择分组回调（'' 表示全部） */
  onChange: (groupId: string) => void;
}

/**
 * 数据目录下拉：把助手分组目录放到筛选栏，支持按分组筛选助手
 * 默认选中「全部」（展示全部助手）；每个分组显示其下助手数量（含子分组）
 * 显示完整分组树结构（即使某分组下无助手也要显示），查询不到助手时显示空状态提示
 * 面板样式对齐 ABI Group 组件（玻璃态 + 搜索 + 文件夹展开/折叠 + 选中高亮）
 */
const DataDirectoryDropdown: React.FC<DataDirectoryDropdownProps> = ({ groups, assistants, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  // 各分组 id -> 助手数量（含所有后代分组，便于父分组聚合展示）
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of groups) {
      const gid = String(g.groupId);
      const ids = new Set<string>([gid, ...getAllDescendantIds(groups, gid)]);
      map[gid] = assistants.filter(a => a.groupId != null && ids.has(String(a.groupId))).length;
    }
    return map;
  }, [groups, assistants]);

  // 搜索过滤后的平铺分组
  const filteredGroups = useMemo(() => {
    const keyword = searchText.trim();
    if (!keyword) return groups;
    return groups.filter((g: any) => (g.groupName || '').includes(keyword));
  }, [groups, searchText]);

  // 递归构建树节点（对齐 Group 组件：蓝色文件夹 + 右侧折叠箭头 + 选中高亮）
  const buildTreeNodes = useCallback((items: any[], currentExpandedKeys: React.Key[]): TreeDataNode[] => {
    return items.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const nodeKey = String(item.groupId);
      const isExpanded = currentExpandedKeys.includes(nodeKey);
      const count = counts[nodeKey] ?? 0;

      const nodeIcon = hasChildren && isExpanded
        ? <FolderOpenOutlined className={styles.nodeIcon} />
        : <FolderOutlined className={styles.nodeIcon} />;

      const chevron = hasChildren ? (
        <span className={`${styles.nodeChevron} ${isExpanded ? styles.nodeChevronOpen : ''}`}>
          <RightOutlined />
        </span>
      ) : null;

      return {
        title: (
          <span className={`${styles.nodeLabel} ${hasChildren ? styles.nodeLabelFolder : styles.nodeLabelLeaf}`}>
            {nodeIcon}
            <span className={styles.nodeName} title={item.groupName || '-'}>{item.groupName || '-'}</span>
            {count > 0 && <span className={styles.nodeCount}>{count}</span>}
            {chevron}
          </span>
        ),
        key: nodeKey,
        children: hasChildren ? buildTreeNodes(item.children, currentExpandedKeys) : undefined,
        isLeaf: !hasChildren,
      };
    });
  }, [counts]);

  const treeData = useMemo(
    () => buildTreeNodes(buildGroupTree(filteredGroups), expandedKeys),
    [filteredGroups, expandedKeys, buildTreeNodes]
  );

  const handleTreeSelect = useCallback((keys: React.Key[], info: { node: any }) => {
    const nodeKey = String(info.node.key);
    onChange(nodeKey);
    // 文件夹节点：点击同时切换展开/折叠
    if (!info.node.isLeaf) {
      setExpandedKeys(prev =>
        prev.includes(nodeKey)
          ? prev.filter(k => k !== nodeKey)
          : [...prev, nodeKey]
      );
    }
  }, [onChange]);

  const panel = (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>数据目录</span>
      </div>
      <div className={styles.panelSearch}>
        <SearchOutlined className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="搜索分组"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>
      <div className={styles.panelBody}>
        <div
          className={`${styles.allRow} ${value === '' ? styles.allRowActive : ''}`}
          onClick={() => { onChange(''); }}
        >
          <FolderOutlined className={styles.nodeIcon} />
          <span className={styles.nodeName}>全部</span>
          <span className={styles.nodeCount}>{assistants.length}</span>
        </div>
        {treeData.length > 0 ? (
          <Tree
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            selectedKeys={value ? [value] : []}
            onSelect={handleTreeSelect}
            blockNode
            motion={false}
          />
        ) : (
          <div className={styles.emptyTip}>{searchText ? '无匹配分组' : '暂无助手分组'}</div>
        )}
      </div>
    </div>
  );

  return (
    <Popover content={panel} open={open} placement="bottomLeft" trigger="click" onOpenChange={setOpen}>
      <button className={styles.trigger} type="button">
        <FolderOutlined />
        <span className={styles.triggerText}>数据目录</span>
        <DownOutlined className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`} />
      </button>
    </Popover>
  );
};

export default DataDirectoryDropdown;
