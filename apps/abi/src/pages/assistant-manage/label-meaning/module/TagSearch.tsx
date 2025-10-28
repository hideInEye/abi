import { PlusOutlined } from '@ant-design/icons';
import React from 'react';

import { searchKeyOptions } from '../constants';

interface SearchInputProps {
  readonly onAdd: () => void;
  readonly onSearch: (value: string, type: string) => void;
  readonly searchValue: string;
}

export const TagSearch: React.FC<SearchInputProps> = ({ onAdd, onSearch, searchValue }) => {
  const [searchType, setSearchType] = useState(searchKeyOptions[0].value);

  return (
    <ASpace className="mb2 flex justify-between">
      <div className="grid grid-cols-2 gap-2">
        <ASelect
          defaultValue={searchKeyOptions[0].value}
          options={searchKeyOptions}
          onChange={v => setSearchType(v)}
        />
        <AInput
          placeholder="请输入标签语义检索"
          value={searchValue}
          onChange={e => onSearch(e.target.value, searchType)}
        />
      </div>
      <AButton
        color="primary"
        icon={<PlusOutlined />}
        variant="outlined"
        onClick={onAdd}
      >
        新增标签语义
      </AButton>
    </ASpace>
  );
};
