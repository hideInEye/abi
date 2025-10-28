import avatar from '@/assets/imgs/soybean.jpg';
import { selectUserInfo } from '@/store/slice/auth';

/**
 * 首页头部横幅组件
 * 显示用户欢迎信息和统计数据
 * 包含用户头像、欢迎语以及项目统计信息
 * 注：此组件当前未在首页主组件中使用，可能用于其他页面或待开发功能
 */
interface StatisticData {
  id: number;
  title: string;
  value: string;
}

const HeaderBanner = () => {
  const { t } = useTranslation();

  const userInfo = useAppSelector(selectUserInfo);

  const statisticData: StatisticData[] = [
    {
      id: 0,
      title: t('page.home.projectCount'),
      value: '25'
    },
    {
      id: 1,
      title: t('page.home.todo'),
      value: '4/16'
    },
    {
      id: 2,
      title: t('page.home.message'),
      value: '12'
    }
  ];
  return (
    <ACard
      bordered={false}
      className="card-wrapper"
    >
      <ARow gutter={[16, 16]}>
        <ACol
          md={18}
          span={24}
        >
          <div className="flex-y-center">
            <div className="size-72px shrink-0 overflow-hidden rd-1/2">
              <img
                className="size-full"
                src={avatar}
              />
            </div>
            <div className="pl-12px">
              <h3 className="text-18px font-semibold">{t('page.home.greeting', { userName: userInfo.userName })}</h3>
              <p className="text-#999 leading-30px">{t('page.home.weatherDesc')}</p>
            </div>
          </div>
        </ACol>

        <ACol
          md={6}
          span={24}
        >
          <ASpace
            className="w-full justify-end"
            size={24}
          >
            {statisticData.map(item => (
              <AStatistic
                className="whitespace-nowrap"
                key={item.id}
                {...item}
              />
            ))}
          </ASpace>
        </ACol>
      </ARow>
    </ACard>
  );
};

export default HeaderBanner;
