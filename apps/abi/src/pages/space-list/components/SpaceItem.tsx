import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { FC } from 'react';
import { useCallback } from 'react';

import { useSpaceSwitch } from '@/hooks/business/useSpaceSwitch';

import type { ISpaceItem } from '../types';
import s from '../../home/index.module.scss';

interface SpaceItemProps {
  readonly deleteSpace: (space: ISpaceItem) => void;
  readonly setEditSpace: (space: ISpaceItem) => void;
  readonly space: ISpaceItem;
}

export const SpaceItem: FC<SpaceItemProps> = ({ deleteSpace, setEditSpace, space }) => {
  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditSpace(space);
    },
    [setEditSpace, space],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      AModal.confirm({
        content: '确定删除该空间吗？',
        onOk: () => {
          deleteSpace(space);
        },
        title: '删除空间',
      });
    },
    [deleteSpace, space],
  );

  const { switchToSpace } = useSpaceSwitch();

  // current user and simplified permission check: only admin or space creator can delete
  const currentUserObj: any = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}');
  const isAdmin = currentUserObj?.userName === 'admin';
  const createByMatchesUserName = space.createBy === currentUserObj?.userName;
  const createByMatchesUserId = space.createBy === (currentUserObj?.userId || '').toString();
  const isCreator = Boolean(space.createBy && (createByMatchesUserName || createByMatchesUserId));
  const canDelete = isAdmin || Boolean(isCreator);

  const setSpaceId = (spaceId: number) => {
    // 使用统一的空间切换逻辑
    switchToSpace(spaceId);
  };
  return (
    <ACard className={`flex flex-col cursor-pointer ${s['space-item']}`} key={space.spaceId} onClick={() => setSpaceId(space.spaceId)}>
      <AFlex align='flex-start' justify="space-between">
        <div className="text-sm lh-[1.75rem] font-bold">{space.spaceName}</div>
        <div className="flex items-center justify-end">
          <div className="flex justify-end">
            <ATooltip title="编辑">
              <AButton color="primary" icon={<EditOutlined />} size="small" variant="link" onClick={handleEdit} />
            </ATooltip>
            {canDelete && (
              <ATooltip title="删除">
                <AButton color="danger" icon={<DeleteOutlined />} size="small" variant="link" onClick={handleDelete} />
              </ATooltip>
            )}
          </div>
        </div>
      </AFlex>
      <div className="border-t flex flex-col gap-[8px]  border-gray-100 xl:pt-[6px] 2xl:pt-[8px] text-xs op80">
        <div className="grid grid-cols-[auto_1fr] gap-x-2">
          <span>创建人</span>
          <span className="text-left">{space.createBy}</span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-2">
          <span>空间 id</span>
          <span className="break-all text-left">{space.spaceId}</span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-2">
          <span>创建时间</span>
          <span className="text-left">{space.createTime}</span>
        </div>
      </div>
    </ACard>
  );
};
