import { PlusOutlined } from '@ant-design/icons';
import React from 'react';

export interface GroupContentGateProps {
  /** 是否存在分组：true=正常渲染业务组件；false=展示空状态；null=加载中（不渲染，避免闪烁） */
  readonly hasGroups: boolean | null;
  /** 点击“新建分组”按钮回调（一般为打开 Group 的新增分组弹窗） */
  readonly onCreateGroup: () => void;
  /** 空状态标题文案 */
  readonly title?: string;
  /** 空状态描述文案，可按业务覆盖 */
  readonly description?: string;
  /** 新建按钮文案 */
  readonly buttonText?: string;
  /** 紧凑模式（抽屉等窄小区域使用，插图缩小） */
  readonly compact?: boolean;
  readonly children: React.ReactNode;
}

/** 文件夹插图（居中构图，配色对齐系统主色 #5b7cf7 → #7091fa 渐变） */
function FolderIllustration({ width = 200 }: { readonly width?: number }) {
  // 渐变 ID 必须每实例唯一：多 tab 页面中隐藏面板里的同 ID 渐变会被优先解析，
  // 而 display:none 子树内的渐变不参与绘制，导致可见实例渲染成另一种样式
  const uid = React.useId().replace(/:/g, '');
  const folderGradId = `gcg-folder-grad-${uid}`;
  const badgeGradId = `gcg-badge-grad-${uid}`;
  return (
    <svg fill="none" height={width * 0.75} viewBox="0 0 160 120" width={width} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={folderGradId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#E8EEFE" />
          <stop offset="100%" stopColor="#D6E0FD" />
        </linearGradient>
        <linearGradient id={badgeGradId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#5B7CF7" />
          <stop offset="100%" stopColor="#7091FA" />
        </linearGradient>
      </defs>
      {/* 底部投影 */}
      <ellipse cx="80" cy="106" fill="#5B7CF7" opacity="0.08" rx="46" ry="7" />
      {/* 周边装饰点 */}
      <circle cx="26" cy="38" fill="#C9D6FC" r="3" />
      <circle cx="138" cy="30" fill="#DCE4FE" r="4" />
      <circle cx="146" cy="62" fill="#C9D6FC" r="2.5" />
      <path d="M20 66 h8 M24 62 v8" stroke="#C9D6FC" strokeLinecap="round" strokeWidth="2" />
      {/* 文件夹后片 + 标签 */}
      <rect fill="#B9CBFB" height="18" rx="6" width="36" x="42" y="26" />
      <rect fill="#B9CBFB" height="62" rx="10" width="76" x="42" y="34" />
      {/* 文件夹前片 */}
      <rect fill={`url(#${folderGradId})`} height="52" rx="10" width="76" x="42" y="44" />
      {/* 文件夹内的两条内容线 */}
      <rect fill="#FFFFFF" height="6" rx="3" width="36" x="56" y="60" />
      <rect fill="#FFFFFF" height="6" rx="3" width="26" x="56" y="72" />
      {/* 右下角新建徽标 */}
      <circle cx="114" cy="90" fill={`url(#${badgeGradId})`} r="14" stroke="#FFFFFF" strokeWidth="3" />
      <path d="M114 84 v12 M108 90 h12" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * 分组内容门控：由 Group 上报的“是否存在分组”状态决定右侧业务区域的展示。
 * 无分组时展示插图 + 新建分组按钮；加载中不渲染，避免空状态闪烁。
 */
export const GroupContentGate: React.FC<GroupContentGateProps> = ({
  hasGroups,
  onCreateGroup,
  title = '暂无分组',
  description = '当前还没有分组，请先新建分组后再进行管理',
  buttonText = '新建分组',
  compact = false,
  children
}) => {
  if (hasGroups) {
    return <>{children}</>;
  }
  // 加载中不渲染任何内容，避免空状态闪烁
  if (hasGroups === null) {
    return null;
  }
  return (
    <div className={`group-content-empty${compact ? ' group-content-empty--compact' : ''}`}>
      <FolderIllustration width={compact ? 120 : 200} />
      <div className="group-content-empty-title">{title}</div>
      <div className="group-content-empty-desc">{description}</div>
      <AButton className="btn-accent-gradient" type="primary" onClick={onCreateGroup}>
        <PlusOutlined />
        {buttonText}
      </AButton>
    </div>
  );
};
