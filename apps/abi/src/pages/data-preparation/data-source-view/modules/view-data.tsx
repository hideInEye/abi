import { getPreviewDataByTable } from '@/service/api';
import type { TableColumnCheck } from '~/packages/hooks/src/use-table';

interface PropsType {
  sourceId?: string;
  tableName: string;
}

export const ViewData: React.FC<PropsType> = memo(({ sourceId, tableName }) => {
  const { t } = useTranslation();
  const [dataSource, setDataSource] = useState<any>([]);
  const [checkboxColumns, setCheckboxColumns] = useState<TableColumnCheck[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0
  });

  const pageDatasource = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return dataSource?.slice(start, end);
  }, [dataSource, pagination]);

  const columns = useMemo(() => {
    return checkboxColumns
      ?.filter(item => item.checked)
      .map(({ key,width }) => ({
        dataIndex: key,
        key,
        width,
        title: key
      }));
  }, [checkboxColumns]);

  const getTableInfo = async () => {
    if (sourceId && tableName) {
      const res = await getPreviewDataByTable({
        sourceId,
        spaceId: Number(localStorage.getItem('spaceId')),
        tableName
      });
      const resData = res.data?.data;
      setDataSource(resData?.data);
      const pageConfig = {
        current: 1,
        pageSize: 50,
        total: resData?.data?.length
      };
      setPagination(pageConfig);

      const _checkboxColumns = resData?.fields.map((item: any) => ({
        checked: true,
        key: item.originName,
        title: item.originName,
        width: 150,
      }));
      setCheckboxColumns(_checkboxColumns);
    }
  };

  useEffect(() => {
    getTableInfo();
  }, [tableName]);

  return (
    <>
      <APopover
        placement="bottomRight"
        trigger="click"
        content={
          <DragContent
            columns={checkboxColumns}
            setColumnChecks={setCheckboxColumns}
          />
        }
      >
        <AButton
          className="absolute right-0 top-[-50px] z-1"
          icon={<IconAntDesignSettingOutlined />}
          size="small"
        >
          {t('common.columnSetting')}
        </AButton>
      </APopover>

      <ATable<any>
        footer={() => <div>说明: 参与预览计算的数据最多100行,原数据不足100行则取全量数据,超过则抽取样数据</div>}
        columns={columns}
        dataSource={pageDatasource}
        scroll={{ y: 'calc(100vh - 400px)' }}
        pagination={{
          ...pagination,
          onChange: (page: number, pageSize: number) => {
            setPagination({
              current: page,
              pageSize,
              total: pagination.total
            });
          }
        }}
      />
    </>
  );
});
