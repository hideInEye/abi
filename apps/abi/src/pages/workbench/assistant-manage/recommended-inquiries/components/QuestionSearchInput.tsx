import React from 'react';

interface SearchInputProps {
  readonly onAdd: () => void;
  readonly onSearch: (value: string) => void;
  readonly searchValue: string;
  groupId?: number
}

export const QuestionSearchInput: React.FC<SearchInputProps> = ({ onAdd, onSearch, searchValue, groupId }) => {
  return (
    <ASpace className="mb3 flex justify-between">
      <AInput
        placeholder="请输入问题检索"
        value={searchValue}
        onChange={e => onSearch(e.target.value)}
        style={{ fontFamily: 'PingFangSC, PingFang SC', fontWeight: 400, fontSize: '1rem', color: '#333333' }}
      />
      <AButton
        type="primary"
        onClick={onAdd}
        disabled={!groupId}
      >
        新增
      </AButton>
    </ASpace>
  );
};
