import React, { useState } from 'react';
import { DatePicker, Select, Table } from 'antd';
import ReactMarkdown from 'react-markdown';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface CausalAnalysisProps {
  data: {
    timeRange: [string, string];
    indicator: {
      startValue: number;
      endValue: number;
      change: number;
      changeRate: number;
    };
    description: string;
    suggestion: string;
    factors: Array<{
      key: string;
      rank: number;
      name: string;
      startValue: number;
      endValue: number;
      change: number;
      changeRate: number;
      impactIndex: number;
    }>;
  };
}

interface TotalDf {
  diff_val?: number;
  total_ratio?: number;
  total_base_sum?: number;
  total_target_sum?: number;
}

const CausalAnalysis: React.FC<CausalAnalysisProps> = ({ data }) => {
  // const data = {
  //   "type": "response_table",
  //   "digest": "乌斯浑河2024年1月份水位总体呈上涨趋势，月初至月末水位从439,648.055增加到459,181.664，增长率为4.44%。",
  //   "analysis_response": {
  //     "趋势深度剖析": [
  //       "从时间维度来看，1月2号00:00时段的水位数据为27,795.017，与月末数据对比，显示出较大的波动。",
  //       "KSSS、RKLL、CKLL等关键节点的变化率均为-0.9368%，表明这些节点可能是水位上涨的制约因素，需要重点关注。"
  //     ],
  //     "结论专业解读": [
  //       "乌斯浑河1月份水位总体呈现增加趋势，但部分关键节点的负增长率提示存在潜在风险。",
  //       "这种趋势可能与降雨量、蒸发作用或人为调控等多重因素相关。"
  //     ],
  //     "策略建议输出": [
  //       "加强对KSSS、RKLL、CKLL等关键节点的监测，采取针对性措施以提升其对水位稳定的贡献。",
  //       "优化河流调控策略，综合考虑自然条件和人为干预，以确保水位平稳健康发展。",
  //       "加大生态保护力度，减少人类活动对河流的不利影响，促进水资源的可持续利用。"
  //     ]
  //   },
  //   "chat_mode": "chat_with_analysis",
  //   "data": [
  //     {
  //       "影响因素": "平稳",
  //       "2024-01_sum": 439648.055,
  //       "2024-01-02 00:00:00_sum": 27795.017,
  //       "变化量": 411853.038,
  //       "变化率": -0.9368
  //     },
  //     {
  //       "影响因素": "平稳",
  //       "2024-01_sum": 439648.055,
  //       "2024-01-02 00:00:00_sum": 27795.017,
  //       "变化量": 411853.038,
  //       "变化率": -0.9368
  //     }
  //   ],
  //   "total_df": {
  //     "total_base_sum": 439648.05499999993,
  //     "total_target_sum": 459181.664,
  //     "total_ratio": 0.0444
  //   }
  // }
  const [pageSize, setPageSize] = useState<number>(5);
  const columns: any = []; // 表头
  let totalDf: TotalDf = {};
  try {
    
    const { analysis_response, data: tableData, total_df }: any = data;
    totalDf = Array.isArray(total_df) ? total_df[0] : total_df;
    
    Object.keys(tableData[0]).forEach((key) => {
      columns.push({
        title: key,
        dataIndex: key,
        key,
      })
    })
  } catch (error) {
    
  }
  // 表格列定义
  // const columns: TableProps<any>['columns'] = [
  //   {
  //     title: '排序',
  //     dataIndex: 'rank',
  //     width: 60,
  //     fixed: 'left',
  //   },
  //   {
  //     title: '影响因素',
  //     dataIndex: 'name',
  //     width: 200,
  //     fixed: 'left',
  //   },
  //   {
  //     title: data.timeRange[0],
  //     dataIndex: 'startValue',
  //     width: 120,
  //     align: 'right',
  //   },
  //   {
  //     title: data.timeRange[1],
  //     dataIndex: 'endValue',
  //     width: 120,
  //     align: 'right',
  //   },
  //   {
  //     title: '变化量',
  //     dataIndex: 'change',
  //     width: 120,
  //     align: 'right',
  //     render: (value: number) => (
  //       <span style={{ color: value >= 0 ? '#ff4d4f' : '#52c41a' }}>
  //         {value >= 0 ? '+' : ''}{value.toFixed(2)}
  //       </span>
  //     ),
  //   },
  //   {
  //     title: '变化率',
  //     dataIndex: 'changeRate',
  //     width: 120,
  //     align: 'right',
  //     render: (value: number) => (
  //       <span style={{ color: value >= 0 ? '#ff4d4f' : '#52c41a' }}>
  //         {value >= 0 ? '+' : ''}{(value * 100).toFixed(2)}%
  //       </span>
  //     ),
  //   },
  //   {
  //     title: '影响指数',
  //     dataIndex: 'impactIndex',
  //     width: 120,
  //     align: 'right',
  //     render: (value: number) => value.toFixed(2),
  //   },
  // ];

  return (
    <div className="rounded bg-[#f6f6f6] p-2 rounded-[8px] w-full">
      <div className="mb-2 ml-2 flex pt-2">
        <h3 className="text-lg font-medium">归因分析</h3>
      </div>
      
      {/* 第一部分：分析结果 */}
      <div className="rounded bg-white p-4 mb-4">
        {/* <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span>时间范围</span>
            <RangePicker
              defaultValue={[dayjs(data.timeRange[0]), dayjs(data.timeRange[1])]}
              format="YYYY-MM-DD"
            />
          </div>
          <Select defaultValue="全部" style={{ width: 120 }}>
            <Select.Option value="全部">全部</Select.Option>
          </Select>
        </div> */}
        <div className="flex items-start gap-8">
          <div>
            <div className="text-gray-500">指标值</div>
            <div className="flex flex-col mt-1">
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-start">
                  <span className="text-2xl font-medium">{(totalDf?.total_base_sum ?? 0).toFixed(2)}</span>
                  {/* <span className="text-xs text-gray-400">{data.timeRange[0]}</span> */}
                </div>
                <span className="text-gray-400 mb-3">→</span>
                <div className="flex flex-col items-start">
                  <span className="text-2xl font-medium">{(totalDf?.total_target_sum ?? 0).toFixed(2)}</span>
                  {/* <span className="text-xs text-gray-400">{data.timeRange[1]}</span> */}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="text-gray-500">变化量</div>
            <div className={`text-2xl font-medium mt-1 ${
              ((totalDf ?? {}).diff_val ?? 0) >= 0 ? 'text-red-500' : 'text-green-500'
            }`}>
              {((totalDf ?? {}).diff_val ?? 0) >= 0 ? '+' : ''}
              {((totalDf ?? {}).diff_val ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="text-gray-500">变化率</div>
            <div className={`text-2xl font-medium mt-1 ${
              (totalDf?.total_ratio ?? 0) >= 0 ? 'text-red-500' : 'text-green-500'
            }`}>
              {(totalDf?.total_ratio ?? 0) >= 0 ? '+' : ''}
              {((totalDf?.total_ratio ?? 0) * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* 第二部分：归因描述 */}
      <div className="rounded bg-white p-4 mb-4">
        <div className="text-gray-600">
          {data.desc}
        </div>
      </div>

      {/* 第三部分：影响因素表格 */}
      <div className="rounded bg-white p-4 mb-4">
        <Table
          columns={columns}
          dataSource={data?.data || []}
          pagination={false}
          scroll={{ x: 'max-content', y: 400 }}
          size="middle"
        />
      </div>

      {/* 第四部分：归因建议 */}
      <div className="rounded bg-white p-4">
        <div className="flex items-center mb-2">
          <div className="w-2 h-4 bg-blue-500 rounded mr-2"></div>
          <h4 className="text-base font-medium">归因建议</h4>
        </div>
        <div className="text-gray-600 pl-4">
          <div className="prose max-w-none">
            <ReactMarkdown>{typeof data?.analysis_response === 'object' ? `${data?.analysis_response}` : data?.analysis_response}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CausalAnalysis; 