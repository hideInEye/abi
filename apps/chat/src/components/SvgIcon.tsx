import React from 'react'
import type { CSSProperties } from 'react';
import botIcon from '@/assets/svg-icon/bot.svg'
import chartIcon from '@/assets/svg-icon/chart.svg'
import chatAddIcon from '@/assets/svg-icon/chat_add.svg'
import cloudUploadIcon from '@/assets/svg-icon/cloud-upload.svg'
import copyIcon from '@/assets/svg-icon/copy.svg'
import deleteIcon from '@/assets/svg-icon/delete.svg'
import drownDeleteIcon from '@/assets/svg-icon/drown_delete.svg'
import drownEditIcon from '@/assets/svg-icon/drown_edit.svg'
import editIcon from '@/assets/svg-icon/edit.svg'
import modelIcon from '@/assets/svg-icon/model.svg'
import refreshIcon from '@/assets/svg-icon/refresh.svg'
import schemaIcon from '@/assets/svg-icon/schema.svg'
import shareIcon from '@/assets/svg-icon/share.svg'
import sqlIcon from '@/assets/svg-icon/sql.svg'
import starIcon from '@/assets/svg-icon/star.svg'
import tableIcon from '@/assets/svg-icon/table.svg'
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
  readonly onClick?: (event: React.MouseEvent<HTMLImageElement>) => void;
}

const localIconUrls: Readonly<Record<string, string>> = {
  bot: botIcon,
  chart: chartIcon,
  chat_add: chatAddIcon,
  'cloud-upload': cloudUploadIcon,
  copy: copyIcon,
  delete: deleteIcon,
  drown_delete: drownDeleteIcon,
  drown_edit: drownEditIcon,
  edit: editIcon,
  model: modelIcon,
  refresh: refreshIcon,
  schema: schemaIcon,
  share: shareIcon,
  sql: sqlIcon,
  star: starIcon,
  table: tableIcon,
};
const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='

const SvgIcon = ({ localIcon, ...props }: Props) => {
  return (
    <img
      alt=""
      draggable={false}
      height="1em"
      src={localIconUrls[localIcon || ''] || transparentPixel}
      width="1em"
      {...props}
      aria-hidden="true"
    />
  );
};

export default SvgIcon;
