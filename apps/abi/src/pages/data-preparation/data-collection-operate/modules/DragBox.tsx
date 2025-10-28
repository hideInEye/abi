import { CopyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { message } from 'antd';
import copy from 'copy-to-clipboard';
import type { FC } from 'react';
import { useDrag } from 'react-dnd';

export interface BoxProps {
  readonly name: string;
  readonly type: string;
}

export const DragBox: FC<any> = props => {
  const { dataType, sourceId, tableName } = props;
  const { fieldsList, getFieldsList } = useDatasource();
  const [visible, setVisible] = useState(false);
  const [hasFetch, setHasFetch] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (visible && !hasFetch) {
      getFieldsList({ sourceId, tableName });
      setHasFetch(true);
    }
  }, [visible, hasFetch]);

  const [{ isDragging }, drag] = useDrag({
    collect: monitor => ({
      isDragging: monitor.isDragging() // 正在拖动时
    }),
    item: {
      ...props
    },
    type: 'box'
  });

  drag(ref);

  const handleCopy = (name: string) => {
    copy(name);
    message.success('复制成功');
  };
  const title = (
    <div>
      <span className="mr-2">{tableName}</span>
      <CopyOutlined onClick={() => handleCopy(tableName)} />
    </div>
  );

  const columns: TableColumnsType<any> = [
    { dataIndex: 'originName', title: '物理字段名' },
    { dataIndex: 'name', title: '字段备注' },
    { render: (_: unknown, row: any) => <CopyOutlined onClick={() => handleCopy(row.originName)} />, title: '操作' }
  ];
  const content = (
    <ATable
      columns={columns}
      dataSource={fieldsList}
      pagination={false}
      rowKey="originName"
    />
  );
  return (
    <div
      className={`group/item flex justify-between cursor-pointer items-center rounded px-2 py-1 hover:bg-gray-200 ${isDragging ? 'opacity-40' : ''}`}
      ref={ref}
    >
      <AFlex align="center">
        <SvgIcon
          className="mr-2"
          localIcon="db"
        />
        <span
          className="inline-block max-w-130px overflow-hidden text-ellipsis"
          title={tableName}
        >
          {tableName}
        </span>
      </AFlex>
      <AFlex className="invisible group-hover/item:visible">
        <CopyOutlined onClick={() => handleCopy(tableName)} />
        <APopover
          content={content}
          open={visible}
          placement="right"
          title={title}
          trigger="click"
          onOpenChange={show => setVisible(show)}
        >
          <InfoCircleOutlined className="ml-2" />
        </APopover>
      </AFlex>
    </div>
  );
};
