/**
 * AI 回答展示组件
 * 用于展示 AI 生成的回答内容
 * 支持 Markdown 格式和代码高亮
 * @module AiEle
 */

import React, { useEffect, useMemo, useState } from "react";
import SvgIcon from "../../components/SvgIcon"
import styles from './index.module.css';
import ClarifyComponent from "./components/ClarifyComponent";
import IntentClarifyV2 from "./components/IntentClarifyV2"; // 澄清处理组件
import ThinkingStepsDrawer from "./components/ThinkingStepsDrawer";
import { RightOutlined } from '@ant-design/icons';  // 导入 Ant Design 图标
import { Typography } from "antd";
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
  isDone,
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

  const normalizeStepContent = (rawContent: string, stepAssistantName: string) => {
    const cleanedRaw = processContent(
      String(rawContent || '')
        .replace(/\[DONE\]/g, '')
        .replace(/round_index:\d+,?\s*/g, '')
        .replace(/sub_chat_mode:\w+,?\s*/g, '')
    )

    const parsed = parseThinkNodes(rawContent, stepAssistantName)
    const thinkOnly = processContent(
      parsed.thinkNodes.length
        ? parsed.thinkNodes.map((node) => node.content).join('\n\n')
        : ''
    )
    const finalOnly = processContent(parsed.finalContent || '')

    return thinkOnly || finalOnly || cleanedRaw
  }

  // 解析思考节点，传入助手名称
  const assistantName = getAssistantName();
  const { thinkNodes, finalContent } = parseThinkNodes(data.context || '', assistantName);

  const historySteps = useMemo(() => {
    if (Array.isArray(data?.aiSteps) && data.aiSteps.length > 0) {
      return data.aiSteps
        .map((step: any, index: number) => {
          const rawContent = String(step?.content || '')
          const stepAssistantName = step?.name || assistantName
          const normalizedContent = normalizeStepContent(rawContent, stepAssistantName)

          return {
            id: step?.id ?? `${data?.order ?? 'step'}-${index}`,
            name: stepAssistantName,
            content: normalizedContent
          }
        })
        .filter((step: any) => !!step.content)
    }

    return thinkNodes.map((node, index) => ({
      id: `${data?.order ?? 'step'}-${index}`,
      name: node.name || assistantName,
      content: normalizeStepContent(node.content || '', node.name || assistantName)
    }))
  }, [assistantName, data?.aiSteps, data?.order, thinkNodes])

  if (useSimpleStyle) {
    return (
      <div className="my-4 w-full flex items-start">
        <div className="flex-shrink-0">
          {/* <SvgIcon
            className="text-[1.875rem]"
            localIcon="bot"
          /> */}
        </div>
        <div className="ml-2 max-w-[80%]">
          <div className="bg-[#e8eefb] rounded-lg px-4 py-2 text-sm text-gray-700 relative">
            {/* 添加小三角 */}
            <div className="absolute left-[-0.375rem] top-3 w-3 h-3 bg-[#e8eefb] transform rotate-45"></div>
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
  // 实时思考秒数（用于生成中展示）
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  // 思考步骤抽屉
  const [stepsDrawerOpen, setStepsDrawerOpen] = useState(false);

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

  useEffect(() => {
    if (data?.smLoading) {
      setThinkingSeconds(0)
      const timer = window.setInterval(() => {
        setThinkingSeconds((prev) => prev + 1)
      }, 1000)
      return () => window.clearInterval(timer)
    }

    if (typeof thinkTime === 'number' && Number.isFinite(thinkTime)) {
      setThinkingSeconds(thinkTime)
    }
  }, [data?.smLoading, data?.order, thinkTime])

  useEffect(() => {
    if (data?.smLoading) {
      setStepsDrawerOpen(false)
    }
  }, [data?.smLoading, data?.order])

  const displayThinkingSeconds = data?.smLoading
    ? thinkingSeconds
    : (typeof thinkTime === 'number' && Number.isFinite(thinkTime) ? thinkTime : thinkingSeconds)

  const statusLabel = data?.smLoading
    ? '思考中'
    : (displayThinkingSeconds > 0 ? '思考了' : '已完成思考')

  const showHistoryTrigger = !questionData?.agent_label && !data?.isIllegalQuery
  const fallbackThinkingContent = processContent(data.context || '')
  const canOpenHistorySteps = showHistoryTrigger && !data?.smLoading && (historySteps.length > 0 || !!fallbackThinkingContent)

  const handleOpenHistorySteps = () => {
    if (!canOpenHistorySteps) return
    setStepsDrawerOpen((prev) => !prev)
  }

  return (
    <div className="my-2 w-full flex justify-start">
      {/* <SvgIcon
        className="mt-[0.375rem] text-[1.875rem]"
        localIcon="bot"
      /> */}
      <div className="w-full px-2 text-left">
        <div className={styles.thinkingCard}>
          <div className={styles.thinkingCardHeader}>
            <div className={styles.thinkingStatusWrap}>
              <span className={styles.thinkingStatusIcon}>
                <SvgIcon className="text-[1rem]" localIcon={data?.smLoading ? 'thinkingblue' : 'thinking'} />
              </span>
              <span className={styles.thinkingStatusText}>
                {statusLabel}
              </span>
              {displayThinkingSeconds > 0 ? <span className={styles.thinkingStatusTime}>{displayThinkingSeconds}秒</span> : null}
              {/* <span className={styles.thinkingAssistantName}>{getAssistantName()}</span> */}
            </div>
            <div className="flex items-center gap-[1rem]">
              {showHistoryTrigger ? (
                <button
                  type="button"
                  className={`${styles.thinkingHistoryTrigger} ${!canOpenHistorySteps ? styles.thinkingHistoryTriggerDisabled : ''}`}
                  onClick={handleOpenHistorySteps}
                  disabled={!canOpenHistorySteps}
                >
                  <span>{stepsDrawerOpen ? '收起历史步骤' : '查看历史步骤'}</span>
                  <RightOutlined className={styles.thinkingHistoryArrow} />
                </button>
              ) : null}
            </div>
          </div>
          {isCollapsed ? null : <div className={styles.thinkingCardBody}>
            <div
              className={styles.thinkingContent}
              style={{
                paddingTop: '1.25rem'
              }}
            >
              {/* 复制 */}
              {
                !questionData?.agent_label && finalContent && (
                  <div className={styles.thinkingCopy}>
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
                    <div key={index} className={styles.thinkingNode}>
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
            </div>
          </div>}
        </div>
      </div>
      <ThinkingStepsDrawer
        open={stepsDrawerOpen}
        onClose={() => setStepsDrawerOpen(false)}
        steps={historySteps}
        fallbackContent={historySteps.length > 0 ? '' : fallbackThinkingContent}
        thinkTime={displayThinkingSeconds}
      />
    </div>
  );
}

export default AiEle;
