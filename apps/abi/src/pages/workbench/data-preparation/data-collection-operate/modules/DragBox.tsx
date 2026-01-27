import { CopyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { message } from 'antd';
import copy from 'copy-to-clipboard';
import type { FC } from 'react';
import { useDrag } from 'react-dnd';

import { DataCollectionOperateContext } from '../context';

export interface BoxProps {
  readonly name: string;
  readonly type: string;
}

export const DragBox: FC<any> = props => {
  const { dataType, disabled, sourceId, tableName } = props;
  const { curDatasourceType } = useContext(DataCollectionOperateContext);

  const { fieldsList, getFieldsList } = useDatasource();
  const [visible, setVisible] = useState(false);
  const [hasFetch, setHasFetch] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (visible && !hasFetch) {
      getFieldsList({ sourceId, tableName }, curDatasourceType);
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
    canDrag: () => !disabled,
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
    { dataIndex: 'originName', title: '物理字段名',width:200 },
    { dataIndex: 'name', title: '字段备注',width:200 },
    { render: (_: unknown, row: any) => <CopyOutlined onClick={() => handleCopy(row.originName)} />, title: '操作',width:200 }
  ];
  const content = (
    <div style={{ maxWidth:600 }}>
      <ATable
        columns={columns}
        dataSource={fieldsList}
        pagination={false}
        rowKey="originName"
        scroll={{ y: 'calc(100vh - 300px)'}}
      />
    </div>
  );
  return (
    <div
      className={`group/item flex justify-between items-center rounded px-2 py-1 ${disabled ? 'cursor-not-allowed bg-#f5f5f5 text-#999' : 'cursor-pointer hover:bg-gray-200'} ${isDragging ? 'opacity-40' : ''}`}
      ref={ref}
      aria-disabled={disabled}
    >
      <AFlex
        align="center"
        className="flex-1 min-w-0 mr-2"
      >
        <SvgIcon
          className="mr-2 flex-shrink-0"
          localIcon="db"
        />
        <span
          className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
          title={tableName}
        >
          {tableName}
        </span>
      </AFlex>
      <AFlex className="invisible group-hover/item:visible flex-shrink-0">
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
