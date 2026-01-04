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
import { DownOutlined, UpOutlined } from '@ant-design/icons';  // 导入 Ant Design 图标
import { Button, Typography, message } from "antd";
import ReactMarkdown from 'react-markdown';
import { SUB_CHAT_MODE_MAP } from '../../constant/chat';

const { Text } = Typography;

/**
 * 思考节点接口
 */
interface ThinkNode {
  name: string;
  content: string;
}

/**
 * 解析思考节点
 */
const parseThinkNodes = (content: string, assistantName: string = 'AI助手'): { thinkNodes: ThinkNode[], finalContent: string } => {
  const thinkNodes: ThinkNode[] = [];

  const blockRegex = /<think>([\s\S]*?)<\/think>/g;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    const inner = match[1].trim();
    thinkNodes.push({ name: assistantName, content: inner });
  }

  const finalContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/\[DONE\]/g, '').trim();

  return { thinkNodes, finalContent };
};

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
  isStorage,
  thinkTime,
  useSimpleStyle = false,
  setDebugModalVisible,
  isDone,
  setCur,
  getAnswer,
  onMessageUpdate,
}) => {

  // 获取AI助手名称
  // 实时对话：从流式数据的 sub_chat_mode 映射获取
  // 历史对话：从接口返回的 name 字段获取
  const getAssistantName = () => {
    // 如果有 sub_chat_mode 字段（实时对话），使用映射表
    if (data?.sub_chat_mode && SUB_CHAT_MODE_MAP[data.sub_chat_mode]) {
      return SUB_CHAT_MODE_MAP[data.sub_chat_mode];
    }
    // 否则，使用 name 字段（历史对话）
    if (data?.name) {
      return data.name;
    }
    // 默认值
    return 'AI助手';
  };

  /**
   * 处理消息内容，确保正确显示
   * @param {string} content - 原始消息内容
   * @returns {string} 处理后的消息内容
   */
  const processContent = (content: string) => {
    // 处理后的内容
    const processed = content
      .replace(/\n{3,}/g, '\n\n') // 将3个及以上的连续换行符压缩为双换行
      .replace(/\n\n\n/g, '\n\n') // 再次确保没有三连换行
      .trim();
    
    return processed;
  };

  // 解析思考节点，传入助手名称
  const assistantName = getAssistantName();
  const { thinkNodes, finalContent } = parseThinkNodes(data.context || '', assistantName);
  
  // 直出思考内容，不使用折叠与额外容器

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
      <span>已完成思考</span>
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
            <div className={styles['markdown-content']}>
              <ReactMarkdown>{processContent(finalContent || data.context)}</ReactMarkdown> 
            </div>
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

  useEffect(() => {
    // 控制折叠状态
    if (data?.questionData?.agent_label === 'intent_clarify' || data.smLoading || data.isIllegalQuery) {
      setIsCollapsed(false); // 澄清、加载或闲聊场景时展开
    } else {
      setIsCollapsed(true); // 否则折叠
    }
  }, [data]);
  
  useEffect(() => {
    if (isDone && !isSharing && !data?.questionData?.agent_label && !data.isIllegalQuery) {
      setIsCollapsed(true);
    }
  }, [isDone, isSharing, data]);
  
  useEffect(() => {
    if (!loading && data.context && isDone) {
      // console.log('====================================');
      // console.log('update 123123:',data.context);
      // console.log('====================================');
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
                  // 实时对话过程中（isStorage=false）：检查是否有 roundIndex
                  // 历史对话直接打开
                  if (!isStorage) {
                    // 实时对话过程中，只有返回了 roundIndex 才能打开模型调试
                    if (data.roundIndex) {
                      setCur(data);
                      setDebugModalVisible(true);
                    } else {
                      message.warning('暂未返回模型调试信息');
                    }
                  } else {
                    // 历史对话场景，直接打开
                    setCur(data);
                    setDebugModalVisible(true);
                  }
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
          {isCollapsed ? null : <div className="p-[0.75rem] px-[1.5625rem]">
            <div
              ref={contentRef}
              className="whitespace-pre-wrap text-sm text-gray-700 transition-all duration-300 ease-in-out relative"
              style={{
                maxHeight: isCollapsed ? '0' : 'none',
                overflow: isCollapsed ? 'hidden' : 'visible',
                paddingTop: isCollapsed ? '0' : '20px'
              }}
            >
              {/* 复制 */}
              {
                !questionData?.agent_label && finalContent && (
                  <div className="absolute right-1 top-[-5px] cursor-pointer text-gray-600 hover:text-gray-800 transition-colors">
                    <Text
                      copyable={{
                        text: processContent(finalContent),
                        tooltips: ['复制', '已复制'],
                      }}
                    />
                  </div>
                )
              }

              {/* 思考内容直出 */}
              {thinkNodes.length > 0 ? (
                <div className="mb-4">
                  {thinkNodes.map((node, index) => (
                    <div key={index} className="mb-2">
                      <div className={styles['markdown-content']}>
                        <ReactMarkdown>{processContent(node.content)}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4">
                  <div className={styles['markdown-content']}>
                    <ReactMarkdown>{processContent(data.context || '')}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* 内容区不渲染 </think> 之后的文本 */}

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
              {
                !isCollapsed && !isSharing && (
                  <div className={styles.collapseButtonWrapper}>
                    <Button
                      type="primary" 
                      shape="circle"
                      className={styles.collapseButton}
                      onClick={() => setIsCollapsed(true)}
                    >
                      <UpOutlined className={styles.collapseButtonArrow} />
                      <span>收起</span>
                    </Button>
                  </div>
                )
              }
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
}

export default AiEle;
