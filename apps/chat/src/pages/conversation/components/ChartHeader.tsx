import { useState, useEffect } from 'react';
import { Button, Dropdown, Space, Popover, Skeleton, Divider, Select } from 'antd';
import SvgIcon from '../../../components/SvgIcon';
import { FilterOutlined, DownloadOutlined, CloseOutlined } from '@ant-design/icons';
import { fetchConvGuide, fetchAssembleSql, fetchSelectDataBySql } from '../../../service/api/conv';
import FilterItem, { FilterType, FilterOption } from './FilterItem';
import { filterParams, countActiveFilters } from '@/utils';
import { exportMenuItems } from '@/constant/chat';
import type { MenuProps } from 'antd';
import './styles.css';

interface FilterData {
  dateFormat: string | null;
  fieldType: string;
  filteredData: any;
  filtrateDataList: string[];
  greaterThan: any;
  minorThan: any;
  showType: string;
  tfieldName: string;
  tfieldShowName: string;
  tfieldType: string | null;
}

interface FilterConfig {
  type: FilterType;
  field: string;
  placeholder?: string | [string, string];
  options?: FilterOption[];
  extra: any;
}

interface Props {
  onTypeChange: (type: string) => void;
  onShareClick: () => void;
  onConfigClick: () => void;
  onDebugClick: () => void;
  onFullscreenClick: () => void;
  onDataFetched: (data: any) => void;
  onExportClick?: (key: string) => void;
  onhandleGetChartType?: (type: string) => void;
  showChartIcon?: boolean;
  activeType?: string;
  convUid?: string;
  chatId?: string;
  spaceId?: number;
  agentId?: string;
  chatMode?: string;
  ansiSql?: string;
  chartType?: string;
}

const ChartHeader: React.FC<Props> = ({
  onTypeChange,
  onShareClick,
  onConfigClick,
  onDebugClick,
  onFullscreenClick,
  onDataFetched,
  onExportClick,
  onhandleGetChartType,
  showChartIcon = false,
  activeType = 'table',
  convUid,
  chatId,
  spaceId,
  agentId,
  chatMode,
  ansiSql,
  chartType
}) => {
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [allFilters, setAllFilters] = useState<FilterData[]>([]); // 二次引导筛选项
  const [open, setOpen] = useState(false); // 控制Popover显示状态
  const [filterValuesLen, setFilterValuesLen] = useState(0);
  const [loading, setLoading] = useState(false); // 加载状态
  const [filtersFetched, setFiltersFetched] = useState(false); // 记录是否已获取过筛选数据
  const chartData = [
    {label:'柱状图',value:'response_bar_chart'},
    {label:'折线图',value:'response_line_chart'},
    {label:'区域图',value:'response_area_chart'},
    {label:'饼图',value:'response_pie_chart'},
    {label:'圆环图',value:'response_donut_chart'},
    {label:'多指标柱形图',value:'response_many_bar_chart'},
    {label:'多指标折线图',value:'response_many_line_chart'},
  ]   // 图表类型
  

  const handleGetFileter = async () => {
    setOpen(true);
    // 如果已经获取过筛选数据且当前有筛选条件，则不再重复请求
    if (filtersFetched && allFilters.length > 0) {
      return;
    }
    
    if (convUid && chatId && spaceId && agentId && chatMode) {
      try {
        setLoading(true);
        const res = await fetchConvGuide({
          convUid,
          chatId,
          spaceId,
          agentId,
          chatMode,
          unionSql: ansiSql
        });

        if (res.data) {
          setAllFilters(res.data || []);
          setFiltersFetched(true); // 标记为已获取数据

          const initialValues = res.data.reduce((acc, filter) => {
            acc[filter.tfieldName] = undefined;
            return acc;
          }, {} as Record<string, any>);
          setFilterValues(initialValues);
        }
      }
      catch (error) {
        console.error('获取过滤器配置失败:', error);
      }
      finally {
        setLoading(false);
      }
    }
  };

  // 重置筛选条件
  const resetFilters = () => {
    const initialValues = allFilters.reduce((acc, filter) => {
      const { showType } = filter;
      let initialValue;
      
      // 根据筛选类型设置初始值
      switch (showType) {
        case 'select': // 下拉选择框：设为 null 或空值
          initialValue = null;
          break;
        case 'range': // 范围选择框：设为 null 或空数组
          initialValue = null; // 或 []，需根据 FilterItem 组件实际逻辑调整
          break;
        default: // 输入框等其他类型：设为 undefined 或空字符串
          initialValue = undefined;
          break;
      }
      
      acc[filter.tfieldName] = initialValue;
      return acc;
    }, {} as Record<string, any>);
    
    setFilterValues(initialValues);
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 刷新
  const onRefreshClick = () => {
    handleSearch(true);
  };

  // 查询,根据筛选和上一次的sql条件转sql，再查数据
  const handleSearch = async (isRefresh: boolean = false) => {
    setFilterValuesLen(countActiveFilters(filterValues));
    try {
      const res = await fetchAssembleSql({
        convUid,
        chatId,
        spaceId,
        agentId,
        chatMode,
        unionSql: ansiSql,
        filteredFields: isRefresh
          ? []
          : generateFilteredFields(allFilters, filterParams(filterValues)),
      });
      if (res.data) {
        const newSql = res.data.unionSql;
        handleSelectDataBySql(newSql);
      }
    }
    catch (error) {
      console.error('组装SQL失败:', error);
    }
  };

  // 根据sql 查数据
  const handleSelectDataBySql = async (sql: string) => {
    try {
      const res = await fetchSelectDataBySql({
        convUid,
        chatId,
        spaceId,
        agentId,
        chatMode,
        unionSql: sql,
      });
      if (res.data) {
        // 将查询到的数据传递给父组件
        onDataFetched?.({
          data: res.data.data.data,
          sql,
        });
      }
    } catch (error) {
      console.error('执行SQL查询失败:', error);
      onDataFetched?.({ sql });
    }
  };

  const generateFilteredFields = (originalFields, formData) => {
    return originalFields
      .filter(field => formData[field.tfieldName] !== undefined)
      .map(field => {
        const { tfieldShowName, tfieldName, fieldType, dateFormat, showType } = field;
        const value = formData[tfieldName];
        let filteredData = '';

        // 处理不同 showType 的筛选逻辑
        switch (showType) {
          case 'range': {
            // 处理范围类型：对象格式 { min: ..., max: ... }
            if (value && value.min !== undefined && value.max !== undefined) {
              const min = fieldType === 'VARCHAR' ? `'${value.min}'` : value.min;
              const max = fieldType === 'VARCHAR' ? `'${value.max}'` : value.max;
              filteredData = `${tfieldName} >= ${min} and ${tfieldName} <= ${max}`;
            } else if (value && value.min !== undefined) {
              const min = fieldType === 'VARCHAR' ? `'${value.min}'` : value.min;
              filteredData = `${tfieldName} >= ${min}`;
            } else if (value && value.max !== undefined) {
              const max = fieldType === 'VARCHAR' ? `'${value.max}'` : value.max;
              filteredData = `${tfieldName} <= ${max}`;
            }
            break;
          }
          
          case 'date': {
            // 处理日期类型：数组格式 [val1, val2]
            if (Array.isArray(value) && value.length === 2) {
              const [startDate, endDate] = value;
              if (startDate && endDate) {
                const formattedStart = fieldType === 'VARCHAR' ? `'${startDate}'` : startDate;
                const formattedEnd = fieldType === 'VARCHAR' ? `'${endDate}'` : endDate;
                filteredData = `${tfieldName} >= ${formattedStart} and ${tfieldName} <= ${formattedEnd}`;
              } else if (startDate) {
                const formattedStart = fieldType === 'VARCHAR' ? `'${startDate}'` : startDate;
                filteredData = `${tfieldName} >= ${formattedStart}`;
              } else if (endDate) {
                const formattedEnd = fieldType === 'VARCHAR' ? `'${endDate}'` : endDate;
                filteredData = `${tfieldName} <= ${formattedEnd}`;
              }
            }
            break;
          }
          
          case 'select': {
            // 处理下拉选择：生成 IN 条件
            if (value && (Array.isArray(value) ? value.length > 0 : value !== null)) {
              const values = Array.isArray(value) ? value : [value];
              const formattedValues = values
                .filter(v => v !== null && v !== undefined)
                .map(v => (fieldType === 'VARCHAR' ? `'${v}'` : v))
                .join(',');
              filteredData = `${tfieldName} in (${formattedValues})`;
            }
            break;
          }
          
          case 'input': {
            // 处理输入框：生成等于条件
            if (value !== null && value !== undefined && value !== '') {
              const formattedValue = fieldType === 'VARCHAR' ? `'${value}'` : value;
              filteredData = `${tfieldName} = ${formattedValue}`;
            }
            break;
          }
          
          default: {
            filteredData = '';
          }
            
        }
  
        return {
          tfieldShowName,
          tfieldName,
          fieldType,
          dateFormat,
          filteredData
        };
      });
  };

  // 文件下载
  const handleDownloadClick: MenuProps['onClick'] = async ({ key }) => {
    onExportClick && onExportClick(key);
  };

  const renderFilterItem = (filter: FilterData) => {
    let config: FilterConfig = {
      type: 'input',
      field: filter.tfieldName,
      placeholder: filter.tfieldShowName,
      extra: {
        convUid,
        chatId,
        spaceId,
        agentId,
        chatMode
      }
    };

    switch (filter.showType) {
      case 'select':
        config = {
          type: 'select',
          field: filter.tfieldName,
          placeholder: filter.tfieldShowName,
          options: filter.filtrateDataList.map(item => ({
            label: item,
            value: item
          })),
          extra: {
            convUid,
            chatId,
            spaceId,
            agentId,
            chatMode
          }
        };
        break;
      case 'range':
        config = {
          type: 'range',
          field: filter.tfieldName,
          placeholder: [filter.tfieldShowName, filter.tfieldShowName],
          extra: {
            convUid,
            chatId,
            spaceId,
            agentId,
            chatMode
          }
        };
        break;
      case 'date':
        config = {
          type: 'date',
          field: filter.tfieldName,
          placeholder: [filter.tfieldShowName, filter.tfieldShowName],
          extra: {
            convUid,
            chatId,
            spaceId,
            agentId,
            chatMode
          }
        };
        break;
      case 'input':
        config = {
          type: 'input',
          field: filter.tfieldName,
          placeholder: filter.tfieldShowName,
          extra: {
            convUid,
            chatId,
            spaceId,
            agentId,
            chatMode
          }
        };
        break;
    }

    return (
      <div className="mb-3" key={filter.tfieldName}>
        <FilterItem
          {...config}
          value={filterValues[filter.tfieldName]}
          onChange={(value) => handleFilterChange(filter.tfieldName, value)}
          style={config.type === 'input' ? { width: 200 } : undefined}
        />
      </div>
    );
  };

  const popoverContent = (
    <div className="p-3 w-[300px] max-h-[400px] overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">筛选条件</h3>
        <CloseOutlined 
          className="cursor-pointer hover:text-gray-600" 
          onClick={() => setOpen(false)}
        />
      </div>
      {/* 加载状态 */}
      {loading && (
        <Skeleton active paragraph={{ rows: 5 }} />
      )}
      
      {/* 筛选内容 */}
      {!loading  && (
        <div className="mb-3">
          {allFilters?.length > 0 ? (
            <>
              {allFilters.map(renderFilterItem)}
            </>
          ) : (
            <div className="text-gray-500 text-center py-4">没有可用的筛选条件</div>
          )}
        </div>
      )}
      <div className="flex justify-end pt-2 border-t">
        <Button onClick={() => setOpen(false)} className="mr-2">
          取消
        </Button>
        {/* <Button 
          className="mr-2"
          onClick={resetFilters}
        >
          重置筛选条件
        </Button> */}
        <Button type="primary" onClick={() => handleSearch(false)}>
          查询
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <header className="flex items-center justify-between border-b p-2 shadow-md">
        <div className="flex items-center">
          {/* 左侧原本的筛选区域已移除 */}
          {showChartIcon && activeType === 'chart' &&(
            <Select
              value={chartType}
              onChange={onhandleGetChartType}
              options={chartData}
              className="h-6 w-[120px]"
            />            
          )}
        </div>
        <div className="flex items-center gap-2">
          {showChartIcon && (
            <span
              className={`cursor-pointer hover:opacity-70 select-none ${
                activeType === 'chart' ? 'text-[#3470f6]' : ''
              }`}
              onClick={() => onTypeChange('chart')}
            >
              <SvgIcon className="text-16px" localIcon="chart" />
            </span>
          )}
          <span
            className={`cursor-pointer hover:opacity-70 select-none ${
              activeType === 'table' ? 'text-[#3470f6]' : ''
            }`}
            onClick={() => onTypeChange('table')}
          >
            <SvgIcon className="text-16px" localIcon="table" />
          </span>
          <span
            className={`cursor-pointer hover:opacity-70 select-none ${
              activeType === 'sql' ? 'text-[#3470f6]' : ''
            }`}
            onClick={() => onTypeChange('sql')}
          >
            <SvgIcon className="text-16px" localIcon="sql" />
          </span>
          {/* 暂时隐藏分享按钮
          <span className="cursor-pointer hover:opacity-70 select-none" onClick={onShareClick}>
            <SvgIcon className="text-16px" localIcon="share" />
          </span>
          */}
          <span className="cursor-pointer hover:opacity-70 select-none" onClick={onRefreshClick}>
            <SvgIcon className="text-16px" localIcon="refresh" />
          </span>
          {showChartIcon && (
            <span className="cursor-pointer hover:opacity-70 select-none" onClick={onConfigClick}>
              <SvgIcon className="text-16px" localIcon="set" />
            </span>
          )}
          {/* <span className="cursor-pointer hover:opacity-70 select-none" onClick={onDebugClick}>
            <SvgIcon className="text-16px" localIcon="setting" />
          </span> */}
          <span className="cursor-pointer hover:opacity-70 select-none" onClick={onFullscreenClick}>
            <SvgIcon className="text-16px" localIcon="fullscreen" />
          </span>
          <span className="cursor-pointer hover:opacity-70 select-none text-[#666] hover:text-[#3470f6]">
            <Dropdown menu={{ items: exportMenuItems, onClick: handleDownloadClick }} placement="bottom" trigger={['click']}>
                <Space>
                  <DownloadOutlined />
                </Space>
            </Dropdown>
          </span>
          {/* 筛选条件Popover */}
          <Popover
            content={popoverContent}
            title={null} // 取消默认标题
            trigger="click"
            placement="bottomRight"
            arrow={{ pointAtCenter: true }}
            open={open}
            onOpenChange={setOpen} // 监听popover打开/关闭状态
          >
            <span onClick={handleGetFileter} className="cursor-pointer hover:opacity-70 select-none text-[#666] hover:text-[#3470f6]">
              <FilterOutlined />
              {filterValuesLen > 0 && <span style={{ fontSize: '10px' }}>{`(${filterValuesLen})`}</span>}
            </span>
          </Popover>
        </div>
      </header>
    </div>
  );
};

export default ChartHeader;