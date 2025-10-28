import { PlusOutlined } from '@ant-design/icons';
import React from 'react';

interface SearchInputProps {
  readonly onAdd: () => void;
  readonly onSearch: (value: string) => void;
  readonly searchValue: string;
}

export const TagSearchInput: React.FC<SearchInputProps> = ({ onAdd, onSearch, searchValue }) => {
  return (
    <ASpace className="mb3 flex justify-between">
      <AInput
        placeholder="请输入行业术语名检索"
        value={searchValue}
        onChange={e => onSearch(e.target.value)}
      />
      <AButton
        color="primary"
        icon={<PlusOutlined />}
        variant="outlined"
        onClick={onAdd}
      >
        新增行业术语
      </AButton>
    </ASpace>
  );
};
