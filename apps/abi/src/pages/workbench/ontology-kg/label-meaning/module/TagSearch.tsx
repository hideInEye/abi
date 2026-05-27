import { SearchOutlined } from '@ant-design/icons';
import React from 'react';

interface SearchInputProps {
  readonly onAdd: () => void;
  readonly onSearch: (value: string) => void;
  groupId?: number
}

export const TagSearch: React.FC<SearchInputProps> = ({ onSearch }) => {
  const [searchValue, setSearchValue] = useState('');

  const SearchInput = (value: string) => {
    setSearchValue(value);
    onSearch(value);
  };

  return (
    <div className="mb-3">
      <AInput
        allowClear
        placeholder="请输入标签语义检索"
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        value={searchValue}
        onChange={e => SearchInput(e.target.value)}
        style={{ width: '12rem' }}
      />
    </div>
  );
};
