import { SearchOutlined } from '@ant-design/icons';
import React from 'react';

interface SearchInputProps {
  readonly onSearch: (value: string) => void;
}

export const TagSearch: React.FC<SearchInputProps> = ({ onSearch }) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch(value);
  };

  return (
    <section className="abi-searchbar">
      <div className="abi-search-row">
        <AInput
          allowClear
          className="abi-field-input"
          placeholder="请输入标签语义检索"
          prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
          value={searchValue}
          onChange={e => handleSearch(e.target.value)}
          style={{ width: '16rem' }}
        />
      </div>
    </section>
  );
};
