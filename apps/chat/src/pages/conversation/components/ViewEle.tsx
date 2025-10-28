import React from 'react';
import CausalAnalysis from './CausalAnalysis';
// ... existing imports ...

interface Props {
  data: any; // 根据实际数据类型定义
}

const ViewEle: React.FC<Props> = ({ data }) => {
  // 示例数据
  const causalAnalysisData = {
    timeRange: ['2023-12-16', '2024-03-14'] as [string, string],
    indicator: {
      startValue: 9618.76,
      endValue: 5700.87,
      change: -3917.89,
      changeRate: -0.4073
    },
    description: '影响指标名称的前三大因素与对应影响幅度依次为：【二级消费渠道-饿了么】影响该指标(-3,633.73),【门店id-19617】影响该指标(-3,232.06),【商品编码-2198033049】影响该指标(-3,229.42),具体因素详情请见下方表格：',
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
    <div>
      {/* 其他组件 */}
      <CausalAnalysis data={causalAnalysisData} />
    </div>
  );
};

export default ViewEle; 