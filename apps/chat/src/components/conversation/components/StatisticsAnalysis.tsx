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
} from '@ant-design/icons';

interface Props {
  onAttributionClick: () => void;
  onPredictClick: () => void;
  onReferenceClick?: () => void;
  onQaClick?: () => void;
  onRegenerateClick?: () => void;
  onVoteChange: (payload: any) => void;
  chatMode: string;
  feedback: any;
  content?: string; // 用于复制的内容
}

const StatisticsAnalysis: React.FC<Props> = ({
  chatMode,
  onVoteChange,
  onAttributionClick,
  onReferenceClick,
  onPredictClick,
  onQaClick,
  onRegenerateClick,
  feedback,
  content = ''
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
    <div className='my-2'>
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

          {/* 重新生成 */}
          {showRegenerate && (
            <Tooltip title="重新生成">
              <span className="action-icon" onClick={onRegenerateClick}>
                <ReloadOutlined />
              </span>
            </Tooltip>
          )}

          {/* 推荐问题 */}
          {showRecommend && (
            <Tooltip title="推荐问题">
              <span className="action-icon" onClick={onQaClick}>
                <BulbOutlined />
              </span>
            </Tooltip>
          )}

          {/* 归因分析 */}
          {showAttributionButton && (
            <Tooltip title="归因分析">
              <span className="action-icon" onClick={onAttributionClick}>
                <FunnelPlotOutlined />
              </span>
            </Tooltip>
          )}

          {/* 预测分析 */}
          {showPredictButton && (
            <Tooltip title="预测分析">
              <span className="action-icon" onClick={onPredictClick}>
                <FundOutlined />
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsAnalysis; 
