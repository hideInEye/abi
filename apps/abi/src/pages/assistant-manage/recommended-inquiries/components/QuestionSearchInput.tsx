import { PlusOutlined } from '@ant-design/icons';
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
      />
      <AButton
        color="primary"
        icon={<PlusOutlined />}
        variant="outlined"
        onClick={onAdd}
        disabled={!groupId}
      >
        新增问题
      </AButton>
    </ASpace>
  );
};
