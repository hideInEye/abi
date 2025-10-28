import type { FormInstance } from 'antd/es/form/Form';

import { TableSemantics } from '@/components/tableSemantics.tsx';
import QuoteFun from '@/pages/data-preparation/data-collection-operate/modules/QuoteFun.tsx';
import type { TableSemanticParams } from '@/pages/data-preparation/data-table-meaning/types/index.js';
import { fetchDataCollectionList } from '@/service/api';
import { getAllFieldsByNodeData } from '@/utils/data-collection-operate.ts';

import Editor from '../../../data-preparation/data-collection-operate/modules/InsetCodemirror.tsx';
import styles from '../styles/index.module.css';

import QuoteField from './QuoteField.tsx';

interface IState {
  bizName: undefined;
  relViewid: number;
  remark: undefined;
  techName: undefined;
}

interface PropsType {
  readonly dispatch: (obj: object) => void;
  readonly form: FormInstance<any>;
  isEdit?: boolean;
  readonly state: IState; // 新增
}

const CalculateCom: FC<PropsType> = memo(({ dispatch, form, isEdit, state }) => {
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
      spaceId: Number(localStorage.getItem('spaceId')),
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
    if (!changeValues.expr) {
      obj.relItemId = '';
    }
    dispatch({
      ...obj,
      relItemId: extractUniqueIds(obj.expr).join(','),
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
        name="bizName"
        rules={[{ message: '请输入业务定义', required: true }]}
      >
        <AInput placeholder="请输入业务定义" />
      </AForm.Item>
      <AForm.Item
        label={
          <div className="flex">
            <div className={styles.requiredLabel}>计算公式：</div>
            <div>
              根据所定义的表语义，能够明确界定相关指标的具体范围，请参照右侧所列指标及其对应的计算公式，在下方文本框中输入相应的计算公式
            </div>
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
