import { DeleteOutlined, EditOutlined, SwapOutlined } from '@ant-design/icons';
import type { GetRef, InputRef, TableProps } from 'antd';
import { Cascader, Form, Popconfirm, Table } from 'antd';
import { cloneDeep } from 'lodash';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { DataCollectionOperateContext } from '../context';
import styles from '../index.module.css';

import type { DataType } from './BatchManage';
import CalculatedFieldModal from './CalculatedFieldModal';
import { fieldTypeOptions } from './Commons';
import SimpleModal from './SimpleModal';

type FormInstance<T> = GetRef<typeof Form<T>>;

const EditableContext = React.createContext<FormInstance<any> | null>(null);

type FormType = 'cascader' | 'input';

interface EditableRowProps {
  readonly index: number;
}

const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {

  const [form] = Form.useForm();
  return (
    <Form
      component={false}
      form={form}
    >
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
};

interface EditableCellProps {
  readonly dataIndex: any;
  readonly editable: boolean;
  readonly formType: FormType;
  readonly handleSave: (record: any) => void;
  readonly record: any;
  readonly title: React.ReactNode;
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
  children,
  dataIndex,
  editable,
  formType,
  handleSave,
  record,
  title,
  ...restProps
}) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<InputRef>(null);
  const selectRef = useRef<any>(null);
  const form = useContext(EditableContext)!;
  const [modalType, setModalType] = useState('');

  useEffect(() => {
    if (dataIndex && record) {
      const val = record[dataIndex];
      form.setFieldsValue({ [dataIndex]: val });
    }
  }, [dataIndex, form, record]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const toggleEdit = () => {
    setEditing(!editing);
    form.setFieldsValue({ [dataIndex]: record[dataIndex] });
  };

  const save = async (needToggleEdit?: boolean) => {
    try {
      const _values = await form.validateFields();
      const [sysFiledType, dateFormat] = _values.sysFiledType;
      let values = cloneDeep(_values);
      if (sysFiledType !== undefined) {
        values = { ...values, sysFiledType };
        if (dateFormat) {
          values.dateFormat = dateFormat;
        }
      }
      if (needToggleEdit) {
        toggleEdit();
      }
      console.log({ ...record, ...values });

      handleSave({ ...record, ...values });
    } catch (errInfo) {
      console.log('Save failed:', errInfo);
    }
  };

  let childNode = children;

  const formTypeMap = {
    cascader: (
      <Form.Item
        name={dataIndex}
        rules={[{ message: `${title} is required.`, required: true }]}
        style={{ margin: 0 }}
      >
        <Cascader
          options={fieldTypeOptions}
          ref={selectRef}
          onChange={(val: any) => {
            if (val[1] === 'custom') {
              setModalType('custom');
            } else {
              save();
            }
          }}
        />
      </Form.Item>
    ),
    input: (
      <Form.Item
        name={dataIndex}
        rules={[{ message: `${title} is required.`, required: true }]}
        style={{ margin: 0 }}
      >
        <AInput
          ref={inputRef}
          onBlur={() => save(true)}
          onPressEnter={() => save(true)}
        />
      </Form.Item>
    )
  };

  if (editable) {
    childNode =
      editing || formType === 'cascader' ? (
        formTypeMap[formType]
      ) : (
        <div
          className="border border-#D9D9D9 rounded px-11px py-4px"
          style={{ paddingInlineEnd: 24 }}
          onClick={toggleEdit}
        >
          {children}
        </div>
      );
  }
  const onClose = (val: any) => {
    const resetField = { dateFormat: val.custom, sysFiledType: 1 };
    handleSave({ ...record, ...resetField });
    setModalType('');
  };

  return (
    <>
      <td {...restProps}>{childNode}</td>
      {modalType ? (
        <SimpleModal
          type={modalType}
          onClose={onClose}
        />
      ) : null}
    </>
  );
};

type ColumnTypes = Exclude<TableProps<DataType>['columns'], undefined>;

type SwitchType = 'd' | 'q';

interface PropsType {
  readonly tfieldType: SwitchType;
}

const EditableTable: React.FC<PropsType> = ({ tfieldType }) => {
  const { allFields, setAllFields } = useContext(DataCollectionOperateContext);
  const [dataSource, setDataSource] = useState<any[]>([]);
  useEffect(() => {
    const filterArr = allFields.filter((item: any) => item.tfieldType === tfieldType);
    const formatArr = filterArr.map((item: any) => {
      return {
        ...item,
        sysFiledType: item.sysFiledType === 1 ? [item.sysFiledType, item.dateFormat] : [item.sysFiledType]
      };
    });
    setDataSource(formatArr);
  }, [allFields, tfieldType]);

  // const dataSource = useMemo(() => {
  //   return allFields.filter((item: any) => item.tfieldType === tfieldType);
  // }, [allFields, tfieldType]);

  const [visible, setVisible] = useState(false);
  const [editRow, setEditRow] = useState<DataType>();

  const [count, setCount] = useState(2);

  const handleDelete = (tfieldId: string) => {
    setAllFields((state: any) => {
      const _allFields = cloneDeep(state);
      const curIndex = _allFields.findIndex((item: any) => item.tfieldId === tfieldId);
      _allFields.splice(curIndex, 1);
      return _allFields;
    });
  };

  const handleCopy = (record: any) => {
    setAllFields((state: any) => {
      const _state = cloneDeep(state);
      const curIndex = _state.findIndex((item: any) => item.tfieldId === record.tfieldId)
      const rec  = {
        ...record,
        sysFiledType: record.sysFiledType[0]
      }
      _state.splice(curIndex + 1, 0, {
        ...rec,
        fieldType: '计算字段',
        // isEdit: true,
        name: '',
        originName: `${record.originName}_copy`,
        tableName: '',
        tfieldId: `${record.tfieldId}${Math.floor(Math.random() * 1000)}`
      });
      return _state;
    });
    setCount(count + 1);
  };

  // const handleCopy = (record: any) => {
  //   setDataSource((state: any) => {
  //     const _state = cloneDeep(state);
  //     const curIndex = allFields.findIndex((item: any) => item.tfieldId === record.tfieldId);
  //     _state.splice(curIndex + 1, 0, {
  //       ...record,
  //       fieldType: '计算字段',
  //       isEdit: true,
  //       name: '',
  //       originName: `${record.originName}_copy`,
  //       tableName: '',
  //       tfieldId: `${record.tfieldId}${Math.floor(Math.random() * 1000)}`
  //     });
  //     return _state;
  //   });
  //   setCount(count + 1);
  // };

  const handleEdit = (record: DataType) => {
    setVisible(true);
    setEditRow(record);
  };

  const handleSwitchType = (record: any) => {
    const rec  = {
      ...record,
      sysFiledType: record.sysFiledType[0]
    }
    setAllFields((state: any) => {
      const _allFields = cloneDeep(state);
      const curIndex = allFields.findIndex((item: any) => item.tfieldId === record.tfieldId);
      _allFields.splice(curIndex, 1, { ...rec, tfieldType: record.tfieldType === 'd' ? 'q' : 'd' });
      return _allFields;
    });
  };

  const defaultColumns: (any & { dataIndex: string; editable?: boolean; formType?: FormType })[] = useMemo(() => {
    return [
      {
        dataIndex: 'tfieldShowName',
        editable: true,
        formType: 'input',
        title: '字段名称',
        width: 200
      },
      {
        dataIndex: 'originName',
        title: '物理字段名',
        width: 120
      },
      {
        dataIndex: 'tfieldAlias',
        title: '字段备注'
      },
      {
        dataIndex: 'tableName',
        title: '表名'
      },
      {
        dataIndex: 'sysFiledType',
        editable: true,
        formType: 'cascader',
        title: '字段类型',
        width: 220
      },
      {
        dataIndex: 'fieldType',
        title: '物理字段类型',
        width: 120
      },
      {
        dataIndex: 'tfieldType',
        render: (_: unknown, record: any) => (
          <ATooltip title={tfieldType === 'd' ? '转换为指标' : '转换为维度'}>
            <AButton
              ghost
              className="text-primary"
              icon={<SwapOutlined />}
              type="text"
              onClick={() => handleSwitchType(record)}
            />
          </ATooltip>
        ),
        title: tfieldType === 'd' ? '维度' : '指标'
      },
      {
        dataIndex: 'operation',
        fixed: 'right',
        render: (_: unknown, record: any) => (
          <>
            <AButton
              ghost
              className="text-primary"
              icon={<SvgIcon localIcon="copy" />}
              type="text"
              onClick={() => handleCopy(record)}
            />
            <Popconfirm
              title="确定要删除吗？"
              onConfirm={() => handleDelete(record.tfieldId!)}
            >
              <AButton
                ghost
                className="text-primary"
                icon={<DeleteOutlined />}
                type="text"
              />
            </Popconfirm>
            {record.isEdit ? (
              <AButton
                ghost
                className="text-primary"
                icon={<EditOutlined className="tex-14px" />}
                type="text"
                onClick={() => handleEdit(record)}
              />
            ) : null}
          </>
        ),
        title: '操作'
      }
    ];
  }, [tfieldType]);

  const handleSave = (row: any) => {
    setAllFields((state: any) => {
      const newData = cloneDeep(state);
      const index = newData.findIndex((item: any) => row.tfieldId === item.tfieldId);
      const item = newData[index];
      newData.splice(index, 1, {
        ...item,
        ...row
      });
      return newData;
    });
  };

  const components = {
    body: {
      cell: EditableCell,
      row: EditableRow
    }
  };

  const columns = defaultColumns.map(col => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: DataType) => ({
        dataIndex: col.dataIndex,
        editable: col.editable,
        formType: col.formType,
        handleSave,
        record,
        title: col.title
      })
    };
  });

  const onClose = (values?: any) => {
    if (values) {
      setAllFields((state: any) => {
        const newData = cloneDeep(state);
        const index = newData.findIndex((item: any) => values?.tfieldId === item.tfieldId);
        const item = newData[index];
        newData.splice(index, 1, {
          ...item,
          ...values,
          isEdit: false
        });
        return newData;
      });
    }
    setVisible(false);
    setEditRow(undefined);
  };

  return (
    <>
      <Table<DataType>
        bordered
        className={styles['datasource-table-container']}
        columns={columns as ColumnTypes}
        components={components}
        dataSource={dataSource}
        pagination={false}
        rowClassName={() => 'editable-row'}
        scroll={{ x: 'max-content' }}
      />

      {visible ? (
        <CalculatedFieldModal
          data={editRow}
          onClose={onClose}
        />
      ) : null}
    </>
  );
};

export default EditableTable;
