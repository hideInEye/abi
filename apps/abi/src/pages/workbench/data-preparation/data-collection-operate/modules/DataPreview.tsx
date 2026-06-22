import { Dropdown, Table } from 'antd';
import { cloneDeep } from 'lodash';

import { DataCollectionOperateContext } from '../context';
import styles from '../index.module.css';

import SimpleModal from './SimpleModal';

interface PropsType {
  isSql?: boolean;
  previewData: any;
}
interface DataType {
  address: string;
  age: number;
  key: string;
  name: string;
  tags: string[];
}

const DataPreview: React.FC<PropsType> = memo(({ isSql = false, previewData = {} }) => {
  const { allFields, setAllFields } = useContext(DataCollectionOperateContext);
  const [selectedField, setSelectedFiled] = useState<any>(undefined);
  const [modalType, setModalType] = useState('');
  const [columns, setColumns] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<any[]>([]);

  useEffect(() => {
    const { data } = previewData;
    if (data?.fields && data?.data) {
      const fieldCols = data?.fields.map((item: any) => {
        const dataKey = item.tfieldName || item.tfieldShowName;
        return {
          ...item,
          align: 'center',
          dataIndex: dataKey,
          key: dataKey,
          title: item.tfieldShowName,
          // SQL 模式：启用排序（Ant Design Table 自带箭头）
          ...(isSql ? { sorter: (a: any, b: any) => {
            const va = a[dataKey], vb = b[dataKey];
            if (va == null && vb == null) return 0;
            if (va == null) return -1;
            if (vb == null) return 1;
            if (typeof va === 'number' && typeof vb === 'number') return va - vb;
            return String(va).localeCompare(String(vb));
          }} : {}),
        };
      });

      if (isSql) {
        fieldCols.unshift({
          title: '',
          dataIndex: '_rowNo',
          key: '_rowNo',
          width: 60,
          fixed: 'left' as const,
          render: (_: any, __: any, index: number) => (
            <span style={{ color: '#333', textAlign: 'center', display: 'block' }}>{index + 1}</span>
          ),
        });
      }

      setColumns(fieldCols);
      setDataSource(data.data);
    }
  }, [previewData, isSql]);

  const changeAField = (resetObj: any) => {
    setAllFields((state: any) => {
      const _allFields = cloneDeep(state);
      const curIndex = allFields.findIndex((item: any) => item.tfieldId === selectedField.tfieldId);
      _allFields.splice(curIndex, 1, { ...selectedField, ...resetObj });
      return _allFields;
    });
  };

  const handleCopy = () => {
    setAllFields((state: any) => {
      const _allFields = cloneDeep(state);
      const curIndex = allFields.findIndex((item: any) => item.tfieldId === selectedField.tfieldId);
      _allFields.splice(curIndex + 1, 0, {
        ...selectedField,
        originName: `${selectedField.originName}_copy`,
        tfieldId: `${selectedField.tfieldId}1`
      });
      return _allFields;
    });
  };

  const handleDelete = () => {
    setAllFields((state: any) => {
      const _allFields = cloneDeep(state);
      const curIndex = allFields.findIndex((item: any) => item.tfieldId === selectedField.tfieldId);
      _allFields.splice(curIndex, 1);
      return _allFields;
    });
  };

  const onSelect = ({ key }: any) => {
    switch (key) {
      case 'switch':
        changeAField({ tfieldType: selectedField.tfieldType === 'd' ? 'q' : 'd' });
        break;
      case 'rename':
        setModalType(key);
        break;
      case 'copy':
        handleCopy();
        break;
      case 'delete':
        handleDelete();
        break;
      // 自定义时间类型
      case 'custom':
        setModalType(key);
        break;
      default: {
        // 更改字段类型
        const numKey = Number(key);
        let resetField: any = { sysFiledType: numKey };
        if (!Number.isInteger(numKey)) {
          resetField = { dateFormat: key, sysFiledType: 1 };
        }
        changeAField(resetField);
        break;
      }
    }
  };

  const onClose = (val: any) => {
    if (val.rename) {
      changeAField({ originName: val.rename });
      //   setAllFields((state: any) => {
      //   const _allFields = cloneDeep(state);
      //   const curIndex = findCurIndex(_allFields, selectedField);
      //   _allFields.splice(curIndex, 1, { ...selectedField, tfieldType: selectedField.tfieldType === 'd' ? 'q' : 'd' });
      //   return _allFields;
      // });
    } else {
      const resetField = { dateFormat: val.custom, sysFiledType: 1 };
      changeAField(resetField);
    }
    setModalType('');
  };
  return (
    <div className="h-full flex">
      <div
        className="h-full w-full"
        style={{
          border: '1px solid rgba(130,140,200,0.18)',
          borderRadius: '12px',
          overflow: 'hidden',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
          <Table<DataType>
            className="abi-std-table"
            columns={columns as any[]}
            dataSource={dataSource}
            pagination={false}
            rowKey={(_, index) => String(index)}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        </div>
      </div>

      {modalType ? (
        <SimpleModal
          type={modalType}
          onClose={onClose}
        />
      ) : null}
    </div>
  );
});

export default DataPreview;
