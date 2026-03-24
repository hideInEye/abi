import React from 'react';

interface SearchInputProps {
  readonly onAdd: () => void;
  readonly onSearch: (value: string) => void;
  readonly searchValue: string;
}

export const TagSearchInput: React.FC<SearchInputProps> = ({ onAdd, onSearch, searchValue }) => {
  return (
    <ASpace className="flex justify-between">
      <AInput
        placeholder="请输入标签语义检索"
        value={searchValue}
        onChange={e => onSearch(e.target.value)}
      />
      <AButton
        type="primary"
        onClick={onAdd}
      >
        新增标签语义
      </AButton>
    </ASpace>
  );
};
