import { PlusOutlined } from '@ant-design/icons';
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
    <div className="mb2 flex">
      <div className="grid grid-cols-2 gap-2">
        {/* <ASelect
          defaultValue={searchKeyOptions[0].value}
          options={searchKeyOptions}
          onChange={v => setSearchType(v)}
        /> */}
        <AInput
          placeholder="请输入标签语义检索"
          value={searchValue}
          onChange={e =>{SearchInput(e.target.value)}}
        />
      </div>
      <AButton
        className='position-absolute right-2'
        color="primary"
        icon={<PlusOutlined />}
        variant="outlined"
        onClick={onAdd}
        disabled={!groupId}
      >
        新增标签语义
      </AButton>
    </div>
  );
};
