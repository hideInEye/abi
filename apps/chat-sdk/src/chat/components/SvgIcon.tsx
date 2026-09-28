import React from 'react'
import type { CSSProperties } from 'react';
/**
 * Props
 *
 * - Support iconify and local svg icon
 * - If icon and localIcon are passed at the same time, localIcon will be rendered first
 */
interface Props {
  readonly className?: string;
  /** Iconify icon name */
  readonly icon?: string;
  /** Local svg icon name */
  readonly localIcon?: string;
  readonly style?: CSSProperties;
  /** Click event handler */
  readonly onClick?: (event: React.MouseEvent<SVGSVGElement>) => void;
}

const defaultLocalIcon = 'no-icon';
// const { VITE_ICON_LOCAL_PREFIX: prefix } = import.meta.env;
const symbolId = (localIcon: string = defaultLocalIcon) => {
  const iconName = localIcon || defaultLocalIcon;

  return `#icon-${iconName}`;
};
const SvgIcon = ({ localIcon, ...props }: Props) => {
  /** If localIcon is passed, render localIcon first */
  return (
    <svg
      height="1em"
      width="1em"
      {...props}
      aria-hidden="true"
    >
      <use
        fill="currentColor"
        href={symbolId(localIcon)}
      />
    </svg>
  );
};

export default SvgIcon;
