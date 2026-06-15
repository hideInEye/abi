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
  DashboardOutlined,
  LineChartOutlined,
  CopyOutlined,
  MoreOutlined,
  FileTextOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';

interface Props {
  onAttributionClick: () => void;
  onPredictClick: () => void;
  onReferenceClick?: () => void;
  onQaClick?: () => void;
  onDimensionClick?: () => void;
  onIndexClick?: () => void;
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
  onDimensionClick,
  onIndexClick,
  feedback,
  content = ''
}) => {
  const showLikeButton = getModulesByChatMode(chatMode, ModulesMap[7]); // 是否显示点赞点踩按钮
  const showReferenceButton = getModulesByChatMode(chatMode, ModulesMap[8]); // 是否显示引用按钮
  const showAttributionButton = getModulesByChatMode(chatMode, ModulesMap[12]); // 是否显示归因分析按钮
  const showPredictButton = getModulesByChatMode(chatMode, ModulesMap[13]); // 是否显示预测分析按钮
  const showRecommend = getModulesByChatMode(chatMode, ModulesMap[9]); // 是否展示推荐问题、推荐维度、推荐指标

  // 内部状态管理
  const [localFeedback, setLocalFeedback] = useState({});
  const [loading, setLoading] = useState(false);
  
  // 初始化反馈状态
  React.useEffect(() => {
    setLocalFeedback(feedback);
  }, [feedback]);
  
  // 判断是否可操作
  const canOperate = () => {
    if (Object.keys(feedback).length === 0) return true;
    return feedback.status === '2';
  };

  // 判断是否已点赞
  const hasLiked = () => {
    if (Object.keys(feedback).length === 0) return false;
    return feedback.eval_user === '0';
  };
  
  // 判断是否已点踩
  const hasDisliked = () => {
    if (Object.keys(feedback).length === 0) return false;
    return feedback.eval_user === '1';
  };

  const handleVote = async (value: '0' | '1') => {
    if (!canOperate() || loading) return;
    
    setLoading(true);
    try {
      const payload = {
        fb_id: feedback?.fb_id || null,
        eval_user: value
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

  // 更多操作下拉菜单
  const moreMenuItems: MenuProps['items'] = [
    ...(showRecommend ? [{
      key: 'dimension',
      label: (
        <span className="flex items-center gap-2">
          <DashboardOutlined />
          推荐维度
        </span>
      ),
      onClick: onDimensionClick,
    }] : []),
    ...(showRecommend ? [{
      key: 'index',
      label: (
        <span className="flex items-center gap-2">
          <LineChartOutlined />
          推荐指标
        </span>
      ),
      onClick: onIndexClick,
    }] : []),
    ...(showAttributionButton ? [{
      key: 'attribution',
      label: (
        <span className="flex items-center gap-2">
          <FunnelPlotOutlined />
          归因分析
        </span>
      ),
      onClick: onAttributionClick,
    }] : []),
    ...(showPredictButton ? [{
      key: 'predict',
      label: (
        <span className="flex items-center gap-2">
          <FundOutlined />
          预测分析
        </span>
      ),
      onClick: onPredictClick,
    }] : []),
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
          {/* 复制按钮 */}
          <Dropdown menu={{ items: copyMenuItems }} trigger={['click']} placement="topLeft">
            <Tooltip title="复制">
              <span className="action-icon">
                <CopyOutlined />
              </span>
            </Tooltip>
          </Dropdown>

          {/* 点赞、点踩 */}
          {renderLikeButtons()}

          {/* 推荐问题 */}
          {showRecommend && (
            <Tooltip title="推荐问题">
              <span className="action-icon" onClick={onQaClick}>
                <BulbOutlined />
              </span>
            </Tooltip>
          )}

          {/* 更多操作 */}
          {moreMenuItems && moreMenuItems.length > 0 && (
            <Dropdown menu={{ items: moreMenuItems }} trigger={['click']} placement="topLeft">
              <Tooltip title="更多">
                <span className="action-icon">
                  <MoreOutlined />
                </span>
              </Tooltip>
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsAnalysis; 
