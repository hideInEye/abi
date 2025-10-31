import { Button, Card, Layout, Menu, Row, Col, Typography, Space } from 'antd';
import type { MenuProps } from 'antd';

import appLogo from '@/assets/imgs/home_logo.png';
import homeIcon from '@/assets/imgs/home.png';
import dialogueIcon from '@/assets/imgs/dialogue.png';
import workbenchIcon from '@/assets/imgs/workbench.png';
import componentsIcon from '@/assets/imgs/components.png';
import supportIcon from '@/assets/imgs/assis.png';
import helpIcon from '@/assets/imgs/user.png';
import createIcon from '@/assets/imgs/create.png';
import duplicateIcon from '@/assets/imgs/copy.png';
import workspaceIllustration from '@/assets/imgs/workspace.png';
import emptyIllustration from '@/assets/imgs/empty.png';
import stepOneIcon from '@/assets/imgs/step_one.png';
import stepTwoIcon from '@/assets/imgs/step_two.png';
import stepThreeIcon from '@/assets/imgs/step_three.png';
import stepFourIcon from '@/assets/imgs/step_four.png';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const siderWidth = 120;

const selectedMenuKey = 'home';

const primaryMenuData = [
  { key: 'home', label: '主页', icon: homeIcon },
  { key: 'dialogue', label: '对话', icon: dialogueIcon },
  { key: 'workbench', label: '工作台', icon: workbenchIcon },
  { key: 'components', label: '组件', icon: componentsIcon },
];

const primaryMenuItems: MenuProps['items'] = primaryMenuData.map((item) => {
  const isActive = item.key === selectedMenuKey;
  return {
    key: item.key,
    className:
      '!h-[84px] !leading-none !flex !items-center !justify-center !bg-transparent',
    label: (
      <div className="flex w-full flex-col items-center gap-2 text-xs">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all ${
            isActive
              ? 'bg-[#EFF4FF] text-[#3366FF] shadow-[0_8px_16px_rgba(51,102,255,0.12)]'
              : 'bg-[#F2F6FF] text-[#4F5D74]'
          }`}
        >
          <img src={item.icon} alt={item.label} className="h-6 w-6" />
        </div>
        <span className={isActive ? 'text-[#3366FF]' : 'text-[#4F5D74]'}>
          {item.label}
        </span>
      </div>
    ),
  };
});

const secondaryMenuData = [
  { key: 'assist', label: '助手', icon: supportIcon },
  { key: 'help', label: '帮助', icon: helpIcon },
];

const secondaryMenuItems: MenuProps['items'] = secondaryMenuData.map((item) => ({
  key: item.key,
  className:
    '!h-[72px] !leading-none !flex !items-center !justify-center !bg-transparent',
  label: (
    <div className="flex w-full flex-col items-center gap-2 text-xs text-[#4F5D74]">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5F7FD]">
        <img src={item.icon} alt={item.label} className="h-6 w-6" />
      </div>
      <span>{item.label}</span>
    </div>
  ),
}));

const assetStats = [
  {
    key: 'space',
    title: '我的空间',
    value: 23749,
    gradient: 'from-[#C8E7FF] to-[#7AB8FF]',
  },
  {
    key: 'source',
    title: '数据源',
    value: 34634,
    gradient: 'from-[#FFE4C1] to-[#FDCFA0]',
  },
  {
    key: 'dataset',
    title: '数据集',
    value: 34576,
    gradient: 'from-[#FFE0D7] to-[#FFB7A6]',
  },
  {
    key: 'assistant',
    title: '智能对话',
    value: 3464,
    gradient: 'from-[#E0D8FF] to-[#B7B4FF]',
  },
];

const workspaceCards = [
  {
    key: 'risk-1',
    name: '风控空间',
    owner: '周丽',
    type: '风控空间',
    createdAt: '2025-09-30 08 : 24 : 34',
    actions: ['操作'],
  },
  {
    key: 'risk-2',
    name: '风控空间',
    owner: '周丽',
    type: '风控空间',
    createdAt: '2025-09-30 08 : 24 : 34',
    actions: ['操作'],
  },
  {
    key: 'risk-3',
    name: '风控空间',
    owner: '周丽',
    type: '风控空间',
    createdAt: '2025-09-30 08 : 24 : 34',
    actions: ['操作'],
  },
];

const guideSteps = [
  {
    key: '1',
    title: '创建空间',
    description: '创建数据空间\n存储数据资产',
    icon: stepOneIcon,
  },
  {
    key: '2',
    title: '数据准备',
    description: '数据接入、数据\n共享、语义映射',
    icon: stepTwoIcon,
  },
  {
    key: '3',
    title: '助手配置',
    description: '让每个人拥有个性化\n数据分析助手',
    icon: stepThreeIcon,
  },
  {
    key: '4',
    title: '智能对话',
    description: '通过可视化组件\n进行交互式分析',
    icon: stepFourIcon,
  },
];

const formatNumber = (value: number) =>
  Intl.NumberFormat('zh-CN').format(value);

export default function Home() {
  return (
    <Layout className="min-h-screen bg-[#EEF3FF]">
      <Sider
        width={siderWidth}
        className="!fixed !left-0 !top-0 !h-screen !bg-white !shadow-[6px_0_18px_rgba(67,103,172,0.08)]"
      >
        <div className="flex h-full flex-col items-center">
          <div className="mt-6 mb-10 flex items-center justify-center">
            <img
              src={appLogo}
              alt="ABI Logo"
              className="h-14 w-14 rounded-full shadow-[0_10px_24px_rgba(51,102,255,0.28)]"
            />
          </div>

          <Menu
            mode="inline"
            selectable
            selectedKeys={['home']}
            className="home-menu !w-full !border-none !bg-transparent gap-4 px-3"
            items={primaryMenuItems}
          />

          <div className="mt-auto w-full px-3 pb-8">
            <Menu
              mode="inline"
              selectable={false}
              className="home-menu !w-full !border-none !bg-transparent gap-4"
              items={secondaryMenuItems}
            />
          </div>
        </div>
      </Sider>

      <Layout className="min-h-screen" style={{ marginLeft: siderWidth }}>
        <Content className="relative min-h-screen overflow-x-hidden px-4 pb-12 pt-6 sm:px-6 lg:px-10">
          <Space
            direction="vertical"
            size={32}
            className="w-full pb-12"
            style={{ display: 'flex' }}
          >
            <header>
              <Title level={3} className="!mb-1 text-[#1B2A4A]">
                数据资产
              </Title>
              <Text className="text-sm text-[#7E8AA5]">
                欢迎回来，快速总览当前空间概况
              </Text>
            </header>

            <section>
              <Row gutter={[24, 24]}>
                {assetStats.map((stat) => (
                  <Col key={stat.key} xs={24} md={12} xl={6}>
                    <Card
                      bordered={false}
                      className="h-full overflow-hidden rounded-3xl border-none shadow-[0_18px_35px_rgba(102,133,255,0.12)]"
                      bodyStyle={{ padding: 0 }}
                    >
                      <div
                        className={`flex h-full flex-col justify-between rounded-3xl bg-gradient-to-r p-6 text-[#1A2240] ${stat.gradient}`}
                      >
                        <Text className="text-sm text-[#1C2A4F]/80">
                          {stat.title}
                        </Text>
                        <Text className="mt-4 text-3xl font-semibold tracking-wide text-[#1A2240] md:text-4xl">
                          {formatNumber(stat.value)}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </section>

            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <Title level={4} className="!mb-0 text-[#1B2A4A]">
                  空间列表
                </Title>
                <Button type="link" className="!text-[#3366FF]">
                  更多 &gt;&gt;
                </Button>
              </div>

              <Row gutter={[24, 24]}>
                <Col xs={24} lg={12} xl={8}>
                  <Card
                    bordered={false}
                    className="h-full rounded-3xl border-none shadow-[0_10px_30px_rgba(102,133,255,0.08)]"
                    bodyStyle={{ padding: 24 }}
                  >
                    <div className="mb-6">
                      <Title level={5} className="!mb-2 text-[#1C2A4F]">
                        创建应用
                      </Title>
                      <Text className="text-sm text-[#8D97AA]">
                        快速构建属于你的数据空间
                      </Text>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { icon: createIcon, label: '创建空间' },
                        { icon: duplicateIcon, label: '复制空间' },
                      ].map((item) => (
                        <Button
                          key={item.label}
                          type="default"
                          className="flex h-28 flex-col items-center justify-center gap-3 rounded-2xl border-none bg-[#F6F8FF] text-[#1D2F54] shadow-[0_12px_20px_rgba(96,125,255,0.08)] transition hover:!bg-[#EDF2FF] hover:!text-[#3366FF]"
                        >
                          <img
                            src={item.icon}
                            alt={item.label}
                            className="h-10 w-10"
                          />
                          <span className="text-base font-medium">
                            {item.label}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </Card>
                </Col>

                {workspaceCards.map((space) => (
                  <Col key={space.key} xs={24} lg={12} xl={8}>
                    <Card
                      bordered={false}
                      className="h-full rounded-3xl border-none shadow-[0_10px_30px_rgba(102,133,255,0.08)]"
                      bodyStyle={{ padding: 24 }}
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <Title level={5} className="!mb-0 text-[#1C2A4F]">
                          {space.name}
                        </Title>
                        <Button type="link" className="!p-0 !text-[#3366FF]">
                          {space.actions[0]}
                        </Button>
                      </div>
                      <div className="flex flex-col gap-2 text-sm text-[#6D7790]">
                        <div className="flex justify-between">
                          <span>创建人</span>
                          <span className="font-medium text-[#1D2F54]">
                            {space.owner}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>空间描述</span>
                          <span className="font-medium text-[#1D2F54]">
                            {space.type}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>创建时间</span>
                          <span className="font-medium text-[#1D2F54]">
                            {space.createdAt}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}

                <Col xs={24} lg={12} xl={8}>
                  <Card
                    bordered={false}
                    className="h-full rounded-3xl border-none shadow-[0_10px_30px_rgba(102,133,255,0.08)]"
                    bodyStyle={{ padding: 24 }}
                  >
                    <div className="flex h-full flex-col items-center justify-center gap-4">
                      <img
                        src={workspaceIllustration}
                        alt="填充空间"
                        className="h-20 w-20"
                      />
                      <Text className="text-sm text-[#8D97AA]">
                        填充空间
                      </Text>
                    </div>
                  </Card>
                </Col>

                <Col xs={24} lg={12} xl={8}>
                  <Card
                    bordered={false}
                    className="h-full rounded-3xl border-none shadow-[0_10px_30px_rgba(102,133,255,0.08)]"
                    bodyStyle={{ padding: 24 }}
                  >
                    <div className="flex h-full flex-col items-center justify-center gap-4">
                      <img
                        src={emptyIllustration}
                        alt="智无空间"
                        className="h-20 w-20"
                      />
                      <Text className="text-sm text-[#8D97AA]">智无空间</Text>
                    </div>
                  </Card>
                </Col>
              </Row>
            </section>

            <section>
              <Card
                bordered={false}
                className="rounded-3xl border-none shadow-[0_20px_45px_rgba(102,133,255,0.1)]"
                bodyStyle={{ padding: 28 }}
              >
                <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                  <Title level={4} className="!mb-0 text-[#1B2A4A]">
                    创建引导
                  </Title>
                  <Button type="link" className="!text-[#3366FF]">
                    快速创建
                  </Button>
                </div>
                <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
                  {guideSteps.map((step, index) => (
                    <div
                      key={step.key}
                      className="relative flex flex-col items-start gap-5 text-left xl:items-center xl:text-center"
                    >
                      <div className="flex items-center gap-4 xl:flex-col">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF2FF] shadow-[0_12px_28px_rgba(102,133,255,0.15)]">
                          <img
                            src={step.icon}
                            alt={step.title}
                            className="h-12 w-12"
                          />
                        </div>
                        <Title
                          level={5}
                          className="!mb-0 text-[#1C2A4F]"
                        >{`${index + 1}. ${step.title}`}</Title>
                      </div>
                      <Text className="whitespace-pre-line text-sm leading-6 text-[#7E8AA5]">
                        {step.description}
                      </Text>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          </Space>
        </Content>
      </Layout>
    </Layout>
  );
}
