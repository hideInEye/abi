import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

import { inequalityOptions, letters, logicalOperators } from '../../constants';
import type { IAllFields } from '../../types';
import { convertTo2DArray } from '../../utils/convertTo2DArray.ts';

interface ExpressionSelectProps {
  readonly allFields: IAllFields[];
  readonly expList: any;
  readonly form: FormInstance<any>;
  readonly LogicalOperatorsPosition: (value: string[]) => void;
}

interface IFiledLabel {
  label: string;
  value: string;
}

function getFiledLabel(allFields: IAllFields[]) {
  return allFields.map(item => ({
    label: item.originName,
    value: item.tfieldId
  }));
}

function generateDynamicArray(input: any[][], filedLabel: any) {
  return input.map(row => {
    if (row.length === 4) {
      return [filedLabel, inequalityOptions, '', logicalOperators];
    } else if (row.length === 3) {
      return [filedLabel, inequalityOptions, ''];
    }
    throw new Error('Invalid input row length');
  });
}

export function ExpressionSelect({ allFields, expList, form, LogicalOperatorsPosition }: ExpressionSelectProps) {
  const [filedLabel, setFiledLabel] = useState<IFiledLabel[]>(getFiledLabel(allFields));
  const [expression, setExpression] = useState([[filedLabel, inequalityOptions, '']]);

  useEffect(() => {
    setFiledLabel(getFiledLabel(allFields));
    setExpression([[filedLabel, inequalityOptions, '']]);
  }, [allFields]);

  useEffect(() => {
    setFiledLabel(getFiledLabel(allFields));
    // 有默认值情况
    if (Object.keys(expList).length) {
      const initExpression = generateDynamicArray(convertTo2DArray(expList), filedLabel);
      initExpression[initExpression.length - 1].pop();
      setExpression(initExpression);
    } else {
      setExpression([[filedLabel, inequalityOptions, '']]);
    }
  }, []);

  const addItem = (expressionIndex: number) => {
    if (expressionIndex === expression.length - 1) {
      const tempExpression = [...expression];
      tempExpression[tempExpression.length - 1].push(logicalOperators);
      form.setFieldValue(`${tempExpression.length - 1}-3`, 'OR');
      const newExpression = [...tempExpression, [filedLabel, inequalityOptions, '']];
      setExpression(newExpression);
    }
  };

  function resetRemoveLineForm(lineIndex: number) {
    const array = Array.from({ length: 4 }, () => Math.floor(Math.random() * 100));
    array.forEach((_, cIndex: number) => {
      form.setFieldValue(`${lineIndex}-${cIndex}`, '');
    });
  }

  const removeItem = (index: number) => {
    if (expression.length === 1) return;
    const tempExpression = [...expression];
    tempExpression[tempExpression.length - 2].pop();
    const newExpression = tempExpression.filter((_, i) => i !== index);
    resetRemoveLineForm(index);
    setExpression(newExpression);
  };

  useEffect(() => {
    const tempExpression = [...expression];
    const positions = tempExpression.slice(0, tempExpression.length - 1).map((item, index) => {
      if (item.length === 4) {
        return `${index}-3`;
      }
      return '';
    });

    LogicalOperatorsPosition(positions);
  }, [expression]);

  return (
    <>
      <h3 className="my-5 font-bold">字段表达式</h3>
      <div className="grid grid-cols-1 gap-2">
        {expression.map((item, expressionIndex) => (
          <ASpace key={expressionIndex}>
            <p className="opacity-60">条件{letters[expressionIndex]}</p>

            {item.map((option, optionIndex) => {
              if (Array.isArray(option)) {
                return (
                  <AForm.Item
                    className="mb-0"
                    key={`${expressionIndex}-${optionIndex}`}
                    name={`${expressionIndex}-${optionIndex}`}
                    rules={[{ message: '请选择', required: true }]}
                  >
                    <ASelect
                      key={optionIndex}
                      options={option}
                      placeholder="请选择"
                      style={{ minWidth: 150 }}
                    />
                  </AForm.Item>
                );
              }
              return (
                <AForm.Item
                  className="mb-0"
                  key={`${expressionIndex}-${optionIndex}`}
                  name={`${expressionIndex}-${optionIndex}`}
                  rules={[{ message: '请输入阈值', required: true }]}
                >
                  <AInput
                    key={optionIndex}
                    placeholder="请输入阈值"
                    style={{ minWidth: 150 }}
                    onChange={e => {
                      const newExpression = [...expression];
                      newExpression[expressionIndex][optionIndex] = e.target.value;
                      setExpression(newExpression);
                    }}
                  />
                </AForm.Item>
              );
            })}
            {expressionIndex === expression.length - 1 && (
              <ASpace className="ml-5 gap-2">
                <MinusOutlined onClick={() => removeItem(expressionIndex)} />
                <PlusOutlined onClick={() => addItem(expressionIndex)} />
              </ASpace>
            )}
          </ASpace>
        ))}
      </div>
    </>
  );
}
