import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, CheckboxChangeEvent } from 'antd';

interface Props {
  convContent: any;
  checkAll: boolean;
  setSharingList: React.Dispatch<React.SetStateAction<any[]>>;
  data: any;
  isSharing: boolean;
  children: React.ReactNode;
}

const CheckboxWrapCom: React.FC<Props> = ({ convContent, checkAll, setSharingList, data, isSharing, children }) => {
  const [checked, setChecked] = useState(false);
  const allList = useMemo(() => convContent.filter((item: any) => item.role !== 'ai'), [convContent]);
  useEffect(() => {
    if (!checkAll) {
      setSharingList([]);
    } else {
      setSharingList(allList);
    }
    setChecked(checkAll);
  }, [checkAll]);

  useEffect(() => {
    if (!isSharing) {
      setChecked(false);
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
    setChecked(val.target.checked);
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