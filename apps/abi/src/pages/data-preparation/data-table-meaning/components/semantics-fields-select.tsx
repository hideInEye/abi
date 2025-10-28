import type { TransferProps } from 'antd';
import { Form, Transfer } from 'antd';

import { useTableStore } from '@/pages/data-preparation/data-table-meaning/store/useTableStore';
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

  const { downSelectVal } = useTableStore();
  const [dataSource, setDataSource] = useState<DataSourceItem[]>([]);

  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([]);
  const { fields, setFields, setTablePrikey, setUnion, union } = useTableStore();
  const { drawerTitle, editObj } = useTableStore();

  function getRTableNames(viewData: any) {
    const result = {};
    function traverse(node: any, resultMap: any) {
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

  async function fetchDataSource() {
    const { response } = await queryDataSetDetail({
      updateBy: '0',
      viewId: downSelectVal
    });

    const { data } = response.data as { data: any };
    if (data.allFields.length > 0) {
      const rTableNamesMap = getRTableNames(data);
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

  const onChange: TransferProps['onChange'] = nextTargetKeys => {
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
    <AForm form={form}>
      <AForm.Item
        required
        name="fields"
        rules={[{ message: '请选择表语义字段', required: true }]}
      >
        <Transfer
          showSearch
          dataSource={dataSource}
          render={item => item.title}
          targetKeys={targetKeys}
          titles={['数据集表语义字段', '已选表语义字段']}
          listStyle={{
            height: 300,
            width: '100%'
          }}
          onChange={onChange}
        />
      </AForm.Item>
    </AForm>
  );
}
