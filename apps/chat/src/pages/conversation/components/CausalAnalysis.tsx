import React, { useState } from 'react';
import { DatePicker, Select, Table, Empty } from 'antd';
import ReactMarkdown from 'react-markdown';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { stripHtmlTags } from '@/utils';

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
          {stripHtmlTags(data.desc)}
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
          locale={{
            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据"/>
          }}
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
            <ReactMarkdown>{stripHtmlTags(typeof data?.analysis_response === 'object' ? `${data?.analysis_response}` : data?.analysis_response)}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CausalAnalysis; 