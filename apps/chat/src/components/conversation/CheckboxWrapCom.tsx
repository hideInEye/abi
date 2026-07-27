import React, { useEffect, useMemo } from 'react';
import { Checkbox, CheckboxChangeEvent } from 'antd';

interface Props {
  convContent: any;
  checkAll: boolean;
  sharingList: any[];
  setSharingList: React.Dispatch<React.SetStateAction<any[]>>;
  data: any;
  isSharing: boolean;
  children: React.ReactNode;
}

const CheckboxWrapCom: React.FC<Props> = ({ convContent, checkAll, sharingList, setSharingList, data, isSharing, children }) => {
  // 勾选态由 sharingList 派生，支持外部预勾选（如「分享对话」默认选中当前轮次）
  const checked = useMemo(
    () => sharingList.some((item: any) => `${item.order}${item.role}` === `${data.order}${data.role}`),
    [sharingList, data],
  );
  const allList = useMemo(() => convContent.filter((item: any) => item.role !== 'ai'), [convContent]);
  useEffect(() => {
    if (!checkAll) {
      setSharingList([]);
    } else {
      setSharingList(allList);
    }
  }, [checkAll]);

  useEffect(() => {
    if (!isSharing) {
      setSharingList([]);
    }
  }, [isSharing])

  const onChange = (val: CheckboxChangeEvent) => {
    if (val.target.checked) {
      setSharingList((state: any) => {
        const _state = [...state];
        _state.push(data);
        return _state;
      });
    } else {
      setSharingList((state: any) => {
        const newData = state.filter((item: any) => `${item.order}${item.role}` !== `${data.order}${data.role}`);
        return newData;
      });
    }
  }
  return (
    <div className='flex items-center justify-between'>
      {
        isSharing && (
          <Checkbox
            className='mr-2'
            checked={checked}
            onChange={onChange}
          />
        )
      }
      {children}
    </div>
  )
};

export default CheckboxWrapCom;