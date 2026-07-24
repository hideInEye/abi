import React, { useState } from 'react';

import { SearchFilterBar, SearchFilterField, getFilterPopupContainer } from '@/components/SearchFilterBar';

interface SearchInputProps {
  readonly onSearch: (value: string) => void;
  readonly onDateRangeChange?: (range: any) => void;
}

export const TagSearch: React.FC<SearchInputProps> = ({ onSearch, onDateRangeChange }) => {
  const [searchValue, setSearchValue] = useState('');
  const [dateRange, setDateRange] = useState<any>(null);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch(value);
  };

  const handleReset = () => {
    setSearchValue('');
    setDateRange(null);
    onDateRangeChange?.(null);
    onSearch('');
  };

  return (
    <section className="abi-searchbar">
      <SearchFilterBar
        searchPlaceholder="请输入标签语义检索"
        searchValue={searchValue}
        onQuery={() => onSearch(searchValue)}
        onReset={handleReset}
        onSearchChange={handleSearch}
        filters={
          <SearchFilterField label="时间范围">
            <ADatePicker.RangePicker
              allowClear
              className="abi-field-input"
              format="YYYY-MM-DD"
              getPopupContainer={getFilterPopupContainer}
              placeholder={['开始时间', '结束时间']}
              value={dateRange}
              onChange={(dates) => { setDateRange(dates); onDateRangeChange?.(dates); }}
            />
          </SearchFilterField>
        }
      />
    </section>
  );
};
