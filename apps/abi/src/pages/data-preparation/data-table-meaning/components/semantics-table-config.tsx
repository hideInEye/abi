import type { TableColumnsType } from 'antd';
import { Form } from 'antd';
import { useEffect } from 'react';

import Star from '../../../../components/star/index.tsx';
import { useTableStore } from '../store/useTableStore';
import type { DataTypea } from '../types';
import { getSemanticTypeMap } from '../utils/getDefaultField';
import { formatField } from '../utils/helper';

import { TableTooltip } from './table-tooltip';

export default function DataTableMeaningTable() {
  const [form] = Form.useForm();
  const { drawerTitle, editObj } = useTableStore();
  const { fields, setFields, tablePrikey } = useTableStore();
  const { setFormTableConfig } = useTableStore();
  const { genderOptions } = useTableStore();

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

  function getSemanticTypeLabel() {
    if (fields.length > 0) {
      fields.forEach((field: any, index: number) => {
        genderOptions.forEach((option: any) => {
          if (field.semanticType === option.value) {
            form.setFieldValue(`tableConfig[${index}].semanticType`, option.label);
          }
        });
      });
    }
  }

  useEffect(() => {
    setFormTableConfig(form);
    getSemanticTypeLabel();
  }, [fields]);

  useEffect(() => {
    if (drawerTitle === '编辑表语义') {
      setTimeout(() => {
        updateBizNameOrAlias();
        setBizNameOrAlias();
        initForm();
      }, 200);
      return;
    }

    if (fields && fields.length > 0) {
      updateBizNameOrAlias();
      setBizNameOrAlias();
    }
  }, [drawerTitle]);

  /**
   * 默认语义类型展示
   *
   * 1. 如果字段的originName 跟 TableName 与 tablePrikey中有匹配则优先展示主键
   * 2. TIME、TIMESTAMP、DATE、DATETIME 展示 datetime
   * 3. INT VARCHAR CHAR展示 categorical
   * 4. FLOAT跟DECIMAL展示 measure
   * 5. 其他情况不展示
   */
  const handleSemanticsShow = (record: DataTypea) => {
    const { fieldType, originName, tableName } = record;
    if (tablePrikey && tablePrikey.length > 0) {
      const data = tablePrikey.find(item => item.originName === originName && item.tableName === tableName) || {};
      if (Object.keys(data).length > 0) {
        record.semanticType = 'primary_key';
        return 'primary_key';
      }
    }
    switch (fieldType) {
      case 'DATETIME':
      case 'TIMESTAMP':
      case 'DATE':
      case 'TIME':
        return 'datetime';
      case 'INT':
      case 'VARCHAR':
      case 'CHAR':
      case 'TEXT':
        return 'categorical';
      case 'FLOAT':
      case 'DECIMAL':
      case 'LONG':
        return 'measure';
      default:
        return '';
    }
  };

  const onFieldChange = (index: number, field: string, value: string, placeholder: string, isRequired: boolean) => {
    return (
      <div className="flex items-center">
        {isRequired && <Star />}
        <AForm.Item
          className="mb0"
          initialValue={value}
          name={`tableConfig[${index}].${field}`}
          rules={[
            { message: '输入不能为空', required: isRequired },
            { max: 50, message: '输入最多50个字符' }
          ]}
        >
          <AInput
            placeholder={placeholder}
            onChange={e => {
              const newFields = [...fields];
              newFields[index] = { ...newFields[index], [field]: formatField(e.target.value) };
              setFields(newFields);
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
      render: (text: string | undefined, record: DataTypea, index: number) => {
        let initSemanticType = record.semanticType;
        if (!initSemanticType) {
          initSemanticType = handleSemanticsShow(record);
        }
        record.semanticType = initSemanticType;

        return (
          <div className="w-40 flex items-center">
            <AForm.Item
              required
              className="m-0 flex items-center"
              initialValue={initSemanticType}
              name={`tableConfig[${index}].semanticType`}
              rules={[{ message: '语义类型未选择', required: true }]}
            >
              <ASelect
                options={genderOptions}
                value={initSemanticType}
                style={{
                  borderColor: text === '' ? 'red' : undefined,
                  width: 120
                }}
                onChange={value => {
                  const newFields = [...fields];
                  // 注释掉单选主键功能
                  // if (value === "primary_key") {
                  //   newFields.forEach((i) => {
                  //     if (i.semanticType === "primary_key") {
                  //       i.semanticType = "";
                  //     }
                  //   });
                  // }
                  newFields[index] = {
                    ...newFields[index],
                    semanticType: value
                  };
                  setFields(newFields);
                  form.setFieldValue(`tableConfig[${index}].semanticType`, value);
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
      render: (_: string, record: DataTypea, index: number) => {
        return onFieldChange(index, 'bizName', record.bizName, '请输入中文名称(逗号分割)', true);
      },
      title: '中文名称'
    },
    {
      dataIndex: 'alias',
      key: 'alias',
      render: (_: string, record: DataTypea, index: number) => {
        return onFieldChange(index, 'alias', record.alias, '请输入别名(逗号分割)', true);
      },
      title: '别名'
    },
    {
      dataIndex: 'fieldDesc',
      key: 'fieldDesc',
      render: (_: string, record: DataTypea, index: number) => {
        return onFieldChange(index, 'fieldDesc', record.fieldDesc, '请输入字段描述', false);
      },
      title: '字段描述'
    }
  ];

  return (
    <AForm form={form}>
      <ATable
        columns={tableMeanConfig}
        dataSource={fields}
        pagination={false}
        rowKey="key"
      />
    </AForm>
  );
}
