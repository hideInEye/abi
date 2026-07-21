import React, {useState} from 'react';
import { ModulesMap } from '@/constant/chat';
import { getModulesByChatMode } from '@/utils';
import { message, Tooltip, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  LikeOutlined,
  DislikeOutlined,
  LikeFilled,
  DislikeFilled,
  BulbOutlined,
  FunnelPlotOutlined,
  FundOutlined,
  CopyOutlined,
  ReloadOutlined,
  FileTextOutlined,
  SnippetsOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  ShareAltOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';

interface Props {
  onAttributionClick: () => void;
  onPredictClick: () => void;
  onReferenceClick?: () => void;
  onQaClick?: () => void;
  onRegenerateClick?: () => void;
  onDeleteClick?: () => void;
  onShareClick?: () => void;
  onVoteChange: (payload: any) => void;
  chatMode: string;
  feedback: any;
  content?: string; // 用于复制的内容
  isLast?: boolean; // 仅最后一组对话显示重新生成
  versionInfo?: { activeIndex: number; total: number; onChange: (i: number) => void }; // 多版本分页
}

const StatisticsAnalysis: React.FC<Props> = ({
  chatMode,
  onVoteChange,
  onAttributionClick,
  onReferenceClick,
  onPredictClick,
  onQaClick,
  onRegenerateClick,
  onDeleteClick,
  onShareClick,
  feedback,
  content = '',
  isLast,
  versionInfo,
}) => {
  const showLikeButton = getModulesByChatMode(chatMode, ModulesMap[7]); // 是否显示点赞点踩按钮
  const showReferenceButton = getModulesByChatMode(chatMode, ModulesMap[8]); // 是否显示引用按钮
  const showAttributionButton = getModulesByChatMode(chatMode, ModulesMap[12]); // 是否显示归因分析按钮
  const showPredictButton = getModulesByChatMode(chatMode, ModulesMap[13]); // 是否显示预测分析按钮
  const showRecommend = getModulesByChatMode(chatMode, ModulesMap[9]); // 是否展示推荐问题
  const showRegenerate = chatMode === 'chat_with_db_execute' || chatMode === 'chat_excel'; // 是否显示重新生成按钮

  // 内部状态管理
  const [localFeedback, setLocalFeedback] = useState({});
  const [loading, setLoading] = useState(false);
  
  // 初始化反馈状态
  React.useEffect(() => {
    setLocalFeedback(feedback);
  }, [feedback]);
  
  // 从 feedback 中解析反馈状态值：0=无评价, 1=点赞, -1=点踩
  // 兼容两种来源：
  //   1) 历史列表接口的 feedbackStatus（数字/字符串）
  //   2) 点击后本地构造的对象 { status, eval_user }
  const getFeedbackStatus = (fb: any): number => {
    if (fb === null || fb === undefined || fb === '') return 0;
    if (typeof fb === 'number') return fb;
    if (typeof fb === 'string') {
      const n = Number(fb);
      return Number.isNaN(n) ? 0 : n;
    }
    if (typeof fb === 'object') {
      if (fb.status !== undefined && fb.status !== null && fb.status !== '') {
        const n = Number(fb.status);
        if (!Number.isNaN(n)) return n;
      }
      if (fb.eval_user === '0') return 1;
      if (fb.eval_user === '1') return -1;
    }
    return 0;
  };

  // 判断是否可操作（已评价仍可在赞/踩之间切换）
  const canOperate = () => true;

  // 判断是否已点赞
  const hasLiked = () => getFeedbackStatus(feedback) === 1;

  // 判断是否已点踩
  const hasDisliked = () => getFeedbackStatus(feedback) === -1;

  const handleVote = async (value: '0' | '1') => {
    if (!canOperate() || loading) return;
    
    setLoading(true);
    try {
      // status: 0=无评价, 1=点赞, -1=点踩
      const payload = {
        fb_id: feedback?.fb_id || null,
        eval_user: value,
        status: value === '0' ? 1 : -1,
      };
      
      onVoteChange && onVoteChange(payload);
    } catch (error) {
      console.error('操作失败:', error);
      // 可添加错误提示
    } finally { 
      setLoading(false);
    }
  };
  
  // 处理点赞
  const handleLike = () => {
    if (!canOperate()) {
      message.error('暂不可操作');
    }
    if (!hasLiked()) {
      handleVote('0'); // 点赞
    }
  };
  
  // 处理点踩
  const handleDislike = () => {
    if (!canOperate()) {
      message.error('暂不可操作');
    }
    if (!hasDisliked()) {
      handleVote('1');
    }
  };

  // 复制功能
  const handleCopy = async (format: 'markdown' | 'plaintext') => {
    if (!content) {
      message.warning('暂无可复制的内容');
      return;
    }

    try {
      let textToCopy = content;
      
      if (format === 'plaintext') {
        // 移除 Markdown 标记,转为纯文本
        textToCopy = content
          .replace(/#{1,6}\s/g, '') // 移除标题
          .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
          .replace(/\*(.*?)\*/g, '$1') // 移除斜体
          .replace(/`(.*?)`/g, '$1') // 移除行内代码
          .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 移除链接,保留文本
          .replace(/!\[(.*?)\]\(.*?\)/g, '$1') // 移除图片
          .replace(/^>\s/gm, '') // 移除引用
          .replace(/^[-*+]\s/gm, '') // 移除无序列表
          .replace(/^\d+\.\s/gm, '') // 移除有序列表
          .replace(/```[\s\S]*?```/g, '') // 移除代码块
          .trim();
      }

      await navigator.clipboard.writeText(textToCopy);
      message.success(format === 'markdown' ? '已复制为 Markdown' : '已复制为纯文本');
    } catch (error) {
      console.error('复制失败:', error);
      message.error('复制失败,请重试');
    }
  };

  // 复制下拉菜单
  const copyMenuItems: MenuProps['items'] = [
    {
      key: 'markdown',
      label: (
        <span className="flex items-center gap-2">
          <SnippetsOutlined />
          复制为 Markdown
        </span>
      ),
      onClick: () => handleCopy('markdown'),
    },
    {
      key: 'plaintext',
      label: (
        <span className="flex items-center gap-2">
          <FileTextOutlined />
          复制为纯文本
        </span>
      ),
      onClick: () => handleCopy('plaintext'),
    },
  ];

  const renderLikeButtons = () => {
    if (!showLikeButton) return null;
    
    return (
      <>
        <Tooltip title="点赞">
          <span 
            className={`action-icon ${hasLiked() ? 'active' : ''} ${
              loading || !canOperate() ? 'disabled' : ''
            }`} 
            onClick={handleLike}
          >
            {hasLiked() ? <LikeFilled /> : <LikeOutlined />}
          </span>
        </Tooltip>
        <Tooltip title="点踩">
          <span 
            className={`action-icon ${hasDisliked() ? 'active' : ''} ${
              loading || !canOperate() ? 'disabled' : ''
            }`} 
            onClick={handleDislike}
          >
            {hasDisliked() ? <DislikeFilled /> : <DislikeOutlined />}
          </span>
        </Tooltip>
      </>
    );
  };

  return (
    <div className='my-1'>
      {/* 操作栏 - 左对齐 */}
      <div className="action-bar">
        <div className="action-bar-left">
          {/* 复制 */}
          <Dropdown menu={{ items: copyMenuItems }} trigger={['click']} placement="topLeft">
            <Tooltip title="复制">
              <span className="action-icon">
                <CopyOutlined />
              </span>
            </Tooltip>
          </Dropdown>

          {/* 点赞、点踩 */}
          {renderLikeButtons()}

          {/* 重新生成（仅最后一组对话） */}
          {showRegenerate && isLast && onRegenerateClick && (
            <Tooltip title="重新生成">
              <span className="action-icon" onClick={onRegenerateClick}>
                <ReloadOutlined />
              </span>
            </Tooltip>
          )}

          {/* 更多（推荐问题/归因分析/预测分析/删除等操作）
              仅一个操作时直接平铺展示对应图标按钮，多个操作时才收进「...」菜单 */}
          {(() => {
            // 先收集所有可用操作（含图标、文案与点击回调）
            const actions: { key: string; icon: React.ReactNode; text: string; onClick: () => void }[] = [];
            if (onShareClick) {
              actions.push({ key: 'share', icon: <ShareAltOutlined />, text: '分享对话', onClick: () => onShareClick?.() });
            }
            if (showRecommend) {
              actions.push({ key: 'qa', icon: <BulbOutlined />, text: '推荐问题', onClick: () => onQaClick?.() });
            }
            if (showAttributionButton) {
              actions.push({ key: 'attribution', icon: <FunnelPlotOutlined />, text: '归因分析', onClick: () => onAttributionClick?.() });
            }
            if (showPredictButton) {
              actions.push({ key: 'predict', icon: <FundOutlined />, text: '预测分析', onClick: () => onPredictClick?.() });
            }
            if (onDeleteClick) {
              actions.push({ key: 'delete', icon: <DeleteOutlined />, text: '删除', onClick: () => onDeleteClick?.() });
            }
            if (!actions.length) return null;

            // 只有一个操作：直接平铺展示该操作图标（不再收进「...」）
            if (actions.length === 1) {
              const only = actions[0];
              return (
                <Tooltip title={only.text}>
                  <span className="action-icon" onClick={only.onClick}>
                    {only.icon}
                  </span>
                </Tooltip>
              );
            }

            // 多个操作：全部收进「...」下拉菜单
            const moreItems: MenuProps['items'] = actions.map((action) => ({
              key: action.key,
              label: (<span className="flex items-center gap-2">{action.icon}{action.text}</span>),
              onClick: action.onClick,
            }));
            return (
              <Dropdown menu={{ items: moreItems }} trigger={['click']} placement="topLeft">
                <Tooltip title="更多">
                  <span className="action-icon">
                    <EllipsisOutlined />
                  </span>
                </Tooltip>
              </Dropdown>
            );
          })()}

          {/* 多版本切换（重新生成后展示层合并） */}
          {versionInfo && versionInfo.total > 1 && (
            <div className="flex items-center gap-1 ml-1 text-[13px] text-[#8a94a6] select-none">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md ${versionInfo.activeIndex <= 0 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-[#f0f2f5]'}`}
                onClick={() => { if (versionInfo.activeIndex > 0) versionInfo.onChange(versionInfo.activeIndex - 1); }}
              >
                <LeftOutlined style={{ fontSize: 12 }} />
              </span>
              <span>{versionInfo.activeIndex + 1} / {versionInfo.total}</span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md ${versionInfo.activeIndex >= versionInfo.total - 1 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-[#f0f2f5]'}`}
                onClick={() => { if (versionInfo.activeIndex < versionInfo.total - 1) versionInfo.onChange(versionInfo.activeIndex + 1); }}
              >
                <RightOutlined style={{ fontSize: 12 }} />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsAnalysis; 
