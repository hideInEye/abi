import React from 'react';

interface SearchInputProps {
  readonly onAdd: () => void;
  readonly onSearch: (value: string) => void;
  readonly searchValue: string;
  groupId?:number
}

export const TagSearchInput: React.FC<SearchInputProps> = ({ onAdd, onSearch, searchValue, groupId }) => {
  return (
    <div className="mb2 flex">
      <AInput
        placeholder="请输入行业术语名检索"
        value={searchValue}
        style={{ width: "200px" }}
        onChange={e => onSearch(e.target.value)}
      />
      <AButton
        className='position-absolute right-6'
        type="primary"
        onClick={onAdd}
        disabled={!groupId}
      >
        新增
      </AButton>
    </div>
  );
};
