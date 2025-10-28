import type { GetRef, TableProps } from 'antd';
import { Form, Select } from 'antd';
import { cloneDeep } from 'lodash';
import React, { useContext, useEffect, useRef, useState } from 'react';

// import styles from '../index.module.css';

type FormInstance<T> = GetRef<typeof Form<T>>;

const EditableContext = React.createContext<FormInstance<any> | null>(null);

type FormType = 'input' | 'select';

interface EditableRowProps {
  readonly index: number;
}

const FIELD_TYPE_OPTIONS = [
  {
    icon: 'text',
    key: 0,
    label: '文本',
    value: 'TEXT'
  },
  {
    icon: 'value',
    key: 2,
    label: '数值',
    value: 'LONG'
  },
  {
    icon: 'value',
    key: 3,
    label: '数值(小数)',
    value: 'DOUBLE'
  }
];

const fieldTypeOptions = FIELD_TYPE_OPTIONS.map(({ icon, label, value }) => ({
  label: (
    <>
      <SvgIcon
        className="mr-2 inline-block"
        localIcon={icon}
      />
      <span>{label}</span>
    </>
  ),
  value
}));

const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {
  console.log(index, { ...props });

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
  const inputRef = useRef<any>(null);
  const selectRef = useRef<any>(null);
  const form = useContext(EditableContext)!;

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
      const values = await form.validateFields();
      console.log('values', values);
      // const [sysFiledType] = _values.sysFiledType;
      // if (sysFiledType !== undefined) {
      //   values = { ...values, sysFiledType };
      // }
      if (needToggleEdit) {
        toggleEdit();
      }
      handleSave({ ...record, ...values });
    } catch (errInfo) {
      console.log('Save failed:', errInfo);
    }
  };

  let childNode = children;

  const formTypeMap = {
    input: (
      <Form.Item
        name={dataIndex}
        style={{ margin: 0 }}
      >
        <AInputNumber
          className="w-full"
          disabled={record?.fieldType !== 'TEXT'}
          precision={0}
          ref={inputRef}
          onBlur={() => save(true)}
          onPressEnter={() => save(true)}
        />
      </Form.Item>
    ),
    select: (
      <Form.Item
        name={dataIndex}
        rules={[{ message: `${title} is required.`, required: true }]}
        style={{ margin: 0 }}
      >
        <Select
          options={fieldTypeOptions}
          ref={selectRef}
          onChange={() => save()}
        />
      </Form.Item>
    )
  };

  if (editable) {
    childNode =
      editing || formType === 'select' ? (
        formTypeMap[formType]
      ) : (
        <div
          className="min-h-30px border border-#D9D9D9 rounded px-11px py-4px"
          style={{ paddingInlineEnd: 24 }}
          onClick={toggleEdit}
        >
          {children}
        </div>
      );
  }

  return <td {...restProps}>{childNode}</td>;
};

type ColumnTypes = Exclude<TableProps<any>['columns'], undefined>;

interface PropsType {
  readonly data: any[];
  readonly setData: (data: any) => void;
}

const FieldSelectTable: React.FC<PropsType> = ({ data, setData }) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [dataSource, setDataSource] = useState<any[]>([]);
  useEffect(() => {
    if (data?.[0]?.fields) {
      setDataSource(data[0].fields || []);
      const keys = data[0].fields.reduce((arr: number[], item: any) => {
        if (item.checked) {
          arr.push(item.index);
        }
        return arr;
      }, []);
      setSelectedRowKeys(keys);
    }
  }, [data]);

  const defaultColumns = [
    {
      dataIndex: 'name',
      title: '字段名称',
      width: 200
    },
    {
      dataIndex: 'fieldType',
      editable: true,
      formType: 'select',
      title: '字段类型',
      width: 100
    },
    {
      dataIndex: 'length',
      editable: true,
      formType: 'input',
      title: '字段长度',
      width: 100
    }
  ];

  const handleSave = (row: any) => {
    try {
      const _state = cloneDeep(data);
      _state[0].fields[row.index] = row;
      setData(_state);
    } catch (error) {
      console.log(error);
    }
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
      onCell: (record: any) => ({
        dataIndex: col.dataIndex,
        editable: col.editable,
        formType: col.formType,
        handleSave,
        record,
        title: col.title
      })
    };
  });

  const rowSelection: TableProps<any>['rowSelection'] = {
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
      const _state = cloneDeep(data);
      try {
        _state[0].fields = _state[0].fields.map((item: any, index: number) => ({
          ...item,
          checked: selectedKeys.includes(index)
        }));
        setData(_state);
      } catch (error) {
        console.log(error);
      }
    },
    selectedRowKeys
  };

  return (
    <ATable
      components={components}
      dataSource={dataSource}
      pagination={false}
      rowClassName={() => 'editable-row'}
      rowKey='index'
      rowSelection={{ type: 'checkbox', ...rowSelection }}
      scroll={{ x: 'max-content' }}
      bordered
      // className={styles['datasource-table-container']}
      columns={columns as ColumnTypes}
    />
  );
};

export default FieldSelectTable;
