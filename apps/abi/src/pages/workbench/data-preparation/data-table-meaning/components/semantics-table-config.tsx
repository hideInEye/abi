import { useDebounceFn } from 'ahooks';
import type { TableColumnsType } from 'antd';
import { Form } from 'antd';
import { useEffect, useRef } from 'react';

import Star from '../../../../../components/star/index.tsx';
import { useTableStore } from '../store/useTableStore.ts';
import type { DataTypea } from '../types/index';
import { getSemanticTypeMap } from '../utils/getDefaultField.ts';
import { formatField } from '../utils/helper.ts';

import { TableTooltip } from './table-tooltip.tsx';

export default function DataTableMeaningTable() {
  const [form] = Form.useForm();
  const { drawerTitle, editObj } = useTableStore();
  const { fields, setFields, tablePrikey, union } = useTableStore();
  const { setFormTableConfig } = useTableStore();
  const { genderOptions } = useTableStore();

  // 用于存储待更新的字段值，避免频繁更新 store
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const isInitializedRef = useRef(false);
  const prevFieldsLengthRef = useRef(0);

  function updateBizNameOrAlias() {
    const newFields = [...fields].map((item: any) => {
      return {
        ...item,
        alias: item.alias && item.alias.trim() ? item.alias : item.tfieldAlias,
        bizName: item.bizName && item.bizName.trim() ? item.bizName : item.tfieldAlias
      };
    });
    setFields(newFields);
  }

  function setBizNameOrAlias() {
    fields.forEach((field, index) => {
      form.setFieldsValue({
        [`tableConfig[${index}].alias`]: field.alias && field.alias.trim() ? field.alias : field.tfieldAlias,
        [`tableConfig[${index}].bizName`]: field.bizName && field.bizName.trim() ? field.bizName : field.tfieldAlias
      });
    });
  }

  function initForm() {
    const semanticTypeMap = getSemanticTypeMap(JSON.parse(editObj.modelDetail));
    const newFields = fields.map((field: any) => {
      try {
        const { alias, bizName, fieldDesc, semanticType } = semanticTypeMap.get(field.tfieldId);
        return {
          ...field,
          alias,
          bizName,
          fieldDesc,
          semanticType
        };
      } catch (error) {
        console.error(error);
        return {
          ...field,
          alias: '',
          bizName: '',
          fieldDesc: '',
          semanticType: ''
        };
      }
    });
    setFields(newFields);

    // 设置表单字段值
    setFormFieldValues(newFields, form);

    function setFormFieldValues(fieldsList: any[], formInstance: any) {
      fieldsList.forEach((field, index) => {
        formInstance.setFieldsValue({
          [`tableConfig[${index}].alias`]: field.alias && field.alias.trim() ? field.alias : field.tfieldAlias,
          [`tableConfig[${index}].bizName`]: field.bizName && field.bizName.trim() ? field.bizName : field.tfieldAlias,
          [`tableConfig[${index}].fieldDesc`]: field.fieldDesc,
          [`tableConfig[${index}].semanticType`]: field.semanticType
        });
      });
    }
  }

  // 优化 getSemanticTypeLabel：使用 Map 优化查找，避免 O(n*m) 复杂度
  function getSemanticTypeLabel() {
    if (fields.length > 0 && genderOptions.length > 0) {
      // 创建 value 到 label 的映射，时间复杂度从 O(n*m) 降为 O(n)
      const optionMap = new Map(genderOptions.map(opt => [opt.value, opt.label]));

      fields.forEach((field: any, index: number) => {
        const label = optionMap.get(field.semanticType);
        if (label) {
          form.setFieldValue(`tableConfig[${index}].semanticType`, label);
        }
      });
    }
  }

  // 防抖更新单个字段的函数
  const { run: debouncedUpdateField } = useDebounceFn(
    (index: number, field: string, value: string) => {
      const newFields = [...fieldsRef.current];
      newFields[index] = { ...newFields[index], [field]: value };
      setFields(newFields);
    },
    { wait: 300 } // 300ms 防抖延迟，可根据实际情况调整
  );

  // 防抖更新表中文名称的函数
  const { run: debouncedUpdateTableRemarks } = useDebounceFn(
    (tableName: string, rtableId: string, value: string) => {
      const newFields = fieldsRef.current.map((f: any) => {
        if ((f.tableName && f.tableName === tableName) || (f.rtableId && f.rtableId === rtableId)) {
          return { ...f, tableRemarks: value };
        }
        return f;
      });
      setFields(newFields);
    },
    { wait: 300 } // 300ms 防抖延迟
  );

  // 立即更新本地表单值，防抖更新 store
  const handleFieldChange = (index: number, field: string, value: string) => {
    // 先更新表单值，保证 UI 响应流畅
    form.setFieldValue(`tableConfig[${index}].${field}`, value);
    // 防抖更新 store，避免频繁触发全局状态更新
    debouncedUpdateField(index, field, formatField(value));
  };

  // 只在组件初始化时设置 form 配置，避免重复设置
  useEffect(() => {
    if (!isInitializedRef.current) {
      setFormTableConfig(form);
      isInitializedRef.current = true;
    }
  }, []);

  // 优化：只在字段数量变化时执行语义类型标签设置，而不是每次 fields 变化都执行
  useEffect(() => {
    // 只在字段数量变化时才执行，避免每次输入都执行
    if (fields.length !== prevFieldsLengthRef.current) {
      prevFieldsLengthRef.current = fields.length;
      if (fields.length > 0) {
        getSemanticTypeLabel();
      }
    }
  }, [fields.length, genderOptions]); // 只依赖长度和选项，不依赖整个 fields 数组

  useEffect(() => {
    if (drawerTitle !== '编辑表语义') {
      setTimeout(() => {
        updateBizNameOrAlias();
        setBizNameOrAlias();
      }, 200);
      return;
    }

    if (fields && fields.length > 0) {
      updateBizNameOrAlias();
      setBizNameOrAlias();
      initForm(); // 加载已保存的语义类型、中文名称、别名、字段描述
    }
  }, [drawerTitle]);

  /**
   * 根据字段类型返回语义类型（不考虑主键映射）
   */
  const getSemanticTypeByFieldType = (fieldType: string) => {
    switch (fieldType) {
      case 'DATETIME':
      case 'DATETIME64':
      case 'DATE':
      case 'TIME':
        return 'datetime';
    }
    if (fieldType.includes('TIMESTAMP')) {
      return 'datetime';
    }
    // 度量类型：模糊匹配包含 int、float、decimal 的类型（转小写兼容各种大小写）
    const lowerFieldType = fieldType?.toLowerCase() || '';
    const upperFieldType = fieldType?.toUpperCase() || '';
    if (lowerFieldType.includes('int') || 
        lowerFieldType.includes('float') || 
        lowerFieldType.includes('decimal') ||
        upperFieldType.includes('NUMBER') ||
        upperFieldType.includes('LONG')) {
      return 'measure';
    }
    if( fieldType.includes('VARCHAR')){
      return 'categorical';
    }
    switch (fieldType) {
      case 'STRING':
      case 'BOOL':
      case 'CHAR':
      case 'TEXT':
      case 'FIXEDSTRING':
      case 'NULLABLE':
      case 'CLOB':
        return 'categorical';
      default:
        return '';
    }
  };

  /**
   * 默认语义类型展示（只在编辑模式下使用）
   *
   * 1. 如果字段的originName 跟 TableName 与 tablePrikey中有匹配则优先展示主键（一个表只映射第一个主键）
   * 2. TIME、TIMESTAMP、DATE、DATETIME 展示 datetime
   * 3. VARCHAR CHAR等字符类型展示 categorical
   * 4. INT、FLOAT、DECIMAL（含各种位数变体如Int8, Int16, Float32, Decimal32等）展示 measure
   * 5. 其他情况不展示
   */
  const handleSemanticsShow = (record: DataTypea) => {
    const { fieldType, originName, tableName } = record;
    // 只在编辑模式下检查是否是数据库映射的主键（一个表只映射第一个）
    if (drawerTitle === '编辑表语义' && tablePrikey && tablePrikey.length > 0) {
      // 找出当前表的所有主键字段
      const currentTablePrimaryKeys = tablePrikey.filter(item => item.tableName === tableName);
      // 如果有主键，只映射第一个
      if (currentTablePrimaryKeys.length > 0) {
        const firstPrimaryKey = currentTablePrimaryKeys[0];
        if (firstPrimaryKey.originName === originName && firstPrimaryKey.tableName === tableName) {
          return 'primary_key';
        }
      }
    }
    return getSemanticTypeByFieldType(fieldType);
  };

  const onFieldChange = (index: number, field: string, value: string, placeholder: string, isRequired: boolean) => {
    // 根据不同字段设置不同的字符限制
    const getMaxLength = (fieldName: string) => {
      switch (fieldName) {
        case 'bizName':
          return { max: 50, message: '中文名称最多50个字符' };
        case 'alias':
          return { max: 200, message: '别名最多200个字符' };
        case 'fieldDesc':
          return { max: 500, message: '字段描述最多500个字符' };
        default:
          return { max: 500, message: '输入最多500个字符' };
      }
    };

    const maxLengthRule = getMaxLength(field);

    return (
      <div className="flex items-center" data-field-type={field}>
        {isRequired && <Star />}
        <AForm.Item
          className="mb0"
          initialValue={value}
          name={`tableConfig[${index}].${field}`}
          rules={[
            { message: '输入不能为空', required: isRequired },
            maxLengthRule
          ]}
        >
          <AInput
            placeholder={placeholder}
            data-field-type={field}
            onChange={e => {
              handleFieldChange(index, field, e.target.value);
            }}
          />
        </AForm.Item>
      </div>
    );
  };

  const tableMeanConfig: TableColumnsType<DataTypea> = [
    {
      dataIndex: 'originName',
      key: 'originName',
      render: (text: string, record: DataTypea) => (
        <span>
          {text}
          <ATooltip title={<div>{record.tableName}</div>}>
            <span style={{ color: 'red', marginLeft: 8 }}>?</span>
          </ATooltip>
        </span>
      ),
      title: '英文名称'
    },
    {
      dataIndex: 'fieldType',
      key: 'fieldType',
      title: '字段类型'
    },
    {
      dataIndex: 'gender',
      key: 'gender',
      render: (text: string | undefined, record: any, index: number) => {
        // 使用全局索引而不是表内索引
        const globalIndex = record.globalIndex;
        
        // 获取语义类型：优先使用已保存的，否则使用默认规则计算
        let initSemanticType = record.semanticType;
        if (!initSemanticType) {
          initSemanticType = handleSemanticsShow(record);
          // 将计算出的默认值保存到 record 和 fields state
          if (initSemanticType) {
            record.semanticType = initSemanticType;
            // 同步更新 fields state，确保数据一致性
            const newFields = [...fields];
            if (globalIndex !== undefined && !newFields[globalIndex].semanticType) {
              newFields[globalIndex].semanticType = initSemanticType;
              setFields(newFields);
            }
            // 同步更新表单值
            form.setFieldValue(`tableConfig[${globalIndex}].semanticType`, initSemanticType);
          }
        }

        return (
          <div className="w-40 flex items-center" data-field-type="semantic-type">
            <AForm.Item
              required
              className="m-0 flex items-center"
              initialValue={initSemanticType}
              name={`tableConfig[${globalIndex}].semanticType`}
              rules={[{ message: '语义类型未选择', required: true }]}
            >
              <ASelect
                options={genderOptions}
                style={{
                  borderColor: text === '' ? 'red' : undefined,
                  width: 120
                }}
                data-field-type="semantic-type"
                data-field-index={globalIndex}
                onChange={value => {
                  const newFields = [...fields];
                  
                  // 单选主键功能：一个表只能有一个主键
                  if (value === "primary_key") {
                    const currentTableName = record.tableName;
                    // 遍历所有字段，将同一表的其他主键改为默认类型（包括自动映射的第一个主键）
                    newFields.forEach((field, idx) => {
                      // 同一个表且不是当前字段且是主键
                      if (field.tableName === currentTableName && idx !== globalIndex && field.semanticType === "primary_key") {
                        // 根据字段类型自动改成其他类型（不考虑 tablePrikey 映射）
                        const defaultType = getSemanticTypeByFieldType(field.fieldType);
                        newFields[idx] = {
                          ...newFields[idx],
                          semanticType: defaultType
                        };
                        form.setFieldValue(`tableConfig[${idx}].semanticType`, defaultType);
                      }
                    });
                  }

                  newFields[globalIndex] = {
                    ...newFields[globalIndex],
                    semanticType: value
                  };
                  setFields(newFields);
                  form.setFieldValue(`tableConfig[${globalIndex}].semanticType`, value);
                }}
              />
              {!record.semanticType && (
                <ATooltip title="请选择语义类型">
                  <span style={{ color: 'red', marginLeft: 8 }}>⚠️</span>
                </ATooltip>
              )}
            </AForm.Item>
          </div>
        );
      },
      title: (
        <span>
          语义类型
          <TableTooltip />
        </span>
      )
    },
    {
      dataIndex: 'bizName',
      key: 'bizName',
      render: (_: string, record: any, index: number) => {
        const globalIndex = record.globalIndex;
        return onFieldChange(globalIndex, 'bizName', record.bizName, '请输入中文名称(逗号分割)', true);
      },
      title: '中文名称'
    },
    {
      dataIndex: 'alias',
      key: 'alias',
      render: (_: string, record: any, index: number) => {
        const globalIndex = record.globalIndex;
        return onFieldChange(globalIndex, 'alias', record.alias, '请输入别名(逗号分割)', true);
      },
      title: '别名'
    },
    {
      dataIndex: 'fieldDesc',
      key: 'fieldDesc',
      render: (_: string, record: any, index: number) => {
        const globalIndex = record.globalIndex;
        return onFieldChange(globalIndex, 'fieldDesc', record.fieldDesc, '请输入字段描述', false);
      },
      title: '字段描述'
    }
  ];

  // 字段类型分类
  const fieldTypeCategories = {
    // 日期时间字段
    datetime: ['DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR', 'INTERVAL'],
    // 字符串字段
    string: ['CHAR', 'VARCHAR', 'TEXT', 'STRING', 'NCHAR', 'NVARCHAR'],
    // 数值字段
    numeric: [
      'TINYINT',
      'SMALLINT',
      'MEDIUMINT',
      'INTEGER',
      'INT',
      'BIGINT',
      'NUMBER',
      'FLOAT',
      'DOUBLE',
      'REAL',
      'DECIMAL',
      'NUMERIC',
      'LONG'
    ]
    // 其他字段: BOOLEAN、BOOL、ENUM、SET、JSON、XML、ARRAY、GEOGRAPHY 等等
  };

  // 获取字段类型的排序优先级 (1: 日期, 2: 字符串, 3: 数值, 4: 其他)
  const getFieldTypePriority = (fieldType: string): number => {
    const upperFieldType = fieldType?.toUpperCase() || '';
    
    // 处理 NUMBER(x,y) 这种带括号的类型
    const baseType = upperFieldType.split('(')[0];
    
    if (fieldTypeCategories.datetime.includes(baseType)) {
      return 1;
    }
    if (fieldTypeCategories.string.includes(baseType)) {
      return 2;
    }
    if (fieldTypeCategories.numeric.includes(baseType)) {
      return 3;
    }
    return 4; // 其他类型
  };

  // 从 union 数据中提取 rtableName 映射
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
    if (viewData && viewData.length > 0) {
      traverse(viewData[0], result);
    }
    return result;
  }

  const rTableNamesMap = union && union.length > 0 ? getRTableNames(union) : {};

  // 按表名分组字段，并保留全局索引
  const groupedFields = fields.reduce((acc: Record<string, Array<DataTypea & { globalIndex: number }>>, field: DataTypea, globalIndex: number) => {
    const tableName = field.tableName || '未命名表';
    if (!acc[tableName]) {
      acc[tableName] = [];
    }
    acc[tableName].push({ ...field, globalIndex });
    return acc;
  }, {} as Record<string, Array<DataTypea & { globalIndex: number }>>);

  // 对每个表内的字段按类型排序
  Object.keys(groupedFields).forEach(tableName => {
    groupedFields[tableName].sort((a: any, b: any) => {
      const priorityA = getFieldTypePriority(a.fieldType);
      const priorityB = getFieldTypePriority(b.fieldType);
      return priorityA - priorityB;
    });
  });

  return (
    <AForm form={form}>
      <div className="space-y-6">
        {Object.entries(groupedFields).map(([tableName, tableFields]) => {
          // 获取表的中文名称，从 union 数据中通过 rtableId 获取 rtableName
          const firstField = (tableFields as DataTypea[])[0] as any;
          const rtableId = firstField?.rtableId;
          const rtableName = rtableId ? (rTableNamesMap[rtableId] || '') : '';
          const tableChineseName = (firstField?.tableRemarks && firstField.tableRemarks.trim())
            ? firstField.tableRemarks
            : (rtableName && rtableName.trim() ? rtableName : '');
          
          return (
            <div key={tableName} className="border border-solid border-gray-300 rounded-lg p-4">
              <div className="mb-3 flex items-center gap-6">
                <div className="flex items-center">
                  <span className="text-base font-medium">表名称：</span>
                  <span className="text-base font-medium mr-15">{tableName}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-base font-medium">中文名称：</span>
                  <div className="flex items-center">
                    <Star />
                    <ATooltip 
                      placement="top" 
                      title={form.getFieldValue(`tableHeader[${rtableId || tableName}].rtableName`) || tableChineseName || '请输入表中文名称'}
                    >
                      <AForm.Item
                        className="mb0"
                        initialValue={tableChineseName}
                        name={`tableHeader[${rtableId || tableName}].rtableName`}
                        rules={[{ message: '请输入表中文名称', required: true }, { max: 200, message: '中文名称最多200个字符' }]}
                      >
                        <AInput
                          placeholder="请输入表中文名称"
                          style={{ width: 200 }}
                          data-field-type="table-chinese-name"
                          onChange={e => {
                            const value = e.target.value;
                            // 先立即更新表单值，保证 UI 响应流畅
                            form.setFieldValue(`tableHeader[${rtableId || tableName}].rtableName`, value);
                            // 防抖更新 store，避免频繁遍历整个 fields 数组
                            debouncedUpdateTableRemarks(tableName, rtableId, value);
                          }}
                        />
                      </AForm.Item>
                    </ATooltip>
                  </div>
                </div>
              </div>
              <ATable
                columns={tableMeanConfig}
                dataSource={tableFields as DataTypea[]}
                pagination={false}
                rowKey="key"
              />
            </div>
          );
        })}
      </div>
    </AForm>
  );
}
