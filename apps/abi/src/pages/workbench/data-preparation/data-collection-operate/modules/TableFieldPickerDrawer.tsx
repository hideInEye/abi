import { TableOutlined } from '@ant-design/icons';
import { Checkbox, Collapse, Spin } from 'antd';
import type { TableColumnsType } from 'antd';

import CommonDrawer from '@/components/stateless/common/CommonDrawer';

/** 字段项（与 SqlModeEditor 的字段缓存结构一致） */
export interface PickerFieldItem {
  originName: string;
  comment: string;
}

/** 勾选结果：{ 表名 -> 已勾选字段对象列表 }，key 存在即代表该表被勾选；保存时直接组装 currentDsFields */
export type TableFieldSelection = Record<string, PickerFieldItem[]>;

interface Props {
  open: boolean;
  /** 当前数据源下的表列表 */
  tableList: Array<{ tableName: string }>;
  /** 已勾选结果（受控，打开抽屉时作为初始值） */
  value: TableFieldSelection;
  /** 按需获取表字段（带缓存，由调用方提供） */
  fetchFields: (tableName: string) => Promise<PickerFieldItem[]>;
  onCancel: () => void;
  onConfirm: (selection: TableFieldSelection) => void;
}

interface FieldPanelProps {
  fields: PickerFieldItem[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
}

/** 单表展开后的字段选择区：计数 + 字段名搜索 + 可勾选表格 */
const FieldPanel: React.FC<FieldPanelProps> = memo(({ fields, selectedKeys, onChange }) => {
  const [search, setSearch] = useState('');

  const filterFields = useMemo(() => {
    if (!search) return fields;
    return fields.filter((item) => item.originName.toLowerCase().includes(search.toLowerCase()));
  }, [fields, search]);

  const columns: TableColumnsType<PickerFieldItem> = [
    { dataIndex: 'originName', title: '物理字段名' },
    { dataIndex: 'comment', title: '字段备注' },
  ];

  return (
    <>
      <div className="flex items-center justify-between pb-3">
        <span className="whitespace-nowrap">
          字段选择（{selectedKeys.length}/{fields.length}）
        </span>
        <AInput.Search
          allowClear
          className="w-200px"
          placeholder="通过字段名称搜索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ATable<PickerFieldItem>
        columns={columns}
        dataSource={filterFields}
        pagination={false}
        rowKey="originName"
        size="small"
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => onChange(keys as string[]),
        }}
      />
    </>
  );
});

/**
 * 选择表抽屉（SQL 模式）
 * - 表级复选 + 折叠展开字段级复选，表/字段勾选状态联动（全选/半选）
 * - 字段按需加载（首次展开或勾选表头时请求，复用调用方缓存）
 * - 勾选结果随数据集保存存入 viewHistory（表结构），编辑时从详情 viewHistory 回显
 */
const TableFieldPickerDrawer: React.FC<Props> = memo(({ open, tableList, value, fetchFields, onCancel, onConfirm }) => {
  const [selection, setSelection] = useState<TableFieldSelection>({});
  const [fieldsMap, setFieldsMap] = useState<Record<string, PickerFieldItem[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  // 防止同一张表并发重复请求
  const loadPromiseRef = useRef<Record<string, Promise<PickerFieldItem[]>>>({});

  // 打开抽屉时用外部值初始化草稿，取消时不影响外部状态
  useEffect(() => {
    if (open) {
      setSelection(value);
      setActiveKeys([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** 按需加载字段（带缓存） */
  const loadFields = useCallback(
    (tableName: string): Promise<PickerFieldItem[]> => {
      if (!loadPromiseRef.current[tableName]) {
        setLoadingMap((prev) => ({ ...prev, [tableName]: true }));
        loadPromiseRef.current[tableName] = fetchFields(tableName)
          .then((fields) => {
            setFieldsMap((prev) => ({ ...prev, [tableName]: fields }));
            return fields;
          })
          .finally(() => {
            setLoadingMap((prev) => ({ ...prev, [tableName]: false }));
          });
      }
      return loadPromiseRef.current[tableName];
    },
    [fetchFields]
  );

  /** 表级勾选：勾选=全选该表字段（未加载则先加载），取消=移除该表 */
  const handleTableCheck = async (tableName: string, checked: boolean) => {
    if (!checked) {
      setSelection((prev) => {
        const next = { ...prev };
        delete next[tableName];
        return next;
      });
      return;
    }
    const fields = await loadFields(tableName);
    setSelection((prev) => ({ ...prev, [tableName]: [...fields] }));
  };

  /** 字段级勾选变化：按 key 从已加载字段中取对象；全部取消时同时取消表勾选 */
  const handleFieldsChange = (tableName: string, keys: string[]) => {
    setSelection((prev) => {
      const next = { ...prev };
      if (keys.length) {
        const keySet = new Set(keys);
        next[tableName] = (fieldsMap[tableName] || []).filter((f) => keySet.has(f.originName));
      } else {
        delete next[tableName];
      }
      return next;
    });
  };

  /** 展开折叠时按需加载字段 */
  const handleCollapseChange = (keys: string | string[]) => {
    const keyArr = Array.isArray(keys) ? keys : [keys];
    setActiveKeys(keyArr);
    keyArr.forEach((k) => {
      if (!fieldsMap[k]) loadFields(k);
    });
  };

  const collapseItems = tableList.map((table) => {
    const { tableName } = table;
    const fields = fieldsMap[tableName];
    const selectedKeys = (selection[tableName] || []).map((f) => f.originName);
    // 字段已加载时按数量精确判断全选/半选；未加载时以是否存在勾选记录展示
    const checked = fields ? fields.length > 0 && selectedKeys.length === fields.length : selectedKeys.length > 0;
    const indeterminate = Boolean(fields && selectedKeys.length > 0 && selectedKeys.length < fields.length);

    return {
      key: tableName,
      label: (
        <div className="flex items-center gap-8px" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={checked}
            indeterminate={indeterminate}
            onChange={(e) => handleTableCheck(tableName, e.target.checked)}
          />
          <TableOutlined style={{ color: '#3467FF' }} />
          <span style={{ fontWeight: 500 }}>{tableName}</span>
        </div>
      ),
      children: (
        <Spin spinning={Boolean(loadingMap[tableName])}>
          {fields ? (
            <FieldPanel
              fields={fields}
              selectedKeys={selectedKeys}
              onChange={(keys) => handleFieldsChange(tableName, keys)}
            />
          ) : (
            <div style={{ minHeight: 60 }} />
          )}
        </Spin>
      ),
    };
  });

  return (
    <CommonDrawer
      destroyOnClose
      open={open}
      width={600}
      icon={<TableOutlined />}
      title="选择表"
      description="勾选参与查询的数据表与字段"
      footer={
        <ASpace className="w-full flex justify-end">
          <AButton onClick={onCancel}>取消</AButton>
          <AButton type="primary" onClick={() => onConfirm(selection)}>
            确定
          </AButton>
        </ASpace>
      }
      onClose={onCancel}
    >
      {tableList.length ? (
        <Collapse activeKey={activeKeys} items={collapseItems} onChange={handleCollapseChange} />
      ) : (
        <AEmpty description="暂无数据表，请先选择数据源" image={AEmpty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </CommonDrawer>
  );
});

export default TableFieldPickerDrawer;
