import type { FormInstance } from 'antd/es/form/Form';
import { InfoCircleOutlined } from '@ant-design/icons';

import { TableSemantics } from '@/components/tableSemantics.tsx';
import { useAppSelector } from '@/hooks/business/useStore';
import QuoteFun from '@/pages/workbench/data-preparation/data-collection-operate/modules/QuoteFun.tsx';
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types/index.js';
import { fetchDataCollectionList } from '@/service/api';
import { getSpaceId } from '@/store/slice/app';
import { getAllFieldsByNodeData } from '@/utils/data-collection-operate.ts';

import Editor from '../../../data-preparation/data-collection-operate/modules/InsetCodemirror.tsx';
import styles from '../styles/index.module.css';

import QuoteField from './QuoteField.tsx';

interface IState {
  expr?: string;        // 计算公式
  relItemId?: string;   // 计算公式中引用的字段ID
  relViewid?: number;   // 关联视图ID
  remark?: string;      // 业务定义
  viewId?: number;      // 初始化数据集视图ID
}

interface PropsType {
  readonly dispatch: (obj: object) => void;
  readonly form: FormInstance<any>;
  isEdit?: boolean;
  readonly state: IState; // 新增
}

const CalculateCom: FC<PropsType> = memo(({ dispatch, form, isEdit, state }) => {
  const spaceId = useAppSelector(getSpaceId) || 0;
  const [viewDataId, setViewDataId] = useState<number | null>(state.viewId);
  const tfieldId = `${new Date().getTime()}`;
  const [dataCollectionList, setDataCollectionList] = useState<any>([]);
  const editorRef = useRef(null);
  const [target, setTarget] = useState<any[]>([]);
  const relViewidVal = AForm.useWatch('relViewid', form);
  const exprVal = AForm.useWatch('expr', form);
  const semanticSchemaIdVal = AForm.useWatch('semanticSchemaId', form);
  const quoteFieldDisabled = useMemo(() => {
    const res = /\[\d+\]/.test(exprVal);
    return res;
  }, [exprVal]);
  const [schemaOptions, setSchemaOptions] = useState<TableSemanticParams[]>([]);

  const getSchemaOptions = (options: TableSemanticParams[]) => {
    setSchemaOptions(options);
  };
  const allFields = useMemo(() => {
    if (semanticSchemaIdVal) {
      try {
        const cur: any = schemaOptions.find((item: any) => item.schemaId === semanticSchemaIdVal);
        const modelDetailObj = JSON.parse(cur.modelDetail);
        let resData: any[] = [];
        const includesTypes = ['dimensions', 'measures'];
        const labelMap: any = {
          dimensions: '维度',
          measures: '度量'
        };
        Object.keys(modelDetailObj).forEach(key => {
          if (includesTypes.includes(key)) {
            const formatArr = modelDetailObj[key].map((item: any) => ({
              ...item,
              tfieldType: key === 'dimensions' && item.type === 'datetime' ? 'dates' : key,
              typeTitle: key === 'dimensions' && item.type === 'datetime' ? '日期' : labelMap[key]
            }));
            resData = resData.concat(formatArr);
          }
        });
        return resData;
      } catch (error) {
        console.log(error);
      }
    }
    return [];
  }, [semanticSchemaIdVal, schemaOptions]);

  const fetchDataCollections = async () => {
    const { data } = await fetchDataCollectionList({
      pageNum: 1,
      pageSize: 10000,
      spaceId,
      viewName: ''
    });
    setDataCollectionList(data?.data);
  };
  useEffect(() => {
    fetchDataCollections();
  }, []);

  useEffect(() => {
    form.setFieldsValue(state);
    if (state.relViewid) {
      setViewDataId(state.relViewid);
    }
  }, [form, state]);

  // 初始化时，如果有计算公式但没有 relItemId，自动计算并设置
  useEffect(() => {
    if (state.expr && !state.relItemId) {
      const extractedIds = extractUniqueIds(state.expr);
      if (extractedIds.length > 0) {
        dispatch({
          relItemId: extractedIds.join(',')
        });
      }
    }
  }, [state.expr, state.relItemId]);

  function extractUniqueIds(expression: string): string[] {
    if (!expression) {
      return [];
    }
    const regex = /##(\d+)##/g;
    const matches = expression.matchAll(regex);
    const idSet = new Set<string>();

    for (const match of matches) {
      idSet.add(match[1]);
    }

    return Array.from(idSet);
  }

  const handleValuesChange = (changeValues: any) => {
    const obj = changeValues;
    // 如果修改了计算公式，自动计算并更新 relItemId
    if ('expr' in changeValues) {
      obj.relItemId = extractUniqueIds(changeValues.expr || '').join(',');
    }
    dispatch({
      ...obj,
      relViewid: viewDataId
    });
  };

  const insertCode = (val: any) => {
    let text = val;

    if (typeof val === 'object') {
      text = `##${val.techId}##`;
      dispatch({
        relItemId: val.techId,
        relViewid: viewDataId,
        termType: val.tfieldType
      });
    }
    if (editorRef?.current?.insertText) {
      editorRef?.current?.insertText(text, false);
    }
  };

  const getSchemaId = ({
    semanticGroupId,
    semanticSchemaId,
    viewId
  }: {
    semanticGroupId: number | null;
    semanticSchemaId: number;
    viewId: number;
  }) => {
    form.setFieldsValue({
      semanticGroupId,
      semanticSchemaId
    });
    setViewDataId(viewId);
  };

  return (
    <AForm
      form={form}
      layout="vertical"
      onValuesChange={handleValuesChange}
    >
      <TableSemantics
        form={form}
        getSchemaId={getSchemaId}
        getSchemaOptions={getSchemaOptions}
        isEdit={isEdit} // 只这里传递
        type="shema"
      />
      <AForm.Item
        label="业务定义"
        name="remark"
        rules={[{ message: '请输入业务定义', required: true }]}
      >
        <AInput.TextArea
          autoSize={{ minRows: 2 }}
          placeholder="请输入业务定义"
        />
      </AForm.Item>
      <AForm.Item
        label={
          <div className="flex items-center">
            <div className={styles.requiredLabel}>计算公式：</div>
            <div>
              从右侧[引用字段]、[引用函数]中选择元素，定义业务术语的计算表达式。
            </div>
            <ATooltip
              placement="top"
              title={
                <div style={{ maxWidth: 420 }}>
                  <div>[业务术语] = 引用函数(引用字段A) + 算术运算符 + 引用函数(引用字段B)</div>
                  <div style={{ marginTop: 8 }}>业务术语：订单成功率</div>
                  <div>COUNT(CASE WHEN status = 'success' THEN order_id END) / COUNT(order_id)</div>
                  <div style={{ marginTop: 8 }}>业务术语：净利润率</div>
                  <div>(SUM(revenue) - SUM(total_cost)) / SUM(revenue)</div>
                </div>
              }
            >
              <InfoCircleOutlined className="ml-2 cursor-pointer text-gray-500" />
            </ATooltip>
          </div>
        }
      >
        <div className="flex">
          <AForm.Item
            className="mr-4 w-50%"
            // label="计算公式"
            name="expr"
            rules={[{ message: '请输入计算公式', required: true }]}
          >
            <Editor
              isExpr
              fieldOptions={[...allFields, ...target]}
              height="200px"
              mode="name"
              ref={editorRef}
            />
          </AForm.Item>
          <QuoteField
            allFields={allFields}
            disabled={quoteFieldDisabled}
            height="calc(100vh - 500px)"
            notAddTarget={true}
            setTarget={setTarget}
            target={target}
            tfieldId={tfieldId}
            onSelect={insertCode}
          />
          <QuoteFun
            height="calc(100vh - 500px)"
            onSelect={insertCode}
          />
        </div>
      </AForm.Item>
    </AForm>
  );
});

export default CalculateCom;
