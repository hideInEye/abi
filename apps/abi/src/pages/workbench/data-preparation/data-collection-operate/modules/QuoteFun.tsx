import { InfoCircleOutlined, SearchOutlined } from '@ant-design/icons';

import { FUN_ENUM } from '@/constants/data-preparation';

const QuoteFun: React.FC<{ height?: string; onSelect: (val: string) => void }> = memo(
  ({ height = 'calc(100vh - 120px)', onSelect }) => {
    const [search, setSearch] = useState('');
    const funOptions = useMemo(() => {
      return FUN_ENUM.filter(item => item.subTitle.toLowerCase().includes(search));
    }, [search]);

    return (
      <div className="w-25%">
        <header className="pb-8px">
          <span className="mr-1">点击引用函数</span>
          <ATooltip title="请使用当前数据源对应的数据库函数进行表达式编辑">
            <InfoCircleOutlined />
          </ATooltip>
        </header>
        <div
          className="overflow-y-auto border rounded p-10px"
          style={{ height }}
        >
          <AInput
            className="mb-16px"
            placeholder="通过名称搜索"
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div>
            {funOptions.map(item => (
              <ATooltip
                key={item.subTitle}
                mouseEnterDelay={0.5}
                placement="left"
                title={
                  <div>
                    <div>
                      <b>{item.title}</b>
                    </div>
                    <div>{item.subTitle}</div>
                    <div>{item.explain}</div>
                  </div>
                }
              >
                <div
                  className="cursor-pointer rounded px-2 py-1 hover:bg-#E8E9E9"
                  onClick={() => onSelect(item.subTitle)}
                  // min-height: 28px;
                  // padding: 0 8px;
                  // margin-bottom: 4px;
                  // border-radius: 4px;
                  // color: #1f2329;
                >
                  {item.subTitle}
                </div>
              </ATooltip>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

export default QuoteFun;
