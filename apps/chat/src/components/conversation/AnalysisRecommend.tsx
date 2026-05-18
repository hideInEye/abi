import React, { useEffect, useState } from 'react';
import { Tag } from 'antd';
import { fetchRecommendQuestions, fetchRecommendDimensions, fetchRecommendIndicators } from '../../service/api/conv';

interface Props {
  onQuestionClick?: (question: string) => void;
  paramsData?: any;
}

const AnalysisRecommend: React.FC<Props> = ({ onQuestionClick, paramsData }) => {
  // 添加状态管理
  const [recommendQuestions, setRecommendQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sceneTitle, setSceneTitle] = useState('推荐问题');
  // 获取推荐问题
  useEffect(() => {
    const getRecommendQuestions = async () => {
      setLoading(true);
      try {
        const res = await fetchRecommendQuestions({});
        console.log('fetchRecommendQuestions', res);
        if (res?.data) {
          // 设置推荐问题
          const questions = res.data.map((item: any) => {
            return item.prompt_sub_scene_zh;
          });
          setRecommendQuestions(questions);
        }
      } catch (error) {
        console.error('获取推荐问题失败:', error);
        setRecommendQuestions([
          '上个月的总销售额是多少?',
          '去年各省份利润是多少?',
          '去年各省份利润是多少?'
        ]);
      } finally {
        setLoading(false);
      }
    };
    const getRecommendDimensions = async () => {
      console.log('paramsData', paramsData);
      const res = await fetchRecommendDimensions(paramsData);
      console.log('fetchRecommendDimensions', res);
    };
    const getRecommendIndicators = async () => {
      const res = await fetchRecommendIndicators(paramsData);
      console.log('fetchRecommendIndicators', res);
    };

    getRecommendQuestions();
    getRecommendDimensions();
    getRecommendIndicators();
  }, []);

  // 推荐维度列表
  const recommendDimensions = [
    { label: '订单日期', color: 'rgb(252, 238, 219)' },
    { label: '订单编号', color: 'rgb(228, 246, 189)' },
    { label: '省份', color: 'rgb(200, 240, 238)' },
    { label: '商户类别', color: 'rgb(236, 218, 252)' },
    { label: '商品名称', color: 'rgb(218, 222, 252)' }
  ];

  // 推荐指标列表
  const recommendIndicators = [
    { label: '销售数量', color: 'rgb(46, 108, 246)' },
    { label: '利润金额', color: 'rgb(46, 108, 246)' },
    { label: '销售金额', color: 'rgb(46, 108, 246)' }
  ];

  return (
    <div className="pl-2 pr-2 pt-2">
      {/* 推荐问题 */}
      <div className="mb-4 flex text-left" style={{ width: '100%' }}>
        <div className="text-gray-600" style={{ width: '10%', lineHeight: '32px' }}>{sceneTitle}</div>
        <div className="flex flex-wrap gap-2" style={{ width: '90%' }}>
          {!loading && recommendQuestions.map((question, index) => (
            <Tag
              key={index}
              className="cursor-pointer px-3 py-1 rounded-full hover:opacity-70 select-none"
              onClick={() => onQuestionClick?.(question)}
              style={{ backgroundColor: 'white' }}
            >
              {question}
            </Tag>
          ))}
        </div>
      </div>

      {/* 推荐维度 */}
      <div className="mb-4 flex text-left" style={{ width: '100%' }}>
        <div className="text-gray-600" style={{ width: '10%', lineHeight: '32px' }}>推荐维度</div>
        <div className="flex flex-wrap gap-2" style={{ width: '90%' }}>
          {recommendDimensions.map((dim, index) => (
            <Tag
              key={index}
              className="cursor-pointer px-3 py-1 hover:opacity-70 select-none"
              style={{ backgroundColor: dim.color }}
            >
              {dim.label}
            </Tag>
          ))}
        </div>
      </div>

      {/* 推荐指标 */}
      <div className="flex text-left" style={{ width: '100%' }}>
        <div className="text-gray-600" style={{ width: '10%', lineHeight: '32px' }}>推荐指标</div>
        <div className="flex flex-wrap gap-2" style={{ width: '90%' }}>
          {recommendIndicators.map((metric, index) => (
            <Tag
              key={index}
              className="cursor-pointer px-3 py-1 text-white hover:opacity-70 select-none"
              style={{ backgroundColor: metric.color }}
            >
              {metric.label}
            </Tag>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalysisRecommend; 