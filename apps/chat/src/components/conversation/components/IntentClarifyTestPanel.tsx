import React, { useState } from 'react';
import { Button, message } from 'antd';
import { SettingOutlined, ClearOutlined } from '@ant-design/icons';
import { mockIntentClarifyData } from '../../../mock-data/index';

interface IntentClarifyTestPanelProps {
  onTestData: (data: any, scenarioTitle: string) => void;
  onClearConversation?: () => void;
  visible?: boolean;
  setConvContent?: React.Dispatch<React.SetStateAction<any[]>>;
}

const IntentClarifyTestPanel: React.FC<IntentClarifyTestPanelProps> = ({ 
  onTestData, 
  onClearConversation,
  visible = true,
  setConvContent
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('');

  // 测试场景配置
  const testScenarios = [
    {
      key: 'queryDetailSample',
      title: '问数 - 明细查询',
      description: '查询具体数据记录，包含时间范围、选择维度、选择对象、指标选择',
      chatMode: 'chat_with_db_execute',
      queryMode: 'query_detail',
      color: 'blue'
    },
    {
      key: 'queryAggregationSample', 
      title: '问数 - 聚合查询',
      description: '统计汇总数据，支持多维度分析，包含业务限定和过滤条件',
      chatMode: 'chat_with_db_execute',
      queryMode: 'query_aggregation',
      color: 'cyan'
    },
    {
      key: 'analysisSingleSample',
      title: '归因 - 单指标归因',
      description: '分析单个指标异动原因，包含指标异动描述和基线指标',
      chatMode: 'chat_with_analysis',
      queryMode: 'analysis_single_indicator',
      color: 'orange'
    },
    {
      key: 'analysisMultiSample',
      title: '归因 - 多维指标归因',
      description: '分析多个维度的指标关系，包含基线指标和指标异动描述',
      chatMode: 'chat_with_analysis',
      queryMode: 'analysis_dims_indicator', 
      color: 'volcano'
    },
    {
      key: 'analysisCompareSample',
      title: '归因 - 实体对比指标归因',
      description: '比较不同实体的指标差异并分析原因，包含目标实体和对比实体的指标',
      chatMode: 'chat_with_analysis',
      queryMode: 'analysis_compare_indicator',
      color: 'red'
    },
    {
      key: 'predictSample',
      title: '预测 - 时间序列预测',
      description: '基于历史数据预测未来趋势，包含基线指标和业务限定',
      chatMode: 'chat_with_predict',
      queryMode: 'predict_time_series',
      color: 'purple'
    },
    {
      key: 'excelAnalysisSample',
      title: 'Excel - 描述性统计',
      description: 'Excel数据的概览和统计分析，包含选择维度和过滤条件',
      chatMode: 'chat_with_excel',
      queryMode: 'excel_description',
      color: 'green'
    },
    {
      key: 'dashboardSample',
      title: '大屏 - 聚合查询',
      description: '大屏展示的汇总数据，包含选择维度和业务限定',
      chatMode: 'chat_with_dashboard',
      queryMode: 'dashboard_aggregation',
      color: 'magenta'
    }
  ];

  const handleTestScenario = (scenarioKey: string) => {
    const testData = (mockIntentClarifyData as any)[scenarioKey];
    const scenario = testScenarios.find(s => s.key === scenarioKey);
    if (testData && scenario) {
      console.log('测试数据:', testData);
      onTestData(testData, scenario.title);
      setSelectedScenario(scenarioKey);
      message.success(`已生成 ${scenario.title} 测试对话`);
    }
  };

  const handleClearConversation = () => {
    if (onClearConversation) {
      onClearConversation();
      return;
    }
    if (setConvContent) {
      setConvContent([]);
      message.success('对话已清空');
    }
  };


  if (!visible) return null;

  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <SettingOutlined className="text-blue-600" />
          <span className="text-sm font-medium text-blue-800">测试意图澄清</span>
        </div>
        {onClearConversation || setConvContent ? (
          <Button
            type="text"
            size="small"
            icon={<ClearOutlined />}
            onClick={handleClearConversation}
            title="清空对话"
            className="text-blue-600 hover:text-blue-800"
          >
            清空
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {testScenarios.map(scenario => (
          <Button
            key={scenario.key}
            size="small"
            type={selectedScenario === scenario.key ? 'primary' : 'default'}
            onClick={() => handleTestScenario(scenario.key)}
          >
            {scenario.title.replace(' - ', '-')}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default IntentClarifyTestPanel;
