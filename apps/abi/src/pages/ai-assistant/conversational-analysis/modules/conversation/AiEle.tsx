import { Collapse } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import styles from './index.module.css';

interface PropsType {
  data: any;
  loading?: boolean;
}

const formatThink = (inputString: any) => {
  try {
    if (!inputString?.includes('<think>')) return '';
    // 使用正则表达式提取 <think> 标签内的内容
    const pattern = /<think>([\s\S]*?)<\/think>/; // 匹配 <think> 和 </think> 之间的内容
    const match = inputString.match(pattern);

    let thinkContent = '';
    // 输出结果
    if (match && match[1]) {
      thinkContent = match[1].trim(); // 提取内容并去除首尾空白
    } else {
      return inputString;
    }
    return thinkContent;
  } catch (error) {
    console.log(error);

    return '';
  }
};

const AiEle: React.FC<PropsType> = ({ data, loading }: any) => {
  const [activeKey, setActiveKey] = useState<any[]>([]);

  const loadingLabel = (
    <div className="flex items-center">
      <span className="mr-4">思考中</span>
      <div className={styles['loader-container']}>
        <div className={styles['loader-bar']} />
      </div>
    </div>
  );
  const endLabel = (
    <div className="text-[#666]">已深度思考{data?.thinkTime ? `（用时${Math.round(data?.thinkTime)}秒）` : null}</div>
  );

  const items = useMemo(() => {
    const content = formatThink(data?.context);
    return [
      {
        children: <div className="whitespace-pre-wrap">{content}</div>,
        key: '1',
        label: loading ? loadingLabel : endLabel
      }
    ];
  }, [data, loading]);

  useEffect(() => {
    setActiveKey(loading ? ['1'] : []);
  }, [loading]);

  return (
    <div className="my-2 w-full flex">
      <SvgIcon
        className="mt-6px text-[30px]"
        localIcon="bot"
      />
      <div className="w-full px-2">
        <Collapse
          activeKey={activeKey}
          className="w-full"
          items={items}
          onChange={keys => setActiveKey(keys)}
        />
      </div>
    </div>
  );
};

export default AiEle;
