import { Form, Transfer } from 'antd';
import type { TransferProps } from 'antd';

import { dataSetList, queryDataSetDetail } from '@/service/api/data-table-meaning';

import { useTableStore } from '../store/useTableStore';
import type { DataSourceItem } from '../types';

function transformDataSet(data: any) {
  return data.map((item: any) => ({
    label: item.viewName,
    value: item.viewId,
    ...item
  }));
}

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
  const fieldNameMap: { [key: string]: string } = {};
  const bizNameMap: { [key: string]: string } = {};
  const aliasMap: { [key: string]: string } = {};

  data.dimensions.forEach(dim => {
    techIdMap[dim.techId] = dim.techId;
    fieldNameMap[dim.fieldName] = dim.techId;
    bizNameMap[dim.techId] = dim.bizName;
    aliasMap[dim.techId] = dim.alias;
  });

  data.identifiers.forEach(id => {
    techIdMap[id.techId] = id.techId;
    fieldNameMap[id.fieldName] = id.techId;
    bizNameMap[id.techId] = id.bizName;
    aliasMap[id.techId] = id.alias;
  });

  data.measures.forEach(measure => {
    techIdMap[measure.techId] = measure.techId;
    fieldNameMap[measure.fieldName] = measure.techId;
    bizNameMap[measure.techId] = measure.bizName;
    aliasMap[measure.techId] = measure.alias;
  });

  const updatedFields = dataSource
    .map(field => {
      // tfieldId 每次加载数据集都会重新生成，优先按 techId 匹配，回退到字段名（originName）匹配
      const matchedTechId = techIdMap[field.tfieldId] || fieldNameMap[field.originName];
      if (matchedTechId) {
        return {
          ...field,
          alias: aliasMap[matchedTechId],
          bizName: bizNameMap[matchedTechId],
          techId: techIdMap[matchedTechId]
          // 保留当前 tfieldId，用于 Transfer targetKeys 与 dataSource key 匹配
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

export default function DataTableMeaningBaseInfoFields() {
  const [form] = Form.useForm();
  const { setFormBaseInfo, setFormFieldsConfig } = useTableStore();
  const { drawerTitle, setChinaname, setDescribe, setDownSelectLabel, setDownSelectVal, setEnglishname } =
    useTableStore();
  const { chineseName, desc, downSelectLabel, downSelectVal, englishName } = useTableStore();
  const { downSelectVal: selectedDownSelectVal } = useTableStore();
  const [dropDownData, setDropDownData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<DataSourceItem[]>([]);
  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([]);
  const { fields, setFields, setTablePrikey, setUnion, editObj } = useTableStore();

  const fetchDataSetList = async () => {
    const { response } = await dataSetList();
    const { code, data } = response.data;
    if (Number(code) === 200) {
      setDropDownData(transformDataSet(data?.list));
    }
  };

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

  function getTableNames() {
    if (editObj.modelDetail) {
      const modelDetail = JSON.parse(editObj.modelDetail);
      return (
        modelDetail.tableNames &&
        modelDetail.tableNames.reduce((acc: any, item: any) => {
          acc[item.rtableId] = item.tableName;
          return acc;
        }, {})
      );
    }
    return {};
  }

  async function fetchDataSource() {
    if (!selectedDownSelectVal) return;
    setLoading(true);
    const { response } = await queryDataSetDetail({
      updateBy: '0',
      viewId: selectedDownSelectVal
    });

    const { data } = response.data as { data: any };
    if (data.allFields.length > 0) {
      const rTableNamesMap = !drawerTitle ? getRTableName(data) : getTableNames();
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

  function initFieldsForm() {
    if (drawerTitle === '编辑数据语义' && dataSource.length > 0) {
      const selectKeyFields = updateTechIdToFields(JSON.parse(editObj.modelDetail), dataSource).fields as [];
      const initKey = selectKeyFields.map((item: any) => item.tfieldId);
      setTargetKeys(initKey);
      form.setFieldValue('fields', initKey);
      setFields(updateTechId(findFieldReturnObject(initKey, dataSource), selectKeyFields));
    } else if (fields.length > 0) {
      const initKey = fields.map((item: any) => item.tfieldId);
      setTargetKeys(initKey);
      form.setFieldValue('fields', initKey);
    }
  }

  function initForm() {
    form.setFieldValue('chineseName', chineseName);
    form.setFieldValue('englishName', englishName);
    form.setFieldValue('desc', desc);
    form.setFieldValue('downSelectLabel', downSelectLabel);
    form.setFieldValue('downSelectVal', downSelectVal);
  }

  useEffect(() => {
    setFormBaseInfo(form);
    setFormFieldsConfig(form);
    fetchDataSetList();
    initForm();
  }, []);

  useEffect(() => {
    fetchDataSource();
  }, [selectedDownSelectVal]);

  useEffect(() => {
    initFieldsForm();
  }, [dataSource]);

  const onChange = (nextTargetKeys: TransferProps['targetKeys']) => {
    const keyList = uniqueKey(nextTargetKeys as string[]);
    setTargetKeys(keyList);

    if (drawerTitle === '编辑数据语义') {
      const selectKeyFields = updateTechIdToFields(JSON.parse(editObj.modelDetail), dataSource).fields as [];
      setFields(updateTechId(findFieldReturnObject(keyList, dataSource), selectKeyFields));
      return;
    }
    setFields(findFieldReturnObject(uniqueKey(nextTargetKeys as string[]), dataSource));
  };

  return (
    <ASpin spinning={loading}>
      <div className="ds-form-content">
        <AForm
          form={form}
          onValuesChange={v => {
            if (v?.chineseName) {
              setChinaname(v?.chineseName);
              form.setFieldValue('chineseName', v?.chineseName);
            }

            if (v?.desc) {
              setDescribe(v?.desc);
              form.setFieldValue('desc', v?.desc);
            }

            if (v?.englishName) {
              setEnglishname(v?.englishName);
              form.setFieldValue('englishName', v?.englishName);
            }

            if (v?.downSelectLabel) {
              const findData = dropDownData.find(item => Number(item.value) === Number(v?.downSelectLabel));
              if (findData) {
                form.setFieldValue('downSelectLabel', findData.label);
                form.setFieldValue('downSelectVal', findData.value);

                setDownSelectLabel(findData.label);
                setDownSelectVal(findData.value);
              }
            }

            if (v?.fields) {
              onChange(v.fields);
            }
          }}
        >
          <div className="ds-form-section">
            <div className="ds-form-section-title">
              <span>基本信息</span>
            </div>
            <AForm.Item
              required
              label="数据集"
              labelCol={{ span: 3 }}
              name="downSelectLabel"
              rules={[{ message: '数据集未选择', required: true }]}
            >
              <ASelect options={dropDownData} />
            </AForm.Item>

            <AForm.Item
              label="数据语义"
              labelCol={{ span: 3 }}
              name="chineseName"
              rules={[{ message: '请输入数据语义', required: true }, { max: 50, message: '数据语义最多50个字符' }]}
            >
              <AInput placeholder="请输入数据语义名称" />
            </AForm.Item>

            <AForm.Item
              required
              label="英文名"
              labelCol={{ span: 3 }}
              name="englishName"
              rules={[
                { message: '请输入英文名', required: true },
                { max: 50, message: '英文名最多50个字符' },
                {
                  message: '请输入英文字符,以下划线分割',
                  pattern: /^[\u4E00-\u9FA5a-zA-Z_]+$/
                }
              ]}
            >
              <AInput placeholder="请输入英文名称" />
            </AForm.Item>

            <AForm.Item
              label="描述"
              labelCol={{ span: 3 }}
              name="desc"
              rules={[{ max: 500, message: '描述最多500个字符' }]}
            >
              <AInput.TextArea placeholder="请输入描述信息" maxLength={500} showCount />
            </AForm.Item>
          </div>

          <div className="ds-form-section">
            <div className="ds-form-section-title">
              <span>字段选择</span>
            </div>
            <AForm.Item
              required
              name="fields"
              rules={[{ required: true, message: '请选择数据语义字段' }]}
            >
              <Transfer
                showSearch
                dataSource={dataSource}
                render={item => (
                  <ATooltip title={item.title}>
                    <span
                      style={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.title}
                    </span>
                  </ATooltip>
                )}
                targetKeys={targetKeys}
                titles={['数据集数据语义字段', '已选数据语义字段']}
                listStyle={{
                  height: 300,
                  width: '100%'
                }}
                onChange={onChange}
              />
            </AForm.Item>
          </div>
        </AForm>
      </div>
    </ASpin>
  );
}
