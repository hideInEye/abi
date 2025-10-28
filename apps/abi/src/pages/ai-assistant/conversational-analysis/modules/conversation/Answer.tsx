import { sql } from '@codemirror/lang-sql';
import CodeMirror from '@uiw/react-codemirror';
import { Table } from 'antd';
import { EditorView } from '@codemirror/view';

import { AutoChart, getChartType } from './auto-chart/auto-chart';

interface PropsType {
  dataInfo: any;
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

const Answer: React.FC<PropsType> = memo(({ dataInfo }) => {
  const [showType, setShowType] = useState('table');
  const [data, setData] = useState<any>();
  const [optBtns, setOptBtns] = useState<any[]>([]);

  useEffect(() => {
    const resObj = formatStrToObj(dataInfo.context);
    setData(resObj);

    const optArr = [
      {
        label: (
          <SvgIcon
            className="cursor-pointer"
            localIcon="table"
          />
        ),
        value: 'table'
      },
      {
        label: (
          <SvgIcon
            className="cursor-pointer"
            localIcon="sql"
          />
        ),
        value: 'sql'
      }
    ];
    if (resObj?.type !== 'response_table') {
      optArr.push({
        label: (
          <SvgIcon
            className="cursor-pointer"
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
    // eslint-disable-next-line guard-for-in
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
          columns={columns}
          dataSource={data?.data?.map((item: any, index: number) => ({ ...item, index }))}
          pagination={false}
          rowKey="index"
        />
      )
    };
  }, [data, showType]);

  return (
    <div className="max-width-[70%] ml-2 min-w-[400px] rounded-lg bg-[#e8eefb] p-2 text-black">
      <header className="flex items-center justify-end pb-2">
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
      <div>{typeContentMap[showType]}</div>
    </div>
  );
});

export default Answer;
