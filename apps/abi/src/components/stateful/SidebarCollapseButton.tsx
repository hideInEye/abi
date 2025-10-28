import { getSiderCollapse, toggleSiderCollapse } from '@/store/slice/app';
import { useAppDispatch, useAppSelector } from '@/hooks/business/useStore';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  className?: string;
}

const SidebarCollapseButton: React.FC<Props> = memo(({ className }) => {
  const { t } = useTranslation();
  const siderCollapse = useAppSelector(getSiderCollapse);
  const dispatch = useAppDispatch();

  return (
    <div
      className={`absolute z-10 flex items-center justify-center cursor-pointer bg-white shadow-md hover:bg-gray-100 ${className}`}
      style={{
        width: '20px',
        height: '60px',
        borderRadius: '15px',
        top: '50%',
        right: '-10px',
        transform: 'translateY(-50%)',
        zIndex: 100
      }}
      onClick={() => dispatch(toggleSiderCollapse())}
      title={siderCollapse ? t('icon.expand') : t('icon.collapse')}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderWidth: siderCollapse ? '6px 0 6px 8px' : '6px 8px 6px 0',
          borderColor: siderCollapse ? 'transparent transparent transparent #666' : 'transparent #666 transparent transparent'
        }}
      />
    </div>
  );
});

export default SidebarCollapseButton;