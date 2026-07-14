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
import { CheckCircleFilled, DownOutlined, UpOutlined } from '@ant-design/icons';
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
    // 处理后的内容：保留段落结构（空行=段落分隔），避免多个换行被压缩后 Markdown 将其折叠为空格
    const processed = String(content || '')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map(line => line.trim()) // 去除每行首尾空白
      .join('\n') // 重新组合，保留空行
      .replace(/\n{3,}/g, '\n\n') // 将多个连续空行压缩为单个段落分隔
      .trim();

    return processed;
  };

  /**
   * 思考内容专用渲染处理：在保留段落分隔的基础上，把段落内的单个换行也转成 Markdown 硬换行（<br>）
   * 用于实时对话与历史对话的思考内容展示，确保后端返回的 \n / \n\n 都能真实换行
   */
  const toThinkingMarkdown = (content: string) => {
    const normalized = processContent(content);
    if (!normalized) return '';
    // 非空行结尾追加两个空格 => Markdown 硬换行；空行保持为段落分隔
    return normalized
      .split('\n')
      .map(line => (line === '' ? '' : `${line}  `))
      .join('\n');
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
  // 历史步骤折叠/展开状态
  const [stepsExpanded, setStepsExpanded] = useState(false);

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
      setStepsExpanded(false)
    }
  }, [data?.smLoading, data?.order])

  const displayThinkingSeconds = data?.smLoading
    ? thinkingSeconds
    : (typeof thinkTime === 'number' && Number.isFinite(thinkTime) ? thinkTime : thinkingSeconds)

  const statusLabel = data?.smLoading
    ? '思考中'
    : (displayThinkingSeconds > 0 ? '思考了' : '已完成思考')

  const showHistoryTrigger = !questionData?.agent_label && !data?.isIllegalQuery
  const fallbackThinkingContent = toThinkingMarkdown(data.context || '')
  const canOpenHistorySteps = showHistoryTrigger && !data?.smLoading && (historySteps.length > 0 || !!fallbackThinkingContent)

  const handleToggleHistorySteps = () => {
    if (!canOpenHistorySteps) return
    setStepsExpanded((prev) => !prev)
  }

  return (
    <div className="my-2 w-full flex justify-start">
      {/* <SvgIcon
        className="mt-[0.375rem] text-[1.875rem]"
        localIcon="bot"
      /> */}
      <div className="w-full text-left">
        <div className={styles.thinkingCard}>
          <div className={styles.thinkingCardHeader}>
            <div className={styles.thinkingStatusWrap}>
              <span className={styles.thinkingStatusIcon}>
                {statusLabel === '已完成思考' ? (
                  <CheckCircleFilled style={{ fontSize: '1rem', color: '#52c41a' }} />
                ) : (
                  <SvgIcon className="text-[1rem]" localIcon={data?.smLoading ? 'thinkingblue' : 'thinking'} />
                )}
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
                  onClick={handleToggleHistorySteps}
                  disabled={!canOpenHistorySteps}
                >
                  <span>{stepsExpanded ? '收起' : '展开'}</span>
                  {stepsExpanded ? <UpOutlined className={styles.thinkingHistoryArrow} /> : <DownOutlined className={styles.thinkingHistoryArrow} />}
                </button>
              ) : null}
            </div>
          </div>

          {/* 历史步骤折叠区域 - 默认显示3行 */}
          {canOpenHistorySteps && (
            <div className={styles.thinkingStepsCollapsible}>
              <div
                className={styles.thinkingStepsContent}
                style={{
                  maxHeight: stepsExpanded ? 'none' : '4.5em',
                  overflow: stepsExpanded ? 'visible' : 'hidden',
                }}
              >
                {historySteps.length > 0 ? (
                  historySteps.map((step: any, index: number) => (
                    <div key={step.id || index} className={styles.thinkingStepItem}>
                      <div className={styles.thinkingStepBody}>
                        <div className={styles.thinkingStepContent}>
                          <ReactMarkdown>{toThinkingMarkdown(step.content)}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))
                ) : fallbackThinkingContent ? (
                  <div className={styles.thinkingStepItem}>
                    <div className={styles.thinkingStepBody}>
                      <div className={styles.thinkingStepContent}>
                        <ReactMarkdown>{fallbackThinkingContent}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              {/* 渐变遮罩 - 未展开且内容溢出时显示 */}
              {!stepsExpanded && <div className={styles.thinkingStepsFade} />}
            </div>
          )}

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
                        <ReactMarkdown>{toThinkingMarkdown(node.content)}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-4">
                  <div className={styles['markdown-content']}>
                    <ReactMarkdown>{toThinkingMarkdown(data.context || '')}</ReactMarkdown>
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
    </div>
  );
}

export default AiEle;
