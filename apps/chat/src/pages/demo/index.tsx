import React from 'react';
import CausalAnalysis from '../conversation/components/CausalAnalysis';

const DemoPage: React.FC = () => {
  // 示例数据
  const demoData = {
    timeRange: ['2023-12-16', '2024-03-14'] as [string, string],
    indicator: {
      startValue: 9618.76,
      endValue: 5700.87,
      change: -3917.89,
      changeRate: -0.4073
    },
    description: '影响指标名称的前三大因素与对应影响幅度依次为：【二级消费渠道-饿了么】影响该指标(-3,633.73),【门店id-19617】影响该指标(-3,232.06),【商品编码-2198033049】影响该指标(-3,229.42),具体因素详情请见下方表格：',
    suggestion: `根据分析结果，建议采取以下措施：
1. 针对饿了么渠道的销售下滑，建议：
   - 检查配送时效和服务质量
   - 优化商品在平台的展示位置
   - 考虑开展专项促销活动

2. 对于19617门店的业绩下降，建议：
   - 评估门店位置和客流情况
   - 检查商品库存管理情况
   - 加强员工培训和服务水平

3. 关于德亚优选脱脂牛奶的销售问题：
   - 分析产品定价策略
   - 评估市场竞品情况
   - 考虑调整产品陈列方式`,
    factors: [
      {
        key: '1',
        rank: 1,
        name: '二级消费渠道-饿了么',
        startValue: 4098.03,
        endValue: 464.30,
        change: -3633.73,
        changeRate: -0.8867,
        impactIndex: 92.75
      },
      {
        key: '2',
        rank: 2,
        name: '门店id-19617',
        startValue: 7506.60,
        endValue: 4274.54,
        change: -3232.06,
        changeRate: -0.4306,
        impactIndex: 82.49
      },
      {
        key: '3',
        rank: 3,
        name: '商品编码-2198033049',
        startValue: 1621.61,
        endValue: -1607.82,
        change: -3229.42,
        changeRate: -1.9915,
        impactIndex: 82.43
      },
      {
        key: '4',
        rank: 4,
        name: '商品名称-德亚优选脱脂牛奶1L',
        startValue: 1621.61,
        endValue: -1607.82,
        change: -3229.42,
        changeRate: -1.9915,
        impactIndex: 82.43
      },
      {
        key: '5',
        rank: 5,
        name: '消费渠道-线上三方',
        startValue: 5076.62,
        endValue: 1942.86,
        change: -3133.75,
        changeRate: -0.6173,
        impactIndex: 79.99
      },
      {
        key: '6',
        rank: 6,
        name: '一级品类名称-生鲜',
        startValue: 4405.44,
        endValue: 1781.21,
        change: -2624.23,
        changeRate: -0.5957,
        impactIndex: 66.98
      },
      {
        key: '7',
        rank: 7,
        name: '二级品类名称-乳品',
        startValue: 4480.35,
        endValue: 2069.48,
        change: -2410.87,
        changeRate: -0.5381,
        impactIndex: 61.53
      }
    ]
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">组件演示</h2>
        <p className="text-gray-600">这是一个归因分析组件的演示页面，展示了各种数据分析功能。</p>
      </div>
      
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">归因分析示例</h3>
        <div className="border rounded-lg shadow-sm">
          <CausalAnalysis data={demoData} />
        </div>
      </div>
    </div>
  );
};

export default DemoPage; 