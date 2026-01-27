import type { TransferProps } from 'antd';
import { Form, Transfer } from 'antd';

import { useTableStore } from '@/pages/workbench/data-preparation/data-table-meaning/store/useTableStore';
import { queryDataSetDetail } from '@/service/api/data-table-meaning';

import type { DataSourceItem } from '../types';

interface Field {
  dataType: string;
  fieldName: string;
  techId?: string;
}

interface Item {
  agg?: string;
  alias: string;
  bizName: string;
  dateFormat: string;
  expand: Record<string, any>;
  expr?: string;
  fieldName: string;
  isCreateDimension?: number;
  isCreateMetric?: number;
  techId: string;
  techName: string;
  type: string;
}

interface Data {
  dates: Item[];
  dimensions: Item[];
  fields: Field[];
  identifiers: Item[];
  measures: Item[];
}

function updateTechIdToFields(data: Data, dataSource: any[]): Data {
  const techIdMap: { [key: string]: string } = {};
  const bizNameMap: { [key: string]: string } = {};
  const aliasMap: { [key: string]: string } = {};

  data.dimensions.forEach(dim => {
    techIdMap[dim.techId] = dim.techId;
    bizNameMap[dim.techId] = dim.bizName;
    aliasMap[dim.techId] = dim.alias;
  });

  data.identifiers.forEach(id => {
    techIdMap[id.techId] = id.techId;
    bizNameMap[id.techId] = id.bizName;
    aliasMap[id.techId] = id.alias;
  });

  data.measures.forEach(measure => {
    techIdMap[measure.techId] = measure.techId;
    bizNameMap[measure.techId] = measure.bizName;
    aliasMap[measure.techId] = measure.alias;
  });

  const updatedFields = dataSource
    .map(field => {
      if (techIdMap[field.tfieldId]) {
        return {
          ...field,
          alias: aliasMap[field.tfieldId],
          bizName: bizNameMap[field.tfieldId],
          techId: techIdMap[field.tfieldId],
          tfieldId: techIdMap[field.tfieldId]
        };
      }
      return null;
    })
    .filter(item => item !== null);

  return {
    ...data,
    fields: updatedFields
  };
}

function transformDataSource(data: any) {
  return data.map((item: any) => ({
    ...item,
    description: item.originName,
    key: item.tfieldId,
    semanticType: '',
    title: `${item.originName} (${item.tfieldShowName}) - ${item.fieldType}`
  }));
}

function findFieldReturnObject(selectedKeys: string[], processedDataSource: any[]) {
  return selectedKeys
    .map((item: any) => {
      return processedDataSource.find(c => {
        return c.tfieldId === item;
      });
    })
    .filter(item => item !== undefined);
}

function uniqueKey(keys: string[]) {
  return [...new Set(keys)];
}

export function DataTableFieldsSelect() {
  const [form] = Form.useForm();
  const { setFormFieldsConfig } = useTableStore();
  const [loading, setLoading] = useState(false);
  const { downSelectVal } = useTableStore();
  const [dataSource, setDataSource] = useState<DataSourceItem[]>([]);

  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([]);
  const { fields, setFields, setTablePrikey, setUnion, union } = useTableStore();
  const { drawerTitle, editObj } = useTableStore();
  


  function getRTableNames(viewData: any) {
    const result: Record<string, string> = {};
    function traverse(node: any, resultMap: Record<string, string>) {
      if (node.currentDs && node.currentDs.rtableId) {
        resultMap[node.currentDs.rtableId] = node.currentDs.rtableName || '';
      }
      for (const child of node.childrenDs || []) {
        traverse(child, resultMap);
      }
    }
    traverse(viewData.union[0], result);
    return result;
  }

  const getTableNames = ()=>{
    if(editObj.modelDetail){
      const modelDetail = JSON.parse(editObj.modelDetail);
      
      return modelDetail.tableNames&&modelDetail.tableNames.reduce((acc: any, item: any) => {
        acc[item.rtableId] = item.tableName;
        return acc;
      }, {})||{};
    }
    return {}
    
  }

  async function fetchDataSource() {
    setLoading(true);
    const { response } = await queryDataSetDetail({
      updateBy: '0',
      viewId: downSelectVal
    });

    const { data } = response.data as { data: any };
    if (data.allFields.length > 0) {
      const rTableNamesMap =!drawerTitle ? getRTableNames(data) : getTableNames();
      const allFs = data.allFields.map((field: any) => {
        return {
          tableRemarks: rTableNamesMap[field.rtableId] || '',
          ...field
        };
      });
      
      const processedDataSource = transformDataSource(allFs);
      setDataSource(processedDataSource);
      setTablePrikey(data.tablePrikey);
      setUnion(data.union);
    }
    setLoading(false);
  }

  function updateTechId(data: any[], techIds: []) {
    return data.map((i: any) => {
      techIds.forEach((item: any) => {
        if (item.fieldName === i.originName) {
          i.techId = item.techId;
          i.bizName = item.bizName;
          i.alias = item.alias;
        }
      });
      return i;
    });
  }

  function initForm() {
    if (drawerTitle === '编辑表语义') {
      const selectKeyFields = updateTechIdToFields(JSON.parse(editObj.modelDetail), dataSource).fields as [];
      const initKey = selectKeyFields.map((item: any) => item.tfieldId);
      setTargetKeys(initKey);
      form.setFieldValue('fields', initKey);
      setFields(updateTechId(findFieldReturnObject(initKey, dataSource), selectKeyFields));
    } else {
      const initKey = fields.map((item: any) => item.tfieldId);
      setTargetKeys(initKey);
      form.setFieldValue('fields', initKey);
    }
  }

  useEffect(() => {
    fetchDataSource();
  }, [downSelectVal]);

  useEffect(() => {
    setFormFieldsConfig(form);
    initForm();
  }, [dataSource]);

 const onChange= (nextTargetKeys: TransferProps['targetKeys']) => {
    const keyList = uniqueKey(nextTargetKeys as string[]);
    setTargetKeys(keyList);

    if (drawerTitle === '编辑表语义') {
      const selectKeyFields = updateTechIdToFields(JSON.parse(editObj.modelDetail), dataSource).fields as [];
      setFields(updateTechId(findFieldReturnObject(keyList, dataSource), selectKeyFields));
      return;
    }
    setFields(findFieldReturnObject(uniqueKey(nextTargetKeys as string[]), dataSource));
  };

  return (
    <ASpin spinning={loading}>
    <AForm form={form} onValuesChange={(val)=>{
      if(val.fields){
        onChange(val.fields)
      }
    }}>
      <AForm.Item
        required
        name="fields"
        rules={[{required: true, message: '请选择表语义字段'}]}
      >
        <TransferComponent dataSource={dataSource}  targetKeys={targetKeys} />
      </AForm.Item>
    </AForm>
    </ASpin>
  );
}

export function TransferComponent({ dataSource, targetKeys, onChange }: {dataSource: DataSourceItem[], targetKeys: TransferProps['targetKeys'], onChange?:any}) {

    // 可调整的高度状态
  const [transferHeight, setTransferHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;
      
      const container = resizeRef.current;
      const containerRect = container.getBoundingClientRect();
      // 计算鼠标相对于容器顶部的位置
      const newHeight = e.clientY - containerRect.top;
      
      // 限制高度范围：最小 200px，最大 800px
      const clampedHeight = Math.max(200, Math.min(800, newHeight));
      setTransferHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

    // 处理拖拽调整大小
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleTranferChange = (nextTargetKeys: TransferProps['targetKeys']) => {
    onChange?.(nextTargetKeys);
  };
  

  return (
    <div ref={resizeRef} style={{ position: 'relative', paddingBottom: '8px' }}>
          <Transfer
            showSearch
            dataSource={dataSource}
            render={item => item.title}
            targetKeys={targetKeys}
            titles={['数据集表语义字段', '已选表语义字段']}
            listStyle={{
              height: transferHeight,
              width: '100%'
            }}
            onChange={handleTranferChange}
          />
          {/* 可拖拽的调整条 */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '8px',
              cursor: 'row-resize',
              backgroundColor: isResizing ? '#1890ff' : 'transparent',
              zIndex: 10,
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (!isResizing) {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#e6f7ff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }
            }}
          >
            {/* 调整条指示器 */}
            <div
              style={{
                width: '40px',
                height: '4px',
                backgroundColor: isResizing ? '#1890ff' : '#d9d9d9',
                borderRadius: '2px',
                transition: 'background-color 0.2s'
              }}
            />
          </div>
        </div>
  );
}