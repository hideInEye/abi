import { Graph } from '@antv/g6';
import { Typography } from 'antd';
import { useEffect, useRef } from 'react';

type requestParameter = {
  readonly basicData: any;
};

const { Text } = Typography;
const App: React.FC<requestParameter> = ({ basicData }: requestParameter) => {
  // console.log('basicData ', basicData);
  //   const [datasets, setDatasets] = useState<any>([]);
  //   const [tables, setTables] = useState<any>([]);
  const isNoData = useMemo(() => {
    let flag = true;
    if (basicData) {
      Object.keys(basicData).forEach(key => {
        if (basicData[key]) {
          flag = false;
        }
      });
    }
    return flag;
  }, [basicData]);
  const containerRef = useRef<HTMLDivElement>(null);
  function formatata(obj: any) {
    const combos: any[] = [
      {
        id: obj.sourceType,
        style: {
          type: 'rect'
        }
      },
      {
        id: 'tables',
        style: {
          type: 'rect'
        }
      },
      {
        id: 'datasets',
        style: {
          type: 'rect'
        }
      }
    ];
    // 线
    const edges: any[] = [];
    // 节点
    const nodes: any[] = [
      {
        combo: obj.sourceType,
        id: obj.sourceId,
        name: obj.sourceName
      }
    ];
    obj.tables?.forEach((item: any, index: number) => {
      // 线
      edges.push({
        id: `${obj.sourceId}-${index}`,
        source: obj.sourceId,
        target: `${index}`
      });
      // 点
      nodes.push({
        combo: 'tables',
        id: `${index}`,
        name: item.tableName
      });
      const list: any = obj.datasets?.filter((el: any) => {
        return el.viewId === item.viewId;
      });
      list?.forEach((el: any) => {
        edges.push({
          id: `${index}-${el.viewId}`,
          source: `${index}`,
          target: el.viewId
        });
      });
    });
    obj.datasets?.forEach((item: any) => {
      nodes.push({
        combo: 'datasets',
        id: item.viewId,
        name: item.viewName,
        size: 100
      });
    });
    // console.log('{ combos, edges, nodes }', { combos, edges, nodes });
    return { combos, edges, nodes };
  }
  function readGraph(data: any) {
    // const dataList: any = {
    //   // 标签类别 用各种颜色区分
    //   combos: [
    //     {
    //       id: 'A',
    //       style: {
    //         type: 'rect'
    //       }
    //     },
    //     {
    //       id: 'B',
    //       style: {
    //         type: 'rect'
    //       }
    //     },
    //     {
    //       id: 'C',
    //       style: {
    //         type: 'rect'
    //       }
    //     },
    //     {
    //       id: 'D',
    //       style: {
    //         type: 'rect'
    //       }
    //     }
    //   ],
    //   // 连接线
    //   edges: [
    //     {
    //       id: 'edge-102',
    //       source: '0',
    //       target: '1'
    //     },
    //     {
    //       id: 'edge-161',
    //       source: '0',
    //       target: '2'
    //     },
    //     {
    //       id: 'edge-237',
    //       source: '1',
    //       target: '4'
    //     },
    //     {
    //       id: 'edge-253',
    //       source: '0',
    //       target: '3'
    //     },
    //     {
    //       id: 'edge-133',
    //       source: '3',
    //       target: '4'
    //     },
    //     {
    //       id: 'edge-320',
    //       source: '2',
    //       target: '5'
    //     },
    //     {
    //       id: 'edge-355',
    //       source: '1',
    //       target: '6'
    //     },
    //     {
    //       id: 'edge-823',
    //       source: '1',
    //       target: '7'
    //     },
    //     {
    //       id: 'edge-665',
    //       source: '3',
    //       target: '8'
    //     },
    //     {
    //       id: 'edge-884',
    //       source: '3',
    //       target: '9'
    //     },
    //     {
    //       id: 'edge-536',
    //       source: '5',
    //       target: '10'
    //     },
    //     {
    //       id: 'edge-401',
    //       source: '5',
    //       target: '11'
    //     }
    //   ],
    //   // 具体节点
    //   nodes: [
    //     {
    //       combo: 'A',
    //       id: '0'
    //     },
    //     {
    //       combo: 'B',
    //       id: '1'
    //     },
    //     {
    //       combo: 'B',
    //       id: '2'
    //     },
    //     {
    //       combo: 'B',
    //       id: '3'
    //     },
    //     {
    //       combo: 'C',
    //       id: '4'
    //     },
    //     {
    //       combo: 'D',
    //       id: '5'
    //     },
    //     {
    //       combo: 'C',
    //       id: '6'
    //     },
    //     {
    //       combo: 'C',
    //       id: '7'
    //     },
    //     {
    //       combo: 'C',
    //       id: '8'
    //     },
    //     {
    //       combo: 'C',
    //       id: '9'
    //     },
    //     {
    //       combo: 'D',
    //       id: '10'
    //     },
    //     {
    //       combo: 'D',
    //       id: '11'
    //     }
    //   ]
    // };
    const graph = new Graph({
      plugins: [
        {
          type: "tooltip",
          // 只对节点启用，边不显示tooltip
          enable: (e) => e.targetType === "node",
          getContent: (_, items) => {
            return `<div>${items[0].name}</div>`;
          },
          enterable: true,
          style: {
            ".tooltip": {
              background: "#1f1f1f",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: "8px",
              fontSize: "24px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            },
          },
        },
      ],
      autoFit: "view",
      behaviors: ["drag-element", "drag-canvas", "zoom-canvas"], // 类别样式
      combo: {
        style: {
          // labelText: d => d.id,
          radius: 8,
        },
        type: "none", // rect 同类别标记为框
      },
      container: containerRef.current!,
      data,
      // 自定义缩放
      // 线条
      edge: {
        style: {
          endArrow: true,
        },
        type: "cubic-horizontal",
      },
      height: 500,
      // 布局
      layout: {
        direction: "LR",
        dropCap: false,
        getHeight: () => 16,
        getWidth: () => 32,
        indent: 180,
        type: "indented",
      },
      node: {
        palette: {
          field: (d) => `${d.id}`,
          // type: 'group'
        },
        style: {
          // iconMaxLines: 1,
          // iconText: d => `${d.name}`,
          // iconTextOverflow: 'ellipsis',
          // iconWidth: 50,
          // iconWordWrap: false,
          labelMaxWidth: "90%",
          labelPlacement: "center",
          labelText: (d) => `${d.name}`,
          labelWordWrap: true,
          // iconText: d => (
          //   <Text
          //     ellipsis
          //     style={{ width: 200 }}
          //   >
          //     {d.name}
          //   </Text>
          // ),
          // labelBackground: true,
          ports: [{ placement: "left" }, { placement: "right" }],
          radius: 6,
          size: [80, 20],
        },
        type: "rect",
      },
      // width: 500
    });
    graph.render();
  }
  useEffect(() => {
    if (basicData && !isNoData) {
      const data = formatata(basicData);
      readGraph(data);
    }
  }, [basicData, isNoData]);

  return isNoData ? (
    <div className="min-h-300px !pt-10">
      <AEmpty />
    </div>
  ) : (
    <div ref={containerRef} />
  );
};
export default App;
