import {ConfigProvider, DatePicker} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type {Dayjs} from 'dayjs';

import {SearchFilterField, getFilterPopupContainer} from '../home/project-list/SearchFilterBar.tsx';

interface MyScreenDateRangeFilterProps {
    onChange: (value: [Dayjs | null, Dayjs | null] | null) => void;
    value: [Dayjs | null, Dayjs | null] | null;
}

export default function MyScreenDateRangeFilter({onChange, value}: MyScreenDateRangeFilterProps) {
    return (
        <SearchFilterField label="创建时间">
            <ConfigProvider locale={zhCN}>
                <DatePicker.RangePicker
                    allowClear
                    className="abi-field-input"
                    style={{width: '100%'}}
                    format="YYYY-MM-DD"
                    getPopupContainer={getFilterPopupContainer}
                    placeholder={['开始时间', '结束时间']}
                    value={value}
                    onChange={dates => onChange(dates as [Dayjs | null, Dayjs | null] | null)}
                />
            </ConfigProvider>
        </SearchFilterField>
    );
}
