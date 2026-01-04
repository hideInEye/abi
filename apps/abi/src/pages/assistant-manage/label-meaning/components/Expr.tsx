import { DeleteOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, TreeSelect } from 'antd';
import React from 'react';

import Star from '../../../../components/star';
import { inequalityOptions, logicalOperators } from '../constants';

export type Condition = {
  metric: string;
  operator: string;
  value: number | string;
};

export type Expression = {
  binName: string;
  conditions: Condition[];
  logic: 'AND' | 'OR';
};

const defaultCondition: Condition = {
  metric: '',
  operator: '>=',
  value: ''
};

interface ExpressionBuilderProps {
  readonly allFields: any[];
}

const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({ allFields }) => {
  const getExpressionLabel = (index: number) => `表达式 ${String.fromCharCode(65 + index)}`; // A, B, C

  function transformToTree(data: any, disabled: boolean, search: string): any {
    // 初始化树结构
    const tree = [
      {
        children: [],
        key: 'dimensions',
        selectable: false,
        title: '维度'
      },
      {
        children: [],
        key: 'measures',
        selectable: false,
        title: '度量'
      },
      {
        children: [],
        key: 'dates',
        selectable: false,
        title: '日期'
      }
    ];

    // 用于记录已经处理过的表名，避免重复
    const tableMap: any = {
      dates: {},
      dimensions: {},
      measures: {}
    };

    // 遍历原始数据
    data.forEach((item: any) => {
      const type = item.tfieldType; // dimensions, measures 或 dates
      const tableKey = `${type}${item.tableName}`;
      const fieldName = item.fieldName;
      const techId = item.techId;

      // 找到对应的树节点
      const typeNode = tree.find(node => node.key === type);
      if (!typeNode) return;

      // 检查是否已经存在该表的节点
      if (!tableMap[type][tableKey]) {
        // 创建新的表节点
        const tableNode = {
          children: [],
          key: tableKey,
          selectable: false,
          title: item.tableName
        };
        typeNode.children.push(tableNode);
        tableMap[type][tableKey] = tableNode;
      }

      // 添加字段节点
      const tableNode = tableMap[type][tableKey];
      if (fieldName.includes(search) || !search) {
        tableNode.children.push({
          ...item,
          disabled,
          isLeaf: true,
          key: techId,
          title: fieldName
        });
      }
    });

    return tree;
  }

  const treeData = useMemo(() => {
    const originalData = [...allFields];
    const data = transformToTree(originalData, false, '');
    return data;
  }, [allFields]);

  return (
    <Form.List name="exp">
      {(fields, { add, remove }) => (
        <div className="my10">
          <div className="flex items-center gap-2">
            <div>表达式定义</div>
            <Button
              shape="round"
              size="small"
              type="primary"
              onClick={() => add({ binName: '', conditions: [defaultCondition], logic: 'AND' })}
            >
              新增表达式
            </Button>
          </div>

          {fields.map((field,index,rest) =>{             
           return <div
              className="my4 rounded-md bg-gray-1/40 p-4"
              key={field.key}
            >
              <div className="mb-4 flex items-center justify-between">
                {getExpressionLabel(field.name)}
                <div className="flex items-center gap-2">
                  <Form.Item
                    label="标签名称"
                    layout="horizontal"
                    name={[field.name, 'binName']}
                    style={{ marginBottom: 0 }}
                    rules={[
                      { message: '请输入标签名称', required: true },
                      { max: 50, message: '标签名称不能超过50个字符' }
                    ]}
                  >
                    <Input placeholder="标签名称" />
                  </Form.Item>

                  {rest.length>1&&
                  <DeleteOutlined
                    className="cursor-pointer"
                    onClick={() => {
                      remove(field.name);
                    }}
                  />
                }
                </div>
              </div>

              {/* 嵌套的 Form.List 用于条件 */}
              <Form.List name={[field.name, 'conditions']}>
                {(subFields, subOpt) => (
                  <div style={{ display: 'flex', flexDirection: 'column', rowGap: 16 }}>
                    {subFields.map((subField,childIndex,childRest) => (
                      <div
                        className="my2 flex items-center gap-2"
                        key={subField.key}
                      >
                        <div className="flex">
                          <Star />
                          <Form.Item
                            name={[subField.name, 'metric']}
                            rules={[{ message: '请选择指标', required: true }]}
                          >
                            <TreeSelect
                              showSearch
                              treeDefaultExpandAll
                              dropdownStyle={{ maxHeight: 300 }}
                              fieldNames={{ label: 'title', value: 'key' }}
                              listHeight={256}
                              placeholder="请选择指标/维度"
                              style={{ width: 250 }}
                              treeData={treeData}
                              treeNodeFilterProp="title"
                            />
                          </Form.Item>
                        </div>

                        <Form.Item
                          name={[subField.name, 'operator']}
                          rules={[{ message: '请选择操作符', required: true }]}
                        >
                          <Select
                            options={inequalityOptions}
                            placeholder="选择操作符"
                            style={{ width: 150 }}
                          />
                        </Form.Item>

                        <div className="flex">
                          <Star />
                          <Form.Item
                            name={[subField.name, 'value']}
                            rules={[{ message: '请输入值', required: true }]}
                          >
                            <Input
                              placeholder="输入值"
                              style={{ width: 150 }}
                              type="number"
                            />
                          </Form.Item>
                        </div>

                        {/* 逻辑操作符（除了最后一个条件） */}
                        <Form.Item
                          hidden={subField.name === subFields.length - 1}
                          name={[field.name, 'logic']}
                        >
                          <Select
                            options={logicalOperators}
                            style={{ width: 60 }}
                          />
                        </Form.Item>

                        <div className="grid grid-cols-2 mt--6 gap-2">
                          <Button
                            icon={<PlusOutlined />}
                            title="在此位置后添加条件"
                            onClick={() => subOpt.add(defaultCondition, subField.name + 1)}
                          />
                        {childRest.length>1&&
                          <Button
                            icon={<MinusCircleOutlined />}
                            title="删除此条件"
                            onClick={() => {
                              subOpt.remove(subField.name);
                            }}
                          />
                          }
                        </div>
                      </div>
                    ))}

                    {/* 如果没有条件，显示添加按钮 */}
                    {subFields.length === 0 && (
                      <Button
                        block
                        icon={<PlusOutlined />}
                        type="dashed"
                        onClick={() => subOpt.add(defaultCondition)}
                      >
                        添加条件
                      </Button>
                    )}
                  </div>
                )}
              </Form.List>
            </div>
          })}
        </div>
      )}
    </Form.List>
  );
};

export default ExpressionBuilder;
