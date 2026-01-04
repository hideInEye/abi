/**
 * 答案展示组件
 * 用于展示AI返回的文本答案
 * 支持Markdown格式渲染
 */

import { Table } from "antd";
import React, { memo, useEffect, useMemo, useState } from "react";
import { format } from 'sql-formatter';
import SvgIcon from "../../components/SvgIcon";
// @ts-ignore - react-syntax-highlighter 类型定义问题
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import AutoChart from "./autoChart";
import { getChartType } from "./autoChart/helpers";
import ReactMarkdown from 'react-markdown'
import { Spin } from 'antd'

interface PropsType {
  dataInfo: any;
  loading?: boolean;
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
}

/**
 * 答案展示组件
 * @param {PropsType} props - 组件属性
 * @returns {JSX.Element} 答案组件
 */
const Answer: React.FC<PropsType> = memo(({ dataInfo, loading }) => {
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
        <>
          {/* @ts-ignore */}
          <SyntaxHighlighter
            language="sql"
            style={oneLight}
            showLineNumbers={true}
            customStyle={{
              margin: 0,
              borderRadius: '4px',
              fontSize: '14px',
              maxHeight: '400px',
              backgroundColor: '#f5f5f5',
              padding: '12px',
            }}
            codeTagProps={{
              style: {
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              }
            }}
          >
            {data?.sql ? format(data.sql, {
              language: 'sql',
              tabWidth: 2,
              keywordCase: 'upper',
              linesBetweenQueries: 2,
            }) : ''}
          </SyntaxHighlighter>
        </>
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
      {loading ? (
        <Spin tip="生成答案中..." />
      ) : (
        <div className="prose max-w-none">
          <ReactMarkdown>{data?.context}</ReactMarkdown>
        </div>
      )}
      <div>{typeContentMap[showType]}</div>
    </div>
  );
});

export default Answer;