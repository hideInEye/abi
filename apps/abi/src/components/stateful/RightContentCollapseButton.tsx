import { getSiderCollapse } from '@/store/slice/app';
import { useAppDispatch, useAppSelector } from '@/hooks/business/useStore';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SvgIcon from '@/components/stateless/custom/SvgIcon';

interface Props {
  className?: string;
  inHeader?: boolean; // 是否在头部显示
}

const RightContentCollapseButton: React.FC<Props> = memo(({ className, inHeader = false }) => {
  const { t } = useTranslation();
  const siderCollapse = useAppSelector(getSiderCollapse);
  const dispatch = useAppDispatch();
  const [rightContentCollapsed, setRightContentCollapsed] = useState(false);

  useEffect(() => {
    const contentElement = document.querySelector('.bg-layout');
    if (contentElement) {
      if (rightContentCollapsed) {
        contentElement.classList.add('right-content-collapsed');
        contentElement.classList.remove('right-content-expanded');
      } else {
        contentElement.classList.add('right-content-expanded');
        contentElement.classList.remove('right-content-collapsed');
      }
    }
  }, [rightContentCollapsed]);

  // 在头部显示的按钮样式和位置不同
  if (inHeader) {
    return (
      <div
        className={`flex items-center justify-center cursor-pointer hover:bg-gray-100 ${className}`}
        style={{
          padding: '0 8px',
          height: '100%'
        }}
        onClick={() => setRightContentCollapsed(!rightContentCollapsed)}
        title={rightContentCollapsed ? t('icon.expand') : t('icon.collapse')}
      >
        <SvgIcon icon={rightContentCollapsed ? 'ph-caret-double-right-bold' : 'ph-caret-double-left-bold'} />
      </div>
    );
  }

  // 原有的内容区域按钮
  return (
    <>
      {/* 当内容展开时，按钮显示在内容区域左侧 */}
      {!rightContentCollapsed && (
        <div
          className={`absolute z-10 flex items-center justify-center cursor-pointer bg-white shadow-md hover:bg-gray-100 ${className}`}
          style={{
            width: '24px',
            height: '48px',
            borderRadius: '4px 0 0 4px',
            left: '0',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
          onClick={() => setRightContentCollapsed(true)}
          title={t('icon.collapse')}
        >
          <SvgIcon icon={'ph-caret-double-left-bold'} />
        </div>
      )}
      
      {/* 当内容折叠时，按钮显示在右侧 */}
      {rightContentCollapsed && (
        <div
          className={`fixed z-10 flex items-center justify-center cursor-pointer bg-white shadow-md hover:bg-gray-100 ${className}`}
          style={{
            width: '24px',
            height: '48px',
            borderRadius: '0 4px 4px 0',
            right: '0',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
          onClick={() => setRightContentCollapsed(false)}
          title={t('icon.expand')}
        >
          <SvgIcon icon={'ph-caret-double-right-bold'} />
        </div>
      )}
    </>
  );
});

export default RightContentCollapseButton;