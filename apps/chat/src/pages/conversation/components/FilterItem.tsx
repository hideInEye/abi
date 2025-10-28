import React, { useState, useCallback } from 'react';
import { Input, Select, DatePicker, Spin } from 'antd';
import { fetchSelectFilterValue } from '../../../service/api/conv';
import { debounce } from 'lodash';
const { RangePicker } = DatePicker;
export type FilterType = 'input' | 'select' | 'range' | 'date';

export interface FilterOption {
  label: string;
  value: string | number;
}

export interface FilterItemProps {
  type: FilterType;
  placeholder?: string | [string, string];
  value?: any;
  onChange?: (value: any) => void;
  field: string;
  options?: FilterOption[];
  style?: React.CSSProperties;
  className?: string;
  extra: any
}

const FilterItem: React.FC<FilterItemProps> = ({
  type,
  placeholder,
  value = type === 'range' ? { min: '', max: '' } : undefined,
  onChange,
  options = [],
  style,
  className,
  extra,
  field
}) => {
  const [searchOptions, setSearchOptions] = useState<FilterOption[]>(options);
  const [fetching, setFetching] = useState(false);
  const handleChange = (val: any) => {
    onChange?.(val);
  };

  const handleSelectChange = (val: any) => {
    onChange?.(val);
    if ((val === null || val?.length === 0) && handleSearch) {
      handleSearch('');
    }
  };

  const handleRangeChange = (key: 'min' | 'max', val: string) => {
    const newVal = val.replace(/[^\d.]/g, '');
    handleChange({
      ...value,
      [key]: newVal
    });
  };
  
  const handleSearch = useCallback(
    debounce(async (keyword: string) => {
      try {
        setFetching(true);
        const res = await fetchSelectFilterValue({
          ...extra,
          tfieldName: field,
          pageSize: 20,
          filteredData: keyword
        });
        if (res?.data) {
          const options = (res.data?.filtrateDataList || []).map(item => ({
            label: item,
            value: item
          }))
          setSearchOptions(options);
        }
      } catch (error) {
        console.error('搜索失败:', error);
      } finally {
        setFetching(false);
      }
    }, 500),
    []
  );

  const renderFilter = () => {
    switch (type) {
      case 'input': {
        const inputPlaceholder = placeholder as string;
        return (
          <div className="flex items-center">
            {inputPlaceholder && <label className="mr-2 w-20 truncate">{inputPlaceholder}</label>}
            <Input
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              style={style}
              className={className}
            />
          </div>
        );
      }
      case 'select': {
        const selectPlaceholder = typeof placeholder === 'string' ? placeholder : '请选择';
        return (
          <div className="flex items-center">
            {selectPlaceholder && <label className="mr-2 w-20 truncate">{selectPlaceholder}</label>}
            <Select
              placeholder={typeof placeholder === 'string' ? placeholder : '请选择'}
              onChange={handleSelectChange}
              onSearch={handleSearch}
              filterOption={false}
              options={searchOptions}
              style={{ ...style, minWidth: '160px' }}
              className={className}
              notFoundContent={fetching ? <Spin size="small" /> : '暂无数据'}
              allowClear
              showSearch
              mode="multiple"
              optionFilterProp="label"
            />
          </div>
        );
      }
      case 'date': {
        const datePlaceholder = Array.isArray(placeholder) ? placeholder : ['开始日期', '结束日期'];
        return (
          <div className="flex items-center">
            <label className="mr-2 w-20 truncate">{datePlaceholder.join(' ~ ')}</label>
            <RangePicker 
              style={{ width: '200px' }}
              format="YYYY-MM-DD"
            />
          </div>
        );
      }
      case 'range': {
        const [minPlaceholder = '最小值', maxPlaceholder = '最大值'] = Array.isArray(placeholder) ? placeholder : [];
        return (
          <div className="flex items-center">
            <label className="mr-2 w-20 truncate">范围</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <span className="mr-1 text-sm">{minPlaceholder}</span>
                <Input
                  value={value.min}
                  onChange={(e) => handleRangeChange('min', e.target.value)}
                  style={{ width: 100 }}
                  className={className}
                />
              </div>
              <span className="mx-1">-</span>
              <div className="flex items-center">
                <span className="mr-1 text-sm">{maxPlaceholder}</span>
                <Input
                  value={value.max}
                  onChange={(e) => handleRangeChange('max', e.target.value)}
                  style={{ width: 100 }}
                  className={className}
                />
              </div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="mr-4">
      {renderFilter()}
    </div>
  );
};

export default FilterItem;