import React, {useState} from 'react';
import SvgIcon from '../../../components/SvgIcon';
import AnalysisRecommend from '../AnalysisRecommend';
import { ModulesMap } from '@/constant/chat';
import { getModulesByChatMode } from '@/utils';
import { Tag, message, Tooltip } from 'antd';
import { FundTwoTone, BulbTwoTone, FunnelPlotTwoTone } from '@ant-design/icons';

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
            className={`cursor-pointer text-[1.5rem] hover:opacity-80 select-none ${
              loading || !canOperate() ? 'opacity-50 cursor-not-allowed' : ''
            }`} 
            onClick={handleLike}
          >
            <SvgIcon localIcon={hasLiked() ? "good-fill" : "good"} />
          </span>
        </Tooltip>
        <Tooltip title="点踩">
          <span 
            className={`cursor-pointer text-[1.5rem] hover:opacity-80 select-none ${
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
    <div className='my-2'>
      {/* 推荐问题等部分 */}
      <div className="rounded bg-[#f6f6f6]  pl-2 pr-2 rounded-[0.5rem] w-full">
        <div className="flex justify-between items-center">
          <div className="flex gap-3">
            {renderLikeButtons()}
          </div>
          <div className="flex gap-4 items-center mr-2">
            {/* {showReferenceButton && (
              <Tooltip title="引用">
                <span 
                  className="cursor-pointer text-[1.5rem] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none" 
                  onClick={onReferenceClick}
                >
                  #
                </span>
              </Tooltip>
            )} */}
            {showRecommend && (
              <Tooltip title="推荐问题">
                <span 
                  className="cursor-pointer text-[1.25rem] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none"
                  onClick={onQaClick}
                >
                  <BulbTwoTone />  
                </span>
              </Tooltip>
            )}
            {showRecommend && (
              <Tooltip title="推荐维度">
                <span 
                  className="cursor-pointer text-[1.375rem] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none"
                  onClick={onDimensionClick}
                >
                  <SvgIcon
                    className="cursor-pointer"
                    localIcon="weidu"
                  />
                </span>
                </Tooltip>
            )}
            {showRecommend && (
              <Tooltip title="推荐指标">
                <span 
                  className="cursor-pointer text-[1.4375rem] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none"
                  onClick={onIndexClick}
                >
                  <SvgIcon
                    className="cursor-pointer"
                    localIcon="zhibiao"
                  />
                </span>
              </Tooltip>
            )}
            {showAttributionButton && (
              <Tooltip title="归因分析">
                <span 
                  className="cursor-pointer text-[1.25rem] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none"
                  onClick={onAttributionClick}
                >
                  <FunnelPlotTwoTone />
                </span>
              </Tooltip>
            )}
            {showPredictButton && (
              <Tooltip title="预测分析">
                <span 
                  className="cursor-pointer text-[1.25rem] text-[#2E6CF6] hover:text-[#2E6CF6] hover:opacity-80 select-none"
                  onClick={onPredictClick}
                >
                  <FundTwoTone />
                </span>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsAnalysis; 
