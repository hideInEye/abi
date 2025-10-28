import React, { useEffect, useMemo, useState } from 'react';
import { Button, message, Checkbox } from 'antd';

interface Props {
  handleConfirmShare: () => void;
  convContent: any;
  checkAll: boolean;
  setCheckAll: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSharing: React.Dispatch<React.SetStateAction<boolean>>;
  sharingList: any[];
}

const SharingModal: React.FC<Props> = ({ handleConfirmShare, convContent, checkAll, setCheckAll, setIsSharing, sharingList }) => {
  const [indeterminate, setIndeterminate] = useState(false);
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
  const onCheckAllChange = () => {
    setCheckAll(!checkAll);
  }
  const handleShare = () => {
    if (!sharingList.length) {
      message.error('请至少选择一条记录');
      return;
    }
    handleConfirmShare();
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
        <Button type="primary" className="mr-2" onClick={handleShare}>生成快照</Button>
        <Button onClick={() => setIsSharing(false)}>取消</Button>
      </div>
    </div>
  );
};

export default SharingModal;