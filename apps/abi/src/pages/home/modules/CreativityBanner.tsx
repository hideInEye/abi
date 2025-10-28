/**
 * 创意横幅组件
 * 显示装饰性的横幅内容，用于首页的视觉美化
 * 居中显示一个大尺寸的横幅图标
 * 注：此组件当前未在首页主组件中使用，可能用于其他页面或待开发功能
 */
const CreativityBanner = memo(() => {
  const { t } = useTranslation();

  return (
    <ACard
      bordered={false}
      className="h-full flex-col-stretch card-wrapper"
      size="small"
      styles={{ body: { flex: 1, overflow: 'hidden' } }}
      title={t('page.home.creativity')}
    >
      <div className="h-full flex-center">
        <IconLocalBanner className="text-400px text-primary sm:text-320px" />
      </div>
    </ACard>
  );
});

export default CreativityBanner;
