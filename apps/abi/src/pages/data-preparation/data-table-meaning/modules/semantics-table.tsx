import { CloseOutlined } from '@ant-design/icons';
import { message } from 'antd';

import { addTableSemantics, editTableSemantics } from '@/service/api/data-table-meaning';
import { formattedDate } from '@/utils/date';

import DataTableMeaningBaseInfo from '../components/semantics-base-info';
import { DataTableFieldsSelect } from '../components/semantics-fields-select';
import DataTableMeaning from '../components/semantics-steps';
import DataTableMeaningTable from '../components/semantics-table-config';
import { useTableStore } from '../store/useTableStore';
import type { InputField, OutputData, TableSemanticParams } from '../types';

function streamlinedData(data: any[]): InputField[] {
  return data.map(item => ({
    ...item,
    agg: item.agg || '',
    alias: item.alias,
    bizName: item.bizName || item.tfieldAlias,
    dataType: item.fieldType,
    expand: item.expand || {},
    expr: item.expr || '',
    fieldDesc: item.fieldDesc,
    fieldName: item.originName,
    fieldType: item.fieldType,
    isCreateDimension: 1,
    isCreateMetric: 1,
    originName: item.originName,
    primaryKey: item.primaryKey,
    rtableName: item.tableRemarks,
    semanticType: item.semanticType,
    sourceId: item.sourceId,
    tableName: item.tableName,
    // 表别名 无
    tdesc: item.tableRemarks,
    techId: item.tfieldId,
    techName: item.originName,
    tfieldId: item.tfieldId,
    tfieldName: item.tfieldName,
    type: item.fieldType
  }));
}

function createDimensionObject(field: InputField) {
  return {
    alias: field.alias,
    bizName: field.bizName,
    expand: field.expand,
    fieldDesc: field.fieldDesc,
    fieldName: field.fieldName,
    fieldType: field.fieldType,
    originName: field.originName,
    primaryKey: field.primaryKey,
    rtableName: field.tableRemarks,
    sourceId: field.sourceId,
    tableName: field.tableName,
    tdesc: field.tableRemarks,
    techId: field.tfieldId,
    techName: field.techName,
    tfieldName: field.tfieldName,
    type: field.semanticType || ''
  };
}

function assembleData(input: InputField[]): OutputData {
  const result: OutputData = {
    // 维度
    dimensions: [],
    // 字段
    fields: [],
    // 主键
    identifiers: [],
    // 度量
    measures: [],
    // 表名称
    tableNames: []
  };

  const semanticTypeHandlers = {
    // 维度
    categorical: (field: InputField) => {
      result.dimensions.push({
        ...createDimensionObject(field),
        isCreateDimension: field.isCreateDimension,
        techId: field.tfieldId,
        type: 'categorical'
      });
    },
    // 日期
    datetime: (field: InputField) => {
      result.dimensions.push({
        ...createDimensionObject(field),
        dateFormat: formattedDate(),
        techId: field.tfieldId,
        type: 'datetime'
      });
    },

    // 度量
    measure: (field: InputField) => {
      result.measures.push({
        agg: field.agg || 'sum',
        alias: field.alias,
        bizName: field.bizName,
        expand: field.expand,
        expr: field.expr || field.fieldName,
        fieldDesc: field.fieldDesc,
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        isCreateMetric: field.isCreateMetric,
        originName: field.originName,
        primaryKey: field.primaryKey || '*',
        rtableName: field.tableRemarks || '*',
        sourceId: field.sourceId || '*',
        tableName: field.tableName,
        tdesc: field.tableRemarks,
        techId: field.tfieldId,
        techName: field.techName,
        tfieldName: field.tfieldName,
        type: 'measure'
      });
    },
    // 主键
    primary_key: (field: InputField) => {
      result.identifiers.push({
        ...createDimensionObject(field),
        techId: field.tfieldId,
        type: 'primary_key'
      });
    }
  };

  type SemanticType = keyof typeof semanticTypeHandlers;
  // 储存表名称的数组
  const tableNames = new Map<string, string>();
  
  input.forEach(field => {
    const handler = semanticTypeHandlers[field.semanticType as SemanticType];
    if (handler) {
      handler(field);
    }
    result.fields.push({
      dataType: field.dataType,
      fieldName: field.fieldName
    });
    
    if(!tableNames.has(field.rtableId!)) {
      result.tableNames.push({
        tableName: field.tableRemarks!,
        rtableId: field.rtableId!
      })
      tableNames.set(field.rtableId!, field.tableRemarks!);
    }
  });
  return result;
}

function getTablePrikey(
  allFields: InputField[],
  tablePrikey: {
    originName: string;
    tableName: string;
  }[]
) {
  const prikeyMap = new Map(tablePrikey.map(p => [p.tableName, p.originName]));
  allFields.forEach(field => {
    field.primaryKey = (field.tableName && prikeyMap.get(field.tableName)) || '*';
  });
}

function getTabNameByRtableId(union: any[], targetRtableId: string): string | undefined {
  if (!union || union.length === 0) {
    return undefined;
  }

  for (const item of union) {
    if (item.currentDs?.rtableId === targetRtableId) {
      return item.currentDs.tableName;
    }

    if (item.childrenDs?.length > 0) {
      const result = getTabNameByRtableId(item.childrenDs, targetRtableId);
      if (result !== undefined) {
        return result;
      }
    }
  }

  return undefined;
}

function setTableName(fields: any[], union: any[], tablePrikey: any[] = []) {
  if (!fields?.length) {
    return;
  }

  // 一次性构建映射表，避免重复递归
  const rtableIdMap = new Map<string, string>();
  const traverse = (items: any[]) => {
    items?.forEach(item => {
      if (item.currentDs?.rtableId) {
        rtableIdMap.set(item.currentDs.rtableId, item.currentDs.tableName);
      }
      traverse(item.childrenDs);
    });
  };
  traverse(union);

  const primaryKeyMap = new Map<string, string>();
  tablePrikey.forEach((item) => {
    if (item.originName) {
      primaryKeyMap.set(item.originName, item.originName);
      primaryKeyMap.set(item.tableName, item.originName);
    }
  });

  fields.forEach((field) => {
    // 直接从映射表查找
    const tableName = rtableIdMap.get(field.rtableId);

    if (tableName) {
      field.tableName = tableName;
    }

    const primaryKey =
      tableName &&
      primaryKeyMap.has(tableName) &&
      primaryKeyMap.has(field.originName)
        ? primaryKeyMap.get(field.originName)
        : undefined;
    field.primaryKey = primaryKey || "*";
  });
}


export function SemanticsTable({ updateTableList }: { readonly updateTableList: () => void }) {
  const {
    chineseName,
    desc,
    downSelectVal,
    drawerTitle,
    editObj,
    englishName,
    fields,
    groupId,
    resetStore,
    setStepIndex,
    setTableModalOpen,
    stepIndex,
    tableModalOpen,
    tablePrikey,
    union
  } = useTableStore();

  const { formBaseInfo, formFieldsConfig, formTableConfig, nextStep, prevStep } = useTableStore();
  const [nextLoading, setNextLoading] = useState(false);

  const handleClose = () => {
    setTableModalOpen(false);
    resetStore();
    setStepIndex(0);
  };

  // getTablePrikey(fields, tablePrikey,);
  setTableName(fields, union, tablePrikey);

  const buildTableSemanticParams = (): TableSemanticParams => ({
    bizName: chineseName,
    drillDim: null,
    filters: null,
    groupId,
    modelDetail: JSON.stringify(assembleData(streamlinedData(fields))),
    relViewId: downSelectVal?.toString() || '',
    remark: desc,
    schemaId: drawerTitle === '新增表语义' ? '' : editObj.schemaId,
    spaceId: localStorage.getItem('spaceId'),
    status: '1',
    techName: englishName
  });
  // 滚动定位到表单字段
  const scrollToErrorField = (fieldName: string) => {
    let selector = '';
    if (fieldName.includes('tableHeader')) {
      selector = '[data-field-type="table-chinese-name"]';
    } else if (fieldName.includes('tableConfig')) {
      // 提取字段索引，如 tableConfig[5].semanticType -> 5
      const indexMatch = fieldName.match(/tableConfig\[(\d+)\]/);
      const fieldIndex = indexMatch ? indexMatch[1] : null;
      
      const fieldType = fieldName.includes('semanticType') ? 'semantic-type' : 
                       fieldName.includes('bizName') ? 'bizName' : 
                       fieldName.includes('alias') ? 'alias' : 'fieldDesc';
      
      // 如果是语义类型且有索引，精确定位到特定字段
      if (fieldType === 'semantic-type' && fieldIndex) {
        selector = `[data-field-type="semantic-type"][data-field-index="${fieldIndex}"]`;
      } else {
        selector = `[data-field-type="${fieldType}"]`;
      }
    }
    
    if (selector) {
      document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleTableSemantics = async () => {
    const params = buildTableSemanticParams();
    if (params.groupId === '' || !params.groupId) {
      message.error('请选择分组');
      return;
    }
    const api = drawerTitle === '新增表语义' ? addTableSemantics : editTableSemantics;
    const { response } = await api(params);

    if (Number(response.data.code) === 200) {
      message.success(`${drawerTitle === '新增表语义' ? '新增' : '编辑'}成功`);
      handleClose();
      updateTableList();
    }
  };

  function onPrevStep() {
    prevStep();
  }

  async function onNextStep() {
    if (nextLoading) return;
    setNextLoading(true);
    try {
      if (stepIndex === 0) {
        await formBaseInfo.validateFields();
        nextStep();
        await new Promise(resolve => setTimeout(resolve, 800));
      } else if (stepIndex === 1) {
        await formFieldsConfig.validateFields();
        nextStep();
        await new Promise(resolve => setTimeout(resolve, 800));
      } else if (stepIndex === 2) {
        try {
          await formTableConfig.validateFields();
        } catch (errorInfo) {
          if (errorInfo?.errorFields?.[0]?.name?.[0]) {
            scrollToErrorField(errorInfo.errorFields[0].name[0]);
          }
          return;
        }

        // 检查每个表都有主键
        const tableNames = [...new Set(fields.map(f => f.tableName))];
        for (const tableName of tableNames) {
          const hasKey = fields.some(f => f.tableName === tableName && f.semanticType === 'primary_key');
          if (!hasKey) {
            const firstIndex = fields.findIndex(f => f.tableName === tableName);
            scrollToErrorField(`tableConfig[${firstIndex}].semanticType`);
            message.error(`表"${tableName}"缺少主键，每个表都必须设置一个主键字段`);
            return;
          }
        }
        await handleTableSemantics();
      }
    } finally {
      setNextLoading(false);
    }
  }

  return (
    <ADrawer
      destroyOnClose
      closeIcon={null}
      open={tableModalOpen}
      title={drawerTitle}
      width={1200}
      extra={
        <CloseOutlined
          onClick={() => {
            setTableModalOpen(false);
            handleClose();
          }}
        />
      }
      footer={
        <AFlex
          className="mt-4 gap-4"
          justify="flex-end"
        >
          {stepIndex >= 1 && (
            <AButton
              type="default"
              disabled={nextLoading}
              onClick={() => {
                onPrevStep();
              }}
            >
              上一步
            </AButton>
          )}
          <AButton
            type="primary"
            loading={nextLoading}
            disabled={nextLoading}
            onClick={() => {
              onNextStep();
            }}
          >
            {stepIndex < 2 && '下一步'}
            {stepIndex === 2 && '完成'}
          </AButton>
        </AFlex>
      }
      onClose={() => {
        setTableModalOpen(false);
        resetStore();
        handleClose();
      }}
    >
      <ASpin spinning={nextLoading} tip="正在处理，请稍候">
        <DataTableMeaning data={stepIndex} />
        {stepIndex === 0 && <DataTableMeaningBaseInfo />}
        {stepIndex === 1 && <DataTableFieldsSelect />}
        {stepIndex === 2 && <DataTableMeaningTable />}
      </ASpin>
    </ADrawer>
  );
}
