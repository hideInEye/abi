import React from 'react';
import IntentClarifyQueryMode from './IntentClarifyQueryMode';
import IntentClarifyAnalysisMode from './IntentClarifyAnalysisMode';
import IntentClarifyPredictMode from './IntentClarifyPredictMode';

// 组件属性类型定义
interface IntentClarifyV2Props {
  questionData: any; // 意图澄清数据
  onComplete: (ICparameter: any) => void; // 完成回调
}

// 主组件 - 意图澄清路由组件
const IntentClarifyV2: React.FC<IntentClarifyV2Props> = ({ questionData, onComplete }) => {
  // 解析意图澄清数据
  const agentStep = questionData?.agent_step?.[0];
  const chatMode = agentStep?.chat_mode;

  if (!agentStep || !chatMode) {
    return (
      <div className="bg-white p-6 rounded-lg">
        <div className="text-red-600">数据格式错误：缺少必要的意图澄清数据</div>
      </div>
    );
  }

  // 根据 chat_mode 路由到对应的独立组件
  switch (chatMode) {
    // 问数场景
    case 'chat_with_db_execute':
      return <IntentClarifyQueryMode questionData={questionData} onComplete={onComplete} />;
    
    // 归因分析场景
    case 'chat_with_analysis':
      return <IntentClarifyAnalysisMode questionData={questionData} onComplete={onComplete} />;
    
    // 预测分析场景
    case 'chat_with_predict':
      return <IntentClarifyPredictMode questionData={questionData} onComplete={onComplete} />;
    
    // Excel分析场景（复用问数组件）
    case 'chat_with_excel':
      return <IntentClarifyQueryMode questionData={questionData} onComplete={onComplete} />;
    
    // 大屏生成场景（复用问数组件）
    case 'chat_with_dashboard':
      return <IntentClarifyQueryMode questionData={questionData} onComplete={onComplete} />;
    
    // 未知场景
    default:
      return (
        <div className="bg-white p-6 rounded-lg">
          <div className="text-yellow-600">
            未知的智能体模式：{chatMode}
            <br />
            <span className="text-sm text-gray-500">请联系管理员配置对应的意图澄清组件</span>
          </div>
        </div>
      );
  }
};

export default IntentClarifyV2;
