import React, {useState} from 'react';
import SvgIcon from '../../../components/SvgIcon';
import AnalysisRecommend from '../AnalysisRecommend';
import { ModulesMap } from '@/constant/chat';
import { getModulesByChatMode } from '@/utils';
import { Tag, message, Tooltip } from 'antd';

interface Props {
  onAttributionClick: () => void;
  onPredictClick: () => void;
  onReferenceClick?: () => void;
  onQaClick?: () => void;
  onDimensionClick?: () => void;
  onIndexClick?: () => void;
  onVoteChange: (payload: any) => void;
  paramsData?: any;
  chatMode: string;
  feedback: any;
}

const StatisticsAnalysis: React.FC<Props> = ({
  chatMode,
  onVoteChange,
  paramsData,
  onAttributionClick,
  onReferenceClick,
  onPredictClick,
  onQaClick,
  onDimensionClick,
  onIndexClick,
  feedback
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

  const renderLikeButtons = () => {
    if (!showLikeButton) return null;
    
    return (
      <>
        <Tooltip title="点赞">
          <span 
            className={`cursor-pointer text-[24px] hover:opacity-80 select-none ${
              loading || !canOperate() ? 'opacity-50 cursor-not-allowed' : ''
            }`} 
            onClick={handleLike}
          >
            <SvgIcon localIcon={hasLiked() ? "good-fill" : "good"} />
          </span>
        </Tooltip>
        <Tooltip title="点踩">
          <span 
            className={`cursor-pointer text-[24px] hover:opacity-80 select-none ${
              loading || !canOperate() ? 'opacity-50 cursor-not-allowed' : ''
            }`} 
            onClick={handleDislike}
          >
            <SvgIcon localIcon={hasDisliked() ? "bad-fill" : "bad"} />
          </span>
        </Tooltip>
      </>
    );
  };

  return (
    <>
      {/* 推荐问题等部分 */}
      <div className="rounded bg-[#f6f6f6] p-2 rounded-[8px] w-full">
        <div className="flex justify-between items-center p-2 pt-4">
          <div className="flex gap-2">
            {renderLikeButtons()}
          </div>
          <div className="flex gap-2 items-center mr-2">
            {/* {showReferenceButton && (
              <Tooltip title="引用">
                <span 
                  className="cursor-pointer text-[24px] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none" 
                  onClick={onReferenceClick}
                >
                  #
                </span>
              </Tooltip>
            )} */}
            {showRecommend && (
              <Tooltip title="推荐问题">
                <span 
                  className="cursor-pointer text-[22px] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none"
                  onClick={onQaClick}
                >
                  QA
                </span>
              </Tooltip>
            )}
            {showRecommend && (
              <Tooltip title="推荐维度">
                <span 
                  className="cursor-pointer text-[20px] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none"
                  onClick={onDimensionClick}
                >
                  <SvgIcon
                    className="cursor-pointer"
                    localIcon="dimension"
                  />
                </span>
                </Tooltip>
            )}
            {showRecommend && (
              <Tooltip title="推荐指标">
                <span 
                  className="cursor-pointer text-[20px] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none"
                  onClick={onIndexClick}
                >
                  <SvgIcon
                    className="cursor-pointer"
                    localIcon="index"
                  />
                </span>
              </Tooltip>
            )}
            {showAttributionButton && (
              <Tooltip title="归因分析">
                <span 
                  className="cursor-pointer text-[18px] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none"
                  onClick={onAttributionClick}
                >
                  <SvgIcon
                    className="cursor-pointer"
                    localIcon="attribution"
                  />
                </span>
              </Tooltip>
            )}
            {showPredictButton && (
              <Tooltip title="预测分析">
                <span 
                  className="cursor-pointer text-[18px] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none"
                  onClick={onPredictClick}
                >
                  <SvgIcon
                    className="cursor-pointer"
                    localIcon="predict"
                  />
                </span>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StatisticsAnalysis; 