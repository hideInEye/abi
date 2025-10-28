import { sql } from '@codemirror/lang-sql';
import CodeMirror from '@uiw/react-codemirror';
import { Table } from 'antd';

import { AutoChart, getChartType } from './auto-chart/auto-chart';
import styles from './index.module.css';
import { EditorView } from '@codemirror/view';

interface PropsType {
  data: any;
}

const formatStrToObj = (str: string) => {
  // 使用正则表达式提取 content 属性的值
  const contentMatch = str.match(/content="([^"]+)"/);
  if (contentMatch && contentMatch[1]) {
    const content = contentMatch[1];
    // 替换 &quot; 为 "
    const jsonString = content.replace(/&quot;/g, '"');
    return JSON.parse(jsonString);
  }
  return {};
};

const ViewEle: React.FC<PropsType> = memo(({ data: dataInfo }) => {
  const [showType, setShowType] = useState('table');
  const [answerStr, setAnswerStr] = useState('');
  const [optBtns, setOptBtns] = useState<any[]>([]);
  const [data, setData] = useState<any>();

  useEffect(() => {
    // console.log('回答接口返回的原始数据', dataInfo);
    try {
      if (dataInfo.context.includes('ERROR')) {
        const str = dataInfo.context.split('</span>')[1].trim();
        setAnswerStr(str);
      } else {
        setAnswerStr(dataInfo.context.split('\n')[0]);
      }
    } catch (error) {
      console.log(error);
    }
    const resObj = formatStrToObj(dataInfo.context);
    setData(resObj);

    const optArr = [
      {
        label: (
          <SvgIcon
            className="cursor-pointer text-16px"
            localIcon="table"
          />
        ),
        value: 'table'
      },
      {
        label: (
          <SvgIcon
            className="cursor-pointer text-16px"
            localIcon="sql-code"
          />
        ),
        value: 'sql'
      }
    ];
    if (resObj?.type !== 'response_table') {
      optArr.push({
        label: (
          <SvgIcon
            className="cursor-pointer text-16px"
            localIcon="chart"
          />
        ),
        value: 'chart'
      });
    }
    setOptBtns(optArr);
  }, [dataInfo]);

  const typeContentMap: any = useMemo(() => {
    const columns = [];
    for (const key in data?.data?.[0]) {
      columns.push({
        dataIndex: key,
        key,
        title: key
      });
    }

    // const chartOpt = {
    //   xAxis: {
    //     type: 'category',
    //     data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    //   },
    //   yAxis: {
    //     type: 'value'
    //   },
    //   series: [
    //     {
    //       data: [120, 200, 150, 80, 70, 110, 130],
    //       type: 'bar'
    //     }
    //   ]
    // };
    return {
      chart: (
        <AutoChart
          chartType={getChartType(data?.type)}
          data={data?.data}
        />
      ),
      sql: (
        <CodeMirror
          readOnly
          extensions={[sql()]}
          height="200px"
          value={data?.sql}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
            dropCursor: false,
          }}
          theme={EditorView.theme({
            "&": { 
              backgroundColor: "#fff",
              border: "1px solid #aaa",
              borderRadius: "4px"
            },
            ".cm-content": { 
              whiteSpace: "pre-wrap", 
              padding: "8px",
              color: "#333"
            },
            ".cm-line": { 
              padding: "0 8px",
              minHeight: "1.2em"
            },
            ".cm-gutters": {
              backgroundColor: "#fff",
              color: "#999",
              borderRight: "1px solid #aaa"
            },
            // 修复选中文本的样式问题
            ".cm-selectionBackground": {
              backgroundColor: "#b3d4fc !important"
            },
            ".cm-selectionMatch": {
              backgroundColor: "#b3d4fc !important"
            },
            // 确保选中区域有正确的背景色
            "&.cm-focused .cm-selectionBackground": {
              backgroundColor: "#b3d4fc !important"
            },
            // 修复首行选中的显示问题
            ".cm-line:first-child .cm-selectionBackground": {
              backgroundColor: "#b3d4fc !important"
            },
            // 修复部分行选中的问题
            ".cm-line .cm-selectionBackground": {
              backgroundColor: "#b3d4fc !important"
            }
          })}
        />
      ),
      table: (
        <Table
          className={styles.viewTable}
          columns={columns}
          dataSource={data?.data?.map((item: any, index: number) => ({ ...item, index }))}
          pagination={false}
          rowKey="index"
        />
      )
    };
  }, [data, showType]);

  return (
    <div className="pl-9 pr-2">
      <div className="rounded bg-#f6f6f6 p-2">
        <div className="mb-2 ml-2 flex pt-2">
          <div className="whitespace-nowrap text-#666">描述分析&nbsp;&nbsp;</div>
          <div>{answerStr}</div>
        </div>
        <div className="pl-75px pr-75px">
          <div className="rounded bg-white">
            <header
              className="flex items-center justify-end border-b p-2 shadow-inner"
              // style={{
              //   boxShadow:
              //     '0 1px 2px 0 rgba(0, 0, 0, 0.03),0 1px 6px -1px rgba(0, 0, 0, 0.02),0 2px 4px 0 rgba(0, 0, 0, 0.02)'
              // }}
            >
              {optBtns.map(item => (
                <span
                  className="mr-2"
                  key={item.value}
                  onClick={() => setShowType(item.value)}
                >
                  {item.label}
                </span>
              ))}
            </header>
            {typeContentMap[showType]}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ViewEle;
