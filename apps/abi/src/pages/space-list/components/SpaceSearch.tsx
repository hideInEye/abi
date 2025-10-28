import { SearchOutlined } from '@ant-design/icons';
import { Button as AButton, Input as AInput } from 'antd'; // 确保导入 Ant Design 的组件
import type { FC } from 'react';
import React from 'react';

import { $t } from '@/locales';

interface SpaceSearchProps {
  readonly addNewSpaceHandler: () => void;
  readonly searchHandler: (searchText: string) => void;
}

const SpaceSearch: FC<SpaceSearchProps> = ({ addNewSpaceHandler, searchHandler }) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchHandler(e.target.value);
  };

  return (
    <div className="my4 flex items-center justify-between">
      <AInput
        className="w-260px"
        placeholder={$t('page.mySpace.searchPlaceholder')}
        prefix={<SearchOutlined />}
        size="middle"
        onChange={handleSearchChange}
      />
      <AButton
        type="primary"
        onClick={addNewSpaceHandler}
      >
        {$t('page.mySpace.addNewSpace')}
      </AButton>
    </div>
  );
};

export default SpaceSearch;
