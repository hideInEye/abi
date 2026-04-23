import React, { useEffect, useMemo, useState } from 'react';
import { Button, message, Checkbox } from 'antd';

interface Props {
  handleConfirmShare: (type: string) => void;
  convContent: any;
  checkAll: boolean;
  setCheckAll: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSharing: React.Dispatch<React.SetStateAction<boolean>>;
  sharingList: any[];
  confirmVisible?: boolean;
}

const SharingModal: React.FC<Props> = ({ handleConfirmShare, convContent, checkAll, setCheckAll, setIsSharing, sharingList, confirmVisible }) => {
  const [indeterminate, setIndeterminate] = useState(false);
  const [localDisabled, setLocalDisabled] = useState(false);
  const allList = useMemo(() => convContent.filter((item: any) => item.role !== 'ai'), [convContent]);
  useEffect(() => {
    if (!sharingList.length) {
      setIndeterminate(false);
      setCheckAll(false);
    } else if (sharingList.length < allList.length) {
      setIndeterminate(true);
      setCheckAll(false);
    } else if (sharingList.length === allList.length) {
      setIndeterminate(false);
      setCheckAll(true);
    }
  }, [sharingList, allList, setCheckAll]);
  useEffect(() => {
    if (!confirmVisible) {
      setLocalDisabled(false);
    }
  }, [confirmVisible]);
  const onCheckAllChange = () => {
    setCheckAll(!checkAll);
  }
  const handleShare = (type: string) => {
    if (localDisabled || confirmVisible) return;
    if (!sharingList.length) {
      message.error('请至少选择一条记录');
      return;
    }
    setLocalDisabled(true);
    // 使用 requestAnimationFrame 确保状态更新后再执行耗时操作
    requestAnimationFrame(() => {
       handleConfirmShare(type);
    });
   
    // download(); // 调用下载函数
    // 这里可以添加生成快照的逻辑
    // message.success('快照已生成');
    // setIsSharing(false);
  }
  return (
    <div className="pt-4 flex items-center justify-between">
      <Checkbox
        indeterminate={indeterminate}
        onChange={onCheckAllChange}
        checked={checkAll}
      >
        全选
      </Checkbox>
      <div>
        <Button type="primary" className="mr-2" onClick={()=>{handleShare('email')}} disabled={localDisabled || !!confirmVisible}>邮件分享</Button>
        <Button type="primary" className="mr-2" onClick={()=>{handleShare('snapshot')}} disabled={localDisabled || !!confirmVisible}>生成快照</Button>
        <Button onClick={() => setIsSharing(false)}>取消</Button>
      </div>
    </div>
  );
};

export default SharingModal;
