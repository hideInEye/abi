import React from 'react';

import { searchKeyOptions } from '../constants';
import { debounce } from 'lodash';

interface SearchInputProps {
  readonly onAdd: () => void;
  readonly onSearch: (value: string) => void;
  groupId?:number
}

export const TagSearch: React.FC<SearchInputProps> = ({ onAdd, onSearch, groupId }) => {
 const [searchValue, setSearchValue] = useState('');

 const SearchInput = (value: string) => {
  setSearchValue(value);
  onSearch(value)
 }
  return (
    <div className="mb4 flex">
      <div className="grid grid-cols-2 gap-2">
        <AInput
          placeholder="请输入标签语义检索"
          value={searchValue}
          onChange={e =>{SearchInput(e.target.value)}}
          style={{ fontFamily: 'PingFangSC, PingFang SC', fontWeight: 400, fontSize: '0.875rem', color: '#333333' }}
        />
      </div>
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
