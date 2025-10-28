/**
 * AI 回答展示组件
 * 用于展示 AI 生成的回答内容
 * 支持 Markdown 格式和代码高亮
 * @module AiEle
 */

import React, { useEffect, useRef, useState } from "react";
import SvgIcon from "../../components/SvgIcon"
import styles from './index.module.css';
import ClarifyComponent from "./components/ClarifyComponent";
import IntentClarifyV2 from "./components/IntentClarifyV2"; // 澄清处理组件
import { DownOutlined } from '@ant-design/icons';  // 导入 Ant Design 图标
import { message, Typography } from "antd";

const { Paragraph, Text } = Typography;

/**
 * 组件属性接口定义
 * @interface PropsType
 * @property {string} data - AI 回答的内容
 * @property {boolean} [loading] - 是否正在加载
 * @property {boolean} [isNew] - 是否为新回答
 * @property {number} [thinkTime] - 思考时间
 * @property {boolean} [useSimpleStyle] - 是否使用简单样式（气泡样式）
 */
interface PropsType {
  isSharing?: boolean
  data: any
  loading?: boolean
  isStorage?: boolean
  isNew?: boolean
  thinkTime?: number
  isDone?: boolean;
  useSimpleStyle?: boolean
  setDebugModalVisible: React.Dispatch<React.SetStateAction<boolean>>
  setCur: React.Dispatch<React.SetStateAction<any>>
  getAnswer?: (props: any) => void;
  onMessageUpdate?: (props: any) => void;
}

/**
 * AI 回答展示组件
 * @param {PropsType} props - 组件属性
 * @returns {JSX.Element} AI 回答组件
 */
const AiEle: React.FC<PropsType> = ({
  isSharing,
  data, 
  loading, 
  isStorage = false,
  isNew = false,
  thinkTime,
  useSimpleStyle = false,
  setDebugModalVisible,
  isDone,
  setCur,
  getAnswer,
  onMessageUpdate,
  // questionData
}) => {

  // 获取AI助手名称，如果data中有name则使用，否则默认为"AI助手"
  const getAssistantName = () => {
    return data?.name || 'AI助手';
  };

  /**
   * 处理消息内容，确保正确显示
   * @param {string} content - 原始消息内容
   * @returns {string} 处理后的消息内容
   */
  const processContent = (content: string) => {
    return content.split('</think>')[0] // 只保留think标签之前的内容
      .replace(/<think>/g, '') // 移除所有 think 标签
      .trim();
  };

  const loadingLabel = (
    <div className="flex items-center">
      <span className="mr-4">思考中</span>
      <div className={styles['loader-container']}>
        <div className={styles['loader-bar']} />
      </div>
    </div>
  );

  const endLabel = (
    <div className="text-[#666] flex items-center">
      <span>已深度思考</span>
      {thinkTime ? (
        <span className="ml-1 text-blue-500">
          {thinkTime}s
        </span>
      ) : null}
    </div>
  );

  if (useSimpleStyle) {
    return (
      <div className="my-4 w-full flex items-start">
        <div className="flex-shrink-0">
          <SvgIcon
            className="text-[30px]"
            localIcon="bot"
          />
        </div>
        <div className="ml-2 max-w-[80%]">
          <div className="bg-[#e8eefb] rounded-lg px-4 py-2 text-sm text-gray-700 relative">
            {/* 添加小三角 */}
            <div className="absolute left-[-6px] top-3 w-3 h-3 bg-[#e8eefb] transform rotate-45"></div>
            {processContent(data.context)}
          </div>
          {loading ? (
            <div className="mt-1 text-xs text-gray-400">思考中...</div>
          ) : (
            thinkTime && (
              <div className="mt-1 text-xs text-gray-400">
                思考用时：{thinkTime}s
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  const questionData = data?.questionData

  // 完成按钮的回调函数
  const handleQueryComplete = (ICparameter: any) => {
    const { query, clarify_flag, chat_mode, extra, structured_data } = ICparameter;
    getAnswer!({ question: query, IC: { clarify_flag, chat_mode, extra, structured_data } });
  };

  // 控制折叠状态
  const [isCollapsed, setIsCollapsed] = useState(true);
  // 记录内容高度
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | string>("auto");

  // 动态计算内容高度
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [data]);

  useEffect(() => {
    // 控制折叠状态
    if (isSharing || data?.questionData?.agent_label === 'intent_clarify' || data.smLoading) {
      setIsCollapsed(false); // 澄清或加载时展开
    } else {

      setIsCollapsed(true); // 否则折叠
    }
  }, [data, isSharing]);
  
  useEffect(() => {
    if (!loading && data.context && isDone) {
      console.log('====================================');
      console.log('update 123123:',data.context);
      console.log('====================================');
      onMessageUpdate && onMessageUpdate(data)
    }
  }, [loading, data, isDone])

  return (
    <div className="my-2 w-full flex justify-start">
      <SvgIcon
        className="mt-6px text-[30px]"
        localIcon="bot"
      />
      <div className="w-full px-2 text-left">
        <div className="w-full bg-white border border-gray-200 rounded-lg">
          <div className="p-[0.75rem] px-[1.5625rem] border-b border-gray-200 flex justify-between items-center grid grid-cols-[1fr_5fr]">
            <span className="font-bold font-extrabold">{getAssistantName()}</span>
            <div className="flex items-center gap-[20px] justify-end" onClick={() => setIsCollapsed(!isCollapsed)}>
              <div className="flex items-center">
                <span className="cursor-pointer hover:opacity-70 select-none mr-2" onClick={(e) => {
                  e.stopPropagation()
                  setDebugModalVisible(true);
                  setCur(data);
                }}>
                  <SvgIcon className="text-16px" localIcon="setting" />
                </span>
                {data.smLoading ? loadingLabel : endLabel}
              </div>

              {/* 箭头 */}
              <span
                style={{ transform: isCollapsed ? 'rotate(270deg)' : 'rotate(360deg)' }}
                className={`cursor-pointer transition-transform duration-300`}
              >
                <DownOutlined className="text-[#666]" />
              </span>
            </div>
          </div>
          <div className="p-[0.75rem] px-[1.5625rem]">
            <div
              ref={contentRef}
              className={`
                whitespace-pre-wrap text-sm text-gray-700 transition-all duration-300 ease-in-out relative 
                ${isCollapsed ? 'max-h-0 overflow-hidden' : `max-h-[${contentHeight}px] pt-[20px]`} 
              `}
            >
              {/* 流式渲染开始前的loading图标 */}
              {/* {loading && (!data.context || data.context === '') && (
                <div className={`${styles['spin-loading']} absolute left-1 top-[-5px]`}></div>
              )} */}
              
              {/* 复制 */}
              {
                !questionData?.agent_label && (
                  <div className="absolute right-1 top-[-5px] cursor-pointer text-gray-600 hover:text-gray-800 transition-colors">
                    <Text
                      copyable={{
                        text: processContent(data.context),
                        tooltips: ['复制', '已复制'],
                      }}
                    />
                  </div>
                )
              }

              {/* 内容 */}
              {/* 当触发意图澄清时，不显示JSON数据，只显示澄清组件 */}
              {questionData?.agent_label === 'intent_clarify' ? null : processContent(data.context)}

              {/* 澄清组件 */}
              {
                questionData?.agent_label && (
                  questionData?.agent_label === 'intent_clarify' ? (
                    // 检查是否为新的数据结构
                    questionData?.agent_step ? (
                      <IntentClarifyV2 questionData={questionData} onComplete={handleQueryComplete} />
                    ) : (
                      <ClarifyComponent questionData={questionData} onComplete={handleQueryComplete} />
                    )
                  ) : null
                )
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiEle;
